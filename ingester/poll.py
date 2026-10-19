#!/usr/bin/env python3
"""Poll public Telegram channels for new job posts and upsert into Postgres."""

from __future__ import annotations

import asyncio
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import yaml
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.sessions import StringSession

from db import (
    connect,
    ensure_unique_indexes,
    insert_raw_post,
    set_last_message_id,
    upsert_channel,
    upsert_job,
)
from parse import parse_message

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT.parent / ".env")
load_dotenv()


def load_channels() -> list[dict]:
    with open(ROOT / "channels.yaml", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return list(data.get("channels") or [])


async def poll_channel(
    client: TelegramClient,
    conn,
    entry: dict,
    *,
    limit: int = 40,
) -> int:
    username = entry["username"].lstrip("@")
    market = entry.get("market") or "both"
    language_hint = entry.get("language_hint")

    entity = await client.get_entity(username)
    title = getattr(entity, "title", None) or username
    channel = upsert_channel(
        conn,
        username=username,
        title=title,
        market=market,
        language_hint=language_hint,
    )
    conn.commit()

    min_id = int(channel.get("last_message_id") or 0)
    messages = await client.get_messages(entity, limit=limit, min_id=min_id)
    # oldest first so last_message_id advances correctly
    messages = list(reversed([m for m in messages if m and m.id]))

    inserted = 0
    max_id = min_id
    for msg in messages:
        text = msg.message or ""
        posted_at = msg.date
        if posted_at and posted_at.tzinfo is None:
            posted_at = posted_at.replace(tzinfo=timezone.utc)
        if posted_at:
            posted_at = posted_at.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            posted_at = datetime.utcnow()

        payload = {
            "id": msg.id,
            "views": getattr(msg, "views", None),
            "grouped_id": getattr(msg, "grouped_id", None),
        }
        raw_id = insert_raw_post(
            conn,
            channel_id=channel["id"],
            tg_message_id=msg.id,
            text=text,
            posted_at=posted_at,
            payload=payload,
        )

        parsed = parse_message(
            text,
            username=username,
            message_id=msg.id,
            posted_at=posted_at,
            market=market,
        )
        if parsed:
            upsert_job(
                conn,
                channel_id=channel["id"],
                raw_post_id=raw_id,
                tg_message_id=msg.id,
                parsed=parsed,
            )
            inserted += 1

        max_id = max(max_id, msg.id)

    if max_id > min_id:
        set_last_message_id(conn, channel["id"], max_id)
    conn.commit()
    return inserted


async def main() -> int:
    api_id = os.environ.get("TELEGRAM_API_ID")
    api_hash = os.environ.get("TELEGRAM_API_HASH")
    session = os.environ.get("TELEGRAM_SESSION")
    if not api_id or not api_hash or not session:
        print(
            "Missing TELEGRAM_API_ID / TELEGRAM_API_HASH / TELEGRAM_SESSION",
            file=sys.stderr,
        )
        return 1

    channels = load_channels()
    if not channels:
        print("No channels in channels.yaml", file=sys.stderr)
        return 1

    conn = connect()
    ensure_unique_indexes(conn)
    conn.commit()

    client = TelegramClient(StringSession(session), int(api_id), api_hash)
    await client.connect()
    if not await client.is_user_authorized():
        print("Telegram session is not authorized", file=sys.stderr)
        return 1

    total = 0
    try:
        for entry in channels:
            username = entry.get("username")
            if not username:
                continue
            try:
                n = await poll_channel(client, conn, entry)
                print(f"@{username.lstrip('@')}: +{n} jobs")
                total += n
            except Exception as exc:  # noqa: BLE001
                print(f"@{username}: error {exc}", file=sys.stderr)
            time.sleep(1.5)
    finally:
        await client.disconnect()
        conn.close()

    print(f"Done. Parsed {total} job posts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

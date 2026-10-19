"""Postgres helpers for the Telethon ingester."""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


def connect() -> psycopg.Connection:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg.connect(url, row_factory=dict_row)


def upsert_channel(
    conn: psycopg.Connection,
    *,
    username: str,
    title: str | None,
    market: str,
    language_hint: str | None,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO channels (id, username, title, market, language_hint, active, last_message_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, true, 0, NOW(), NOW())
            ON CONFLICT (username) DO UPDATE SET
              title = COALESCE(EXCLUDED.title, channels.title),
              market = EXCLUDED.market,
              language_hint = COALESCE(EXCLUDED.language_hint, channels.language_hint),
              updated_at = NOW()
            RETURNING *
            """,
            (str(uuid4()), username, title, market, language_hint),
        )
        row = cur.fetchone()
        assert row is not None
        return row


def set_last_message_id(conn: psycopg.Connection, channel_id: str, message_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE channels
            SET last_message_id = GREATEST(last_message_id, %s), updated_at = NOW()
            WHERE id = %s
            """,
            (message_id, channel_id),
        )


def insert_raw_post(
    conn: psycopg.Connection,
    *,
    channel_id: str,
    tg_message_id: int,
    text: str,
    posted_at: datetime,
    payload: dict[str, Any] | None,
) -> str:
    post_id = str(uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO raw_posts (id, channel_id, tg_message_id, text, posted_at, payload, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (channel_id, tg_message_id) DO UPDATE SET
              text = EXCLUDED.text,
              payload = EXCLUDED.payload
            RETURNING id
            """,
            (
                post_id,
                channel_id,
                tg_message_id,
                text,
                posted_at,
                Jsonb(payload or {}),
            ),
        )
        row = cur.fetchone()
        assert row is not None
        return row["id"]


def upsert_job(
    conn: psycopg.Connection,
    *,
    channel_id: str,
    raw_post_id: str,
    tg_message_id: int,
    parsed: dict[str, Any],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO jobs (
              id, channel_id, raw_post_id, tg_message_id, title, company, location,
              description, categories, skills, tags, remote, employment_type,
              salary_text, apply_url, source_url, posted_at, is_active, dedupe_hash,
              created_at, updated_at
            ) VALUES (
              %s, %s, %s, %s, %s, %s, %s,
              %s, %s, %s, %s, %s, %s,
              %s, %s, %s, %s, true, %s,
              NOW(), NOW()
            )
            ON CONFLICT (channel_id, tg_message_id) DO UPDATE SET
              title = EXCLUDED.title,
              company = EXCLUDED.company,
              location = EXCLUDED.location,
              description = EXCLUDED.description,
              categories = EXCLUDED.categories,
              skills = EXCLUDED.skills,
              tags = EXCLUDED.tags,
              remote = EXCLUDED.remote,
              apply_url = EXCLUDED.apply_url,
              source_url = EXCLUDED.source_url,
              posted_at = EXCLUDED.posted_at,
              dedupe_hash = EXCLUDED.dedupe_hash,
              raw_post_id = EXCLUDED.raw_post_id,
              updated_at = NOW(),
              is_active = true
            """,
            (
                str(uuid4()),
                channel_id,
                raw_post_id,
                tg_message_id,
                parsed["title"],
                parsed.get("company"),
                parsed.get("location"),
                parsed.get("description") or "",
                parsed.get("categories") or [],
                parsed.get("skills") or [],
                parsed.get("tags") or [],
                bool(parsed.get("remote")),
                parsed.get("employment_type"),
                parsed.get("salary_text"),
                parsed.get("apply_url"),
                parsed["source_url"],
                parsed["posted_at"],
                parsed["dedupe_hash"],
            ),
        )


def ensure_unique_indexes(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS raw_posts_channel_msg_uidx
            ON raw_posts (channel_id, tg_message_id)
            """
        )
        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS jobs_channel_msg_uidx
            ON jobs (channel_id, tg_message_id)
            """
        )

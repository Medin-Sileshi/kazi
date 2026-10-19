#!/usr/bin/env python3
"""Interactive helper to create a TELEGRAM_SESSION string (run locally once)."""

from __future__ import annotations

import asyncio
import os

from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.sessions import StringSession

load_dotenv()


async def main() -> None:
    api_id = int(os.environ["TELEGRAM_API_ID"])
    api_hash = os.environ["TELEGRAM_API_HASH"]
    client = TelegramClient(StringSession(), api_id, api_hash)
    await client.start()
    print("\nTELEGRAM_SESSION=")
    print(client.session.save())
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())

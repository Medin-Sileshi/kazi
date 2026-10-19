#!/usr/bin/env python3
"""Deactivate junk jobs already stored (and optionally re-score categories)."""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

from db import connect
from parse import is_junk, is_likely_job, extract_categories, extract_skills

ROOT = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT, "..", ".env"))
load_dotenv(os.path.join(ROOT, "..", ".env.local"))
load_dotenv()


def main() -> int:
    conn = connect()
    deactivated = 0
    rescored = 0
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, title, description, is_active FROM jobs WHERE is_active = true"
        )
        rows = cur.fetchall()
        for row in rows:
            text = row["description"] or row["title"] or ""
            if is_junk(text) or not is_likely_job(text):
                cur.execute(
                    "UPDATE jobs SET is_active = false, updated_at = NOW() WHERE id = %s",
                    (row["id"],),
                )
                deactivated += 1
            else:
                cats = extract_categories(text)
                skills = extract_skills(text)
                cur.execute(
                    """
                    UPDATE jobs
                    SET categories = %s, skills = %s, updated_at = NOW()
                    WHERE id = %s
                    """,
                    (cats, skills, row["id"]),
                )
                rescored += 1
    conn.commit()
    conn.close()
    print(f"Deactivated {deactivated} junk jobs; refreshed {rescored} keepers.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

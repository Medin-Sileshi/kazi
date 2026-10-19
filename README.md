# Kazi

Aggregate job posts from public Telegram channels and show them as a browseable board (guests) or a matched **For you** feed (signed-in users).

## Stack

- **Next.js** (App Router) on Vercel
- **Neon** Postgres + Drizzle ORM
- **Auth.js** — Google + Telegram Login Widget
- **Telethon** poller on **GitHub Actions** (every 15 minutes)

Ingestion uses a Telegram **user** session, not the Bot API. The BotFather bot is only for the login widget.

## Local setup

```bash
cp .env.example .env
npm install
```

1. Create a Neon database and set `DATABASE_URL`.
2. Apply schema:

```bash
npm run db:push
# or: psql "$DATABASE_URL" -f drizzle/0000_init.sql
```

3. Set `AUTH_SECRET`, Google OAuth credentials, and (optional) Telegram login bot vars.
4. Create a Telethon session once:

```bash
cd ingester
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Get api_id / api_hash from https://my.telegram.org
python login.py   # prints TELEGRAM_SESSION=
```

5. Edit [`ingester/channels.yaml`](ingester/channels.yaml) to real public job channels you can access.
6. Run a poll:

```bash
python poll.py
```

7. Start the web app:

```bash
npm run dev
```

## Deploy (free tier)

See [`.github/DEPLOY.md`](.github/DEPLOY.md) for the full checklist.

| Piece | Where |
|-------|--------|
| Web | Vercel — import repo, set env vars from `.env.example` |
| DB | Neon free — run `npm run db:push` or apply `drizzle/0000_init.sql` |
| Ingest | GitHub Actions — add secrets: `DATABASE_URL`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_SESSION` |

Manual backfill: Actions → **Ingest Telegram jobs** → Run workflow → mode `backfill`.

Telegram Login: create a bot via BotFather, `/setdomain` to your Vercel host, set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_BOT_USERNAME` on Vercel.

## Routes

- `/` — guest board + categories
- `/jobs/[id]` — detail + Telegram deep link
- `/for-you` — matched feed (auth + profile)
- `/profile` — skills / roles / location prefs
- `/sign-in` — Google + Telegram

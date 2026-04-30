# MindWellAI Local Setup

## Required keys

- `GROQ_API_KEY`: required for live AI responses.
- `JWT_SECRET`: required for auth token signing.

## Optional keys

- `DATABASE_URL`: optional for local development. If unset, the app uses in-memory storage.
- `OPENAI_API_KEY`: optional fallback if you want to use OpenAI instead of Groq.
- `OPENAI_BASE_URL`: optional for another OpenAI-compatible provider.

## Free-tier options

- AI: Groq
- Database: none required for local testing
- Production/Postgres: Neon or Supabase free tier

## Neon setup

1. Create a Neon project.
2. Copy the Postgres connection string.
3. Set `DATABASE_URL` in `.env`.
4. Run `npm.cmd run db:push`.

## Supabase setup

1. Create a Supabase project.
2. Open Project Settings, then Database.
3. Copy the Postgres connection string.
4. Set `DATABASE_URL` in `.env`.
5. Run `npm.cmd run db:push`.

## Run locally

```powershell
npm.cmd run dev
```

## Notes

- If port `5000` is busy, the server will automatically choose another open port.
- Without `DATABASE_URL`, data is not persisted between restarts.

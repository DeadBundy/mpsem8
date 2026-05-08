# Vercel deployment checklist (MindWellAI)

- [x] Confirm Vercel build uses both: client static build + node server entry (repo already has `vercel.json` routing)

- [x] Ensure `vercel.json` routes are set for SPA fallback + `/api` proxy (already present)

- [ ] Add required Vercel environment variables: `GROQ_API_KEY`, `JWT_SECRET`, (optional `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`)
- [ ] Deploy via Vercel → Project → Import Git repository
- [ ] Verify `/` serves React app
- [ ] Verify `/api/*` endpoints return JSON (smoke test)


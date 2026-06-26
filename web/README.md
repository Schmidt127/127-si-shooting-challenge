# Hoop Challenges — Web App

Next.js site for **127 Sports Intensity** programs. The **Shooting Challenge** is the first live program; this hub will replace Softr.io over time.

> Repo: `127-si-shooting-challenge` (monorepo). Vercel **Root Directory** = `web`.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Data | Airtable REST API (server-side only) |
| Hosting | Vercel |
| Source control | GitHub (monorepo: `web/` folder) |

## Quick start

```bash
cd web
cp .env.example .env.local
# Add AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Health check: [http://localhost:3000/api/airtable](http://localhost:3000/api/airtable)

## Project structure

```
web/
├── app/                  # Routes (App Router)
├── components/           # UI by feature area
├── lib/                  # Airtable client, queries, formatters, security
├── types/                # Shared TypeScript types
├── docs/                 # Web-specific planning docs
└── public/               # Static assets
```

## Current phase

**Phase 0 — Pipeline scaffold**

- Homepage with deployment pipeline message
- Placeholder routes for all major pages
- Airtable client stub + `/api/airtable` health route
- No live data on pages yet

## Related repo docs

- [Documentation index](../docs/README.md)
- [Site hierarchy (canonical routes)](./docs/site-hierarchy.md)
- [Airtable schema notes](../airtable/schema/current/table-map.md)
- [System overview](../SYSTEM_OVERVIEW.md)

## Security

- Never expose `AIRTABLE_API_TOKEN` to the browser
- All Airtable reads go through Server Components, Route Handlers, or Server Actions
- Use `SITE_ACCESS_TOKEN` on Vercel preview deployments during private dev

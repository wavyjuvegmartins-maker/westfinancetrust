# West Finance Trust

Marketing site, online banking (installable as an app) and staff admin for West Finance Trust.
Built with Next.js 16, Supabase and Resend.

## Run locally

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev                  # http://localhost:3000
```

To try the installable app, offline page and service worker locally, use a production build:
`npm run build && npm start`.

## Deploy

See [DEPLOY.md](DEPLOY.md) for Vercel, the domain (westfinacetrust.com), Supabase settings and a test checklist.

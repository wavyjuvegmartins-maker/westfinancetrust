# Deploying West Finance Trust to Vercel

The site is a standard Next.js app, so Vercel builds it with no extra config.
These steps put it on **westfinacetrust.com** (note the spelling: "finace").

## 1. Import the project

1. Push `main` to GitHub (`wavyjuvegmartins-maker/westfinancetrust`).
2. In Vercel: **Add New → Project**, then import that repository.
3. Framework preset: **Next.js**. Leave the build command, output folder and install command at their defaults.
4. Add the environment variables below **before** the first deploy, then click **Deploy**.

## 2. Environment variables

Vercel → Project → **Settings → Environment Variables**. Copy the values from your `.env.local`. Set each one for **Production** and **Preview**.

| Name | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://….supabase.co` | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Safe in the browser |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | **Server only.** Mark it *Sensitive* |
| `RESEND_API_KEY` | `re_…` | Mark it *Sensitive* |
| `EMAIL_FROM` | `West Finance Trust <no-reply@westfinacetrust.com>` | The domain must be verified in Resend |
| `STAFF_EMAIL` | e.g. `support@westfinacetrust.com` | Where contact-form messages go |
| `CRON_SECRET` | a long random string | Mark it *Sensitive*; must match the Supabase Vault secret (step 5) |
| `NEXT_PUBLIC_SITE_URL` | `https://westfinacetrust.com` | Used for links in emails. No trailing slash |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from `.env.local` | Push notifications. Keep the same pair forever |
| `VAPID_PRIVATE_KEY` | from `.env.local` | **Server only.** Mark it *Sensitive* |
| `VAPID_SUBJECT` | `mailto:support@westfinacetrust.com` | |

`NEXT_PUBLIC_*` values are baked into the build, so **redeploy** after changing one.

## 3. Connect the domain

Vercel → Project → **Settings → Domains**:

1. Add `westfinacetrust.com`, then add `www.westfinacetrust.com` and choose to redirect it to the main domain.
2. Vercel shows the DNS records to create. Add them at your domain registrar, using the values Vercel shows for your project:
   - the apex `westfinacetrust.com`: an **A** record
   - `www`: a **CNAME** record
3. **Keep your email records.** Only add or change the A and CNAME records above. Leave your existing **MX**, **SPF (TXT)**, **DKIM** and **DMARC** records alone. They run your mailboxes and Resend sending.
   - If you choose Vercel's nameservers instead, re-create every email record in Vercel DNS *before* switching.
4. Wait until both domains show **Valid Configuration**. Vercel issues the HTTPS certificate automatically.

## 4. Supabase settings

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://westfinacetrust.com`
- **Redirect URLs:** add `https://westfinacetrust.com/**`, plus `https://*-<your-vercel-team>.vercel.app/**` if you want preview deployments to work.

Login uses user ID + password, so no other auth changes are needed.

## 5. Scheduled emails (once the domain is live)

1. Run `supabase/migrations/20261002000001_email_outbox.sql` if you haven't already.
2. In `supabase/setup/04_email_job.sql`, replace `https://YOUR-DOMAIN` with `https://westfinacetrust.com` and `YOUR-CRON-SECRET` with the same `CRON_SECRET` you set in Vercel. Then run the script in the Supabase SQL editor.
3. Check it: after 5 minutes, `select * from net._http_response order by created desc limit 5;` should show status `200` responses.

## 6. Test checklist

- [ ] `https://westfinacetrust.com` loads with a padlock, and `www.` redirects to it
- [ ] Log in as a test customer, then as `admin`
- [ ] Register a test customer in the admin area. The login email arrives from `no-reply@westfinacetrust.com`
- [ ] Send the contact form. It reaches `STAFF_EMAIL`
- [ ] **Install the app:**
  - **Android/Chrome:** an "Install" card appears at the bottom of the page. Install, open it from the home screen, and the navy launch screen shows before online banking.
  - **iPhone/Safari:** Share → Add to Home Screen, then open it from the home screen.
  - **Desktop Chrome/Edge:** use the install icon in the address bar.
- [ ] Turn on airplane mode in the installed app and pull to refresh. The "You're offline" page shows.
- [ ] Delete the test customers afterwards

## The installable app, briefly

- `src/app/manifest.ts`: app name, colours, icons and start page (`/dashboard`).
- `public/app/*` and `src/app/apple-icon.png`: icons. Rebuild them with `node scripts/make-app-icons.mjs` if the logo changes.
- `public/sw.js`: the service worker. Pages are **never cached**, so no account data stays on the phone. Only build files and brand images are cached. Bump `VERSION` in it when you change its rules.
- `public/offline.html`: shown when there's no connection.
- `src/components/app/splash.tsx`: the launch screen. It only appears in the installed app.
- `src/components/app/install.tsx`: the install banner, the footer's "Get the app" link and the dashboard settings row.

The service worker only runs in production builds (`npm run build && npm start`), not `npm run dev`.

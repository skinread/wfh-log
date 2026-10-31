# Supabase → Void migration

The app now runs as a Void app on Cloudflare: React SPA in `src/`, API in `routes/api/entries/`, data in D1 (`db/schema.ts`), GitHub sign-in through Void auth (`auth.ts`).

## Local development

Create `.env` (gitignored; Void reads only this file, so don't add `.env.example`):

```ini
AUTH_GITHUB_CLIENT_ID=...
AUTH_GITHUB_CLIENT_SECRET=...
AUTH_ALLOWED_GITHUB_USERS=your-github-username
```

Use a GitHub OAuth app with callback `http://localhost:5173/api/auth/callback/github`, then run `npm run dev`.

`AUTH_ALLOWED_GITHUB_USERS` takes comma-separated GitHub usernames or numeric user IDs. A numeric ID survives a username change (`gh api user --jq .id`). Everyone else is refused at sign-up and at every sign-in.

## First deploy

The Worker is named `wfh-log` (`cloudflare.name` in `void.config.ts`), so it is served at `https://wfh-log.<your-subdomain>.workers.dev`.

1. Create a GitHub OAuth app for production with homepage `https://wfh-log.<your-subdomain>.workers.dev` and callback `https://wfh-log.<your-subdomain>.workers.dev/api/auth/callback/github`.
2. Set the production secrets. Deploy refuses to run until they exist; on a first deploy they go onto a draft Worker:
   ```sh
   npx void secret put AUTH_GITHUB_CLIENT_ID
   npx void secret put AUTH_GITHUB_CLIENT_SECRET
   npx void secret put AUTH_ALLOWED_GITHUB_USERS
   ```
   `BETTER_AUTH_SECRET` is created by Void on the first deploy, so the build's "Missing required secrets: BETTER_AUTH_SECRET" warning can be ignored.
3. `npx void deploy` from your machine. `void init` saved Cloudflare as the target (account in `void.lock.json`). The first deploy provisions D1 and applies `db/migrations/`; commit the `void.lock.json` changes it makes before CI deploys.

## Deploying from CI

`.github/workflows/void-deploy.yml` (from `void init --github`) runs `npx void deploy --platform cloudflare` on every push to `main`. It needs a `CLOUDFLARE_API_TOKEN` repository secret (Settings → Secrets and variables → Actions). Do the first deploy from your machine before pushing to `main`, so CI deploys to the D1 database recorded in `void.lock.json`.

Create the token in Cloudflare under My Profile → API Tokens → Create Custom Token. None of the templates fit: "Edit Cloudflare Workers" lacks D1 and grants more than the app uses. The app is one Worker with static assets and one D1 database on workers.dev, so it needs:

| Scope | Permission | Access | Used for |
|---|---|---|---|
| Account | Workers Scripts | Edit | Uploading the Worker, secrets, versions and readiness checks |
| Account | D1 | Edit | Applying `db/migrations/` and the restore point Void saves before migrating |
| Account | Account Settings | Read | Account lookups during deploy |

Set Account Resources to Include → the account in `void.lock.json`, so `CLOUDFLARE_ACCOUNT_ID` isn't needed. Leave Zone Resources empty; a custom domain later also needs Zone → Workers Routes: Edit for that zone. If a CI deploy fails on permissions, add only the permission the error names.

Disconnect the Cloudflare dashboard's Workers Builds integration for `wfh-log` (Worker → Settings → Builds) so the two don't both deploy. Its PR check can be ignored once it's disconnected.

## Moving the data

1. In the current Bolt/Supabase app: Export CSV with "All time".
2. In the new app: sign in with GitHub, then Import CSV with that file.
3. Check the day count and totals in the Summary match.
4. Once you're happy, pause or delete the Supabase project.

## Schema changes

Edit `db/schema.ts`, run `npx void db generate`, review and commit the SQL. `void deploy` applies it. A rollback restores code only, not the database, so keep migrations additive.

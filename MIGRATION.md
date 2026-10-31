# Supabase → Void migration

The app now runs as a Void app on Cloudflare: React SPA in `src/`, API in `routes/api/entries/`, data in D1 (`db/schema.ts`), GitHub sign-in through Void auth (`auth.ts`).

Production is **https://wfh-log.kinread.com**: the `wfh-log` Worker with a Cloudflare Custom Domain, both set in `void.config.ts` (hostname in `deploy-target.ts`). PRs deploy previews to `https://pr-<number>.wfh-log.kinread.com`.

## Local development

Create `.env` (gitignored; Void reads only this file, so don't add `.env.example`):

```ini
AUTH_GITHUB_CLIENT_ID=...
AUTH_GITHUB_CLIENT_SECRET=...
AUTH_ALLOWED_GITHUB_USERS=your-github-username
```

Use a GitHub OAuth app with callback `http://localhost:5173/api/auth/callback/github`, then run `npm run dev`. Leave `AUTH_OAUTH_PROXY_SECRET` out of `.env`, or local sign-in is sent through production.

`AUTH_ALLOWED_GITHUB_USERS` takes comma-separated GitHub usernames or numeric user IDs. A numeric ID survives a username change (`gh api user --jq .id`). Everyone else is refused at sign-up and at every sign-in.

## Production setup

1. Create a GitHub OAuth app for production: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
   - Application name: `Work Hours`
   - Homepage URL: `https://wfh-log.kinread.com`
   - Authorization callback URL: `https://wfh-log.kinread.com/api/auth/callback/github`
   - Leave "Enable Device Flow" off, then Register application.

   Keep this app separate from the local one: a GitHub OAuth app has a single callback URL and no wildcards. Previews and the `workers.dev` URL sign in through production instead (see [Previews](#previews)).
2. Set the production secrets. Deploy refuses to run until the first three exist; on a first deploy they go onto a draft Worker. Each command prompts for the value:

   | Secret | Value |
   |---|---|
   | `AUTH_GITHUB_CLIENT_ID` | The app's "Client ID" on its GitHub settings page (starts `Ov23…`). Not secret, but stored the same way. |
   | `AUTH_GITHUB_CLIENT_SECRET` | Click "Generate a new client secret" on the same page and copy it straight away; GitHub shows it only once. |
   | `AUTH_ALLOWED_GITHUB_USERS` | Who may sign in: comma-separated GitHub usernames or numeric IDs, e.g. `skinread` or `583231,octocat`. Get your ID with `gh api user --jq .id`; an ID keeps working if the username changes. |
   | `AUTH_OAUTH_PROXY_SECRET` | A random string shared with previews, e.g. from `openssl rand -base64 32`. Optional for production alone; previews can't sign in without it. |

   ```sh
   npx void secret put AUTH_GITHUB_CLIENT_ID
   npx void secret put AUTH_GITHUB_CLIENT_SECRET
   npx void secret put AUTH_ALLOWED_GITHUB_USERS
   npx void secret put AUTH_OAUTH_PROXY_SECRET
   ```

   To change who has access later, run `npx void secret put AUTH_ALLOWED_GITHUB_USERS` again; it applies from their next sign-in.
   `BETTER_AUTH_SECRET` is created by Void on the first deploy, so the build's "Missing required secrets: BETTER_AUTH_SECRET" warning can be ignored.
3. `npx void deploy` from your machine. `void init` saved Cloudflare as the target (account in `void.lock.json`). The first deploy provisions D1 and applies `db/migrations/`; commit the `void.lock.json` changes it makes before CI deploys.

## Deploying from CI

`.github/workflows/void-deploy.yml` (from `void init --github`) runs `npx void deploy --platform cloudflare` on every push to `main`. It needs a `CLOUDFLARE_API_TOKEN` repository secret (Settings → Secrets and variables → Actions → Repository secrets). Do the first deploy from your machine before pushing to `main`, so CI deploys to the D1 database recorded in `void.lock.json`.

Create the token in Cloudflare under My Profile → API Tokens → Create Custom Token. None of the templates fit: "Edit Cloudflare Workers" lacks D1 and grants more than the app uses. The app is one Worker with static assets and one D1 database, plus per-PR copies, on the `kinread.com` zone:

| Scope | Permission | Access | Used for |
|---|---|---|---|
| Account | Workers Scripts | Edit | Uploading Workers, secrets, versions and readiness checks; deleting previews |
| Account | D1 | Edit | Migrations and restore points; creating and deleting preview databases |
| Account | Account Settings | Read | Account lookups during deploy |
| Zone | Workers Routes | Edit | The production Custom Domain and preview routes |

Set Account Resources to Include → the account in `void.lock.json`, and Zone Resources to Include → Specific zone → `kinread.com`. If a CI deploy fails on permissions, add only the permission the error names.

The Cloudflare dashboard's Workers Builds integration for `wfh-log` must stay disconnected (Worker → Settings → Builds), or it deploys alongside these workflows.

## Previews

`.github/workflows/void-preview.yml` deploys each PR from this repository as its own Worker, `wfh-log-pr-<number>`, at `https://pr-<number>.wfh-log.kinread.com`, with its own D1 database `wfh-log-pr-<number>-db`. Previews never touch production data. Closing the PR deletes both. Fork and Dependabot PRs are skipped because they don't get repository secrets.

`void.config.ts` switches to the preview Worker when `WFH_LOG_PREVIEW` is set (`pr-12`). The workflow removes `void.lock.json` first, since it pins production's Worker and database.

Previews are reached through the proxied `*.wfh-log.kinread.com` DNS record in the `kinread.com` zone. Keep it.

**Sign-in on previews.** GitHub only returns to production's callback URL, so `auth.ts` enables Better Auth's `oAuthProxy` when `AUTH_OAUTH_PROXY_SECRET` is set. A preview sends GitHub to production's callback; production exchanges the code and redirects back to the preview with the GitHub profile, encrypted with that secret. The preview then applies the allowlist and creates the session in its own database. The same applies to `https://wfh-log.kinread.workers.dev`.

Add these repository secrets for the preview workflow, alongside `CLOUDFLARE_API_TOKEN`:

| Secret | Value |
|---|---|
| `AUTH_GITHUB_CLIENT_ID` | Same as production |
| `AUTH_GITHUB_CLIENT_SECRET` | Same as production |
| `AUTH_ALLOWED_GITHUB_USERS` | Who may sign in to previews; can be narrower than production |
| `AUTH_OAUTH_PROXY_SECRET` | Exactly the value set on production |

## Moving the data

1. In the current Bolt/Supabase app: Export CSV with "All time".
2. In the new app: sign in with GitHub, then Import CSV with that file.
3. Check the day count and totals in the Summary match.
4. Once you're happy, pause or delete the Supabase project.

## Schema changes

Edit `db/schema.ts`, run `npx void db generate`, review and commit the SQL. `void deploy` applies it. A rollback restores code only, not the database, so keep migrations additive.

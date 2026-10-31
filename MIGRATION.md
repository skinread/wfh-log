# Supabase → Void migration

The app now runs as a Void app on Cloudflare: React SPA in `src/`, API in `routes/api/entries/`, data in D1 (`db/schema.ts`), GitHub sign-in through Void auth (`auth.ts`).

## Local development

Create `.env` (gitignored):

```ini
AUTH_GITHUB_CLIENT_ID=...
AUTH_GITHUB_CLIENT_SECRET=...
AUTH_ALLOWED_GITHUB_USERS=your-github-username
```

Use a GitHub OAuth app with callback `http://localhost:5173/api/auth/callback/github`, then run `npm run dev`.

`AUTH_ALLOWED_GITHUB_USERS` takes comma-separated GitHub usernames or numeric user IDs. A numeric ID survives a username change (`gh api user --jq .id`). Everyone else is refused at sign-up and at every sign-in.

## First deploy

1. Create a GitHub OAuth app for production with callback `https://<your-domain>/api/auth/callback/github`.
2. Set the production secrets:
   ```sh
   npx void secret put AUTH_GITHUB_CLIENT_ID
   npx void secret put AUTH_GITHUB_CLIENT_SECRET
   npx void secret put AUTH_ALLOWED_GITHUB_USERS
   ```
3. `npx void deploy --platform cloudflare` (logs in to Cloudflare on first run, provisions D1, applies `db/migrations/`).

## Moving the data

1. In the current Bolt/Supabase app: Export CSV with "All time".
2. In the new app: sign in with GitHub, then Import CSV with that file.
3. Check the day count and totals in the Summary match.
4. Once you're happy, pause or delete the Supabase project.

## Schema changes

Edit `db/schema.ts`, run `npx void db generate`, review and commit the SQL. `void deploy` applies it. A rollback restores code only, not the database, so keep migrations additive.

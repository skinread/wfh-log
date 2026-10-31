import { defineEnv, string } from 'void/env';

export default defineEnv({
  AUTH_GITHUB_CLIENT_ID: string(),
  AUTH_GITHUB_CLIENT_SECRET: string(),
  /** Comma-separated GitHub usernames or numeric user IDs allowed to sign in. */
  AUTH_ALLOWED_GITHUB_USERS: string(),
  /**
   * Shared by production and PR previews so previews can sign in through production's
   * GitHub callback. Unset locally, which leaves sign-in on the local OAuth app.
   */
  AUTH_OAUTH_PROXY_SECRET: string().optional(),
});

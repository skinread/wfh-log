import { defineEnv, string } from 'void/env';

export default defineEnv({
  AUTH_GITHUB_CLIENT_ID: string(),
  AUTH_GITHUB_CLIENT_SECRET: string(),
  /** Comma-separated GitHub usernames or numeric user IDs allowed to sign in. */
  AUTH_ALLOWED_GITHUB_USERS: string(),
});

import { oAuthProxy } from 'better-auth/plugins/oauth-proxy';
import { defineAuth } from 'void/auth';
import { PRODUCTION_URL } from './deploy-target';

/** Parses AUTH_ALLOWED_GITHUB_USERS ("octocat, 583231") into lower-cased entries. */
function allowedGithubUsers(value: unknown): Set<string> {
  return new Set(
    String(value ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export default defineAuth(({ defaults, env }) => ({
  ...defaults,
  // A GitHub OAuth app has one callback URL, so other hosts (PR previews, workers.dev)
  // send GitHub back to production, which hands the profile back to them encrypted.
  // The host that started sign-in creates the session in its own database.
  plugins: env.AUTH_OAUTH_PROXY_SECRET
    ? [oAuthProxy({ productionURL: PRODUCTION_URL, secret: String(env.AUTH_OAUTH_PROXY_SECRET) })]
    : [],
  user: {
    ...defaults.user,
    // Runs on sign-up and on every GitHub sign-in, with the fresh GitHub profile,
    // so removing someone from the list also stops their next sign-in.
    validateUserInfo: ({ source }) => {
      const profile = source.oauth?.profile;
      if (source.oauth?.providerId !== 'github' || !profile) {
        return { error: 'not_allowed', errorDescription: 'Sign in with GitHub.' };
      }
      const allowed = allowedGithubUsers(env.AUTH_ALLOWED_GITHUB_USERS);
      const login = String(profile.login ?? '').toLowerCase();
      const id = String(profile.id ?? '');
      if (!allowed.has(login) && !allowed.has(id)) {
        return { error: 'not_allowed', errorDescription: 'This GitHub account is not allowed.' };
      }
    },
  },
}));

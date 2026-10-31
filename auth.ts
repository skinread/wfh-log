import { defineAuth } from 'void/auth';

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

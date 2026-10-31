import { auth } from 'void/client/react';

export function useAuth() {
  const { data, isPending } = auth.useSession();
  return { user: data?.user ?? null, loading: isPending };
}

export async function signInWithGithub(): Promise<void> {
  // Redirects to GitHub. Failures (e.g. an account not on the allowlist) come back as ?error=…
  await auth.signIn.social({ provider: 'github', callbackURL: '/', errorCallbackURL: '/' });
}

export async function signOut(): Promise<void> {
  await auth.signOut();
}

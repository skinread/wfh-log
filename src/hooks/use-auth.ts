import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    let claimed = false;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setState({ session: null, user: null, loading: false });
        return;
      }
      setState({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      });
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        (async () => {
          if (!mounted) return;
          setState({
            session,
            user: session?.user ?? null,
            loading: false,
          });
          if (event === "SIGNED_IN" && !claimed && session) {
            claimed = true;
            await claimOrphanedEntries();
          }
        })();
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signUp(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

async function claimOrphanedEntries(): Promise<void> {
  try {
    const { data } = await supabase.functions.invoke("claim-entries", {
      method: "POST",
    });
    if (data && typeof data.claimed === "number" && data.claimed > 0) {
      void data;
    }
  } catch {
    // Non-fatal: entries can be claimed manually later
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

import { useEffect, useState } from 'react';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthScreenProps {
  onSignIn: () => Promise<void>;
}

/** Reads an OAuth error that Better Auth appended to the URL. */
function readAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('error');
  if (!code) return null;
  if (code === 'not_allowed') return 'This GitHub account is not allowed to use Work Hours.';
  return params.get('error_description') || `Sign-in failed (${code.replace(/_/g, ' ')}).`;
}

// Read once at page load: the screen can remount while the session loads, after the URL is cleaned.
const initialAuthError = readAuthError();

export function AuthScreen({ onSignIn }: AuthScreenProps) {
  const [error, setError] = useState<string | null>(initialAuthError);
  const [submitting, setSubmitting] = useState(false);

  // Drop the error from the URL once shown, so a reload doesn't repeat it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('error')) return;
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    window.history.replaceState(null, '', url);
  }, []);

  async function handleSignIn() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSignIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-blue text-white mb-4">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Hours</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to view your work log</p>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center mb-4" role="alert">
            {error}
          </p>
        )}

        <Button
          type="button"
          onClick={handleSignIn}
          disabled={submitting}
          className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white"
        >
          {/* lucide-react 1.x dropped brand icons */}
          <GitHubLogoIcon className="h-4 w-4" />
          {submitting ? 'Redirecting to GitHub…' : 'Sign in with GitHub'}
        </Button>
      </div>
    </div>
  );
}

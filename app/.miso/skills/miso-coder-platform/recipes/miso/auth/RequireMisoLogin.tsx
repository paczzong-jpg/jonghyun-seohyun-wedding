// Copy to src/components/auth/RequireMisoLogin.tsx.
import { type ReactNode, useEffect, useState } from "react";

import {
  getMisoCurrentUser,
  redirectToMisoLogin,
  type MisoAuthContext,
} from "@/lib/miso-sdk/miso-auth";

interface RequireMisoLoginProps {
  children: ReactNode;
  loading?: ReactNode;
  redirecting?: ReactNode;
  denied?: ReactNode;
  error?: (message: string) => ReactNode;
  returnTo?: string;
  autoRedirect?: boolean;
  onLoaded?: (auth: MisoAuthContext) => void;
}

export function RequireMisoLogin({
  children,
  loading = <p role="status">Checking MISO login...</p>,
  redirecting = <p role="status">Redirecting to MISO login...</p>,
  denied = <p role="status">MISO login required.</p>,
  error,
  returnTo,
  autoRedirect = true,
  onLoaded,
}: RequireMisoLoginProps) {
  const [auth, setAuth] = useState<MisoAuthContext | null>(null);
  const [checked, setChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMisoCurrentUser()
      .then((nextAuth) => {
        if (cancelled) return;
        setAuth(nextAuth);
        setChecked(true);
        setErrorMessage(null);
        onLoaded?.(nextAuth);
        if (!(nextAuth.authenticated && nextAuth.user) && autoRedirect) {
          redirectToMisoLogin(returnTo);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setAuth(null);
        setChecked(true);
        setErrorMessage(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [autoRedirect, onLoaded, returnTo]);

  if (errorMessage) {
    return error ? (
      <>{error(errorMessage)}</>
    ) : (
      <p role="status">Unable to load MISO login state.</p>
    );
  }

  if (!checked) {
    return <>{loading}</>;
  }

  const allowed = Boolean(auth && auth.authenticated && auth.user);
  if (!allowed) {
    return <>{autoRedirect ? redirecting : denied}</>;
  }

  return <>{children}</>;
}

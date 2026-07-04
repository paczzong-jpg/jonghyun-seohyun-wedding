// Copy to src/components/auth/MisoAuthStatus.tsx.
import { useEffect, useState } from "react";

import {
  getMisoCurrentUser,
  type MisoAuthContext,
} from "@/lib/miso-sdk/miso-auth";

export function MisoAuthStatus() {
  const [auth, setAuth] = useState<MisoAuthContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMisoCurrentUser()
      .then((nextAuth) => {
        if (!cancelled) {
          setAuth(nextAuth);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setAuth(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p role="status">Unable to load MISO login state.</p>;
  }

  if (!auth) {
    return <p role="status">Checking MISO login...</p>;
  }

  if (!auth.authenticated || !auth.user) {
    return <p role="status">MISO login required.</p>;
  }

  const displayName =
    auth.user.name || auth.user.email || auth.user.id || "Signed in";

  return (
    <section aria-label="MISO login status">
      <p>{displayName}</p>
      {auth.user.department ? <p>{auth.user.department}</p> : null}
      <dl>
        <div>
          <dt>Account</dt>
          <dd>{auth.user.id || "Unknown"}</dd>
        </div>
        <div>
          <dt>Site</dt>
          <dd>{auth.site.code || "Preview"}</dd>
        </div>
        <div>
          <dt>App</dt>
          <dd>{auth.app.id || "Current app"}</dd>
        </div>
      </dl>
    </section>
  );
}

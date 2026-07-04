// Copy to src/components/auth/GoogleLoginButton.tsx.
// Keep the click handler non-async so the OAuth popup is not blocked on Safari.

import { useEffect, useState } from "react";
import pb from "@/lib/miso-sdk/runtime-client";

const AUTH_COLLECTION = "users";

type AuthRecord = {
  id: string;
  email?: string;
  name?: string;
} | null;

function currentUser(): AuthRecord {
  return pb.authStore.record as AuthRecord;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || "Google sign-in failed");
}

export function GoogleLoginButton() {
  const [user, setUser] = useState<AuthRecord>(currentUser());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return pb.authStore.onChange(() => {
      setUser(currentUser());
    }, true);
  }, []);

  function signInWithGoogle() {
    setBusy(true);
    setMessage("");

    pb.collection(AUTH_COLLECTION)
      .authWithOAuth2({ provider: "google" })
      .then(() => {
        setUser(currentUser());
      })
      .catch((error) => {
        setMessage(errorMessage(error));
      })
      .finally(() => {
        setBusy(false);
      });
  }

  function logout() {
    pb.authStore.clear();
    setUser(null);
  }

  if (user) {
    return (
      <div>
        <span>{user.email || user.name || user.id}</span>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <div>
      <button disabled={busy} onClick={signInWithGoogle} type="button">
        {busy ? "Opening Google" : "Continue with Google"}
      </button>
      {message ? <p role="alert">{message}</p> : null}
    </div>
  );
}

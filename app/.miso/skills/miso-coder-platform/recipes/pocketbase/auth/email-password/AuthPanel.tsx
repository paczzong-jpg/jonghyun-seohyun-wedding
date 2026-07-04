// Copy to src/components/auth/AuthPanel.tsx.
// Uses the MISO runtime PocketBase client; no custom /api login route is needed.

import { FormEvent, useEffect, useState } from "react";
import pb from "@/lib/miso-sdk/runtime-client";

const AUTH_COLLECTION = "users";

type AuthRecord = {
  id: string;
  email?: string;
  name?: string;
  verified?: boolean;
} | null;

function currentUser(): AuthRecord {
  return pb.authStore.record as AuthRecord;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || "Authentication failed");
}

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<AuthRecord>(currentUser());
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      setUser(currentUser());
    }, true);

    if (pb.authStore.isValid) {
      pb.collection(AUTH_COLLECTION).authRefresh()
        .then(() => setUser(currentUser()))
        .catch(() => {
          pb.authStore.clear();
          setUser(null);
        });
    }

    return unsubscribe;
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      if (mode === "signup") {
        await pb.collection(AUTH_COLLECTION).create({
          email: email.trim(),
          password,
          passwordConfirm: password,
        });
      }

      await pb.collection(AUTH_COLLECTION).authWithPassword(email.trim(), password);
      setPassword("");
      setUser(currentUser());
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setStatus("idle");
    }
  }

  function logout() {
    pb.authStore.clear();
    setUser(null);
    setPassword("");
  }

  if (user) {
    return (
      <section aria-label="Account">
        <div>
          <strong>{user.email || user.name || user.id}</strong>
          {user.verified === false ? <span> Email not verified</span> : null}
        </div>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} aria-label={mode === "login" ? "Log in" : "Sign up"}>
      <div>
        <button type="button" onClick={() => setMode("login")} aria-pressed={mode === "login"}>
          Log in
        </button>
        <button type="button" onClick={() => setMode("signup")} aria-pressed={mode === "signup"}>
          Sign up
        </button>
      </div>

      <label>
        Email
        <input
          autoComplete="email"
          inputMode="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label>
        Password
        <input
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {message ? <p role="alert">{message}</p> : null}

      <button disabled={status === "loading"} type="submit">
        {status === "loading" ? "Please wait" : mode === "login" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}

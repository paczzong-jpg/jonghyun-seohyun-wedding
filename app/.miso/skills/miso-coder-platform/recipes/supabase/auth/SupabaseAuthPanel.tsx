import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";

export function SupabaseAuthPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setMessage(error.message);
        return;
      }
      setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signUp() {
    await runAuthAction(async () => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setMessage("Check your email if confirmation is enabled.");
    });
  }

  async function signIn() {
    await runAuthAction(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setMessage(null);
    });
  }

  async function signOut() {
    await runAuthAction(async () => {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setMessage(null);
    });
  }

  async function runAuthAction(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (session?.user) {
    return (
      <section>
        <p>Signed in as {session.user.email ?? session.user.id}</p>
        <button type="button" onClick={() => void signOut()} disabled={busy}>
          Sign out
        </button>
        {message ? <p role="alert">{message}</p> : null}
      </section>
    );
  }

  return (
    <section>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </label>
      <div>
        <button type="button" onClick={() => void signIn()} disabled={busy}>
          Sign in
        </button>
        <button type="button" onClick={() => void signUp()} disabled={busy}>
          Create account
        </button>
      </div>
      {message ? <p role="alert">{message}</p> : null}
    </section>
  );
}

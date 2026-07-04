import { useEffect, useState } from "react";

import { client } from "@/lib/neonClient";

export function NeonAuthPanel() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setMessage(error.message);
        return;
      }
      setSessionEmail(data.session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function signUp() {
    await runAuthAction(async () => {
      const result = await client.auth.signUp.email({
        email: email.trim(),
        password,
        name: name.trim() || email.trim(),
      });
      if (result.error) throw result.error;
      setSessionEmail(result.data.user.email ?? email.trim());
      setMessage("Account created.");
    });
  }

  async function signIn() {
    await runAuthAction(async () => {
      const result = await client.auth.signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) throw result.error;
      setSessionEmail(result.data.user.email ?? email.trim());
      setMessage(null);
    });
  }

  async function signOut() {
    await runAuthAction(async () => {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      setSessionEmail(null);
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

  if (sessionEmail) {
    return (
      <section>
        <p>Signed in as {sessionEmail}</p>
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
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
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

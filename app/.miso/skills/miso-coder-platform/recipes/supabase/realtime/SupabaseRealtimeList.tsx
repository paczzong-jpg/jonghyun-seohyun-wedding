import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

type Todo = {
  id: number;
  task: string;
  is_complete: boolean;
  inserted_at?: string;
};

export function SupabaseRealtimeList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInitialRows() {
      const { data, error } = await supabase
        .from("todos")
        .select("id, task, is_complete, inserted_at")
        .order("id", { ascending: false });

      if (!mounted) return;
      if (error) {
        setError(error.message);
      } else {
        setTodos(data ?? []);
      }
    }

    void loadInitialRows();

    const channel = supabase
      .channel("todos-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        (payload) => {
          setTodos((current) => {
            if (payload.eventType === "INSERT") {
              const next = payload.new as Todo;
              return [next, ...current.filter((todo) => todo.id !== next.id)];
            }
            if (payload.eventType === "UPDATE") {
              const next = payload.new as Todo;
              return current.map((todo) => (todo.id === next.id ? next : todo));
            }
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Pick<Todo, "id">;
              return current.filter((todo) => todo.id !== oldRow.id);
            }
            return current;
          });
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError(err ? String(err) : status);
        }
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {todo.is_complete ? "Done: " : "Todo: "}
            {todo.task}
          </li>
        ))}
      </ul>
    </section>
  );
}

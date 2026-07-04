import { useEffect, useState } from "react";

import { client } from "@/lib/neonClient";

type Todo = {
  id: number;
  task: string;
  is_complete: boolean;
  created_at?: string;
};

export function NeonDataApiTable() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [task, setTask] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadTodos() {
    setLoading(true);
    setError(null);

    const { data, error } = await client
      .from("todos")
      .select("id, task, is_complete, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setError(error.message);
      setTodos([]);
    } else {
      setTodos(data ?? []);
    }

    setLoading(false);
  }

  async function createTodo() {
    const nextTask = task.trim();
    if (!nextTask || saving) return;

    setSaving(true);
    setError(null);

    const { error } = await client
      .from("todos")
      .insert({ task: nextTask, is_complete: false });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setTask("");
    await loadTodos();
    setSaving(false);
  }

  async function toggleTodo(todo: Todo) {
    setError(null);

    const { error } = await client
      .from("todos")
      .update({ is_complete: !todo.is_complete })
      .eq("id", todo.id);

    if (error) {
      setError(error.message);
      return;
    }

    setTodos((current) =>
      current.map((item) =>
        item.id === todo.id ? { ...item, is_complete: !item.is_complete } : item,
      ),
    );
  }

  async function deleteTodo(id: number) {
    setError(null);

    const { error } = await client.from("todos").delete().eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    setTodos((current) => current.filter((todo) => todo.id !== id));
  }

  useEffect(() => {
    void loadTodos();
  }, []);

  return (
    <section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void createTodo();
        }}
      >
        <input
          value={task}
          onChange={(event) => setTask(event.target.value)}
          placeholder="New todo"
        />
        <button type="submit" disabled={saving || !task.trim()}>
          {saving ? "Saving..." : "Add"}
        </button>
      </form>

      {loading ? <p>Loading...</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              <input
                type="checkbox"
                checked={todo.is_complete}
                onChange={() => {
                  void toggleTodo(todo);
                }}
              />
              {todo.task}
            </label>
            <button
              type="button"
              onClick={() => {
                void deleteTodo(todo.id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Neon Data API must expose the `todos` table and Row-Level Security
// policies must allow select/insert/update/delete for the active role.

import { useEffect, useState } from "react";
import pb from "@/lib/miso-sdk/runtime-client";

type Todo = {
  id: string;
  title: string;
  done?: boolean;
};

const COLLECTION = "todos";

export function PocketBaseCrudTable() {
  const [items, setItems] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const records = await pb.collection(COLLECTION).getFullList<Todo>({
        sort: "-created",
        $autoCancel: false,
      });
      setItems(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }

  async function createItem() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    setError(null);
    try {
      const created = await pb.collection(COLLECTION).create<Todo>({ title: nextTitle, done: false });
      setItems((current) => [created, ...current]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create record");
    }
  }

  async function toggleItem(item: Todo) {
    setError(null);
    try {
      const updated = await pb.collection(COLLECTION).update<Todo>(item.id, { done: !item.done });
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update record");
    }
  }

  async function deleteItem(id: string) {
    setError(null);
    try {
      await pb.collection(COLLECTION).delete(id);
      setItems((current) => current.filter((entry) => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  return (
    <section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void createItem();
        }}
      >
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New item" />
        <button type="submit">Add</button>
      </form>

      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input type="checkbox" checked={Boolean(item.done)} onChange={() => void toggleItem(item)} />
              {item.title}
            </label>
            <button type="button" onClick={() => void deleteItem(item.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { useEffect, useState } from "react";
import pb from "@/lib/miso-sdk/runtime-client";

type Todo = {
  id: string;
  title: string;
  done?: boolean;
};

const COLLECTION = "todos";

export function PocketBaseRealtimeList() {
  const [items, setItems] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    async function start() {
      try {
        const initial = await pb.collection(COLLECTION).getFullList<Todo>({
          sort: "-created",
          $autoCancel: false,
        });
        if (!disposed) setItems(initial);

        unsubscribe = await pb.collection(COLLECTION).subscribe<Todo>("*", (event) => {
          setItems((current) => {
            if (event.action === "delete") {
              return current.filter((item) => item.id !== event.record.id);
            }

            const exists = current.some((item) => item.id === event.record.id);
            if (exists) {
              return current.map((item) => (item.id === event.record.id ? event.record : item));
            }
            return [event.record, ...current];
          });
        });
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : "Realtime subscription failed");
      }
    }

    void start();

    return () => {
      disposed = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <section>
      {error && <p>{error}</p>}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.title}
            {item.done ? " done" : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

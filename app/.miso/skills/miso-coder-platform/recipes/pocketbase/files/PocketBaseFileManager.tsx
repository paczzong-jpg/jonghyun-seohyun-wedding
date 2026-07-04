import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import pb from "@/lib/miso-sdk/runtime-client";

type DocumentRecord = {
  id: string;
  collectionId: string;
  collectionName: string;
  title: string;
  attachment: string;
};

const COLLECTION = "documents";

export function PocketBaseFileManager() {
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRecords() {
    const rows = await pb.collection(COLLECTION).getFullList<DocumentRecord>({
      sort: "-created",
      $autoCancel: false,
    });
    setRecords(rows);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !title.trim()) return;

    const form = new FormData();
    form.append("title", title.trim());
    form.append("attachment", file);

    setError(null);
    try {
      const created = await pb.collection(COLLECTION).create<DocumentRecord>(form);
      setRecords((current) => [created, ...current]);
      setTitle("");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  useEffect(() => {
    loadRecords().catch((err) => setError(err instanceof Error ? err.message : "Failed to load files"));
  }, []);

  return (
    <section>
      <form onSubmit={upload}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
        <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button type="submit" disabled={!file || !title.trim()}>
          Upload
        </button>
      </form>

      {error && <p>{error}</p>}

      <ul>
        {records.map((record) => (
          <li key={record.id}>
            <a href={pb.files.getURL(record, record.attachment)} target="_blank" rel="noreferrer">
              {record.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

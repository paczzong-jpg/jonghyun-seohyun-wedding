import { FormEvent, useState } from "react";

import { getGoogleAccessToken, GOOGLE_DRIVE_FILE_SCOPE } from "@/lib/googleAccessToken";
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
};

type DriveListResult = {
  ok?: boolean;
  files?: DriveFile[];
  nextPageToken?: string;
  error?: string;
  details?: unknown;
};

type DriveCreateResult = {
  ok?: boolean;
  file?: DriveFile;
  error?: string;
  details?: unknown;
};

export function GoogleDriveFileManager() {
  const [searchText, setSearchText] = useState("");
  const [fileName, setFileName] = useState("miso-export.txt");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [message, setMessage] = useState("");

  async function listFiles() {
    if (loading) return;
    setLoading(true);
    setMessage("");

    try {
      const accessToken = await getGoogleAccessToken(GOOGLE_DRIVE_FILE_SCOPE);
      const response = await fetch(`${getRuntimeBase()}/api/google/drive/files/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          searchText,
          pageSize: 20,
        }),
      });
      const payload = (await response.json()) as DriveListResult;
      if (!response.ok) {
        setMessage(payload.error || "Drive file list failed");
        return;
      }
      setFiles(payload.files || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Drive file list failed");
    } finally {
      setLoading(false);
    }
  }

  async function createTextFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !fileName.trim() || !content.trim()) return;
    setLoading(true);
    setMessage("");

    try {
      const accessToken = await getGoogleAccessToken(GOOGLE_DRIVE_FILE_SCOPE);
      const response = await fetch(`${getRuntimeBase()}/api/google/drive/files/create-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          name: fileName,
          mimeType: "text/plain",
          content,
        }),
      });
      const payload = (await response.json()) as DriveCreateResult;
      if (!response.ok) {
        setMessage(payload.error || "Drive file creation failed");
        return;
      }
      const createdFile = payload.file;
      setMessage(`Created ${createdFile?.name || "file"}`);
      if (createdFile) {
        setFiles((current) => [createdFile, ...current]);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Drive file creation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div>
        <label>
          Search
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        </label>
        <button type="button" onClick={listFiles} disabled={loading}>
          {loading ? "Loading..." : "List Drive files"}
        </button>
      </div>

      <form onSubmit={createTextFile}>
        <label>
          File name
          <input value={fileName} onChange={(event) => setFileName(event.target.value)} required />
        </label>
        <label>
          Content
          <textarea value={content} onChange={(event) => setContent(event.target.value)} required />
        </label>
        <button type="submit" disabled={loading || !fileName.trim() || !content.trim()}>
          {loading ? "Creating..." : "Create Drive text file"}
        </button>
      </form>

      {message ? <p role="status">{message}</p> : null}

      <ul>
        {files.map((file) => (
          <li key={file.id}>
            {file.webViewLink ? <a href={file.webViewLink}>{file.name}</a> : file.name}
            <span>{file.mimeType}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

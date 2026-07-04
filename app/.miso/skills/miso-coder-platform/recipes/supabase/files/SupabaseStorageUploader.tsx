import { useState } from "react";

import { supabase } from "@/lib/supabaseClient";

const BUCKET = "uploads";

type UploadResult = {
  path: string;
  publicUrl: string;
  signedUrl: string | null;
};

export function SupabaseStorageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function uploadSelectedFile() {
    if (!file || uploading) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const path = buildStoragePath(file.name);
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      setError(error.message);
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10);

    setResult({
      path,
      publicUrl: publicData.publicUrl,
      signedUrl: signedError ? null : signedData.signedUrl,
    });
    setUploading(false);
  }

  return (
    <section>
      <input
        type="file"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          setResult(null);
          setError(null);
        }}
      />
      <button type="button" onClick={() => void uploadSelectedFile()} disabled={!file || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {error ? <p role="alert">{error}</p> : null}
      {result ? (
        <div>
          <p>Stored at {result.path}</p>
          <a href={result.publicUrl}>Public URL</a>
          {result.signedUrl ? <a href={result.signedUrl}>Signed URL</a> : null}
        </div>
      ) : null}
    </section>
  );
}

function buildStoragePath(fileName: string) {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_");
  return `browser-uploads/${crypto.randomUUID()}-${safeName}`;
}

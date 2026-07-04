// Bulk upsert for parsed data.go.kr rows — copy to api/<feature>.pb.js.
//
// The PocketBase batch API (pb.createBatch() / POST /api/batch) is enabled but bounded
// (maxRequests=50, timeout=5s, maxBodySize=1MiB) and can be disabled by platform policy.
// Do data imports with this server-side transaction route instead.
// Goja: keep everything inside the handler; no import/export/async/await.
//
// Frontend sends: POST { rows: [...] }. Chunk large datasets (e.g. 500/call) on the client.

routerAdd("POST", "/api/<feature>/upsert", function (e) {
  try {
    var body = e.requestInfo().body || {};
    var rows = body && body.rows ? body.rows : [];
    if (!rows.length) return e.json(400, { error: "rows is empty" });
    if (rows.length > 2000) return e.json(400, { error: "batch too large (max 2000 per call)" });

    var coll = $app.findCollectionByNameOrId("<collection>"); // <-- your collection
    var counts = { inserted: 0, updated: 0, skipped: 0 };

    $app.runInTransaction(function (tx) {
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i] || {};

        // a stable de-dupe key derived from the source row (so re-sync updates, not duplicates)
        var fp = String(r.fingerprint || "");
        if (fp.length < 6) { counts.skipped++; continue; }

        var rec = null;
        try { rec = tx.findFirstRecordByData("<collection>", "fingerprint", fp); } catch (_) { rec = null; }
        var existed = !!rec;
        if (!rec) { rec = new Record(coll); rec.set("fingerprint", fp); }

        // set your columns here (clamp/coerce as needed):
        rec.set("col_a", String(r.colA == null ? "" : r.colA));
        rec.set("col_b", Number(r.colB) || 0);

        tx.save(rec);
        if (existed) counts.updated++; else counts.inserted++;
      }
    });

    return e.json(200, {
      total: rows.length,
      inserted: counts.inserted,
      updated: counts.updated,
      skipped: counts.skipped,
    });
  } catch (err) {
    return e.json(500, { error: "upsert failed", detail: err && err.message ? err.message : String(err) });
  }
});

// data.go.kr file download — copy to api/<feature>-file.pb.js, then change the route suffix and `dataId`.
//
// PocketBase 0.31 / Goja: every helper, constant, and require() lives INSIDE the handler.
// No import/export/async/await. One GET route does: page fetch -> resolve the current
// fileDownload.do URL by byte search -> download -> return raw bytes (frontend sniffs/parses).

routerAdd("GET", "/api/data-go-kr/<feature>-file", function (e) {
  try {
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var q = e.request.url.query();
    var dataId = q.get("dataId") || "15003467"; // <-- replace with the target file-data id
    var sourcePage = "https://www.data.go.kr/data/" + dataId + "/fileData.do";

    var headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,application/octet-stream,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: sourcePage,
    };

    // 1) resolve the download URL by byte-searching the page (never stringify the whole ~150KB page)
    var downloadUrl = "";
    var page = runtimeProxy.proxyFetch({ url: sourcePage, method: "GET", headers: headers, timeout: 45 });
    if (page.statusCode < 200 || page.statusCode >= 300) {
      return e.json(502, { error: "page request failed", statusCode: page.statusCode, sourcePage: sourcePage });
    }
    var bytes = page.body || [];
    var needle = "fileDownload.do";
    var nb = [];
    for (var n = 0; n < needle.length; n++) nb.push(needle.charCodeAt(n));
    var hit = -1;
    for (var bi = 0; bi + nb.length <= bytes.length; bi++) {
      var ok = true;
      for (var bj = 0; bj < nb.length; bj++) {
        if (bytes[bi + bj] !== nb[bj]) { ok = false; break; }
      }
      if (ok) { hit = bi; break; }
    }
    if (hit >= 0) {
      var s = Math.max(0, hit - 500);
      var en = Math.min(bytes.length, hit + 300);
      var win = "";
      for (var wi = s; wi < en; wi++) win += String.fromCharCode(bytes[wi]);
      var fd = win.indexOf("fileDownload.do");
      var qs = Math.max(win.lastIndexOf('"', fd), win.lastIndexOf("'", fd));
      var quote = qs >= 0 ? win.charAt(qs) : "";
      var qe = quote ? win.indexOf(quote, fd) : -1;
      if (qs >= 0 && qe > qs) {
        var cand = win.substring(qs + 1, qe).split("\\/").join("/").split("&amp;").join("&");
        if (cand.indexOf("fileDownload.do") >= 0) {
          downloadUrl = cand.indexOf("http") === 0 ? cand : "https://www.data.go.kr" + cand;
        }
      }
    }

    // a contentUrl without fileDownload.do is an external link-out, not file data
    if (!downloadUrl || downloadUrl.indexOf("fileDownload.do") < 0) {
      return e.json(404, { error: "no fileDownload.do URL (external link-out, not file data)", sourcePage: sourcePage });
    }

    // 2) download the bytes
    var dl = null;
    var fetchErr = "";
    try {
      dl = runtimeProxy.proxyFetch({ url: downloadUrl, method: "GET", headers: headers, timeout: 90 });
    } catch (err) {
      fetchErr = err && err.message ? err.message : String(err);
    }

    if (dl && dl.statusCode >= 200 && dl.statusCode < 400 && dl.body && dl.body.length > 0) {
      return e.blob(200, "application/octet-stream", dl.body);
    }

    return e.json(502, {
      error: "proxy download failed",
      sourcePage: sourcePage,
      reason: fetchErr || ("status=" + (dl ? dl.statusCode : "none")),
    });
  } catch (err) {
    return e.json(500, { error: "handler threw", detail: err && err.message ? err.message : String(err) });
  }
});

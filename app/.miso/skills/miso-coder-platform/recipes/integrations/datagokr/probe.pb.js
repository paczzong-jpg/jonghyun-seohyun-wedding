// TEMP external-source probe — copy to api/_probe.pb.js, hit it once, then DELETE it.
//
// Use this to explore/verify ANY external source. Do NOT curl/wget external domains from the
// sandbox shell: the sandbox has no CA bundle (TLS fails with "error setting certificate file"),
// and a direct shell call bypasses the SM proxy that the app's proxyFetch actually uses — so its
// results (headers, status, "is it dynamic?") do not represent the real runtime path.
//
// Returns a summary only (status / size / first bytes), never the body.

routerAdd("GET", "/api/_probe", function (e) {
  try {
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var url = e.request.url.query().get("url");
    if (!url) return e.json(400, { error: "pass ?url=<encoded external url>" });
    var res = runtimeProxy.proxyFetch({
      url: url,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/octet-stream,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://www.data.go.kr/",
      },
      timeout: 60,
    });
    var body = res.body || [];
    var magic = "";
    for (var i = 0; i < Math.min(4, body.length); i++) magic += (body[i] & 0xff).toString(16) + " ";
    return e.json(200, { statusCode: res.statusCode, size: body.length, magic: magic });
  } catch (err) {
    return e.json(500, { detail: err && err.message ? err.message : String(err) });
  }
});

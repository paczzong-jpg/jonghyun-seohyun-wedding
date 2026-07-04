// Copy to api/tableau-rest.pb.js.
// Lists Tableau workbooks using PAT sign-in through the MISO runtime proxy.

routerAdd("POST", "/api/tableau/workbooks", function (e) {
  var bytesToUtf8 = function (bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; ) {
      var c = bytes[i++] & 255;
      if (c < 128) {
        out += String.fromCharCode(c);
      } else if (c >= 192 && c < 224 && i < bytes.length) {
        var c2 = bytes[i++] & 255;
        out += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else if (c >= 224 && c < 240 && i + 1 < bytes.length) {
        var c3 = bytes[i++] & 255;
        var c4 = bytes[i++] & 255;
        out += String.fromCharCode(((c & 15) << 12) | ((c3 & 63) << 6) | (c4 & 63));
      } else if (c >= 240 && c < 248 && i + 2 < bytes.length) {
        var c5 = bytes[i++] & 255;
        var c6 = bytes[i++] & 255;
        var c7 = bytes[i++] & 255;
        var point = ((c & 7) << 18) | ((c5 & 63) << 12) | ((c6 & 63) << 6) | (c7 & 63);
        point -= 65536;
        out += String.fromCharCode(55296 + (point >> 10), 56320 + (point & 1023));
      } else {
        out += String.fromCharCode(65533);
      }
    }
    return out;
  };

  var bodyToText = function (res) {
    if (typeof res.text === "string") return res.text;
    if (typeof res.body === "string") return res.body;
    return bytesToUtf8(res.body || []);
  };

  var parseJsonOrText = function (text) {
    try {
      return JSON.parse(text);
    } catch (err) {
      return String(text || "").substring(0, 1000);
    }
  };

  var clampString = function (value, max) {
    var text = String(value == null ? "" : value).trim();
    if (max && text.length > max) return text.substring(0, max);
    return text;
  };

  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");

    var baseUrl = clampString(runtimeEnv.TABLEAU_SERVER_URL, 1000).replace(/\/+$/, "");
    var apiVersion = clampString(runtimeEnv.TABLEAU_API_VERSION || "3.29", 20);
    var siteContentUrl = clampString(runtimeEnv.TABLEAU_SITE_CONTENT_URL, 300);
    var patName = clampString(runtimeEnv.TABLEAU_PAT_NAME, 300);
    var patSecret = runtimeEnv.TABLEAU_PAT_SECRET || "";

    if (!baseUrl || !siteContentUrl || !patName || !patSecret) {
      return e.json(500, { error: "Missing Tableau env values" });
    }

    var signin = runtimeProxy.proxyFetch({
      url: baseUrl + "/api/" + encodeURIComponent(apiVersion) + "/auth/signin",
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        credentials: {
          personalAccessTokenName: patName,
          personalAccessTokenSecret: patSecret,
          site: { contentUrl: siteContentUrl },
        },
      }),
      timeout: 30,
    });

    var signinText = bodyToText(signin);
    var signinData = parseJsonOrText(signinText);
    if (signin.statusCode < 200 || signin.statusCode >= 300) {
      return e.json(signin.statusCode, { error: "Tableau sign-in failed", details: signinData });
    }

    var token = signinData && signinData.credentials ? signinData.credentials.token : "";
    var siteId = signinData && signinData.credentials && signinData.credentials.site ? signinData.credentials.site.id : "";
    if (!token || !siteId) return e.json(502, { error: "Tableau sign-in response was missing token or site id" });

    var workbooks = runtimeProxy.proxyFetch({
      url:
        baseUrl +
        "/api/" +
        encodeURIComponent(apiVersion) +
        "/sites/" +
        encodeURIComponent(siteId) +
        "/workbooks?pageSize=100",
      method: "GET",
      headers: { Accept: "application/json", "X-Tableau-Auth": token },
      timeout: 30,
    });

    var text = bodyToText(workbooks);
    var data = parseJsonOrText(text);
    if (workbooks.statusCode < 200 || workbooks.statusCode >= 300) {
      return e.json(workbooks.statusCode, { error: "Tableau workbooks request failed", details: data });
    }

    return e.json(200, { ok: true, data: data });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

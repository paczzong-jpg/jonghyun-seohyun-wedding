// Copy to api/dooray-wiki-pages.pb.js.
// Dooray Wiki page and comment routes through the MISO runtime proxy.

var doorayWikiBytesToUtf8 = function (bytes) {
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

var doorayWikiBodyToText = function (res) {
  if (typeof res.text === "string") return res.text;
  if (typeof res.body === "string") return res.body;
  return doorayWikiBytesToUtf8(res.body || []);
};

var doorayWikiJsonOrText = function (text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return String(text || "").substring(0, 1000);
  }
};

var doorayWikiReadJsonBody = function (event) {
  var info = event.requestInfo();
  var parsed = info.body || {};
  if (typeof parsed === "string") {
    try {
      return JSON.parse(parsed);
    } catch (err) {
      throw new Error("Invalid JSON body");
    }
  }
  return parsed;
};

var doorayWikiClamp = function (value, max) {
  var text = String(value == null ? "" : value).trim();
  if (max && text.length > max) return text.substring(0, max);
  return text;
};

var doorayWikiAppendQuery = function (path, params) {
  var parts = [];
  for (var key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      var value = params[key];
      if (value !== "" && value != null) {
        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
      }
    }
  }
  if (!parts.length) return path;
  return path + "?" + parts.join("&");
};

var doorayWikiBaseUrl = function (runtimeEnv) {
  var baseUrl = doorayWikiClamp(runtimeEnv.DOORAY_BASE_URL || "https://api.dooray.com", 300);
  while (baseUrl.length > 1 && baseUrl.charAt(baseUrl.length - 1) === "/") {
    baseUrl = baseUrl.substring(0, baseUrl.length - 1);
  }
  return baseUrl;
};

var doorayWikiRequest = function (event, method, path, query, payload) {
  var runtimeEnv = require(__hooks + "/_runtime_env.js");
  var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
  var apiToken = runtimeEnv.DOORAY_API_TOKEN || "";
  if (!apiToken) return event.json(500, { error: "Missing DOORAY_API_TOKEN" });

  var options = {
    url: doorayWikiBaseUrl(runtimeEnv) + "/" + doorayWikiAppendQuery(path, query || {}),
    method: method,
    headers: {
      Accept: "application/json",
      Authorization: "dooray-api " + apiToken,
      "Content-Type": "application/json",
    },
    timeout: 30,
  };
  if (payload) options.body = JSON.stringify(payload);

  var upstream = runtimeProxy.proxyFetch(options);
  var text = doorayWikiBodyToText(upstream);
  var data = doorayWikiJsonOrText(text);
  if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
    return event.json(upstream.statusCode || 502, {
      error: "Dooray request failed",
      details: data,
    });
  }
  if (data && data.header && data.header.isSuccessful === false) {
    return event.json(502, {
      error: "Dooray request failed",
      details: data,
    });
  }
  return event.json(200, { ok: true, data: data, result: data && data.result ? data.result : null });
};

routerAdd("GET", "/api/dooray/wiki/wikis", function (e) {
  var q = e.request.url.query();
  return doorayWikiRequest(e, "GET", "wiki/v1/wikis", {
    page: Math.max(0, Number(q.get("page") || 0)),
    size: Math.min(100, Math.max(1, Number(q.get("size") || 50))),
  });
});

routerAdd("GET", "/api/dooray/wiki/pages", function (e) {
  var q = e.request.url.query();
  var wikiId = doorayWikiClamp(q.get("wikiId"), 100);
  var pageId = doorayWikiClamp(q.get("pageId"), 100);
  if (!wikiId) return e.json(400, { error: "wikiId is required" });
  if (pageId) {
    return doorayWikiRequest(e, "GET", "wiki/v1/wikis/" + encodeURIComponent(wikiId) + "/pages/" + encodeURIComponent(pageId));
  }
  return doorayWikiRequest(e, "GET", "wiki/v1/wikis/" + encodeURIComponent(wikiId) + "/pages", {
    parentPageId: doorayWikiClamp(q.get("parentPageId"), 100),
  });
});

routerAdd("POST", "/api/dooray/wiki/pages", function (e) {
  try {
    var body = doorayWikiReadJsonBody(e);
    var wikiId = doorayWikiClamp(body.wikiId || body.wiki, 100);
    var parentPageId = doorayWikiClamp(body.parentPageId, 100);
    var subject = doorayWikiClamp(body.subject || body.title, 300);
    var content = doorayWikiClamp(body.content || body.body, 30000);
    if (!wikiId) return e.json(400, { error: "wikiId is required" });
    if (!parentPageId) return e.json(400, { error: "parentPageId is required" });
    if (!subject) return e.json(400, { error: "subject is required" });

    return doorayWikiRequest(
      e,
      "POST",
      "wiki/v1/wikis/" + encodeURIComponent(wikiId) + "/pages",
      {},
      {
        subject: subject,
        body: { mimeType: "text/x-markdown", content: content },
        parentPageId: parentPageId,
      },
    );
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

routerAdd("POST", "/api/dooray/wiki/comments", function (e) {
  try {
    var body = doorayWikiReadJsonBody(e);
    var wikiId = doorayWikiClamp(body.wikiId || body.wiki, 100);
    var pageId = doorayWikiClamp(body.pageId, 100);
    var content = doorayWikiClamp(body.content || body.body, 30000);
    if (!wikiId) return e.json(400, { error: "wikiId is required" });
    if (!pageId) return e.json(400, { error: "pageId is required" });
    if (!content) return e.json(400, { error: "content is required" });

    return doorayWikiRequest(
      e,
      "POST",
      "wiki/v1/wikis/" + encodeURIComponent(wikiId) + "/pages/" + encodeURIComponent(pageId) + "/comments",
      {},
      { body: { content: content } },
    );
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

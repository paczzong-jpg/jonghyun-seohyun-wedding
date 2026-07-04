// Copy to api/notion-pages.pb.js.
// Creates Notion pages through the MISO runtime proxy.

routerAdd("POST", "/api/notion/pages", function (e) {
  var readJsonBody = function (event) {
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

  var clampString = function (value, max) {
    var text = String(value == null ? "" : value).trim();
    if (max && text.length > max) return text.substring(0, max);
    return text;
  };

  var paragraphBlock = function (text) {
    return {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: text } }],
      },
    };
  };

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

  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var body = readJsonBody(e);

    var apiKey = runtimeEnv.NOTION_API_KEY || "";
    var notionVersion = runtimeEnv.NOTION_VERSION || "2026-03-11";
    var parentPageId = clampString(body.parentPageId || runtimeEnv.NOTION_PARENT_PAGE_ID, 100);
    var dataSourceId = clampString(body.dataSourceId || runtimeEnv.NOTION_DATA_SOURCE_ID, 100);
    var title = clampString(body.title, 200);
    var content = clampString(body.content, 2000);

    if (!apiKey) {
      return e.json(500, { error: "Missing NOTION_API_KEY" });
    }
    if (!title && !body.properties) {
      return e.json(400, { error: "title or properties is required" });
    }
    if (!parentPageId && !dataSourceId) {
      return e.json(400, { error: "parentPageId or dataSourceId is required" });
    }

    var payload = {};
    if (dataSourceId) {
      payload.parent = { type: "data_source_id", data_source_id: dataSourceId };
      payload.properties =
        body.properties ||
        {
          Name: { title: [{ type: "text", text: { content: title } }] },
        };
    } else {
      payload.parent = { type: "page_id", page_id: parentPageId };
      payload.properties = {
        title: { title: [{ type: "text", text: { content: title } }] },
      };
    }
    if (content) {
      payload.children = [paragraphBlock(content)];
    }

    var upstream = runtimeProxy.proxyFetch({
      url: "https://api.notion.com/v1/pages",
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Notion-Version": notionVersion,
      },
      body: JSON.stringify(payload),
      timeout: 30,
    });

    var text = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Notion request failed",
        details: parseJsonOrText(text),
      });
    }

    var data = parseJsonOrText(text);
    return e.json(200, {
      ok: true,
      id: data && data.id ? data.id : "",
      url: data && data.url ? data.url : "",
      data: data,
    });
  } catch (err) {
    return e.json(500, {
      error: err && err.message ? err.message : String(err),
    });
  }
});

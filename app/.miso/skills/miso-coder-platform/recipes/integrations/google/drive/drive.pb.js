// Copy to api/google-drive.pb.js.
// Lists and creates small Google Drive files with a user-granted short-lived access token.
// External network access goes through the MISO runtime proxy.

routerAdd("POST", "/api/google/drive/files/list", function (e) {
  var readJsonBody = function (event) {
    var info = event.requestInfo();
    var body = info.body || {};
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (err) {
        throw new Error("Invalid JSON body");
      }
    }
    return body;
  };

  var clampString = function (value, max) {
    var text = String(value == null ? "" : value);
    if (max && text.length > max) return text.substring(0, max);
    return text;
  };

  var clampNumber = function (value, min, max, fallback) {
    var num = Number(value);
    if (!isFinite(num)) return fallback;
    num = Math.floor(num);
    if (num < min) return min;
    if (num > max) return max;
    return num;
  };

  var escapeDriveQueryText = function (value) {
    return clampString(value, 500).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var body = readJsonBody(e);

    var accessToken = clampString(body.accessToken, 4096);
    if (!accessToken) {
      return e.json(400, { error: "accessToken is required" });
    }

    var queryParts = [];
    if (body.includeTrashed !== true) {
      queryParts.push("trashed = false");
    }

    var searchText = escapeDriveQueryText(body.searchText);
    if (searchText) {
      queryParts.push("(name contains '" + searchText + "' or fullText contains '" + searchText + "')");
    }

    var mimeType = escapeDriveQueryText(body.mimeType);
    if (mimeType) {
      queryParts.push("mimeType = '" + mimeType + "'");
    }

    var parentId = escapeDriveQueryText(body.parentId);
    if (parentId) {
      queryParts.push("'" + parentId + "' in parents");
    }

    var pageSize = clampNumber(body.pageSize, 1, 100, 20);
    var pageToken = clampString(body.pageToken, 2000);
    var fields =
      "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,iconLink,modifiedTime,size)";

    var url =
      "https://www.googleapis.com/drive/v3/files" +
      "?pageSize=" +
      encodeURIComponent(String(pageSize)) +
      "&fields=" +
      encodeURIComponent(fields) +
      "&orderBy=" +
      encodeURIComponent("modifiedTime desc") +
      "&supportsAllDrives=true&includeItemsFromAllDrives=false";

    if (queryParts.length) {
      url += "&q=" + encodeURIComponent(queryParts.join(" and "));
    }
    if (pageToken) {
      url += "&pageToken=" + encodeURIComponent(pageToken);
    }

    var upstream = runtimeProxy.proxyFetch({
      url: url,
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + accessToken,
      },
      timeout: 30,
    });

    var text = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Google Drive list request failed",
        details: parseJsonOrText(text),
      });
    }

    var data = parseJsonOrText(text);
    return e.json(200, {
      ok: true,
      files: data && data.files ? data.files : [],
      nextPageToken: data && data.nextPageToken ? data.nextPageToken : "",
    });
  } catch (err) {
    return e.json(500, {
      error: err && err.message ? err.message : String(err),
    });
  }
});

routerAdd("POST", "/api/google/drive/files/create-text", function (e) {
  var readJsonBody = function (event) {
    var info = event.requestInfo();
    var body = info.body || {};
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (err) {
        throw new Error("Invalid JSON body");
      }
    }
    return body;
  };

  var clampString = function (value, max) {
    var text = String(value == null ? "" : value);
    if (max && text.length > max) return text.substring(0, max);
    return text;
  };

  var cleanFileName = function (value) {
    return clampString(value, 255).replace(/[\r\n/\\]+/g, " ").trim();
  };

  var cleanMimeType = function (value) {
    var text = clampString(value || "text/plain", 100).trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/.test(text)) {
      return "text/plain";
    }
    return text;
  };

  var normalizeParents = function (values) {
    var out = [];
    if (!Array.isArray(values)) return out;
    for (var i = 0; i < values.length && i < 5; i++) {
      var parent = clampString(values[i], 200).trim();
      if (parent) out.push(parent);
    }
    return out;
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
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var body = readJsonBody(e);

    var accessToken = clampString(body.accessToken, 4096);
    var name = cleanFileName(body.name);
    var mimeType = cleanMimeType(body.mimeType);
    var content = clampString(body.content, 1000000);
    var parents = normalizeParents(body.parents);

    if (!accessToken || !name || !content) {
      return e.json(400, { error: "accessToken, name, and content are required" });
    }

    var metadata = {
      name: name,
      mimeType: mimeType,
    };
    if (parents.length) {
      metadata.parents = parents;
    }

    var boundary = "miso_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 1000000));
    var multipartBody =
      "--" +
      boundary +
      "\r\n" +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      "\r\n" +
      "--" +
      boundary +
      "\r\n" +
      "Content-Type: " +
      mimeType +
      "; charset=UTF-8\r\n\r\n" +
      content +
      "\r\n" +
      "--" +
      boundary +
      "--";

    var upstream = runtimeProxy.proxyFetch({
      url:
        "https://www.googleapis.com/upload/drive/v3/files" +
        "?uploadType=multipart&fields=" +
        encodeURIComponent("id,name,mimeType,webViewLink,webContentLink,iconLink,modifiedTime,size"),
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + accessToken,
        "Content-Type": "multipart/related; boundary=" + boundary,
      },
      body: multipartBody,
      timeout: 60,
    });

    var text = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Google Drive create request failed",
        details: parseJsonOrText(text),
      });
    }

    return e.json(200, {
      ok: true,
      file: parseJsonOrText(text),
    });
  } catch (err) {
    return e.json(500, {
      error: err && err.message ? err.message : String(err),
    });
  }
});

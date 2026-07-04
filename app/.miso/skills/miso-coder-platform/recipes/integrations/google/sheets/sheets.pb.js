// Copy to api/google-sheets.pb.js.
// Reads, appends, and updates Google Sheets values with a user-granted short-lived access token.
// External network access goes through the MISO runtime proxy.

routerAdd("POST", "/api/google/sheets/values/get", function (e) {
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
    var spreadsheetId = clampString(body.spreadsheetId, 300);
    var range = clampString(body.range, 500);

    if (!accessToken || !spreadsheetId || !range) {
      return e.json(400, { error: "accessToken, spreadsheetId, and range are required" });
    }

    var url =
      "https://sheets.googleapis.com/v4/spreadsheets/" +
      encodeURIComponent(spreadsheetId) +
      "/values/" +
      encodeURIComponent(range) +
      "?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE";

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
        error: "Google Sheets get request failed",
        details: parseJsonOrText(text),
      });
    }

    var data = parseJsonOrText(text);
    return e.json(200, {
      ok: true,
      spreadsheetId: data && data.spreadsheetId ? data.spreadsheetId : spreadsheetId,
      range: data && data.range ? data.range : range,
      values: data && data.values ? data.values : [],
    });
  } catch (err) {
    return e.json(500, {
      error: err && err.message ? err.message : String(err),
    });
  }
});

routerAdd("POST", "/api/google/sheets/values/append", function (e) {
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

  var normalizeValues = function (values) {
    var source = Array.isArray(values) ? values : [];
    if (source.length > 0 && !Array.isArray(source[0])) {
      source = [source];
    }

    var rows = [];
    for (var r = 0; r < source.length && r < 500; r++) {
      var rowSource = Array.isArray(source[r]) ? source[r] : [];
      var row = [];
      for (var c = 0; c < rowSource.length && c < 50; c++) {
        row.push(clampString(rowSource[c], 5000));
      }
      if (row.length) rows.push(row);
    }
    return rows;
  };

  var valueInputOption = function (value) {
    return value === "RAW" ? "RAW" : "USER_ENTERED";
  };

  var insertDataOption = function (value) {
    return value === "OVERWRITE" ? "OVERWRITE" : "INSERT_ROWS";
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
    var spreadsheetId = clampString(body.spreadsheetId, 300);
    var range = clampString(body.range, 500);
    var values = normalizeValues(body.values);

    if (!accessToken || !spreadsheetId || !range || values.length === 0) {
      return e.json(400, { error: "accessToken, spreadsheetId, range, and values are required" });
    }

    var url =
      "https://sheets.googleapis.com/v4/spreadsheets/" +
      encodeURIComponent(spreadsheetId) +
      "/values/" +
      encodeURIComponent(range) +
      ":append?valueInputOption=" +
      encodeURIComponent(valueInputOption(body.valueInputOption)) +
      "&insertDataOption=" +
      encodeURIComponent(insertDataOption(body.insertDataOption));

    var upstream = runtimeProxy.proxyFetch({
      url: url,
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: values,
      }),
      timeout: 30,
    });

    var text = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Google Sheets append request failed",
        details: parseJsonOrText(text),
      });
    }

    var data = parseJsonOrText(text);
    return e.json(200, {
      ok: true,
      spreadsheetId: data && data.spreadsheetId ? data.spreadsheetId : spreadsheetId,
      tableRange: data && data.tableRange ? data.tableRange : "",
      updates: data && data.updates ? data.updates : {},
    });
  } catch (err) {
    return e.json(500, {
      error: err && err.message ? err.message : String(err),
    });
  }
});

routerAdd("POST", "/api/google/sheets/values/update", function (e) {
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

  var normalizeValues = function (values) {
    var source = Array.isArray(values) ? values : [];
    if (source.length > 0 && !Array.isArray(source[0])) {
      source = [source];
    }

    var rows = [];
    for (var r = 0; r < source.length && r < 500; r++) {
      var rowSource = Array.isArray(source[r]) ? source[r] : [];
      var row = [];
      for (var c = 0; c < rowSource.length && c < 50; c++) {
        row.push(clampString(rowSource[c], 5000));
      }
      if (row.length) rows.push(row);
    }
    return rows;
  };

  var valueInputOption = function (value) {
    return value === "RAW" ? "RAW" : "USER_ENTERED";
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
    var spreadsheetId = clampString(body.spreadsheetId, 300);
    var range = clampString(body.range, 500);
    var values = normalizeValues(body.values);

    if (!accessToken || !spreadsheetId || !range || values.length === 0) {
      return e.json(400, { error: "accessToken, spreadsheetId, range, and values are required" });
    }

    var url =
      "https://sheets.googleapis.com/v4/spreadsheets/" +
      encodeURIComponent(spreadsheetId) +
      "/values/" +
      encodeURIComponent(range) +
      "?valueInputOption=" +
      encodeURIComponent(valueInputOption(body.valueInputOption));

    var upstream = runtimeProxy.proxyFetch({
      url: url,
      method: "PUT",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: values,
      }),
      timeout: 30,
    });

    var text = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Google Sheets update request failed",
        details: parseJsonOrText(text),
      });
    }

    var data = parseJsonOrText(text);
    return e.json(200, {
      ok: true,
      spreadsheetId: data && data.spreadsheetId ? data.spreadsheetId : spreadsheetId,
      updatedRange: data && data.updatedRange ? data.updatedRange : "",
      updatedRows: data && data.updatedRows ? data.updatedRows : 0,
      updatedColumns: data && data.updatedColumns ? data.updatedColumns : 0,
      updatedCells: data && data.updatedCells ? data.updatedCells : 0,
    });
  } catch (err) {
    return e.json(500, {
      error: err && err.message ? err.message : String(err),
    });
  }
});

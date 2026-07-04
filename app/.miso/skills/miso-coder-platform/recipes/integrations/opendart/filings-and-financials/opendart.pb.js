// Copy to api/opendart.pb.js.
// OpenDART disclosure and financial statement routes through the MISO runtime proxy.

routerAdd("GET", "/api/opendart/filings", function (e) {
  var clampString = function (value, max) {
    var text = String(value == null ? "" : value).trim();
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

  var addParam = function (parts, key, value) {
    var text = clampString(value, 200);
    if (text) parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(text));
  };

  var digits = function (value, len) {
    var text = clampString(value, len);
    if (!text) return "";
    var re = new RegExp("^\\d{" + len + "}$");
    if (!re.test(text)) throw new Error(value + " must be " + len + " digits");
    return text;
  };

  var jsonResult = function (event, upstream) {
    var statusCode = upstream.statusCode || 502;
    var text = bodyToText(upstream);
    var data = parseJsonOrText(text);
    if (statusCode < 200 || statusCode >= 300) {
      return event.json(statusCode, { ok: false, error: "OpenDART request failed", details: data });
    }
    if (!data || typeof data !== "object") {
      return event.json(502, { ok: false, error: "OpenDART returned non-JSON data", details: data });
    }
    return event.json(200, {
      ok: data.status === "000",
      status: data.status || "",
      message: data.message || "",
      data: data,
    });
  };

  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var apiKey = runtimeEnv.OPENDART_API_KEY || "";
    if (!apiKey) return e.json(500, { ok: false, error: "Missing OPENDART_API_KEY" });

    var q = e.request.url.query();
    var params = ["crtfc_key=" + apiKey];
    addParam(params, "corp_code", digits(q.get("corpCode"), 8));
    addParam(params, "bgn_de", digits(q.get("bgnDe"), 8));
    addParam(params, "end_de", digits(q.get("endDe"), 8));

    var lastReprtAt = clampString(q.get("lastReprtAt"), 1).toUpperCase();
    if (lastReprtAt && lastReprtAt !== "Y" && lastReprtAt !== "N") {
      return e.json(400, { ok: false, error: "lastReprtAt must be Y or N" });
    }
    addParam(params, "last_reprt_at", lastReprtAt);

    var pblntfTy = clampString(q.get("pblntfTy"), 1).toUpperCase();
    if (pblntfTy && "ABCDEFGHIJ".indexOf(pblntfTy) < 0) {
      return e.json(400, { ok: false, error: "pblntfTy is invalid" });
    }
    addParam(params, "pblntf_ty", pblntfTy);
    addParam(params, "pblntf_detail_ty", clampString(q.get("pblntfDetailTy"), 4).toUpperCase());

    var corpCls = clampString(q.get("corpCls"), 1).toUpperCase();
    if (corpCls && "YKNE".indexOf(corpCls) < 0) {
      return e.json(400, { ok: false, error: "corpCls must be Y, K, N, or E" });
    }
    addParam(params, "corp_cls", corpCls);

    var sort = clampString(q.get("sort") || "date", 4);
    if (["date", "crp", "rpt"].indexOf(sort) < 0) sort = "date";
    addParam(params, "sort", sort);

    var sortMth = clampString(q.get("sortMth") || "desc", 4).toLowerCase();
    if (sortMth !== "asc" && sortMth !== "desc") sortMth = "desc";
    addParam(params, "sort_mth", sortMth);

    var pageNo = Number(q.get("pageNo") || 1);
    if (!isFinite(pageNo)) pageNo = 1;
    pageNo = Math.max(1, pageNo);
    var pageCount = Number(q.get("pageCount") || 10);
    if (!isFinite(pageCount)) pageCount = 10;
    pageCount = Math.min(100, Math.max(1, pageCount));
    addParam(params, "page_no", Math.floor(pageNo));
    addParam(params, "page_count", Math.floor(pageCount));

    var upstream = runtimeProxy.proxyFetch({
      url: "https://opendart.fss.or.kr/api/list.json?" + params.join("&"),
      method: "GET",
      headers: { Accept: "application/json" },
      timeout: 30,
    });
    return jsonResult(e, upstream);
  } catch (err) {
    return e.json(400, { ok: false, error: err && err.message ? err.message : String(err) });
  }
});

routerAdd("GET", "/api/opendart/company", function (e) {
  var clampString = function (value, max) {
    var text = String(value == null ? "" : value).trim();
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

  var jsonResult = function (event, upstream) {
    var statusCode = upstream.statusCode || 502;
    var text = bodyToText(upstream);
    var data = parseJsonOrText(text);
    if (statusCode < 200 || statusCode >= 300) {
      return event.json(statusCode, { ok: false, error: "OpenDART request failed", details: data });
    }
    if (!data || typeof data !== "object") {
      return event.json(502, { ok: false, error: "OpenDART returned non-JSON data", details: data });
    }
    return event.json(200, {
      ok: data.status === "000",
      status: data.status || "",
      message: data.message || "",
      data: data,
    });
  };

  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var apiKey = runtimeEnv.OPENDART_API_KEY || "";
    if (!apiKey) return e.json(500, { ok: false, error: "Missing OPENDART_API_KEY" });

    var corpCode = clampString(e.request.url.query().get("corpCode"), 8);
    if (!/^\d{8}$/.test(corpCode)) return e.json(400, { ok: false, error: "corpCode must be 8 digits" });

    var upstream = runtimeProxy.proxyFetch({
      url: "https://opendart.fss.or.kr/api/company.json?crtfc_key=" + apiKey + "&corp_code=" + encodeURIComponent(corpCode),
      method: "GET",
      headers: { Accept: "application/json" },
      timeout: 30,
    });
    return jsonResult(e, upstream);
  } catch (err) {
    return e.json(500, { ok: false, error: err && err.message ? err.message : String(err) });
  }
});

routerAdd("GET", "/api/opendart/single-account", function (e) {
  var clampString = function (value, max) {
    var text = String(value == null ? "" : value).trim();
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

  var jsonResult = function (event, upstream) {
    var statusCode = upstream.statusCode || 502;
    var text = bodyToText(upstream);
    var data = parseJsonOrText(text);
    if (statusCode < 200 || statusCode >= 300) {
      return event.json(statusCode, { ok: false, error: "OpenDART request failed", details: data });
    }
    if (!data || typeof data !== "object") {
      return event.json(502, { ok: false, error: "OpenDART returned non-JSON data", details: data });
    }
    return event.json(200, {
      ok: data.status === "000",
      status: data.status || "",
      message: data.message || "",
      data: data,
    });
  };

  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var apiKey = runtimeEnv.OPENDART_API_KEY || "";
    if (!apiKey) return e.json(500, { ok: false, error: "Missing OPENDART_API_KEY" });

    var q = e.request.url.query();
    var corpCode = clampString(q.get("corpCode"), 8);
    var bsnsYear = clampString(q.get("bsnsYear"), 4);
    var reprtCode = clampString(q.get("reprtCode"), 5);
    if (!/^\d{8}$/.test(corpCode)) return e.json(400, { ok: false, error: "corpCode must be 8 digits" });
    if (!/^\d{4}$/.test(bsnsYear)) return e.json(400, { ok: false, error: "bsnsYear must be 4 digits" });
    if (["11013", "11012", "11014", "11011"].indexOf(reprtCode) < 0) {
      return e.json(400, { ok: false, error: "reprtCode must be 11013, 11012, 11014, or 11011" });
    }

    var upstream = runtimeProxy.proxyFetch({
      url:
        "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=" +
        apiKey +
        "&corp_code=" +
        encodeURIComponent(corpCode) +
        "&bsns_year=" +
        encodeURIComponent(bsnsYear) +
        "&reprt_code=" +
        encodeURIComponent(reprtCode),
      method: "GET",
      headers: { Accept: "application/json" },
      timeout: 30,
    });
    return jsonResult(e, upstream);
  } catch (err) {
    return e.json(500, { ok: false, error: err && err.message ? err.message : String(err) });
  }
});

routerAdd("GET", "/api/opendart/full-financials", function (e) {
  var clampString = function (value, max) {
    var text = String(value == null ? "" : value).trim();
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

  var jsonResult = function (event, upstream) {
    var statusCode = upstream.statusCode || 502;
    var text = bodyToText(upstream);
    var data = parseJsonOrText(text);
    if (statusCode < 200 || statusCode >= 300) {
      return event.json(statusCode, { ok: false, error: "OpenDART request failed", details: data });
    }
    if (!data || typeof data !== "object") {
      return event.json(502, { ok: false, error: "OpenDART returned non-JSON data", details: data });
    }
    return event.json(200, {
      ok: data.status === "000",
      status: data.status || "",
      message: data.message || "",
      data: data,
    });
  };

  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var apiKey = runtimeEnv.OPENDART_API_KEY || "";
    if (!apiKey) return e.json(500, { ok: false, error: "Missing OPENDART_API_KEY" });

    var q = e.request.url.query();
    var corpCode = clampString(q.get("corpCode"), 8);
    var bsnsYear = clampString(q.get("bsnsYear"), 4);
    var reprtCode = clampString(q.get("reprtCode"), 5);
    var fsDiv = clampString(q.get("fsDiv") || "CFS", 3).toUpperCase();
    if (!/^\d{8}$/.test(corpCode)) return e.json(400, { ok: false, error: "corpCode must be 8 digits" });
    if (!/^\d{4}$/.test(bsnsYear)) return e.json(400, { ok: false, error: "bsnsYear must be 4 digits" });
    if (["11013", "11012", "11014", "11011"].indexOf(reprtCode) < 0) {
      return e.json(400, { ok: false, error: "reprtCode must be 11013, 11012, 11014, or 11011" });
    }
    if (fsDiv !== "OFS" && fsDiv !== "CFS") return e.json(400, { ok: false, error: "fsDiv must be OFS or CFS" });

    var upstream = runtimeProxy.proxyFetch({
      url:
        "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?crtfc_key=" +
        apiKey +
        "&corp_code=" +
        encodeURIComponent(corpCode) +
        "&bsns_year=" +
        encodeURIComponent(bsnsYear) +
        "&reprt_code=" +
        encodeURIComponent(reprtCode) +
        "&fs_div=" +
        encodeURIComponent(fsDiv),
      method: "GET",
      headers: { Accept: "application/json" },
      timeout: 45,
    });
    return jsonResult(e, upstream);
  } catch (err) {
    return e.json(500, { ok: false, error: err && err.message ? err.message : String(err) });
  }
});

routerAdd("GET", "/api/opendart/corp-codes.zip", function (e) {
  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
    var apiKey = runtimeEnv.OPENDART_API_KEY || "";
    if (!apiKey) return e.json(500, { ok: false, error: "Missing OPENDART_API_KEY" });

    var upstream = runtimeProxy.proxyFetch({
      url: "https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=" + apiKey,
      method: "GET",
      headers: { Accept: "application/zip,application/octet-stream,*/*" },
      timeout: 60,
    });

    var statusCode = upstream.statusCode || 502;
    if (statusCode < 200 || statusCode >= 300) {
      return e.json(statusCode, { ok: false, error: "OpenDART corp code download failed" });
    }
    if (!upstream.body || !upstream.body.length) {
      return e.json(502, { ok: false, error: "OpenDART returned an empty corp-code file" });
    }

    return e.blob(200, "application/zip", upstream.body);
  } catch (err) {
    return e.json(500, { ok: false, error: err && err.message ? err.message : String(err) });
  }
});

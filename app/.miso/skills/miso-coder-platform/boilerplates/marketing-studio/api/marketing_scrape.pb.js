// 마케팅 스튜디오 백엔드 훅
// - POST /api/marketing/scrape : 웹사이트 HTML/CSS/og:image 수집·파싱 (Playwright 대체)
// - GET  /api/marketing/image  : 외부 이미지 same-origin 프록시 (캔버스 렌더·PNG 내보내기용)
// 규칙: 모든 외부 호출은 proxyFetch, 헬퍼는 핸들러 내부 스코프에 정의 (Goja 제약).

routerAdd("POST", "/api/marketing/scrape", function (e) {
  var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);

  function bytesToUtf8(bytes) {
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
  }

  function bodyToText(res) {
    if (typeof res.text === "string" && res.text.length > 0) return res.text;
    if (typeof res.body === "string") return res.body;
    return bytesToUtf8(res.body || []);
  }

  function bodyToBytes(res) {
    if (res.body && typeof res.body !== "string" && typeof res.body.length === "number") {
      return res.body;
    }
    return null;
  }

  function fetchText(url, maxBytes) {
    var res = runtimeProxy.proxyFetch({
      url: url,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,text/css,*/*;q=0.8",
      },
    });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return { ok: false, status: res.statusCode, text: "" };
    }
    var text = bodyToText(res);
    if (text.length > maxBytes) text = text.slice(0, maxBytes);
    return { ok: true, status: res.statusCode, text: text };
  }

  function decodeEntities(s) {
    return s
      .replace(/&#x([0-9a-fA-F]+);/g, function (_, hex) {
        return String.fromCharCode(parseInt(hex, 16));
      })
      .replace(/&#(\d+);/g, function (_, num) {
        return String.fromCharCode(parseInt(num, 10));
      })
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'");
  }

  // <meta property|name=... content=...> — 속성 순서와 따옴표 종류에 무관하게 추출
  function getMeta(html, key) {
    var tags = html.match(/<meta\b[^>]*>/gi) || [];
    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i];
      var keyMatch = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
      if (!keyMatch || keyMatch[1].toLowerCase() !== key) continue;
      var content = tag.match(/content\s*=\s*["']([^"']*)["']/i);
      if (content) return decodeEntities(content[1]).trim();
    }
    return "";
  }

  function parseBase(url) {
    var m = url.match(/^(https?:)\/\/([^/]+)(\/[^?#]*)?/i);
    if (!m) return null;
    var path = m[3] || "/";
    return {
      protocol: m[1],
      host: m[2],
      origin: m[1] + "//" + m[2],
      dir: path.replace(/[^/]*$/, ""),
    };
  }

  function resolveUrl(base, href) {
    if (!href) return "";
    href = decodeEntities(href.trim());
    if (/^data:/i.test(href)) return "";
    if (/^https?:\/\//i.test(href)) return href;
    if (/^\/\//.test(href)) return base.protocol + href;
    if (/^\//.test(href)) return base.origin + href;
    return base.origin + base.dir + href;
  }

  function stripTags(html) {
    var text = html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
      .replace(/<head\b[\s\S]*?<\/head>/gi, " ")
      .replace(/<[^>]+>/g, " ");
    return decodeEntities(text).replace(/\s+/g, " ").trim();
  }

  function collectColors(cssText, counts) {
    var hexMatches = cssText.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
    for (var i = 0; i < hexMatches.length; i++) {
      var value = hexMatches[i].toLowerCase();
      counts[value] = (counts[value] || 0) + 1;
    }
    var rgbMatches = cssText.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g) || [];
    for (var j = 0; j < rgbMatches.length; j++) {
      var rgb = rgbMatches[j].replace(/\s+/g, "");
      counts[rgb] = (counts[rgb] || 0) + 1;
    }
  }

  function collectFonts(cssText, fonts) {
    var declMatches = cssText.match(/font-family\s*:\s*([^;}{]+)/gi) || [];
    for (var i = 0; i < declMatches.length; i++) {
      var families = declMatches[i].replace(/font-family\s*:\s*/i, "").split(",");
      var first = (families[0] || "").trim().replace(/^["']|["']$/g, "");
      if (!first || /var\(|inherit|initial|unset/i.test(first)) continue;
      if (fonts.indexOf(first) === -1) fonts.push(first);
    }
  }

  function base64Encode(bytes) {
    var table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var out = "";
    for (var i = 0; i < bytes.length; i += 3) {
      var b1 = bytes[i] & 255;
      var b2 = i + 1 < bytes.length ? bytes[i + 1] & 255 : 0;
      var b3 = i + 2 < bytes.length ? bytes[i + 2] & 255 : 0;
      out += table.charAt(b1 >> 2) + table.charAt(((b1 & 3) << 4) | (b2 >> 4));
      out += i + 1 < bytes.length ? table.charAt(((b2 & 15) << 2) | (b3 >> 6)) : "=";
      out += i + 2 < bytes.length ? table.charAt(b3 & 63) : "=";
    }
    return out;
  }

  function detectMime(bytes) {
    if (bytes.length > 3 && (bytes[0] & 255) === 0xff && (bytes[1] & 255) === 0xd8) {
      return "image/jpeg";
    }
    if (bytes.length > 3 && (bytes[0] & 255) === 0x89 && (bytes[1] & 255) === 0x50) {
      return "image/png";
    }
    if (bytes.length > 3 && (bytes[0] & 255) === 0x47 && (bytes[1] & 255) === 0x49) {
      return "image/gif";
    }
    if (
      bytes.length > 11 &&
      (bytes[8] & 255) === 0x57 &&
      (bytes[9] & 255) === 0x45 &&
      (bytes[10] & 255) === 0x42 &&
      (bytes[11] & 255) === 0x50
    ) {
      return "image/webp";
    }
    return "";
  }

  var info = e.requestInfo();
  var targetUrl = info.body && typeof info.body.url === "string" ? info.body.url.trim() : "";
  if (!/^https?:\/\//i.test(targetUrl)) {
    return e.json(400, { error: "url 은 http(s):// 로 시작해야 합니다." });
  }
  var base = parseBase(targetUrl);
  if (!base) {
    return e.json(400, { error: "url 형식을 해석할 수 없습니다." });
  }

  var page;
  try {
    page = fetchText(targetUrl, 1500000);
  } catch (err) {
    return e.json(502, { error: "사이트에 접속하지 못했습니다: " + err });
  }
  if (!page.ok) {
    return e.json(502, { error: "사이트 응답 오류 (HTTP " + page.status + ")" });
  }
  var html = page.text;

  var titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  var langMatch = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i);

  // 파비콘·로고 후보
  var favicon = "";
  var appleTouch = "";
  var linkTags = html.match(/<link\b[^>]*>/gi) || [];
  var stylesheetHrefs = [];
  for (var li = 0; li < linkTags.length; li++) {
    var linkTag = linkTags[li];
    var relMatch = linkTag.match(/rel\s*=\s*["']([^"']+)["']/i);
    var hrefMatch = linkTag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!relMatch || !hrefMatch) continue;
    var rel = relMatch[1].toLowerCase();
    if (rel.indexOf("apple-touch-icon") !== -1 && !appleTouch) {
      appleTouch = resolveUrl(base, hrefMatch[1]);
    } else if (rel.indexOf("icon") !== -1 && !favicon) {
      favicon = resolveUrl(base, hrefMatch[1]);
    } else if (rel.indexOf("stylesheet") !== -1 && stylesheetHrefs.length < 2) {
      var cssUrl = resolveUrl(base, hrefMatch[1]);
      if (cssUrl) stylesheetHrefs.push(cssUrl);
    }
  }

  // 로고 후보 + 사이트 이미지 갤러리 — 갤러리는 크리에이티브 배경 소스로 쓰인다
  var logoCandidates = [];
  var siteImages = [];
  var imgTags = html.match(/<img\b[^>]*>/gi) || [];
  for (var ii = 0; ii < imgTags.length; ii++) {
    var imgTag = imgTags[ii];
    var srcMatch = imgTag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    var resolved = resolveUrl(base, srcMatch[1]);
    if (!resolved || !/^https?:\/\//i.test(resolved)) continue;

    if (/logo/i.test(imgTag)) {
      if (logoCandidates.length < 5 && logoCandidates.indexOf(resolved) === -1) {
        logoCandidates.push(resolved);
      }
      continue;
    }

    // 갤러리: 명시적으로 작은 이미지(아이콘류)와 svg·추적픽셀은 제외
    if (/\.svg(\?|$)/i.test(resolved)) continue;
    var widthAttr = imgTag.match(/\bwidth\s*=\s*["']?(\d+)/i);
    var heightAttr = imgTag.match(/\bheight\s*=\s*["']?(\d+)/i);
    if (widthAttr && parseInt(widthAttr[1], 10) < 120) continue;
    if (heightAttr && parseInt(heightAttr[1], 10) < 120) continue;
    if (siteImages.length < 12 && siteImages.indexOf(resolved) === -1) {
      siteImages.push(resolved);
    }
  }

  // 색·폰트: 인라인 스타일 + <style> 블록 + 외부 CSS 최대 2개
  var colorCounts = {};
  var fonts = [];
  collectColors(html, colorCounts);
  collectFonts(html, fonts);
  var themeColor = getMeta(html, "theme-color");
  if (themeColor) {
    colorCounts[themeColor.toLowerCase()] = (colorCounts[themeColor.toLowerCase()] || 0) + 50;
  }
  for (var si = 0; si < stylesheetHrefs.length; si++) {
    try {
      var css = fetchText(stylesheetHrefs[si], 300000);
      if (css.ok) {
        collectColors(css.text, colorCounts);
        collectFonts(css.text, fonts);
      }
    } catch (cssErr) {
      // 외부 CSS 실패는 무시 — HTML 만으로 진행
    }
  }

  var colorCandidates = [];
  for (var key in colorCounts) {
    colorCandidates.push({ value: key, count: colorCounts[key] });
  }
  colorCandidates.sort(function (a, b) {
    return b.count - a.count;
  });
  colorCandidates = colorCandidates.slice(0, 40);

  var ogImage = resolveUrl(base, getMeta(html, "og:image"));

  // og:image 다운로드 → base64 (vision 분석용, 800KB 이하일 때만)
  var ogImageData = null;
  if (ogImage) {
    try {
      var imgRes = runtimeProxy.proxyFetch({ url: ogImage, method: "GET" });
      if (imgRes.statusCode >= 200 && imgRes.statusCode < 300) {
        var bytes = bodyToBytes(imgRes);
        if (bytes && bytes.length > 0 && bytes.length <= 800 * 1024) {
          var mime = detectMime(bytes);
          if (mime) {
            ogImageData = { mime: mime, base64: base64Encode(bytes) };
          }
        }
      }
    } catch (imgErr) {
      // vision 은 best-effort — 실패해도 스크레이프는 성공 처리
    }
  }

  return e.json(200, {
    url: targetUrl,
    title: titleMatch ? decodeEntities(titleMatch[1]).trim() : "",
    description: getMeta(html, "description") || getMeta(html, "og:description"),
    siteName: getMeta(html, "og:site_name"),
    lang: langMatch ? langMatch[1] : "",
    bodyText: stripTags(html).slice(0, 8000),
    ogImage: ogImage,
    favicon: appleTouch || favicon,
    logoCandidates: logoCandidates,
    images: siteImages,
    colorCandidates: colorCandidates,
    fontCandidates: fonts.slice(0, 20),
    ogImageData: ogImageData,
  });
});

routerAdd("GET", "/api/marketing/image", function (e) {
  var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);

  function detectMime(bytes) {
    if (bytes.length > 3 && (bytes[0] & 255) === 0xff && (bytes[1] & 255) === 0xd8) {
      return "image/jpeg";
    }
    if (bytes.length > 3 && (bytes[0] & 255) === 0x89 && (bytes[1] & 255) === 0x50) {
      return "image/png";
    }
    if (bytes.length > 3 && (bytes[0] & 255) === 0x47 && (bytes[1] & 255) === 0x49) {
      return "image/gif";
    }
    if (
      bytes.length > 11 &&
      (bytes[8] & 255) === 0x57 &&
      (bytes[9] & 255) === 0x45 &&
      (bytes[10] & 255) === 0x42 &&
      (bytes[11] & 255) === 0x50
    ) {
      return "image/webp";
    }
    var head = "";
    for (var i = 0; i < Math.min(bytes.length, 300); i++) {
      head += String.fromCharCode(bytes[i] & 255);
    }
    if (/<svg[\s>]/i.test(head) || /<\?xml/i.test(head)) return "image/svg+xml";
    if (bytes.length > 3 && (bytes[0] & 255) === 0 && (bytes[1] & 255) === 0) {
      return "image/x-icon";
    }
    return "application/octet-stream";
  }

  var src = e.requestInfo().query["src"] || "";
  if (!/^https?:\/\//i.test(src)) {
    return e.json(400, { error: "src 쿼리에 http(s) 이미지 URL 이 필요합니다." });
  }

  var res;
  try {
    res = runtimeProxy.proxyFetch({ url: src, method: "GET" });
  } catch (err) {
    return e.json(502, { error: "이미지를 가져오지 못했습니다: " + err });
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    return e.json(502, { error: "이미지 응답 오류 (HTTP " + res.statusCode + ")" });
  }

  var body = res.body || [];
  if (typeof body === "string" || body.length === 0) {
    return e.json(502, { error: "이미지 본문을 읽지 못했습니다." });
  }
  if (body.length > 5 * 1024 * 1024) {
    return e.json(413, { error: "이미지가 5MB 를 초과합니다." });
  }

  return e.blob(200, detectMime(body), body);
});

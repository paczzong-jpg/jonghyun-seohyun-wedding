/**
 * Vite plugin — MISO Outbound Proxy
 *
 * Injects a tiny script into the HTML <head> that monkey-patches `fetch` and
 * `XMLHttpRequest.open` so that **every** request to an external origin is
 * rewritten to go through the sandbox preview proxy at `/__external/<encoded-url>`.
 *
 * The Fastify preview proxy then forwards the request to the real destination,
 * injecting auth headers / API tokens as needed.
 *
 * This is the Vite equivalent of Next.js middleware — it guarantees that no
 * outbound traffic leaks directly from the browser, regardless of how the
 * developer wrote their code.
 *
 * DO NOT MODIFY THIS FILE — managed by PlaiMaker Coder.
 */

import type { Plugin, ResolvedConfig } from "vite";

function buildInterceptorScript(basePath: string): string {
  return `
(function() {
  var origin = location.origin;
  var configuredBasePath = ${JSON.stringify(basePath)};
  var publishedMatch = location.pathname.match(/^\\/site\\/([^/]+)/);
  var basePath = publishedMatch ? ('/site/' + publishedMatch[1] + '/') : configuredBasePath;

  // ── Root-absolute path rewriter ────────────────────────────
  // Rewrites paths like /logo.jpg → /service/coder/preview/{id}/logo.jpg
  // so they route through the preview proxy to the sandbox dev server.
  // Also rewrites same-origin absolute URLs (https://sandbox.52g.ai/foo)
  // so that basePath is prepended to the pathname.
  // No-op when basePath === "/" (every path already starts with "/").
  function ra(v) {
    if (typeof v !== 'string') return v;
    // Same-origin absolute URL → extract pathname and rewrite
    if (v.startsWith(origin + '/')) {
      var pathname = v.slice(origin.length);
      if (pathname.length > 1 && pathname.indexOf(basePath) !== 0) {
        return origin + basePath + pathname.slice(1);
      }
      return v;
    }
    if (v.length > 1 && v[0] === '/' && v[1] !== '/' && v.indexOf(basePath) !== 0) {
      return basePath + v.slice(1);
    }
    return v;
  }

  function rewriteCssUrls(value) {
    if (typeof value !== 'string' || value.indexOf('url(') === -1) return value;
    return value.replace(/url\\(\\s*(['"]?)([^'"()]+)\\1\\s*\\)/g, function(match, quote, rawUrl) {
      var nextUrl = ra(rawUrl);
      if (nextUrl === rawUrl) return match;
      var wrapped = quote || '"';
      return 'url(' + wrapped + nextUrl + wrapped + ')';
    });
  }

  function rewriteStyleElement(el) {
    if (!el) return;
    if (typeof el.textContent === 'string' && el.textContent.indexOf('url(') !== -1) {
      var next = rewriteCssUrls(el.textContent);
      if (next !== el.textContent) el.textContent = next;
    }
  }

  function rewriteNodeAttrs(node) {
    if (!node || node.nodeType !== 1) return;

    var el = node;
    var tagName = (el.tagName || '').toUpperCase();

    if (tagName === 'STYLE') rewriteStyleElement(el);

    if (typeof el.getAttribute === 'function') {
      var src = el.getAttribute('src');
      if (src) {
        var nextSrc = ra(src);
        if (nextSrc !== src) el.setAttribute('src', nextSrc);
      }

      var poster = el.getAttribute('poster');
      if (poster) {
        var nextPoster = ra(poster);
        if (nextPoster !== poster) el.setAttribute('poster', nextPoster);
      }

      var href = el.getAttribute('href');
      if (href && (tagName === 'A' || tagName === 'LINK')) {
        var nextHref = ra(href);
        if (nextHref !== href) el.setAttribute('href', nextHref);
      }

      var style = el.getAttribute('style');
      if (style) {
        var nextStyle = rewriteCssUrls(style);
        if (nextStyle !== style) el.setAttribute('style', nextStyle);
      }
    }

    if (typeof el.querySelectorAll === 'function') {
      el.querySelectorAll('[src],[poster],[href],[style],style').forEach(rewriteNodeAttrs);
    }
  }

  // ── Asset element .src patching ────────────────────────────
  // HTMLAudioElement/HTMLVideoElement inherit src from HTMLMediaElement, so
  // patch that base class too. Otherwise programmatic media URLs such as
  // new Audio().src = "/__runtime/..." skip preview base-path rewriting.
  ['HTMLImageElement','HTMLScriptElement','HTMLSourceElement','HTMLMediaElement','HTMLVideoElement','HTMLAudioElement','HTMLEmbedElement'].forEach(function(n) {
    var C = window[n]; if (!C) return;
    var d = Object.getOwnPropertyDescriptor(C.prototype, 'src');
    if (d && d.set) {
      var s = d.set;
      Object.defineProperty(C.prototype, 'src', {
        configurable: true, enumerable: true, get: d.get,
        set: function(v) { s.call(this, ra(v)); }
      });
    }
  });

  // ── HTMLLinkElement .href patching (stylesheets/preloads) ──
  var ld = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
  if (ld && ld.set) {
    var ls = ld.set;
    Object.defineProperty(HTMLLinkElement.prototype, 'href', {
      configurable: true, enumerable: true, get: ld.get,
      set: function(v) { ls.call(this, ra(v)); }
    });
  }

  var ad = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href');
  if (ad && ad.set) {
    var as = ad.set;
    Object.defineProperty(HTMLAnchorElement.prototype, 'href', {
      configurable: true, enumerable: true, get: ad.get,
      set: function(v) { as.call(this, ra(v)); }
    });
  }

  // ── setAttribute patching ──────────────────────────────────
  var _sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(n, v) {
    if (n === 'src' || n === 'poster') v = ra(v);
    else if (n === 'href' && (this instanceof HTMLLinkElement || this instanceof HTMLAnchorElement)) v = ra(v);
    else if (n === 'style') v = rewriteCssUrls(v);
    return _sa.call(this, n, v);
  };

  // ── CSS / inline-style rewriting ───────────────────────────
  var stylePropNames = [
    'background',
    'backgroundImage',
    'borderImage',
    'borderImageSource',
    'content',
    'cursor',
    'listStyle',
    'listStyleImage',
    'mask',
    'maskImage',
    'webkitMask',
    'webkitMaskImage',
  ];

  var styleProto = window.CSSStyleDeclaration && window.CSSStyleDeclaration.prototype;
  if (styleProto) {
    var _setProperty = styleProto.setProperty;
    styleProto.setProperty = function(name, value, priority) {
      return _setProperty.call(this, name, rewriteCssUrls(value), priority);
    };

    stylePropNames.forEach(function(name) {
      var desc = Object.getOwnPropertyDescriptor(styleProto, name);
      if (!desc || !desc.set) return;
      Object.defineProperty(styleProto, name, {
        configurable: true,
        enumerable: desc.enumerable,
        get: desc.get,
        set: function(value) {
          desc.set.call(this, rewriteCssUrls(value));
        },
      });
    });
  }

  if (window.CSSStyleSheet && window.CSSStyleSheet.prototype && window.CSSStyleSheet.prototype.insertRule) {
    var _insertRule = window.CSSStyleSheet.prototype.insertRule;
    window.CSSStyleSheet.prototype.insertRule = function(rule, index) {
      return _insertRule.call(this, rewriteCssUrls(rule), index);
    };
  }

  if (window.HTMLStyleElement) {
    var textDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    if (textDesc && textDesc.set) {
      Object.defineProperty(HTMLStyleElement.prototype, 'textContent', {
        configurable: true,
        enumerable: textDesc.enumerable,
        get: textDesc.get,
        set: function(value) {
          textDesc.set.call(this, rewriteCssUrls(value));
        },
      });
    }

    var htmlDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (htmlDesc && htmlDesc.set) {
      Object.defineProperty(HTMLStyleElement.prototype, 'innerHTML', {
        configurable: true,
        enumerable: htmlDesc.enumerable,
        get: htmlDesc.get,
        set: function(value) {
          htmlDesc.set.call(this, rewriteCssUrls(value));
        },
      });
    }
  }

  // ── fetch ────────────────────────────────────────────────
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    if (url.startsWith('http') && !url.startsWith(origin)) {
      var proxyUrl = basePath + '__external/' + encodeURIComponent(url);
      var nextInit = init ? Object.assign({}, init) : {};
      // The rewritten proxy URL is same-origin, so preview auth must use the
      // session cookie even if the app originally used credentials:'omit' for
      // the cross-origin target URL.
      nextInit.credentials = 'include';
      if (typeof input === 'string') {
        return _fetch(proxyUrl, nextInit);
      }
      return _fetch(new Request(proxyUrl, input), nextInit);
    }
    if (typeof input === 'string') input = ra(input);
    return _fetch(input, init);
  };

  // ── EventSource (SSE) ───────────────────────────────────
  var _EventSource = window.EventSource;
  if (_EventSource) {
    window.EventSource = function(url, opts) {
      var strUrl = String(url);
      if (strUrl.startsWith('http') && !strUrl.startsWith(origin)) {
        strUrl = basePath + '__external/' + encodeURIComponent(strUrl);
      } else {
        strUrl = ra(strUrl);
      }
      return new _EventSource(strUrl, opts);
    };
    window.EventSource.prototype = _EventSource.prototype;
    window.EventSource.CONNECTING = _EventSource.CONNECTING;
    window.EventSource.OPEN = _EventSource.OPEN;
    window.EventSource.CLOSED = _EventSource.CLOSED;
  }

  // ── XMLHttpRequest ───────────────────────────────────────
  var _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var strUrl = String(url);
    if (strUrl.startsWith('http') && !strUrl.startsWith(origin)) {
      arguments[1] = basePath + '__external/' + encodeURIComponent(strUrl);
    } else {
      arguments[1] = ra(strUrl);
    }
    return _xhrOpen.apply(this, arguments);
  };

  // ── Anchor navigation safety net ──────────────────────────
  document.addEventListener('click', function(event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    if (anchor.hasAttribute('download')) return;

    var rawHref = anchor.getAttribute('href');
    if (!rawHref || rawHref[0] === '#') return;

    var rewrittenHref = ra(rawHref);
    if (rewrittenHref === rawHref) return;

    event.preventDefault();
    if (anchor.target === '_blank') {
      window.open(rewrittenHref, '_blank', 'noopener');
      return;
    }
    window.location.href = rewrittenHref;
  }, true);

  // ── Observe dynamic DOM insertions ────────────────────────
  var observer = new MutationObserver(function(records) {
    records.forEach(function(record) {
      if (record.type === 'attributes') {
        rewriteNodeAttrs(record.target);
        return;
      }
      record.addedNodes.forEach(rewriteNodeAttrs);
    });
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'poster', 'href', 'style'],
  });

  // ── Expose basePath for client-side routers ────
  // Published apps live under basePath (e.g. /site/{code}/).
  // Instead of manipulating the URL (which breaks React Router),
  // we expose basePath as a global so routers can use it as \`basename\`.
  // URL always keeps the full path — Flask SPA fallback handles refreshes.
  rewriteNodeAttrs(document.documentElement);
  window.__MISO_BASE_PATH__ = basePath.replace(/\\/$/, '') || '';
})();
`;
}

/**
 * React Router shim — intercepts both `react-router-dom` and `react-router`
 * imports and wraps BrowserRouter / createBrowserRouter with the platform basename.
 *
 * React Router v7 consolidated exports into `react-router`, so apps may import
 * from either package. Both must be intercepted.
 *
 * Basename resolution order:
 *   1. window.__MISO_BASE_PATH__ (runtime, injected by interceptor script)
 *   2. import.meta.env.BASE_URL (build-time, from Vite base config)
 *
 * This guarantees sub-path routing works in both:
 *   - Preview: /service/coder/preview/{sessionId}/
 *   - Published: /site/{code}/
 *
 * Platform basename always takes precedence over app-provided basename
 * to prevent AI-generated code from accidentally overriding it.
 */
const ROUTER_SHIM_PREFIX = "\0miso-router-shim:";
const ROUTER_PACKAGES = new Set(["react-router-dom", "react-router"]);

function buildRouterShimCode(pkg: string): string {
  return `
import { BrowserRouter as _OrigBR, createBrowserRouter as _origCBR } from '${pkg}';
import { createElement } from 'react';
export * from '${pkg}';

var _rawBase = (typeof window !== 'undefined' && window.__MISO_BASE_PATH__) || import.meta.env.BASE_URL?.replace(/\\/$/, '') || undefined;
var _basename = _rawBase && typeof window !== 'undefined' && window.location.pathname.startsWith(_rawBase) ? _rawBase : undefined;

export function BrowserRouter(props) {
  return createElement(_OrigBR, { ...props, basename: _basename || props.basename });
}

export function createBrowserRouter(routes, opts) {
  return _origCBR(routes, { ...opts, basename: _basename || (opts && opts.basename) });
}
`;
}

export function misoProxyPlugin(): Plugin {
  let resolvedBase = "/";

  return {
    name: "miso-outbound-proxy",
    enforce: "pre" as const,
    configResolved(config: ResolvedConfig) {
      resolvedBase = config.base.endsWith("/") ? config.base : config.base + "/";
    },
    async resolveId(source, importer) {
      if (!ROUTER_PACKAGES.has(source)) return null;
      // Don't intercept our own shim's internal imports (prevents recursion)
      if (importer?.startsWith("\0")) return null;
      // Only intercept user source imports, not node_modules internals.
      // react-router-dom re-exports from react-router — intercepting that
      // causes double-wrapping which breaks dev mode.
      if (importer?.includes("/node_modules/")) return null;
      // Only redirect if the package is actually installed
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (resolved) return ROUTER_SHIM_PREFIX + source;
      return null;
    },
    load(id) {
      if (!id.startsWith(ROUTER_SHIM_PREFIX)) return;
      const pkg = id.slice(ROUTER_SHIM_PREFIX.length);
      return buildRouterShimCode(pkg);
    },
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "script",
            children: buildInterceptorScript(resolvedBase),
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}

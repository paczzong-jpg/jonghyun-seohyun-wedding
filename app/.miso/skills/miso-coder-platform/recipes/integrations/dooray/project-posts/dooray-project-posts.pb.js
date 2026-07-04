// Copy to api/dooray-project-posts.pb.js.
// Dooray Project task and comment routes through the MISO runtime proxy.

var doorayProjectBytesToUtf8 = function (bytes) {
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

var doorayProjectBodyToText = function (res) {
  if (typeof res.text === "string") return res.text;
  if (typeof res.body === "string") return res.body;
  return doorayProjectBytesToUtf8(res.body || []);
};

var doorayProjectJsonOrText = function (text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return String(text || "").substring(0, 1000);
  }
};

var doorayProjectReadJsonBody = function (event) {
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

var doorayProjectClamp = function (value, max) {
  var text = String(value == null ? "" : value).trim();
  if (max && text.length > max) return text.substring(0, max);
  return text;
};

var doorayProjectAppendQuery = function (path, params) {
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

var doorayProjectBaseUrl = function (runtimeEnv) {
  var baseUrl = doorayProjectClamp(runtimeEnv.DOORAY_BASE_URL || "https://api.dooray.com", 300);
  while (baseUrl.length > 1 && baseUrl.charAt(baseUrl.length - 1) === "/") {
    baseUrl = baseUrl.substring(0, baseUrl.length - 1);
  }
  return baseUrl;
};

var doorayProjectRequest = function (event, method, path, query, payload) {
  var runtimeEnv = require(__hooks + "/_runtime_env.js");
  var runtimeProxy = require(__hooks + "/_runtime_proxy.js");
  var apiToken = runtimeEnv.DOORAY_API_TOKEN || "";
  if (!apiToken) return event.json(500, { error: "Missing DOORAY_API_TOKEN" });

  var options = {
    url: doorayProjectBaseUrl(runtimeEnv) + "/" + doorayProjectAppendQuery(path, query || {}),
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
  var text = doorayProjectBodyToText(upstream);
  var data = doorayProjectJsonOrText(text);
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

var doorayProjectUsers = function (items) {
  var source = Array.isArray(items) ? items : [];
  var users = [];
  for (var i = 0; i < source.length; i++) {
    var item = source[i];
    if (typeof item === "string") {
      var memberId = doorayProjectClamp(item, 100);
      if (memberId) users.push({ type: "member", member: { organizationMemberId: memberId } });
    } else if (item && item.organizationMemberId) {
      users.push({
        type: "member",
        member: { organizationMemberId: doorayProjectClamp(item.organizationMemberId, 100) },
      });
    } else if (item && item.emailAddress) {
      users.push({
        type: "emailUser",
        emailUser: {
          emailAddress: doorayProjectClamp(item.emailAddress, 300),
          name: doorayProjectClamp(item.name || item.emailAddress, 200),
        },
      });
    } else if (item && item.projectMemberGroupId) {
      users.push({
        type: "group",
        group: {
          projectMemberGroupId: doorayProjectClamp(item.projectMemberGroupId, 100),
          members: [],
        },
      });
    }
  }
  return users;
};

routerAdd("GET", "/api/dooray/project/projects", function (e) {
  var q = e.request.url.query();
  var page = Math.max(0, Number(q.get("page") || 0));
  var size = Math.min(100, Math.max(1, Number(q.get("size") || 50)));
  return doorayProjectRequest(e, "GET", "project/v1/projects", {
    member: "me",
    page: page,
    size: size,
    type: doorayProjectClamp(q.get("type"), 20),
    scope: doorayProjectClamp(q.get("scope"), 20),
    state: doorayProjectClamp(q.get("state"), 20),
  });
});

routerAdd("GET", "/api/dooray/project/members", function (e) {
  var q = e.request.url.query();
  var projectId = doorayProjectClamp(q.get("projectId"), 100);
  if (!projectId) return e.json(400, { error: "projectId is required" });
  var page = Math.max(0, Number(q.get("page") || 0));
  var size = Math.min(100, Math.max(1, Number(q.get("size") || 50)));
  return doorayProjectRequest(
    e,
    "GET",
    "project/v1/projects/" + encodeURIComponent(projectId) + "/members",
    { member: "me", page: page, size: size },
  );
});

routerAdd("GET", "/api/dooray/project/posts", function (e) {
  var q = e.request.url.query();
  var projectId = doorayProjectClamp(q.get("projectId"), 100);
  if (!projectId) return e.json(400, { error: "projectId is required" });
  if (q.get("postId")) {
    return doorayProjectRequest(
      e,
      "GET",
      "project/v1/projects/" + encodeURIComponent(projectId) + "/posts/" + encodeURIComponent(q.get("postId")),
    );
  }
  return doorayProjectRequest(e, "GET", "project/v1/projects/" + encodeURIComponent(projectId) + "/posts", {
    page: Math.max(0, Number(q.get("page") || 0)),
    size: Math.min(100, Math.max(1, Number(q.get("size") || 50))),
    subjects: doorayProjectClamp(q.get("subjects"), 200),
    postNumber: doorayProjectClamp(q.get("postNumber"), 50),
    order: doorayProjectClamp(q.get("order"), 50),
  });
});

routerAdd("POST", "/api/dooray/project/posts", function (e) {
  try {
    var body = doorayProjectReadJsonBody(e);
    var projectId = doorayProjectClamp(body.projectId || body.project, 100);
    var subject = doorayProjectClamp(body.subject || body.title, 300);
    var content = doorayProjectClamp(body.content || body.body, 30000);
    var toUsers = doorayProjectUsers(body.to);
    var ccUsers = doorayProjectUsers(body.cc);
    if (!projectId) return e.json(400, { error: "projectId is required" });
    if (!subject) return e.json(400, { error: "subject is required" });

    var payload = {
      subject: subject,
      body: { mimeType: "text/x-markdown", content: content },
      users: { to: toUsers, cc: ccUsers },
    };
    var priority = doorayProjectClamp(body.priority || "normal", 30);
    if (priority) payload.priority = priority;
    if (body.dueDate) {
      payload.dueDate = doorayProjectClamp(body.dueDate, 30);
      payload.dueDateFlag = true;
    }
    if (body.parentPostId) payload.parentPostId = doorayProjectClamp(body.parentPostId, 100);
    if (body.milestoneId) payload.milestoneId = doorayProjectClamp(body.milestoneId, 100);
    if (Array.isArray(body.tagIds)) payload.tagIds = body.tagIds.map(function (id) { return doorayProjectClamp(id, 100); });

    return doorayProjectRequest(e, "POST", "project/v1/projects/" + encodeURIComponent(projectId) + "/posts", {}, payload);
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

routerAdd("POST", "/api/dooray/project/comments", function (e) {
  try {
    var body = doorayProjectReadJsonBody(e);
    var projectId = doorayProjectClamp(body.projectId || body.project, 100);
    var postId = doorayProjectClamp(body.postId, 100);
    var content = doorayProjectClamp(body.content || body.body, 30000);
    if (!projectId) return e.json(400, { error: "projectId is required" });
    if (!postId) return e.json(400, { error: "postId is required" });
    if (!content) return e.json(400, { error: "content is required" });

    return doorayProjectRequest(
      e,
      "POST",
      "project/v1/projects/" + encodeURIComponent(projectId) + "/posts/" + encodeURIComponent(postId) + "/logs",
      {},
      { body: { mimeType: "text/x-markdown", content: content } },
    );
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});

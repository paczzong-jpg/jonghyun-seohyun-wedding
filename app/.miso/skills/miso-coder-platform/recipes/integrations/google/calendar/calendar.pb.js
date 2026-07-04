// Copy to api/google-calendar.pb.js.
// Creates a Google Calendar event with a user-granted short-lived access token.
// External network access goes through the MISO runtime proxy.

routerAdd("POST", "/api/google/calendar/events", function (e) {
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

  var cleanText = function (value, max) {
    return clampString(value, max).replace(/[\r\n]+/g, " ").trim();
  };

  var normalizeAttendees = function (values) {
    var out = [];
    for (var i = 0; i < values.length && i < 50; i++) {
      var email = cleanText(values[i], 320);
      if (email) out.push({ email: email });
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
    var calendarId = clampString(body.calendarId || "primary", 500);
    var summary = cleanText(body.summary, 500);
    var description = cleanText(body.description, 5000);
    var location = cleanText(body.location, 1000);
    var startDateTime = clampString(body.startDateTime, 100);
    var endDateTime = clampString(body.endDateTime, 100);
    var timeZone = clampString(body.timeZone || "Asia/Seoul", 100);
    var attendees = Array.isArray(body.attendees) ? body.attendees : [];
    var createMeet = body.createMeet === true;

    if (!accessToken || !calendarId || !summary || !startDateTime || !endDateTime) {
      return e.json(400, {
        error: "accessToken, calendarId, summary, startDateTime, and endDateTime are required",
      });
    }

    var eventResource = {
      summary: summary,
      description: description,
      location: location,
      start: { dateTime: startDateTime, timeZone: timeZone },
      end: { dateTime: endDateTime, timeZone: timeZone },
      attendees: normalizeAttendees(attendees),
    };

    if (createMeet) {
      eventResource.conferenceData = {
        createRequest: {
          requestId: "miso-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 1000000)),
        },
      };
    }

    var url =
      "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(calendarId) +
      "/events?sendUpdates=all";
    if (createMeet) {
      url += "&conferenceDataVersion=1";
    }

    var upstream = runtimeProxy.proxyFetch({
      url: url,
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventResource),
      timeout: 30,
    });

    var text = bodyToText(upstream);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      return e.json(upstream.statusCode, {
        error: "Google Calendar request failed",
        details: parseJsonOrText(text),
      });
    }

    var data = parseJsonOrText(text);
    return e.json(200, {
      ok: true,
      id: data && data.id ? data.id : "",
      htmlLink: data && data.htmlLink ? data.htmlLink : "",
      hangoutLink: data && data.hangoutLink ? data.hangoutLink : "",
    });
  } catch (err) {
    return e.json(500, {
      error: err && err.message ? err.message : String(err),
    });
  }
});

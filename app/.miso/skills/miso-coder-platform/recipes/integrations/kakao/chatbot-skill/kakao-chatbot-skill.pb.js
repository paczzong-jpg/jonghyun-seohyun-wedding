// Copy to api/kakao-chatbot-skill.pb.js.
// Serves a Kakao chatbot skill response from a published MISO website app.

routerAdd("POST", "/api/kakao/chatbot-skill", function (e) {
  var readJsonBody = function (event) {
    var info = event.requestInfo();
    var parsed = info.body || {};
    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed);
      } catch (err) {
        return {};
      }
    }
    return parsed;
  };

  var simpleText = function (text) {
    return {
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: String(text || "처리했습니다.") } }],
      },
    };
  };

  try {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var expectedToken = runtimeEnv.KAKAO_SKILL_VERIFIER || "";
    var actualToken = e.request.url.query().get("token") || "";
    if (expectedToken && actualToken !== expectedToken) {
      return e.json(401, simpleText("인증되지 않은 요청입니다."));
    }

    var body = readJsonBody(e);
    var utterance = "";
    if (body.userRequest && body.userRequest.utterance) {
      utterance = String(body.userRequest.utterance).trim();
    }

    var answer = utterance ? "요청을 받았습니다: " + utterance : "요청을 받았습니다.";
    return e.json(200, simpleText(answer));
  } catch (err) {
    return e.json(200, simpleText("요청을 처리하지 못했습니다."));
  }
});

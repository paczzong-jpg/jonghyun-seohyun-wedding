// PlaiMaker Coder 플랫폼 관리 파일 — DO NOT EDIT / DELETE
// 외부 HTTP 호출을 Session Manager 리버스 프록시를 통해 라우팅합니다.
// 사용법:
// var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
// runtimeProxy.proxyFetch({ url: "https://api.example.com/data", method: "GET" });
// body can be a string or FormData, matching PocketBase 0.31 $http.send.
function sanitizeConnectorAuth(auth) {
  if (!auth || typeof auth !== "object") {
    return null;
  }
  var out = {
    connector: String(auth.connector || ""),
    grant: String(auth.grant || ""),
  };
  if (auth.scope != null) {
    out.scope = String(auth.scope);
  }
  if (auth.audience != null) {
    out.audience = String(auth.audience);
  }
  var encoded = JSON.stringify(out);
  if (encoded.indexOf("\n") >= 0 || encoded.indexOf("\r") >= 0) {
    throw new Error("connectorAuth contains invalid newline characters");
  }
  return encoded;
}

function proxyFetch(config) {
  var smUrl = $os.getenv("SM_INTERNAL_URL");
  var appId = $os.getenv("RUNTIME_APP_ID");
  var relaySecret = $os.getenv("CODER_RUNTIME_RELAY_SECRET");
  config.headers = config.headers || {};
  var connectorAuthHeader = sanitizeConnectorAuth(config.connectorAuth);
  delete config.connectorAuth;
  if (connectorAuthHeader) {
    config.headers["x-miso-connector-auth"] = connectorAuthHeader;
  }
  if (relaySecret) {
    config.headers["x-coder-runtime-secret"] = relaySecret;
  }
  config.url = smUrl + "/internal/coder/runtime/" + appId + "/proxy/" + encodeURIComponent(config.url);
  return $http.send(config);
}

module.exports = { proxyFetch: proxyFetch };

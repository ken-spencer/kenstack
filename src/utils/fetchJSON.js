import merge from "lodash/merge";

export default function fetchJSON(url, json = null, options = {}) {
  let defaults = {
    method: json ? "POST" : "GET",
    headers: {},
    body: json ? JSON.stringify(json) : "",
    cache: "no-store",
  };

  if (json) {
    defaults.headers["Content-Type"] = "application/json";
  }

  const configs = merge({}, defaults, options);

  return fetch(url, configs).then((res) => {
    if (res.headers.get("content-type") == "application/json") {
      // return the parsed json and the original request.
      return res.json().then((json) => [json, res]);
    }

    return [false, res];
  });
}

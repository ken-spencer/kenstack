"use client";

export default async function apiAction(
  path,
  data,
  { invalidateQueries, action, ...props } = {},
) {
  let headers = {},
    body;

  if (data instanceof FormData) {
    if (Object.keys(props).length) {
      data.append("_api_props", JSON.stringify(props));
    }
    body = data;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }
  if (action) {
    headers["x-action"] = action;
  }

  const response = await fetch(path, {
    method: "POST",
    cache: "no-store",
    headers,
    body,
  });

  if (response.headers.get("content-type") !== "application/json") {
    return {
      error: "Invalid response recieved from server status: " + response.status,
    };
  }

  if (response.status === 404) {
    return { error: "Page not found: " + path };
  } else if (!response.ok) {
    // do something.
  }

  let json;
  try {
    json = await response.json();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Problem decoding json", e);
    json = { error: "Invalid response recieved from server" };
  }

  if (json.success && invalidateQueries) {
    invalidateQueries();
  }

  if (json.redirect) {
    window.location.href = json.redirect;
    return {};
  }

  return json;
}

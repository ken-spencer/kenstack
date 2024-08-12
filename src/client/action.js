export default async function action(path, data) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.headers.get("content-type") == "application/json") {
    return { error: "Invalid response recieved from server" };
  }
}

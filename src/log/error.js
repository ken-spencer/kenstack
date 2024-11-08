import getLogMeta from "./meta";

export default async function errorLog(error, message = null, data = null) {
  const meta = await getLogMeta();

  const trace = new Error();
  // eslint-disable-next-line no-console
  console.error(message || error.message, meta, data, error, "\n\n", trace);
}

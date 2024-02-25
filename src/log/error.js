import getLogMeta from "./meta";

export default function errorLog(error, message = null) {
  const meta = getLogMeta();

  const trace = new Error();
  // eslint-disable-next-line no-console
  console.error(message || error.message, meta, error, "\n\n", trace);
}

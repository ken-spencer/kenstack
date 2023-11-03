import getLogMeta from "./meta";

export default function errorLog(error, message = null) {
  const meta = getLogMeta();

  // eslint-disable-next-line no-console
  console.error(message, meta, error);
}

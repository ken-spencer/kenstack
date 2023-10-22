// Include the log file with console.log so we always know where it is coming from
export function debugLog(...args) {
  const e = new Error();
  const regex = /\((.*):(\d+):(\d+)\)$/;
  const match = regex.exec(e.stack.split("\n")[2]);

  if (match) {
    console.log(
      "\x1b[34m%s\x1b[0m",
      match[1].replace(/.+\(rsc\)\/\./, ""),
      match[2] + ":" + match[3],
    );
  }

  console.log(...args);
}

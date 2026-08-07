export async function getDisplayValues<TValues extends Record<string, unknown>>(
  fields: Record<string, { kind: string }>,
  values: TValues,
) {
  const display = { ...values };

  await Promise.all(
    Object.entries(fields).map(async ([key, field]) => {
      if (field.kind !== "markdown") return;

      const value = values[key];
      Object.assign(display, {
        [key]:
          value === ""
            ? ""
            : await import("@kenstack/components/Markdown/mdToHtml").then(
                ({ default: mdToHtml }) =>
                  mdToHtml(typeof value === "string" ? value : ""),
              ),
      });
    }),
  );

  return display;
}

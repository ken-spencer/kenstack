"use server";

import escapeRegExp from "@kenstack/utils/escapeRegExp";

export default async function load({ sortBy, keywords }, { model, admin }) {
  const list = admin.getList();
  const fields = list.map(({ name }) => name);
  let where = null;
  if (keywords) {
    const escaped = escapeRegExp(keywords);
    const regex = new RegExp(escaped, "i");

    const or = admin.getPaths().reduce((acc, path) => {
      const options = model.schema.path(path);
      if (options?.instance === "String") {
        acc.push({ [path]: { $regex: regex } });
      }
      return acc;
    }, []);

    if (or.length) {
      where = {
        $and: [{ $or: or }],
      };
    }
  }

  let query = model.find(where).select(fields);

  if (sortBy) {
    let [path, order] = sortBy;
    if (fields.includes(path)) {
      query = query.sort({ [path]: order === "asc" ? 1 : -1 });
    }
  }

  // query = query.lean();

  const rows = await query.exec();

  const DTO = rows.map((row) => row.toAdminDTO(fields));

  return {
    rows: DTO,
  };
}

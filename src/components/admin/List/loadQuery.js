"use server";

import errorLog from "../../../log/error";

export default async function loadRowsQuery({
  admin,
  model,
  sortBy,
  keywords,
}) {
  const list = admin.getList();
  const fields = list.map(({ name }) => name);

  let where = null;
  if (keywords) {
    const escaped = keywords.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
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
        $or: or,
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

  let rows;
  try {
    rows = await query.exec();
  } catch (e) {
    errorLog(e, "Problem loading admin rows");
    return {
      error:
        "There was an unexpected problem loading admin data. Please try again later.",
    };
  }

  const retval = rows.map((row) => row.toAdminDTO(fields));
  return retval;
}

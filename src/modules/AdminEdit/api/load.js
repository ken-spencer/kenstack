import { cookies } from "next/headers";

export default async function load({ admin, model, id }) {
  const select = admin.getPaths();

  const key = "admin-list-" + admin.modelName;
  const cookieStore = await cookies();

  const sortCookie = cookieStore.get(key + "Sort");

  const sortBy = sortCookie
    ? [...sortCookie.value.split(",")]
    : ["meta.createdAt", "desc"];

  let [path, order] = sortBy;
  // const sort = { [path]: order === "asc" ? 1 : -1, _id: -1 };

  const doc = await model
    .findById(id)
    // .select(['meta.createdAt', 'meta.updatedAt'])
    .select(select);

  if (!doc) {
    return { doc: false, previous: null, next: null };
  }

  const prevQuery = model
    .findOne({
      $or: [
        { [path]: { $lt: doc.get(path) } },
        { [path]: doc.get(path), _id: { $lt: doc._id } },
      ],
    })
    .sort({ [path]: order === "asc" ? -1 : 1, _id: 1 });

  const nextQuery = model
    .findOne({
      $or: [
        { [path]: { $gt: doc.get(path) } },
        { [path]: doc.get(path), _id: { $gt: doc._id } },
      ],
    })
    .sort({ [path]: order === "asc" ? 1 : -1, _id: -1 });

  const result = await Promise.all([prevQuery.exec(), nextQuery.exec()]);
  const [prevDoc, nextDoc] = result;

  return {
    doc: doc.toAdminDTO(admin),
    previous: prevDoc?._id.toString() ?? null,
    next: nextDoc?._id.toString() ?? null,
  };
}

export function loadAction(req, options) {
  return load(options);
}

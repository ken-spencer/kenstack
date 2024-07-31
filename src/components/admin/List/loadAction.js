"use server";

// import errorLog from "../../../log/error";
import acl from "@admin/auth/acl";
import { cookies } from "next/headers";

import loadQuery from "./loadQuery";

const loadRowsAction = async ({ modelName, sortBy, keywords }) =>
  acl("ADMIN", async () => {
    // await authenticate("ADMIN");

    const admin = thaumazoAdmin.get(modelName);
    if (!admin) {
      throw Error("Unknown admin: " + modelName);
    }

    const model = await thaumazoModels.get(modelName);
    if (!model) {
      throw Error("Unknown model: " + modelName);
    }

    const key = "admin" + modelName;
    const sortCookie = cookies().get(key + "Sort");
    const keywordsCookie = cookies().get(key + "Keywords") || "";

    if (sortBy === undefined && sortCookie) {
      sortBy = sortCookie.value.split(",");
    }

    if (keywords === undefined && keywordsCookie) {
      keywords = keywordsCookie.value;
    }

    const rows = await loadQuery({ model, admin, sortBy, keywords });
    return {
      rows,
    };

    /*
  const list = admin.getList();
  const fields = list.map(({ name }) => name);

  let where = null;
  if (keywords) {
    const escaped = keywords.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const or = admin.getPaths().reduce((acc, path) => {
      const options = model.schema.path(path);
      if (options.instance === "String") {
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

  query = query.lean();

  let leanRows;
  try {
    leanRows = await query.exec()
  } catch(e) {
    errorLog(e, "There was a p
    roblem loading admin rows");
    return {
      error:
        "There was an unexpected problem loading admin data. Please try again later.",
    };
  }


  const rows = JSON.parse(JSON.stringify(leanRows));

  */
  });

export default loadRowsAction;

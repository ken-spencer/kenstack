"use server";

import Folder from "../../db/Folder";
import acl from "@thaumazo/cms/auth/acl";

import errorLog from "@thaumazo/cms/log/error";

// import util from 'util';

const saveOrderAction = async (data) =>
  acl("ADMIN", async () => {
    if (!Array.isArray(data)) {
      return { error: "Invalid input" };
    }

    // convert input to bulk update
    const query = data.map(([id, priority]) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: priority } },
      },
    }));

    try {
      await Folder.bulkWrite(query);
    } catch (e) {
      errorLog(e, "Problem saving library folder order");
      return { error: "There was a problem saving your request" };
    }

    return {
      success: true,
    };
  });

export default saveOrderAction;

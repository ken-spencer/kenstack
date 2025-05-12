const loader =
  ({ canCreate = false, select = null } = {}) =>
  async ({ form, json, id, model }) => {
    let doc;
    if (!id) {
      if (canCreate !== true) {
        return Response.json({
          error: "Was unable to find the requested document.",
        });
      }
      doc = new model();
    } else {
      let query = model.findById(id);
      if (select) {
        query = query.select(select);
      }

      doc = await query.exec();
    }

    if (!doc) {
      return Response.json({
        error: "Was unable to find the requested document.",
      });
    }

    return { doc };
  };

export default loader;

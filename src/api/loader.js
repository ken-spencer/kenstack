const loader =
  ({ select = null } = {}) =>
  async ({ form, json, id, model }) => {
    let doc;
    if (!id) {
      doc = new model();
    } else {
      doc = await model.findById(id, select);
    }

    if (!doc) {
      return Response.json({
        error: "Was unable to find the requested document.",
      });
    }

    return { doc };
  };

export default loader;

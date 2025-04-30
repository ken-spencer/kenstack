import checkServerValidity from "@kenstack/forms/validity/checkServerValidity";

const validate =
  () =>
  async ({ form, json, id, doc, model }) => {
    if (!form) {
      throw Error("Form is required for validity");
    }

    const fields = form.getFields();

    if (doc) {
      // let doc;
      // if (!id) {
      //   doc = new model();
      // } else {
      //   doc = await model.findById(id);
      // }

      // if (!doc) {
      //   return Response.json({
      //     error:
      //       "There was an unexpected problem saving your data. Please try again later.",
      //   });
      // }

      const errors = await doc.bindValues(fields, json);
      if (errors) {
        return Response.json(errors);
      }

      // return; { doc };
      return;
    }

    const fieldErrors = checkServerValidity(fields, json);
    if (fieldErrors) {
      return Response.json({
        error:
          "We couldn't process your request. See the errors marked in red below.",
        fieldErrors,
      });
    }
  };

export default validate;

import checkServerValidity from "@kenstack/forms/validity/checkServerValidity";

const validate =
  ({ form } = {}) =>
  async ({ json }) => {
    if (!form) {
      throw Error("Form is required for validity");
    }

    const fields = form.getFields();

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

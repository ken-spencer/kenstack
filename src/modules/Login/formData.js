import createForm from "@kenstack/forms/formSchema";

const fields = createForm({
  email: {
    required: true,
    type: "email",
    placeholder: "example@3example.com",
    autoFocus: true,
  },
  password: {
    field: "password",
    // placeholder: "●●●●●●●●",
    required: true,
  },
});

export default fields;

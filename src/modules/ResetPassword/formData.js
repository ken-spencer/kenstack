import createForm from "@kenstack/forms/formSchema";

const form = createForm({
  password: {
    sm: 12,
    required: true,
    field: "password",
  },
  confirmPassword: {
    sm: 12,
    required: true,
    field: "password",
    matches: "password",
  },
});

export default form;

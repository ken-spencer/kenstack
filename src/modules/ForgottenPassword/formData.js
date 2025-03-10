import createForm from "@kenstack/forms/formSchema";

const formData = createForm({
  email: {
    sm: 12,
    required: true,
    field: "email",
    placeholder: "Enter your email address",
    autoFocus: true,
  },
});

export default formData;

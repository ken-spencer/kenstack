const fields = {
  contact: {
    label: "Contact",
    fields: {
      first_name: {
        required: true,
        containerClass: "lg:col-span-6",
      },
      last_name: {
        required: true,
        containerClass: "lg:col-span-6",
      },
      email: {
        required: true,
        type: "email",
        unique: true,
      },
    },
  },
  login: {
    label: "Password",
    fields: {
      password: {
        required: true,
        field: "password",
        containerClass: "lg:col-span-6",
      },
      confirm_password: {
        required: true,
        field: "password",
        matches: {
          field: "password",
          message: "The passwords you entered don't match.",
        },
        containerClass: "lg:col-span-6",
      },
    },
  },
};

export default fields;

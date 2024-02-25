const fields = {
  contact: {
    label: "Contact",
    xs: 12,
    fields: {
      first_name: {
        required: true,
        xs: 6,
      },
      last_name: {
        required: true,
        xs: 6,
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
    xs: 12,
    fields: {
      password: {
        required: true,
        field: "password",
      },
      confirm_password: {
        required: true,
        field: "password",
        readOnly: true, // does not write to db
        matches: {
          field: "password",
          message: "The passwords you entered don't match.",
        },
      },
    },
  },
};

export default fields;

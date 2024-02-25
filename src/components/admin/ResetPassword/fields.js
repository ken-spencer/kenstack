const fields = {
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
};

export default fields;

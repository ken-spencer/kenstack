const fields = {
  first_name: {
    required: true,
    md: 6,
  },
  last_name: {
    required: true,
    md: 6,
  },
  email: {
    required: true,
    type: "email",
    email: true,
  },
};

export default fields;

import UsersIcon from "@heroicons/react/24/outline/UsersIcon";

import PasswordRequest from "../PasswordRequest";

import clientModel from "@kenstack/client/Model";

const fields = {
  modelName: "User",
  title: "Manage users",
  icon: UsersIcon,
  list: [
    ["first_name", { label: "First" }],
    ["last_name", { label: "Last" }],
    ["email"],
  ],
  fields: {
    personal: {
      label: "Personal information",
      md: 12,
      lg: 6,
      fields: {
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
        },
      },
    },
    login: {
      label: "Access",
      md: 12,
      lg: 6,
      fields: {
        roles: {
          field: "checkboxList",
          options: [["ADMIN", "Administrator"]],
        },
        resetPassword: {
          field: PasswordRequest,
        },
      },
    },
  },
};

export { fields };

const UserAdmin = clientModel(fields);
export default UserAdmin;

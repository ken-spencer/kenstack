import UsersIcon from "@heroicons/react/24/outline/UsersIcon";

import PasswordRequest from "../PasswordRequest";

import clientModel from "@kenstack/client/Model";

const fields = {
  modelName: "User",
  title: "Manage users",
  icon: UsersIcon,
  list: [
    ["first_name", { label: "First", width: "auto" }],
    ["last_name", { label: "Last", width: "auto" }],
    ["email"],
  ],
  fields: {
    personal: {
      title: "Personal information",
      containerClass: "lg:col-span-6",
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
          field: "email",
        },
      },
    },
    login: {
      label: "Access",
      md: 12,
      lg: 6,
      fields: {
        roles: {
          field: "checkbox-list",
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

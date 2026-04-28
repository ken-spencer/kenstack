import InputField from "@kenstack/forms/InputField";
import CheckboxList from "@kenstack/forms/CheckboxList";
import SwitchUser from "./SwitchUser";
import ResetPassword from "./ResetPassword";

import roles from "@app/deps/roles";

export default function Form() {
  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <InputField name="firstName" label="last Name" />
            <InputField name="lastName" label="Last Name" />
          </div>
          <InputField name="email" label="Email" type="email" />
        </div>
        <div className="flex flex-col gap-4">
          <CheckboxList name="roles" label="Access Roles" options={roles} />
          <SwitchUser />
          <ResetPassword />
        </div>
      </div>
    </div>
  );
}

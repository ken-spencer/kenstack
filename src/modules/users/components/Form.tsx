import { InputField, CheckboxList, ImageField } from "@kenstack/admin/forms";
import SwitchUser from "./SwitchUser";
import ResetPassword from "./ResetPassword";

import roles from "@app/deps/roles";

export default function Form() {
  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ImageField
              label="Avatar"
              name="avatar"
              imageClass="rounded-full"
            />
            <div className="flex flex-grow flex-col gap-4">
              <div className="flex gap-4">
                <InputField name="givenName" label="Given Name" />
                <InputField name="familyName" label="Family Name" />
              </div>
              <InputField
                className="w-full"
                name="email"
                label="Email"
                type="email"
              />
            </div>
          </div>
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

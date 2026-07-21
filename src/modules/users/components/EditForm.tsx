"use client";

import { InputField, CheckboxList, ImageField } from "@kenstack/admin/forms";
import ResetPassword from "./ResetPassword";
import AvatarPlaceholder from "./AvatarPlaceholder";

import roles from "@app/deps/roles";

export default function EditForm() {
  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <ImageField
              name="avatar"
              placeholder={<AvatarPlaceholder />}
              shape="round"
            />
            <div className="flex flex-grow flex-col gap-4">
              <div className="flex items-start gap-4">
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
          <ResetPassword />
        </div>
      </div>
    </div>
  );
}

"use client";

import { InputField, CheckboxList, ImageField } from "@kenstack/admin/forms";
import Avatar from "@kenstack/components/Avatar";
import { UserRound } from "lucide-react";
import { useFormContext } from "react-hook-form";
import ResetPassword from "./ResetPassword";

import roles from "@app/deps/roles";

export default function EditForm() {
  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ImageField
              name="avatar"
              imageClass="rounded-full"
              placeholder={<AvatarPlaceholder />}
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
          <ResetPassword />
        </div>
      </div>
    </div>
  );
}

function AvatarPlaceholder() {
  const { watch } = useFormContext();
  const givenName = watch("givenName");
  const familyName = watch("familyName");
  const initials =
    (typeof givenName === "string" ? givenName.slice(0, 1) : "") +
    (typeof familyName === "string" ? familyName.slice(0, 1) : "");

  if (initials) {
    return <Avatar initials={initials} className="size-full text-5xl" />;
  }

  return (
    <div className="flex size-full items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <UserRound className="size-16" />
    </div>
  );
}

"use client";

import Onboarding from "./Onboarding";
import AvatarPlaceholder from "./AvatarPlaceholder";
import { defineFormFields } from "@kenstack/fields/formFields";
import { fields as definitions } from "../fields";

const fields = defineFormFields(definitions);

export default function EditForm() {
  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <fields.avatar placeholder={<AvatarPlaceholder />} shape="round" />
            <div className="flex flex-grow flex-col gap-4">
              <div className="flex items-start gap-4">
                <fields.givenName />
                <fields.familyName />
              </div>
              <fields.email className="w-full" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <fields.roles />
          <Onboarding />
        </div>
      </div>
    </div>
  );
}

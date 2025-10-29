"use client";

import { Globe } from "lucide-react";
import LinkedInIcon from "@kenstack/icons/LinkedIn";
import FacebookIcon from "@kenstack/icons/FacebookColor";
import TwitterIcon from "@kenstack/icons/Twitter";

import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/components/ui/input";
import { FormControl } from "@kenstack/components/ui/form";

type InputProps = FieldProps &
  React.ComponentProps<"input"> & {
    inputClass?: string;
    icon?: "url" | "twitter" | "facebook" | "linkedin";
  };

export default function UrlField({
  name,
  label,
  description,
  className,
  icon = "url",
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <div className="flex-cl flex items-center">
          {(() => {
            switch (icon) {
              case "url":
                return <Globe className="text-gray-800" />;
              case "linkedin":
                return <LinkedInIcon className="text-[#0a66c2]" />;
              case "facebook":
                return <FacebookIcon className="text-[#0866ff]" />;
              case "twitter":
                return <TwitterIcon className="text-gray-800" />;
            }
            return null;
          })()}
          <FormControl>
            <Input {...props} {...field} className="-ml-8 pl-9" type="url" />
          </FormControl>
        </div>
      )}
    />
  );
}

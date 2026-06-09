import Button, { type ButtonProps } from "@kenstack/components/Button";
import { useForm } from "@kenstack/forms/context";
import { useFormContext } from "react-hook-form";

export default function SubmitButton({
  children = "Submit",
  disabled = false,
  disabledUntilDirty = false,
  ...props
}: ButtonProps & {
  disabledUntilDirty?: boolean;
}) {
  const {
    formState: { isDirty, isSubmitting },
  } = useFormContext();
  const { mutation, uploadingFields } = useForm();
  const isPending = isSubmitting || mutation.isPending;

  return (
    <Button
      {...props}
      disabled={
        disabled ||
        isPending ||
        (disabledUntilDirty && !isDirty) ||
        uploadingFields.size > 0
      }
      isPending={isPending}
    >
      {children}
    </Button>
  );
}

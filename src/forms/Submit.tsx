import Button, { type ButtonProps } from "@kenstack/components/Button";
import { useForm } from "@kenstack/forms/context";
import { useFormContext } from "react-hook-form";

export default function SubmitButton({
  children = "Submit",
  disabled = false,
  disabledUntilDirty = false,
  isPending: isExternallyPending = false,
  ...props
}: Omit<ButtonProps, "type"> & {
  disabledUntilDirty?: boolean;
}) {
  const {
    formState: { isDirty, isReady, isSubmitting },
  } = useFormContext();
  const { mutation, uploadingFields } = useForm();
  const isPending = isExternallyPending || isSubmitting || mutation.isPending;

  return (
    <Button
      {...props}
      type="submit"
      disabled={
        disabled ||
        (disabledUntilDirty && (!isReady || !isDirty)) ||
        uploadingFields.size > 0
      }
      isPending={isPending}
    >
      {children}
    </Button>
  );
}

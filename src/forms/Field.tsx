import { CircleAlert } from "lucide-react";
import Help from "@kenstack/components/Help";

import {
  useFormContext,
  FieldValues,
  Path,
  ControllerRenderProps,
  type ControllerFieldState,
  // type FieldError,
} from "react-hook-form";

import {
  // FormControl,
  // FormDescription,
  FormField,
  FormItem,
  FormLabel,
  useFormField,
  // FormMessage,
} from "@kenstack/components/ui/form";

import { cn } from "@kenstack/lib/utils";

type RenderProps = {
  field: ControllerRenderProps<FieldValues, Path<FieldValues>>;
  fieldState: ControllerFieldState;
};

export type FieldProps = {
  name: Path<FieldValues>;
  label?: React.ReactNode;
  help?: React.ReactNode;
  description?: React.ReactNode;
};
type FieldPropsLocal = React.ComponentProps<"div"> &
  FieldProps & {
    render: (props: RenderProps) => React.ReactElement;
  };

const Field: React.FC<FieldPropsLocal> = ({
  name,
  label,
  help,
  description,
  render,
  ...props
}) => {
  const { control } = useFormContext();

  /** Keep track of list of rendered fields so we can display errors for non rendered fields  * */
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem {...props}>
          {(label || help) && (
            <div className="flex items-center gap-1 leading-none">
              {label && <FormLabel className="select-text">{label}</FormLabel>}
              {help && <Help message={help} />}
            </div>
          )}
          {render
            ? render({
                field,
                fieldState,
              })
            : null}
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
          <FormMessage className="" />
        </FormItem>
      )}
    />
  );
};

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const firstError = findFirstMessageObject(error);
  const body = firstError
    ? String(
        Array.isArray(firstError?.message)
          ? firstError.message.at(0)
          : firstError.message
      )
    : props.children;
  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn(
        "flex items-center gap-2 text-sm text-destructive",
        className
      )}
      {...props}
    >
      <CircleAlert className="size-4" />
      {body}
    </p>
  );
}

type MessageCarrier = { message?: string | string[] };

function findFirstMessageObject(obj: unknown): MessageCarrier | null {
  if (obj && typeof obj === "object") {
    if (Object.prototype.hasOwnProperty.call(obj, "message")) {
      return obj;
    }
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const found = findFirstMessageObject(record[key]);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export default Field;

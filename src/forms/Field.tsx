import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

import {
  useFormContext,
  FieldValues,
  Path,
  ControllerRenderProps,
  type ControllerFieldState,
} from "react-hook-form";
import { useForm } from "@kenstack/forms/context";

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
  description?: React.ReactNode;
};
type FieldPropsLocal = React.ComponentProps<"div"> &
  FieldProps & {
    render: (props: RenderProps) => React.ReactElement;
  };

const Field: React.FC<FieldPropsLocal> = ({
  name,
  label,
  description,
  render,
  ...props
}) => {
  const { control } = useFormContext();
  const { renderedFields } = useForm();

  /** Keep track of list of rendered fields so we can display errors for non rendered fields  * */
  useEffect(() => {
    if (!name) {
      return;
    }
    renderedFields.add(name);
    return () => {
      renderedFields.delete(name);
    };
  }, [name, renderedFields]);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem {...props}>
          {label && <FormLabel className="select-text">{label}</FormLabel>}
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

function FormMessage({ className, ...props }) {
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

function findFirstMessageObject(obj) {
  if (obj && typeof obj === "object") {
    if (Object.prototype.hasOwnProperty.call(obj, "message")) {
      return obj;
    }
    for (const key of Object.keys(obj)) {
      const found = findFirstMessageObject(obj[key]);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export default Field;

import { CircleAlert } from "lucide-react";
import * as React from "react";
import Help from "@kenstack/components/Help";

import {
  Controller,
  useFormContext,
  useFormState,
  type FieldValues,
  type Path,
  type ControllerRenderProps,
  type ControllerFieldState,
} from "react-hook-form";

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

export default function Field({
  name,
  label,
  help,
  description,
  render,
  ...props
}: React.ComponentProps<"div"> &
  FieldProps & {
    render: (props: RenderProps) => React.ReactElement;
  }) {
  const { control } = useFormContext();

  return (
    <FormFieldContext.Provider value={{ name }}>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <FormItem {...props}>
            {(label || help) && (
              <div className="flex items-center gap-1 leading-none">
                {label && (
                  <FormLabel className="select-text">{label}</FormLabel>
                )}
                {help && <Help message={help} />}
              </div>
            )}
            {render({ field, fieldState })}
            {description && (
              <div className="text-muted-foreground text-sm">{description}</div>
            )}
            <FormMessage className="" />
          </FormItem>
        )}
      />
    </FormFieldContext.Provider>
  );
}

const FormFieldContext = React.createContext<{
  name: Path<FieldValues>;
} | null>(null);

const FormItemContext = React.createContext<{ id: string } | null>(null);

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);

  if (!fieldContext || !itemContext) {
    throw new Error("useFormField should be used within <Field>");
  }

  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("grid gap-2", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  const { error, formItemId } = useFormField();

  return (
    <label
      data-error={!!error}
      className={cn(
        "data-[error=true]:text-destructive flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({
  children,
}: {
  children: React.ReactElement<
    React.HTMLAttributes<HTMLElement> & {
      "aria-describedby"?: string;
      "aria-invalid"?: boolean;
      id?: string;
    }
  >;
}) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();
  const child = React.Children.only(children);

  return React.cloneElement(child, {
    ...child.props,
    "aria-describedby": !error
      ? `${formDescriptionId}`
      : `${formDescriptionId} ${formMessageId}`,
    "aria-invalid": !!error,
    id: formItemId,
  });
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const firstError = findFirstMessageObject(error);
  const body = firstError
    ? String(
        Array.isArray(firstError.message)
          ? firstError.message.at(0)
          : firstError.message,
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
        "text-destructive flex items-center gap-2 text-sm",
        className,
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

export { FormControl, FormItem, FormLabel, useFormField };

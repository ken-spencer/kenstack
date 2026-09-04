"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CalendarClock, Check, ChevronDown } from "lucide-react";

import Button from "@kenstack/components/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";
import type { VisibilityValue } from "@kenstack/admin/lib/visibility";
import { visibilityStatusOptions } from "@kenstack/admin/lib/visibilityStatus";
import { useSaveShortcut } from "@kenstack/admin/lib/useSaveShortcut";
import { useForm } from "@kenstack/forms/context";
import DateTimeField from "@kenstack/forms/DateTimeField";
import { useAdminEdit } from "../context";

const publicationDateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

// The clock as an external store, at the minute the status needs: a
// scheduled record turns live on its own without a render reading Date.now.
function subscribeToMinute(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

function currentMinute() {
  return Math.floor(Date.now() / 60_000);
}

// The server render has no clock the client can agree with, so it reports
// no minute and the scheduled state resolves after hydration.
function serverMinute() {
  return null;
}

// The default status leads the menu.
const menuOrder: readonly VisibilityValue[] = [
  "published",
  "unlisted",
  "draft",
];
const menuOptions = [...visibilityStatusOptions].sort(
  (a, b) => menuOrder.indexOf(a.value) - menuOrder.indexOf(b.value),
);

/*
 * The one control that persists a record. Every save carries the record's
 * status, so for a publishing table the button shows the status the next
 * save will commit as its icon, and the chevron menu stages a different one.
 */
export default function SaveButton() {
  const { hasPublicationControl } = useAdminEdit();
  const {
    formState: { isDirty, isReady },
  } = useFormContext();
  const { mutation, uploadingFields } = useForm();
  const saveRef = useRef<HTMLButtonElement>(null);
  const canSubmit =
    isReady && !mutation.isPending && uploadingFields.size === 0;

  useSaveShortcut(() => {
    const button = saveRef.current;
    if (button && !button.disabled) {
      button.form?.requestSubmit(button);
    }
  });

  const saveProps = {
    disabled: !canSubmit || !isDirty,
    isPending: mutation.isPending && mutation.variables.submitter === "save",
    name: "action",
    ref: saveRef,
    size: "sm",
    value: "save",
  } as const;

  return hasPublicationControl ? (
    <PublishingSave saveProps={saveProps} />
  ) : (
    <Button {...saveProps}>Save</Button>
  );
}

function PublishingSave({
  saveProps,
}: {
  saveProps: React.ComponentProps<typeof Button>;
}) {
  const { formState, getValues, register, setValue, subscribe } =
    useFormContext();
  const { mutation } = useForm();
  const [visibility, publishedAt] = useWatch({
    name: ["visibility", "publishedAt"],
  }) as [VisibilityValue | undefined, Date | string | null | undefined];
  const minute = useSyncExternalStore(
    subscribeToMinute,
    currentMinute,
    serverMinute,
  );
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const publishDate = publishedAt ? new Date(publishedAt) : null;
  // A date inside the current minute counts as now.
  const isScheduled =
    visibility !== "draft" &&
    publishDate !== null &&
    minute !== null &&
    publishDate.valueOf() >= (minute + 1) * 60_000;
  const option = visibilityStatusOptions.find(
    ({ value }) => value === visibility,
  );
  const StatusIcon = isScheduled ? CalendarClock : option?.icon;
  const statusLabel = isScheduled
    ? `Scheduled for ${publicationDateFormat.format(publishDate)}`
    : option?.label;

  function stage(next: VisibilityValue) {
    setOpen(false);
    setValue("visibility", next, { shouldDirty: true });
  }

  // Entering a date on a draft is scheduling it, so the status follows. Only
  // the editor's own change counts; a draft that kept its old date stays one.
  useEffect(
    () =>
      subscribe({
        name: "publishedAt",
        formState: { dirtyFields: true, values: true },
        callback: ({ dirtyFields, values }) => {
          if (
            dirtyFields?.publishedAt &&
            values.publishedAt &&
            getValues("visibility") === "draft"
          ) {
            setValue("visibility", "published", { shouldDirty: true });
          }
        },
      }),
    [getValues, setValue, subscribe],
  );

  return (
    <div className="inline-flex items-center" ref={anchorRef}>
      {/* No editor renders visibility, and the form's per-field baseline
          refresh after a save skips names that are not registered. */}
      <input type="hidden" {...register("visibility")} />
      <Button {...saveProps} className="rounded-r-none">
        Save
      </Button>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            className="-ml-px rounded-l-none px-1.5 opacity-50 disabled:opacity-25"
            disabled={!formState.isReady || mutation.isPending}
            size="sm"
            tooltip={statusLabel}
            type="button"
          >
            <span className="relative inline-flex">
              {StatusIcon ? (
                <StatusIcon aria-hidden="true" className="size-4" />
              ) : null}
              <ChevronDown
                aria-hidden="true"
                className="absolute -right-1.5 -bottom-1.5 size-2"
              />
            </span>
            <span className="sr-only">
              Status: {statusLabel}. Change status
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          anchorRef={anchorRef}
          className="w-72 p-1"
        >
          {menuOptions.map(({ icon: Icon, label, value }) => (
            <button
              aria-pressed={value === visibility}
              className="hover:bg-muted flex w-full items-center gap-3 rounded px-2 py-2 text-left transition"
              key={value}
              onClick={() => stage(value)}
              type="button"
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 text-sm font-medium">{label}</span>
              {value === visibility ? <Check className="size-4" /> : null}
            </button>
          ))}
          <div className="border-t border-t-[var(--admin-divider)] px-2 py-2">
            <DateTimeField
              help="A live record becomes reachable at this date; a future date schedules it, and entering one on a draft publishes it. Leave it empty to publish when you save."
              label={
                <span className="flex items-center gap-3 text-sm font-medium">
                  <CalendarClock
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                  Schedule for
                </span>
              }
              name="publishedAt"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

"use client";

import {
  Component as ReactComponent,
  useRef,
  useState,
  useTransition,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type Path,
} from "react-hook-form";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  Eye,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import type { VisibilityValue } from "@kenstack/admin/lib/visibility";
import { draftModePath } from "@kenstack/admin/lib/searchParams";
import { visibilityStatusOptions } from "@kenstack/admin/lib/visibilityStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@kenstack/components/AlertDialog";
import Button from "@kenstack/components/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kenstack/components/Dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";
import { SortableItem, SortableList } from "@kenstack/components/SortableList";
import { defineFormFields } from "@kenstack/fields/formFields";
import DateTimeField from "@kenstack/forms/DateTimeField";
import unsecureId from "@kenstack/lib/unsecureId";

import {
  composerMetaFields,
  type ComposerBlock,
  type ComposerMeta,
  type ComposerValidationResult,
} from "./definition";
import { ComposerBlockEditorProvider } from "./editorContext";

type Definition = {
  Component: ComponentType<{ block: ComposerBlock }>;
  defaults: Record<string, unknown>;
  edit: ReactNode;
  icon: ReactNode;
  kind: string;
  label: string;
  preview: {
    countField?: string;
    subtitleField?: string;
    titleField?: string;
  };
};

type ComposerFormValues = { blocks: ComposerBlock[]; meta: ComposerMeta };

type EditorView = "blocks" | "meta" | "preview";

const MetaFields = defineFormFields(composerMetaFields);

const publicationDateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

type PublicationAction =
  | {
      kind: "publish";
      publishedAt: string;
      visibility: Exclude<VisibilityValue, "draft">;
    }
  | { kind: "unpublish" };

export default function EditComposerClient({
  definitions,
  initialDocument,
  initialMeta,
  pageKey,
  validateAction,
  viewHref,
}: {
  definitions: Definition[];
  initialDocument: ComposerBlock[];
  initialMeta: ComposerMeta;
  pageKey: string;
  validateAction: (
    pageKey: string,
    document: unknown,
  ) => Promise<ComposerValidationResult>;
  viewHref: string;
}) {
  const form = useForm<ComposerFormValues>({
    defaultValues: { blocks: initialDocument, meta: initialMeta },
  });
  const { fields, insert, move, remove, update } = useFieldArray({
    control: form.control,
    keyName: "formKey",
    name: "blocks",
  });
  const [selectedId, setSelectedId] = useState(initialDocument[0]?.id ?? null);
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState<EditorView>("blocks");
  // On narrow screens the outline and editor share one column: selecting a
  // block drills into its editor, and the back control returns to the list.
  const [mobileEditing, setMobileEditing] = useState(false);
  const [showPublicationMenu, setShowPublicationMenu] = useState(false);
  const [showUnpublishConfirmation, setShowUnpublishConfirmation] =
    useState(false);
  const publicationControlRef = useRef<HTMLDivElement>(null);
  const [publication, setPublication] = useState<{
    isScheduled: boolean;
    publishedAt: string | null;
    visibility: VisibilityValue;
  }>({ isScheduled: false, publishedAt: null, visibility: "draft" });
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibilityStatus = visibilityStatusOptions.find(
    ({ value }) => value === publication.visibility,
  );
  const PublishedIcon = visibilityStatusOptions.find(
    ({ value }) => value === "published",
  )?.icon;
  const UnlistedIcon = visibilityStatusOptions.find(
    ({ value }) => value === "unlisted",
  )?.icon;
  const DraftIcon = visibilityStatusOptions.find(
    ({ value }) => value === "draft",
  )?.icon;
  const VisibilityIcon = visibilityStatus?.icon;
  const PublicationIcon = publication.isScheduled
    ? CalendarClock
    : VisibilityIcon;
  const publicationLabel = publication.isScheduled
    ? "Scheduled"
    : visibilityStatus?.label;
  const hasDraftChanges = form.formState.isDirty || hasUnpublishedChanges;
  const scheduledStatusDate = publication.publishedAt
    ? publicationDateFormat.format(new Date(publication.publishedAt))
    : null;
  // The publication control carries the status itself; this label only
  // reports save activity.
  const saveStatusLabel = form.formState.isDirty
    ? isPending
      ? "Saving…"
      : "Unsaved changes"
    : hasUnpublishedChanges
      ? "Changes pending"
      : null;
  const publicationDetail =
    publication.isScheduled && scheduledStatusDate
      ? `Publishes ${scheduledStatusDate}`
      : hasDraftChanges && publication.visibility !== "draft"
        ? "Changes are not published."
        : publication.visibility === "unlisted"
          ? "Available by direct link only."
          : null;

  // Archived blocks keep their slot in the document but sit outside the
  // active outline, the preview, and the published page.
  const blockEntries = fields.map((block, index) => ({ block, index }));
  const activeEntries = blockEntries.filter(
    ({ block }) => block.archived !== true,
  );
  const archivedEntries = blockEntries.filter(
    ({ block }) => block.archived === true,
  );

  const selectedIndex = fields.findIndex((block) => block.id === selectedId);
  const selectedBlock = selectedIndex >= 0 ? fields[selectedIndex] : null;
  const selectedDefinition = selectedBlock
    ? definitions.find(({ kind }) => kind === selectedBlock.kind)
    : null;
  const blockErrors = form.formState.errors.blocks;

  function addBlock(definition: Definition) {
    const id = unsecureId();
    // New blocks join the composition where the editor is working, not at
    // the end of the page.
    const at = selectedIndex >= 0 ? selectedIndex + 1 : fields.length;
    insert(at, { id, kind: definition.kind, ...definition.defaults });
    setSelectedId(id);
    setShowAdd(false);
  }

  function removeBlock(index: number) {
    const next = fields[index + 1] ?? fields[index - 1];
    remove(index);
    setSelectedId(next?.id ?? null);
  }

  function setBlockArchived(index: number, archived: boolean) {
    const block = { ...form.getValues(`blocks.${index}`) };
    delete block.archived;
    update(index, archived ? { ...block, archived: true } : block);
  }

  function applyValidationIssues(
    issues: { message: string; path: string[] }[],
  ) {
    for (const issue of issues) {
      if (issue.path.length) {
        form.setError(issue.path.join(".") as Path<ComposerFormValues>, {
          message: issue.message,
        });
      } else {
        form.setError("root", { message: issue.message });
      }
    }

    setMessage(
      `Fix the highlighted fields. ${issues
        .map(({ message }) => message)
        .join(" ")}`,
    );

    const blockIssue = issues.find(({ path }) => path[0] === "blocks");
    const blockIndex = blockIssue ? Number(blockIssue.path[1]) : NaN;

    if (Number.isInteger(blockIndex)) {
      const target = form.getValues("blocks")[blockIndex];
      if (target) {
        setSelectedId(target.id);
      }
      setView("blocks");
    } else if (issues.some(({ path }) => path[0] === "meta")) {
      setView("meta");
    }
  }

  // Saving is explicit, matching the standard admin editor; without an
  // action the submission saves the draft and leaves publication alone.
  function submit(action?: PublicationAction) {
    form.clearErrors();
    startTransition(async () => {
      const result = await validateAction(pageKey, form.getValues());
      if (result.status === "error") {
        applyValidationIssues(result.issues);
        return;
      }

      // Publication state changes announce themselves through the header
      // status; the message slot is reserved for validation problems.
      form.reset(result.document);
      setMessage(null);

      if (!action) {
        // A saved edit on a live page leaves it ahead of its published
        // version until the author republishes.
        if (publication.visibility !== "draft") {
          setHasUnpublishedChanges(true);
        }
        return;
      }

      if (action.kind === "unpublish") {
        setPublication({
          isScheduled: false,
          publishedAt: null,
          visibility: "draft",
        });
        setHasUnpublishedChanges(false);
        return;
      }

      setPublication({
        isScheduled: new Date(action.publishedAt).valueOf() > Date.now(),
        publishedAt: action.publishedAt,
        visibility: action.visibility,
      });
      setHasUnpublishedChanges(false);
    });
  }

  function publishNow(visibility: Exclude<VisibilityValue, "draft">) {
    setShowPublicationMenu(false);
    submit({
      kind: "publish",
      publishedAt: new Date().toISOString(),
      visibility,
    });
  }

  function confirmUnpublish() {
    setShowUnpublishConfirmation(false);
    submit({ kind: "unpublish" });
  }

  function schedulePublication(publishedAt: string) {
    setShowPublicationMenu(false);
    submit({
      kind: "publish",
      publishedAt,
      visibility: "published",
    });
  }

  return (
    <FormProvider {...form}>
      <div className="mx-auto grid w-full max-w-[1500px] gap-4">
        <header className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-b-[var(--admin-divider)]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 py-1">
            <Button
              disabled={!form.formState.isDirty || isPending}
              isPending={isPending}
              onClick={() => submit()}
              size="icon"
              tooltip="Save"
              type="button"
              variant="ghost"
            >
              <Save className="text-foreground size-6" />
            </Button>
            <div className="inline-flex" ref={publicationControlRef}>
              <Popover
                open={showPublicationMenu}
                onOpenChange={setShowPublicationMenu}
              >
                <PopoverTrigger asChild>
                  <Button
                    aria-label={`Publication status: ${publicationLabel}. Open publication actions`}
                    className="border-border text-muted-foreground hover:text-foreground border bg-transparent px-1.5"
                    disabled={isPending}
                    isPending={isPending}
                    size="xs"
                    type="button"
                    variant="ghost"
                  >
                    {PublicationIcon ? (
                      <PublicationIcon className="size-4" />
                    ) : null}
                    <span>{publicationLabel}</span>
                    <ChevronDown className="size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  anchorRef={publicationControlRef}
                  className="w-72 p-1"
                >
                  {publicationDetail ? (
                    <p className="text-muted-foreground border-b border-b-[var(--admin-divider)] px-2 py-2 text-xs leading-5">
                      {publicationDetail}
                    </p>
                  ) : null}
                  {publication.visibility !== "published" ||
                  hasDraftChanges ||
                  publication.isScheduled ? (
                    <button
                      className="hover:bg-muted flex w-full items-center gap-3 rounded px-2 py-2 text-left transition"
                      onClick={() => publishNow("published")}
                      type="button"
                    >
                      {PublishedIcon ? (
                        <PublishedIcon className="size-4 shrink-0" />
                      ) : null}
                      <span className="text-sm font-medium">Publish now</span>
                    </button>
                  ) : null}
                  <SchedulePublicationFields
                    isPending={isPending}
                    onSchedule={schedulePublication}
                  />
                  <button
                    className="hover:bg-muted flex w-full items-center gap-3 rounded px-2 py-2 text-left transition"
                    onClick={() => publishNow("unlisted")}
                    type="button"
                  >
                    {UnlistedIcon ? (
                      <UnlistedIcon className="size-4 shrink-0" />
                    ) : null}
                    <span className="text-sm font-medium">
                      Publish unlisted
                    </span>
                  </button>
                  {publication.visibility !== "draft" ? (
                    <button
                      className="hover:bg-destructive/10 text-destructive flex w-full items-center gap-3 rounded border-t border-t-[var(--admin-divider)] px-2 py-2 text-left transition"
                      onClick={() => {
                        setShowPublicationMenu(false);
                        setShowUnpublishConfirmation(true);
                      }}
                      type="button"
                    >
                      {DraftIcon ? (
                        <DraftIcon className="size-4 shrink-0" />
                      ) : null}
                      <span className="text-sm font-medium">Unpublish</span>
                    </button>
                  ) : null}
                </PopoverContent>
              </Popover>
            </div>
            {saveStatusLabel ? (
              <span
                aria-live="polite"
                className={`min-w-0 truncate text-xs ${
                  form.formState.isDirty
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
                title={saveStatusLabel}
              >
                {saveStatusLabel}
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center justify-center gap-1 px-2">
            <h1 className="sr-only capitalize">
              {pageKey.replaceAll("-", " ")}
            </h1>
            <div className="flex gap-1" role="tablist">
              {(
                [
                  ["blocks", "Blocks"],
                  ["meta", "Meta"],
                  ["preview", "Preview"],
                ] as const
              ).map(([value, label]) => (
                <button
                  aria-selected={view === value}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    view === value
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  key={value}
                  onClick={() => {
                    setView(value);
                    // Re-selecting Blocks always returns to the outline on
                    // narrow screens.
                    if (value === "blocks") {
                      setMobileEditing(false);
                    }
                  }}
                  role="tab"
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 justify-self-end">
            <Button asChild size="icon" tooltip="View Content" variant="ghost">
              <a
                aria-label="View Content"
                href={draftModePath("enable-draft", viewHref)}
                rel="noreferrer"
                target="_blank"
              >
                <Eye className="text-foreground size-6" />
              </a>
            </Button>
          </div>
        </header>

        {message ? (
          <p aria-live="polite" className="text-muted-foreground px-1 text-sm">
            {message}
          </p>
        ) : null}

        {view === "preview" ? (
          <LivePreview
            control={form.control}
            definitions={definitions}
            onSelect={(id) => {
              setSelectedId(id);
              setView("blocks");
            }}
          />
        ) : null}

        {view === "meta" ? (
          <div className="border-border bg-card border p-4">
            <div className="grid max-w-2xl gap-5">
              <MetaFields.seoTitle namePrefix="meta" />
              <MetaFields.seoDescription namePrefix="meta" />
            </div>
          </div>
        ) : null}

        <div
          className={`grid items-start gap-4 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] ${
            view === "blocks" ? "" : "hidden"
          }`}
        >
          <div
            className={`border-border bg-card border p-2 ${
              mobileEditing ? "max-lg:hidden" : ""
            }`}
          >
            <SortableList
              ids={activeEntries.map(({ block }) => block.id)}
              onMove={(from, to) => {
                const fromEntry = activeEntries[from];
                const toEntry = activeEntries[to];
                if (fromEntry && toEntry) {
                  move(fromEntry.index, toEntry.index);
                }
              }}
            >
              <div className="grid gap-2">
                {activeEntries.map(({ block, index }) => {
                  const definition = definitions.find(
                    ({ kind }) => kind === block.kind,
                  );
                  const selected = block.id === selectedId;
                  const hasBlockErrors = Boolean(blockErrors?.[index]);

                  return (
                    <SortableItem
                      className={`group bg-background border ${
                        hasBlockErrors
                          ? "border-destructive/60"
                          : "border-border"
                      } ${
                        // Selection only reads as a state while the editor is
                        // visible beside the outline.
                        selected ? "lg:border-primary lg:bg-primary/10" : ""
                      }`}
                      id={block.id}
                      key={block.formKey}
                    >
                      <div className="flex items-start gap-1 p-2">
                        <button
                          aria-pressed={selected}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left"
                          onClick={() => {
                            setSelectedId(block.id);
                            setMobileEditing(true);
                          }}
                          type="button"
                        >
                          <GripVertical
                            aria-hidden="true"
                            className="text-muted-foreground mt-0.5 size-4 shrink-0 cursor-grab"
                          />
                          <span className="text-muted-foreground mt-0.5 shrink-0">
                            {definition?.icon}
                          </span>
                          {definition ? (
                            <BlockSummary
                              control={form.control}
                              definition={definition}
                              index={index}
                            />
                          ) : (
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {block.kind}
                            </span>
                          )}
                          {hasBlockErrors ? (
                            <span
                              aria-label="This block has validation problems"
                              className="bg-destructive mt-1.5 size-2 shrink-0 rounded-full"
                              role="img"
                            />
                          ) : null}
                        </button>
                        <div
                          className={`flex shrink-0 gap-1 ${
                            selected
                              ? ""
                              : "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
                          }`}
                        >
                          <Button
                            aria-label={`Archive ${definition?.label ?? block.kind}`}
                            icon={Archive}
                            onClick={() => setBlockArchived(index, true)}
                            size="icon-xs"
                            tooltip="Archive"
                            type="button"
                            variant="ghost"
                          />
                        </div>
                      </div>
                    </SortableItem>
                  );
                })}
              </div>
            </SortableList>
            {fields.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                Add a block to begin composing this page.
              </p>
            ) : null}
            <Button
              className="mt-2 w-full justify-start"
              icon={Plus}
              onClick={() => setShowAdd(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Add block
            </Button>
            {archivedEntries.length ? (
              <details className="border-border mt-2 border-t pt-2">
                <summary className="text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1 text-xs font-medium">
                  Archived ({archivedEntries.length})
                </summary>
                <div className="mt-2 grid gap-2">
                  {archivedEntries.map(({ block, index }) => {
                    const definition = definitions.find(
                      ({ kind }) => kind === block.kind,
                    );
                    const selected = block.id === selectedId;

                    return (
                      <div
                        className={`group border-border bg-background border opacity-70 ${
                          selected ? "lg:border-primary lg:bg-primary/10" : ""
                        }`}
                        key={block.formKey}
                      >
                        <button
                          aria-pressed={selected}
                          className="flex w-full items-start gap-2 p-2 text-left"
                          onClick={() => {
                            setSelectedId(block.id);
                            setMobileEditing(true);
                          }}
                          type="button"
                        >
                          <span className="text-muted-foreground mt-0.5 shrink-0">
                            {definition?.icon}
                          </span>
                          {definition ? (
                            <BlockSummary
                              control={form.control}
                              definition={definition}
                              index={index}
                            />
                          ) : (
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {block.kind}
                            </span>
                          )}
                        </button>
                        <div className="flex justify-end gap-1 px-1 pb-1">
                          <Button
                            aria-label={`Restore ${definition?.label ?? block.kind}`}
                            icon={ArchiveRestore}
                            onClick={() => setBlockArchived(index, false)}
                            size="icon-xs"
                            tooltip="Restore"
                            type="button"
                            variant="ghost"
                          />
                          <RemoveBlockAction
                            label={definition?.label ?? block.kind}
                            onRemove={() => removeBlock(index)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            ) : null}
          </div>

          <div
            className={`border-border bg-card min-h-[680px] border p-4 ${
              mobileEditing ? "" : "max-lg:hidden"
            }`}
          >
            {selectedBlock && selectedDefinition ? (
              <div key={selectedBlock.formKey}>
                {/* Below lg the block title doubles as the back control. */}
                <button
                  className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 text-sm font-medium lg:pointer-events-none"
                  onClick={() => setMobileEditing(false)}
                  type="button"
                >
                  <ChevronLeft className="size-4 lg:hidden" />
                  {selectedDefinition.icon}
                  {selectedDefinition.label}
                  {selectedBlock.archived === true ? (
                    <span className="border-border rounded border px-1.5 py-0.5 text-xs">
                      Archived
                    </span>
                  ) : null}
                </button>
                <ComposerBlockEditorProvider index={selectedIndex}>
                  {selectedDefinition.edit}
                </ComposerBlockEditorProvider>
              </div>
            ) : (
              <div className="text-muted-foreground grid min-h-80 place-items-center text-center text-sm">
                Select a block to edit its content.
              </div>
            )}
          </div>
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent aria-describedby="">
            <DialogHeader>
              <DialogTitle>Add a block</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 sm:grid-cols-2">
              {definitions.map((definition) => (
                <button
                  className="border-border hover:bg-accent hover:text-accent-foreground flex items-center gap-3 border p-4 text-left transition-colors"
                  key={definition.kind}
                  onClick={() => addBlock(definition)}
                  type="button"
                >
                  {definition.icon}
                  <span className="font-medium">{definition.label}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showUnpublishConfirmation}
          onOpenChange={setShowUnpublishConfirmation}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unpublish this page?</DialogTitle>
              <DialogDescription>
                The public page will be removed. Its latest draft will remain
                available in Composer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={confirmUnpublish}
                type="button"
                variant="destructive"
              >
                Unpublish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FormProvider>
  );
}

function RemoveBlockAction({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label={`Remove ${label}`}
          icon={Trash2}
          size="icon-xs"
          tooltip="Remove"
          type="button"
          variant="ghost"
        />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove this {label.toLowerCase()} block?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The block and its content are removed from the page. Archive it
            instead to keep it for later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SchedulePublicationFields({
  isPending,
  onSchedule,
}: {
  isPending: boolean;
  onSchedule: (publishedAt: string) => void;
}) {
  const form = useForm<{ publishedAt: string }>({
    defaultValues: { publishedAt: "" },
  });

  function schedule({ publishedAt }: { publishedAt: string }) {
    const date = new Date(publishedAt);

    if (!publishedAt || Number.isNaN(date.valueOf())) {
      form.setError("publishedAt", {
        message: "Choose a valid publication date and time",
      });
      return;
    }

    if (date <= new Date()) {
      form.setError("publishedAt", {
        message: "Choose a future publication date and time",
      });
      return;
    }

    onSchedule(date.toISOString());
  }

  return (
    <FormProvider {...form}>
      <div className="flex items-end gap-2 px-2 py-2">
        <DateTimeField
          className="min-w-0 flex-1"
          disabled={isPending}
          label="Schedule for"
          name="publishedAt"
        />
        <Button
          isPending={isPending}
          onClick={form.handleSubmit(schedule)}
          size="sm"
          type="button"
        >
          Schedule
        </Button>
      </div>
    </FormProvider>
  );
}

// Renders the page from current (possibly unsaved) form values. Each block is
// covered by a click-to-edit overlay, which also keeps preview interactions
// from reaching real controls such as forms inside blocks.
function LivePreview({
  control,
  definitions,
  onSelect,
}: {
  control: Control<ComposerFormValues>;
  definitions: Definition[];
  onSelect: (id: string) => void;
}) {
  const blocks = useWatch({ control, name: "blocks" });

  return (
    <div className="border-border bg-background border">
      {blocks?.length ? null : (
        <p className="text-muted-foreground px-4 py-16 text-center text-sm">
          Add a block to see the page preview.
        </p>
      )}
      {(blocks ?? []).map((block) => {
        const definition = definitions.find(({ kind }) => kind === block.kind);
        if (!definition || block.archived === true) {
          return null;
        }

        return (
          <div className="group/preview relative" key={block.id}>
            <PreviewBlockBoundary label={definition.label}>
              <definition.Component block={block} />
            </PreviewBlockBoundary>
            <button
              aria-label={`Edit the ${definition.label} block`}
              className="hover:border-primary focus-visible:border-primary absolute inset-0 z-10 border-2 border-transparent"
              onClick={() => onSelect(block.id)}
              type="button"
            />
          </div>
        );
      })}
    </div>
  );
}

// A block editor must survive one block's render throwing on incomplete
// mid-edit values.
class PreviewBlockBoundary extends ReactComponent<
  { children: ReactNode; label: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="text-destructive px-4 py-10 text-center text-sm">
          The {this.props.label} block preview could not render. Check its
          fields.
        </p>
      );
    }

    return this.props.children;
  }
}

function BlockSummary({
  control,
  definition,
  index,
}: {
  control: Control<ComposerFormValues>;
  definition: Definition;
  index: number;
}) {
  const block = useWatch({ control, name: `blocks.${index}` });
  const titleValue = definition.preview.titleField
    ? block?.[definition.preview.titleField]
    : undefined;
  const subtitleValue = definition.preview.subtitleField
    ? block?.[definition.preview.subtitleField]
    : undefined;
  const countValue = definition.preview.countField
    ? block?.[definition.preview.countField]
    : undefined;
  const title =
    typeof titleValue === "string" && titleValue.trim()
      ? titleValue.trim()
      : `Untitled ${definition.label.toLowerCase()}`;
  const subtitle =
    typeof subtitleValue === "string" && subtitleValue.trim()
      ? subtitleValue.trim()
      : Array.isArray(countValue)
        ? `${countValue.length} ${countValue.length === 1 ? "item" : "items"}`
        : null;

  return (
    <span className="min-w-0 flex-1">
      <span className="text-muted-foreground block text-xs">
        {definition.label}
      </span>
      <span className="text-foreground block truncate text-sm font-medium">
        {title}
      </span>
      {/* Always render the line so every outline card has the same height. */}
      <span className="text-muted-foreground mt-0.5 line-clamp-1 block text-xs leading-5">
        {subtitle ?? " "}
      </span>
    </span>
  );
}

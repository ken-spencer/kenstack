import { posToDOMRect } from "@milkdown/prose";
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
} from "@milkdown/prose/state";
import type { EditorView } from "@milkdown/prose/view";
import { $prose } from "@milkdown/kit/utils";
import type { QueryClient } from "@tanstack/react-query";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import fetcher, { type FetchResult } from "@kenstack/api/fetcher";
import Avatar from "@kenstack/components/Avatar";

export type MarkdownMentionConfig = {
  apiPath: string;
  action?: string;
  minQueryLength?: number;
  path: string;
  trigger?: string;
};

type MarkdownMentionOption = {
  avatarUrl?: string | null;
  id: number;
  initials?: string;
  label: string;
  slug: string;
};

type MarkdownMentionSearchResult = FetchResult<{
  mentions: MarkdownMentionOption[];
}>;

type MarkdownMentionRuntimeConfig = MarkdownMentionConfig & {
  queryClient?: Pick<QueryClient, "fetchQuery" | "getQueryData">;
};

type MentionMatch = {
  from: number;
  query: string;
  to: number;
  trigger: string;
};

const mentionPluginKey = new PluginKey("KENSTACK_MARKDOWN_MENTIONS");
const mentionPluginViews = new WeakMap<EditorView, MentionPluginView>();

export function markdownMentionPlugin(config: MarkdownMentionRuntimeConfig) {
  return $prose(
    () =>
      new Plugin({
        key: mentionPluginKey,
        props: {
          handleKeyDown(view, event) {
            return mentionPluginViews.get(view)?.handleKeyDown(event) ?? false;
          },
        },
        view: (view) => {
          const pluginView = new MentionPluginView(view, config);
          mentionPluginViews.set(view, pluginView);
          return pluginView;
        },
      }),
  );
}

class MentionPluginView {
  private abortController: AbortController | null = null;
  private activeMentionFrom: number | null = null;
  private element: HTMLDivElement;
  private error = "";
  private fetchTimeout: ReturnType<typeof setTimeout> | null = null;
  private loading = false;
  private match: MentionMatch | null = null;
  private optionButtons: HTMLButtonElement[] = [];
  private options: MarkdownMentionOption[] = [];
  private roots: Root[] = [];
  private requestKey = "";
  private selectedIndex = 0;

  constructor(
    private view: EditorView,
    private config: MarkdownMentionRuntimeConfig,
  ) {
    this.element = document.createElement("div");
    this.element.style.background = "white";
    this.element.style.border = "1px solid rgb(209 213 219)";
    this.element.style.borderRadius = "6px";
    this.element.style.boxShadow = "0 10px 25px rgb(15 23 42 / 0.16)";
    this.element.style.color = "rgb(17 24 39)";
    this.element.style.fontSize = "13px";
    this.element.style.lineHeight = "18px";
    this.element.style.maxWidth = "min(18rem, calc(100vw - 2rem))";
    this.element.style.minWidth = "13rem";
    this.element.style.padding = "4px";
    this.element.style.position = "fixed";
    this.element.style.zIndex = "60";
    this.element.style.display = "none";

    this.element.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });

    document.body.appendChild(this.element);
    this.update(view);
  }

  handleKeyDown(event: KeyboardEvent) {
    if (!this.menuHasKeyboardFocus() || hasModifierKey(event)) {
      return false;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveSelection(1);
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.moveSelection(-1);
      return true;
    }

    if (event.key === "Enter" && this.options.length) {
      event.preventDefault();
      this.insertMention(this.options[this.selectedIndex] ?? this.options[0]);
      return true;
    }

    return false;
  }

  update(view: EditorView, previousState?: EditorState) {
    this.view = view;
    this.match = findMentionMatch(view.state, this.config);
    const docChanged = previousState
      ? !previousState.doc.eq(view.state.doc)
      : false;

    if (!this.match || !view.hasFocus()) {
      this.deactivate();
      return;
    }

    const mentionIsActive = this.activeMentionFrom === this.match.from;

    if (!mentionIsActive && !docChanged) {
      this.hide();
      return;
    }

    this.activeMentionFrom = this.match.from;

    const minQueryLength = this.config.minQueryLength ?? 0;
    const queryReady = this.match.query.length >= minQueryLength;

    if (queryReady) {
      this.loadOptions(this.match.query);
    } else {
      this.clearRequest();
      this.error = "";
      this.loading = false;
      this.options = [];
      this.selectedIndex = 0;
    }

    this.render();

    const rect = posToDOMRect(view, this.match.from, this.match.to);
    this.element.style.left = `${Math.max(8, rect.left)}px`;
    this.element.style.top = `${rect.bottom + 6}px`;
    this.element.style.display = "block";
  }

  destroy() {
    this.clearRequest();
    this.clearPopover();
    mentionPluginViews.delete(this.view);
    this.element.remove();
  }

  private hide() {
    this.element.style.display = "none";
  }

  private deactivate() {
    this.activeMentionFrom = null;
    this.clearRequest();
    this.error = "";
    this.loading = false;
    this.options = [];
    this.selectedIndex = 0;
    this.clearPopover();
    this.hide();
  }

  private insertMention(option: MarkdownMentionOption) {
    if (!this.match) {
      return;
    }

    const { schema, tr } = this.view.state;
    const link = schema.marks.link;

    if (!link) {
      return;
    }

    const label = `${this.match.trigger}${option.label}`;
    const node = schema.text(label, [
      link.create({
        href: formatMentionPath(this.config.path, option.slug),
      }),
    ]);
    const selectionTo = this.match.from + label.length;

    tr.replaceWith(this.match.from, this.match.to, node);
    tr.insertText(" ", selectionTo, selectionTo);
    tr.setSelection(TextSelection.create(tr.doc, selectionTo + 1));
    tr.setStoredMarks([]);
    this.view.dispatch(tr.scrollIntoView());
    this.view.focus();
  }

  private clearRequest() {
    if (this.fetchTimeout) {
      clearTimeout(this.fetchTimeout);
      this.fetchTimeout = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.requestKey = "";
  }

  private loadOptions(query: string) {
    const action = this.config.action ?? "mention-search";
    const requestKey = `${this.config.apiPath}\n${action}\n${query}`;
    const queryKey = markdownMentionQueryKey(this.config.apiPath, action, query);

    if (requestKey === this.requestKey) {
      return;
    }

    this.clearRequest();
    this.error = "";
    this.requestKey = requestKey;

    const cachedResult =
      this.config.queryClient?.getQueryData<MarkdownMentionSearchResult>(
        queryKey,
      );

    if (cachedResult?.status === "success") {
      this.applyResult(cachedResult);
    } else {
      this.loading = true;
      this.options = [];
      this.selectedIndex = 0;
    }

    this.fetchTimeout = setTimeout(() => {
      this.fetchMentions({ action, query, queryKey })
        .then((result) => {
          if (requestKey !== this.requestKey) {
            return;
          }

          this.applyResult(result);
          this.render();
        })
        .catch((error: unknown) => {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          if (requestKey !== this.requestKey) {
            return;
          }

          this.loading = false;
          this.options = [];
          this.selectedIndex = 0;
          this.error = "Unable to search.";
          this.render();
        });
    }, cachedResult ? 0 : query ? 150 : 0);
  }

  private fetchMentions({
    action,
    query,
    queryKey,
  }: {
    action: string;
    query: string;
    queryKey: ReturnType<typeof markdownMentionQueryKey>;
  }) {
    const queryClient = this.config.queryClient;

    if (queryClient) {
      return queryClient.fetchQuery({
        queryKey,
        queryFn: ({ signal }) =>
          fetcher<{ mentions: MarkdownMentionOption[] }>(
            this.config.apiPath,
            {
              action,
              query,
            },
            {
              signal,
            },
          ),
        staleTime: 5 * 60 * 1000,
      });
    }

    this.abortController = new AbortController();

    return fetcher<{ mentions: MarkdownMentionOption[] }>(
      this.config.apiPath,
      {
        action,
        query,
      },
      {
        signal: this.abortController.signal,
      },
    );
  }

  private applyResult(result: MarkdownMentionSearchResult) {
    this.loading = false;
    this.options = result.status === "success" ? result.mentions : [];
    this.selectedIndex = 0;
    this.error = result.status === "error" ? "Unable to search." : "";
  }

  private render() {
    if (!this.match) {
      return;
    }

    const minQueryLength = this.config.minQueryLength ?? 0;
    const queryReady = this.match.query.length >= minQueryLength;

    this.clearPopover();

    if (!queryReady) {
      this.element.appendChild(
        createStatusElement(`Type after ${this.match.trigger}`),
      );
      return;
    }

    if (this.loading) {
      this.element.appendChild(createStatusElement("Searching..."));
      return;
    }

    if (this.error) {
      this.element.appendChild(createStatusElement(this.error));
      return;
    }

    if (!this.options.length) {
      this.element.appendChild(createStatusElement("No matching people."));
      return;
    }

    this.selectedIndex = Math.min(this.selectedIndex, this.options.length - 1);

    for (const [index, option] of this.options.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-selected", "false");
      button.setAttribute("role", "option");
      button.style.alignItems = "center";
      button.style.background = "transparent";
      button.style.border = "0";
      button.style.borderRadius = "4px";
      button.style.color = "inherit";
      button.style.cursor = "pointer";
      button.style.display = "flex";
      button.style.gap = "8px";
      button.style.padding = "6px";
      button.style.textAlign = "left";
      button.style.width = "100%";
      button.addEventListener("mouseenter", () => {
        this.selectOption(index);
      });
      button.addEventListener("click", () => {
        this.insertMention(option);
      });

      const avatar = createAvatarElement(option);
      this.roots.push(avatar.root);

      button.appendChild(avatar.element);
      button.appendChild(createLabelElement(option));
      this.element.appendChild(button);
      this.optionButtons.push(button);
    }

    this.updateOptionStyles();
  }

  private clearPopover() {
    for (const root of this.roots) {
      root.unmount();
    }

    this.roots = [];
    this.optionButtons = [];
    this.element.replaceChildren();
  }

  private menuHasKeyboardFocus() {
    const match = this.match;

    return (
      match !== null &&
      match.query.length >= (this.config.minQueryLength ?? 0) &&
      this.element.style.display !== "none"
    );
  }

  private moveSelection(offset: number) {
    if (!this.options.length) {
      return;
    }

    this.selectedIndex =
      (this.selectedIndex + offset + this.options.length) %
      this.options.length;
    this.updateOptionStyles();
  }

  private selectOption(index: number) {
    this.selectedIndex = index;
    this.updateOptionStyles();
  }

  private updateOptionStyles() {
    for (const [index, button] of this.optionButtons.entries()) {
      const selected = index === this.selectedIndex;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.style.background = selected ? "rgb(243 244 246)" : "transparent";
    }
  }
}

function findMentionMatch(
  state: EditorState,
  config: MarkdownMentionConfig,
): MentionMatch | null {
  const { selection } = state;

  if (!selection.empty) {
    return null;
  }

  const { $from } = selection;

  if (!$from.parent.isTextblock) {
    return null;
  }

  const trigger = config.trigger ?? "@";
  const textBeforeCursor = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    "\uFFFC",
  );
  const match = textBeforeCursor.match(
    new RegExp(`(^|\\s)${escapeRegExp(trigger)}([A-Za-z0-9_-]*)$`),
  );

  if (!match) {
    return null;
  }

  const matchedText = match[0];
  const prefix = match[1] ?? "";
  const query = match[2] ?? "";
  const mentionOffset =
    textBeforeCursor.length - matchedText.length + prefix.length;

  return {
    from: $from.start() + mentionOffset,
    query,
    to: selection.from,
    trigger,
  };
}

function createAvatarElement(option: MarkdownMentionOption) {
  const element = document.createElement("span");
  element.style.display = "inline-flex";
  element.style.flexShrink = "0";
  element.style.height = "24px";
  element.style.width = "24px";

  const root = createRoot(element);
  root.render(
    createElement(Avatar, {
      className: "size-6 shrink-0 p-0 text-[10px]",
      initials: option.initials ?? "?",
      url: option.avatarUrl,
    }),
  );

  return { element, root };
}

function createLabelElement(option: MarkdownMentionOption) {
  const label = document.createElement("span");
  label.textContent = option.label;
  label.style.overflow = "hidden";
  label.style.textOverflow = "ellipsis";
  label.style.whiteSpace = "nowrap";
  return label;
}

function createStatusElement(message: string) {
  const element = document.createElement("div");
  element.textContent = message;
  element.style.color = "rgb(75 85 99)";
  element.style.padding = "8px 10px";
  return element;
}

function markdownMentionQueryKey(apiPath: string, action: string, query: string) {
  return ["markdown-mentions", apiPath, action, query] as const;
}

function hasModifierKey(event: KeyboardEvent) {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function formatMentionPath(path: string, slug: string) {
  return path.replace("{slug}", encodeURIComponent(slug));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

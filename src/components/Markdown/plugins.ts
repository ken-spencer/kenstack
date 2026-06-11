import type { Content, Link, Parent, PhrasingContent, Root, Text } from "mdast";
import type { PluggableList, Plugin } from "unified";

export type MarkdownMentionTarget = {
  href?: string | null;
  label: string;
};
export type MarkdownMentionTargets = Record<number, MarkdownMentionTarget>;
export type MarkdownMentionLoader = (
  userId: number,
) => Promise<MarkdownMentionTarget | null>;

type RemarkKenStackMarkdownOptions = {
  mentionTargets?: MarkdownMentionTargets;
};

export type MarkdownTextReferenceOptions = {
  href: (match: RegExpMatchArray) => string | null | undefined;
  label: (match: RegExpMatchArray) => string;
  linkStartOffset?: (match: RegExpMatchArray) => number;
  pattern: RegExp;
};

const ignoredParentTypes = new Set([
  "definition",
  "image",
  "imageReference",
  "link",
  "linkReference",
]);

const markdownLinkPattern =
  /\[([^\]]+)\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;

export function formatUserMentionTarget(userId: number) {
  return `mention:user:${encodeURIComponent(String(userId))}`;
}

export function userMentionIdFromHref(href: string) {
  const normalizedHref = href.replace(/^<|>$/g, "");
  const match = normalizedHref.match(/^mention:user:([^/#?]+)$/);
  const encodedId = match?.[1];

  if (!encodedId) {
    return null;
  }

  let userId: number;

  try {
    userId = Number(decodeURIComponent(encodedId));
  } catch {
    return null;
  }

  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
}

export function extractUserMentionIds(content: string | string[]) {
  const contents = Array.isArray(content) ? content : [content];
  const userIds: number[] = [];

  for (const item of contents) {
    for (const match of item.matchAll(markdownLinkPattern)) {
      const label = match[1]?.trim();

      if (!label?.startsWith("@")) {
        continue;
      }

      const userId = userMentionIdFromHref(match[2] ?? "");

      if (userId) {
        userIds.push(userId);
      }
    }
  }

  return [...new Set(userIds)];
}

export async function loadMarkdownMentionTargets(
  content: string | string[],
  load: MarkdownMentionLoader,
) {
  const userIds = extractUserMentionIds(content);
  const entries = await Promise.all(
    userIds.map(async (userId) => [userId, await load(userId)] as const),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is readonly [number, MarkdownMentionTarget] =>
      Boolean(entry[1]),
    ),
  );
}

export const remarkKenStackMarkdown: Plugin<
  [RemarkKenStackMarkdownOptions?],
  Root
> = ({ mentionTargets = {} } = {}) => {
  return (tree) => {
    transformChildren(tree, {
      mentionTargets,
    });
  };
};

export function createMarkdownTextReferencePlugins(
  options: MarkdownTextReferenceOptions,
) {
  return [[remarkMarkdownTextReferences, options]] satisfies PluggableList;
}

const remarkMarkdownTextReferences: Plugin<
  [MarkdownTextReferenceOptions],
  Root
> = (options) => {
  return (tree) => {
    linkTextReferencesInChildren(tree, options);
  };
};

function linkTextReferencesInChildren(
  parent: Parent,
  options: MarkdownTextReferenceOptions,
) {
  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];

    if (child.type === "text") {
      const replacement = linkTextReferences(child, options);

      if (replacement) {
        parent.children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }

      continue;
    }

    if (isParent(child) && !ignoredParentTypes.has(child.type)) {
      linkTextReferencesInChildren(child, options);
    }
  }
}

function linkTextReferences(node: Text, options: MarkdownTextReferenceOptions) {
  const replacements: PhrasingContent[] = [];
  let lastIndex = 0;
  let matched = false;

  for (const match of node.value.matchAll(globalPattern(options.pattern))) {
    const href = options.href(match);
    const startIndex = match.index ?? 0;

    if (!href) {
      continue;
    }

    const textBeforeReference = node.value.slice(
      lastIndex,
      startIndex + (options.linkStartOffset?.(match) ?? 0),
    );

    matched = true;
    if (textBeforeReference) {
      replacements.push({ type: "text", value: textBeforeReference });
    }
    replacements.push({
      type: "link",
      url: href,
      children: [{ type: "text", value: options.label(match) }],
    });
    lastIndex = startIndex + match[0].length;
  }

  if (!matched) {
    return undefined;
  }

  const textAfterLastReference = node.value.slice(lastIndex);

  if (textAfterLastReference) {
    replacements.push({ type: "text", value: textAfterLastReference });
  }

  return replacements;
}

function globalPattern(pattern: RegExp) {
  return pattern.global
    ? pattern
    : new RegExp(pattern.source, `${pattern.flags}g`);
}

function transformChildren(
  parent: Parent,
  options: {
    mentionTargets: MarkdownMentionTargets;
  },
) {
  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];

    if (child.type === "link") {
      const replacement = resolveMentionLink(child, options.mentionTargets);

      if (replacement) {
        parent.children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }

      continue;
    }

    if (isParent(child) && !ignoredParentTypes.has(child.type)) {
      transformChildren(child, options);
    }
  }
}

function resolveMentionLink(
  node: Link,
  mentionTargets: MarkdownMentionTargets,
) {
  const userId = userMentionIdFromHref(node.url);

  if (!userId) {
    return undefined;
  }

  const target = mentionTargets[userId];

  if (!target) {
    return node.children;
  }

  const text = target.label.startsWith("@") ? target.label : `@${target.label}`;

  if (target.href) {
    node.url = target.href;
    node.children = [{ type: "text", value: text }];
    return undefined;
  }

  return [{ type: "text", value: text }] satisfies PhrasingContent[];
}

function isParent(node: Content): node is Content & Parent {
  return "children" in node && Array.isArray(node.children);
}

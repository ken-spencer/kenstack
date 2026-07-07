const idPattern = /^\d+$/;

export function parseAdminRouteSegments(segments: string[]) {
  const [first, second, third] = segments;

  if (!first || segments.length > 3) {
    return null;
  }

  if (idPattern.test(first)) {
    if (!second || (third !== undefined && third !== "new")) {
      return null;
    }

    return {
      name: second,
      isNew: third === "new",
      parentId: Number(first),
    };
  }

  if (segments.length > 2) {
    return null;
  }

  if (second === undefined) {
    return {
      name: first,
      isNew: false,
    };
  }

  if (second === "new") {
    return {
      name: first,
      isNew: true,
    };
  }

  if (!idPattern.test(second)) {
    return null;
  }

  return {
    name: first,
    id: Number(second),
    isNew: false,
  };
}

export function getAdminPathModuleName(pathname: string) {
  const [, adminSegment, ...segments] = pathname.split("/");

  if (adminSegment !== "admin") {
    return undefined;
  }

  return parseAdminRouteSegments(segments)?.name;
}

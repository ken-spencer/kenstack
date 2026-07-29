// Builds the relation cache key shared by server hydration, panel loads, and save updates.
export function getOneToOneQueryKey({
  name,
  parentId,
  relationKey,
}: {
  name: string;
  parentId: number;
  relationKey: string;
}) {
  return ["admin-one-to-one", name, parentId, relationKey];
}

import { useAdminEdit } from "@kenstack/modules/AdminEdit/context";
import apiAction from "@kenstack/client/apiAction";
import { keepPreviousData, useQuery } from "@kenstack/query";
import Notice from "@kenstack/components/Notice";

export default function Dialog({
  ref,
  inputRef,
  field,
  keywords,
  setKeywords,
}) {
  const { apiPath } = useAdminEdit();

  const { data, error, isLoading } = useQuery({
    queryKey: ["load-tags", field.name, field.value, keywords],
    queryFn: () =>
      apiAction(apiPath + "/load-tags", {
        exclude: field.value,
        field: field.name,
        keywords,
      }),
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return null;
  }

  const values = field.value || [];
  const tags = data.tags
    ? data.tags.filter((tag) => !values.includes(tag))
    : [];
  if (data.tags && data.tags.length === 0) {
    return;
  }

  return (
    <div ref={ref} className="top-1 z-10 relative">
      <div className="flex flex-col absolute inset-x-0 max-w-64 max-h-64 overflow-auto multi-select-dialog admin-border">
        {data?.error || error ? (
          <Notice error={data?.error ?? error.message} />
        ) : (
          tags.map((tag) => (
            <button
              key={tag}
              type="button"
              tabIndex={-1}
              className="px-2 py-1 border-y text-left border-gray-700 bg-white focus:bg-gray-200 hover:bg-gray-200  dark:bg-black dark:focus:bg-gray-800 dark:hover:bg-gray-800 transition"
              onClick={() => {
                setKeywords("");

                if (!field.value) {
                  field.setValue([tag]);
                } else if (!field.value.includes(tag)) {
                  field.setValue([...field.value, tag].sort());
                }
                inputRef.current.focus();
              }}
            >
              {tag}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

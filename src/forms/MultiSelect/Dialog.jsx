import { useRef, useEffect } from "react";
import { keepPreviousData, useQuery } from "@kenstack/query";

import Loading from "@kenstack/components/Loading";
import Search from "./Search";
import useDebounce from "@kenstack/hooks/useDebounce";
import Notice from "@kenstack/components/Notice";

import CheckIcon from "@kenstack/icons/Check";

export default function Dialog({
  field,
  options,
  loadOptions,
  open = false,
  onClose,
}) {
  const [keywords, debouncedKeywords, setKeywords] = useDebounce();

  const ref = useRef();

  useEffect(() => {
    const dialog = ref.current;
    if (open) {
      const rect = dialog.parentNode.getBoundingClientRect();
      dialog.style.width = rect.width + "px";
      dialog.style.top = rect.top + "px";
      dialog.style.left = rect.left + "px";
      dialog.showModal();
      // ref.current.show();
    } else {
      dialog.close();
    }
  }, [open]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["multi-select", field.name, debouncedKeywords],
    queryFn: () => {
      if (options) {
        return {
          options: keywords
            ? options.filter(([key, label]) => {
                const k = keywords.toLowerCase();
                return label.toLowerCase().includes(k);
              })
            : options,
        };
      }
    },
    enabled: open,
    placeholderData: keepPreviousData,
  });

  return (
    <dialog
      // open={open}
      className="z-10 multi-select-dialog admin-border"
      ref={ref}
      onClick={(e) => {
        if (e.target === ref.current) {
          ref.current.close();
        }
      }}
      onClose={() => {
        if (onClose) {
          onClose();
        }
      }}
    >
      <Search keywords={keywords} setKeywords={setKeywords} autofocus />
      <hr className="border-t border-gray-200 dark:border-gray-800" />
      {(data?.error || error) && (
        <Notice error={data?.error ?? error.message} />
      )}
      {isLoading && <Loading />}
      <div className="flex flex-col max-h-64 overflow-auto">
        {data?.options &&
          data.options.map(([key, label]) => {
            const selected = field?.value.includes(key);
            return (
              <button
                className="flex items-center gap-2 px-2 py-1 border-y border-gray-700 hover:bg-gray-900 transition"
                type="button"
                // disabled={selected}
                key={key}
                onClick={() => {
                  let newValue = field.value ? [...field.value] : [];
                  if (selected) {
                    newValue = newValue.filter((k) => k !== key);
                  } else {
                    newValue.push(key);
                  }
                  field.setValue(newValue);
                }}
              >
                <div className="w-4 h-4">
                  {selected && <CheckIcon className="w-4 h-4" />}
                </div>
                {label}
              </button>
            );
          })}
      </div>
    </dialog>
  );
}

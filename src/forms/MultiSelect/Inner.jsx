import CancelIcon from "@kenstack/icons/Cancel";
import { keepPreviousData, useQuery } from "@kenstack/query";
import Loading from "@kenstack/components/Loading";
import Notice from "@kenstack/components/Notice";

export default function Inner({ field, options, loadOptions }) {
  let queryFn;
  if (options) {
    queryFn = () => ({
      options: options.filter(([key]) => {
        return field.value && field.value.includes(key);
      }),
    });
  }

  if (loadOptions) {
    queryFn = () => loadOptions({ idArray: field.value });
  }

  const { data, error, isLoading } = useQuery({
    queryKey: ["multi-select", field.name, field.value],
    queryFn,
    enabled: field.value?.length > 0,
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (data?.error || error) {
    return <Notice error={data?.error ?? error.message} />;
  }

  if (!field?.value?.length || !data?.options?.length) {
    return <div>None selected</div>;
  }

  return (
    <div>
      {data.options.map(([key, label]) => {
        return (
          <div className="flex gap-2 vertical-center" key={key}>
            {label}
            <label className="flex items-center cursor-pointer">
              <CancelIcon className="w-4 h-4" />
              <input
                className="sr-only"
                name={field.name}
                type="checkbox"
                defaultChecked
                value={key}
                onChange={() => {
                  field.setValue(field.value.filter((k) => k != key));
                }}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}

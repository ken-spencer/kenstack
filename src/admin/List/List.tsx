import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAdminList } from "./context";

import Progress from "@kenstack/components/Progress";
import Alert from "@kenstack/components/Alert";
import { Checkbox } from "@kenstack/components/ui/checkbox";

export default function AdminListWrapper() {
  return (
    <div className="border-t border-b">
      <AdminList />
    </div>
  );
}

function AdminList() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    selected,
    setSelected,
    // apiPath,
    query,
    adminConfig: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      schema,
      list: { component: ListItemComponent },
    },
  } = useAdminList();

  const { data, error, isPending } = query;

  const [cols, setCols] = useState(2);
  const measureRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (data?.status === "success" && measureRef.current) {
      setCols(measureRef.current.children.length - 1);
    }
  }, [data]);

  if (error) {
    return <Alert className="my-2">{error.message}</Alert>;
  }

  if (isPending) {
    return <Progress className="my-16" />;
  }

  if ("error" === data.status) {
    return <Alert className="my-2">{data.message}</Alert>;
  }

  if (data.items.length === 0) {
    return <div className="py-2">No results</div>;
  }

  const firstItem = data.items[0];

  return (
    <>
      {/* hidden measurer for first row to determine column count */}
      <div ref={measureRef} className="hidden">
        {firstItem ? <ListItemComponent path="#" item={firstItem} /> : null}
      </div>

      <div
        className={`grid gap-x-2 grid-cols-[min-content_1fr] ${cols > 0 ? "md:[grid-template-columns:min-content_repeat(var(--cols),auto)_1fr]" : ""} md:items-center`}
        style={{ "--cols": cols } as React.CSSProperties}
      >
        {data.items.map((item, key) => {
          const path =
            pathname +
            "/" +
            item.id +
            (searchParams.size ? "?" + searchParams : "");
          return (
            <Fragment key={item.id}>
              <div className="p-1 flex items-center justify-self-start col-start-1">
                <Checkbox
                  checked={selected.includes(item.id)}
                  onCheckedChange={(checked) => {
                    return checked
                      ? setSelected([...selected, item.id])
                      : setSelected(
                          selected.filter((value) => value !== item.id)
                        );
                  }}
                />
              </div>
              <div className="flex flex-col gap-1 md:contents">
                <ListItemComponent path={path} item={item} />
              </div>
              {data.items.length > key + 1 ? (
                <div className="col-span-full my-2 border-t" />
              ) : (
                <div className="col-span-full mt-2 " />
              )}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}

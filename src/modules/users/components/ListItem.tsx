import Link from "next/link";
import MetaDates from "@kenstack/admin/MetaDates";
import { type ListItemComponent } from "@kenstack/admin/client";

const ListItem: ListItemComponent<{ lastName: string; firstName: string }> = ({
  path,
  item,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:gap-4">
      <Link className="text-lg" href={path}>
        {item.firstName} {item.lastName}
        <MetaDates createdAt={item.createdAt} updatedAt={item.updatedAt} />
      </Link>
      {/* <div>{item.subscribed ? "Subscribed" : "-"}</div> */}
    </div>
  );
};

export default ListItem;

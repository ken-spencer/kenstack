import Link from "next/link";
import MetaDates from "@kenstack/admin/components/MetaDates";
import { type ListItemComponent } from "@kenstack/admin/client";

const ListItem: ListItemComponent<{
  familyName: string;
  givenName: string;
}> = ({ path, item }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:gap-4">
      <Link className="text-lg" href={path}>
        {item.givenName} {item.familyName}
        <MetaDates createdAt={item.createdAt} updatedAt={item.updatedAt} />
      </Link>
      {/* <div>{item.subscribed ? "Subscribed" : "-"}</div> */}
    </div>
  );
};

export default ListItem;

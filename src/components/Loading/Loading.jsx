import Progress from "@kenstack/icons/Progress";
import "./loading.scss";

export default function Loading() {
  return (
    <div className="admin-loading">
      <Progress
        className="admin-loading text-gray-400"
        width="64"
        height="64"
      />
    </div>
  );
}

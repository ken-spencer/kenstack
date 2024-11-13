
export default function AdminTitle({ modelName, children = null }) {
  if (!children) {
    return null;
  }

  return (
    <div className="admin-toolbar-middle">
      {children}
    </div>
  );
}

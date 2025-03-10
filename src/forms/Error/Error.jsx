export default function Error({ field, ...props }) {
  if (!field.error) {
    return null;
  }

  return (
    <div className="mt-2 w-full text-red-400 text-xs italic" {...props}>
      {field.error}
    </div>
  );
}

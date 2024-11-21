export default function Input({ start, end, className, ...props }) {
  if (start || end) {
    return (
      <label className={"label-input" + (className ? " " + className : "")}>
        {start && <span className="start">{start}</span>}
        <input {...props} />
        {end && <span className="end">{end}</span>}
      </label>
    );
  }
  return (
    <input
      {...props}
      className={"input" + (className ? " " + className : "")}
    />
  );
}

export default function Label({ field, className, ...props }) {
  const { required, id } = field.props;
  const classes = "label" + (className ? " " + className : "");

  return (
    <label className={classes} htmlFor={id} {...props}>
      {field.label}
      {required && <span className="required">*</span>}
    </label>
  );
}

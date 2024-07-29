// import admin from "../admin.module.scss";

import "./section.scss";

export default function Section({
  header = null,
  className,
  children,
  ...props
}) {
  return (
    <section
      {...props}
      className={"admin-section" + (className ? " " + className : "")}
    >
      <header>{header}</header>
      <main>{children}</main>
    </section>
  );
}

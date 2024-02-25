import styles from "./main.module.css";

export default function Main({ children }) {
  return <main className={"darkTheme " + styles.main}>{children}</main>;
}

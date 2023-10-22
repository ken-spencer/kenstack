import styles from "styles/main.module.scss";

export default function H1({ children }) {
  return <h1 className={styles.row}>{children}</h1>;
}

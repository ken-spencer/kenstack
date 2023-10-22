import TopBar from "components/TopBar";

import styles from "./template.module.css";

export default function Template({ children }) {
  return (
    <>
      <header className={styles.toolbar}>
        <TopBar />
      </header>
      {children}
    </>
  );
}

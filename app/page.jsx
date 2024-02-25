import styles from "./page.module.css";

// export const runtime = "edge";
export const metadata = {
  title: "Thaumazo | Home",
};

// import Bootstrap from "../src/components/admin/Bootstrap";
export default function Home() {
  // return <Bootstrap />;
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          {"Welcome to ken's test site. To get started click the admin link in the top right."} 
        </p>
      </div>
    </main>
  );
}

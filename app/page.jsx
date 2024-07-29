// import styles from "./page.module.css";

// export const runtime = "edge";
export const metadata = {
  title: "Thaumazo | Home",
};

// import Bootstrap from "../src/components/admin/Bootstrap";
export default function Home() {
  // return <Bootstrap />;

  return (
    <div className="fixed top-16 bottom-16 left-0 right-0 mt-[50px] flex items-center justify-center bg-red-500 bg-opacity-50">
      <h1> foo bar: {Date.now() / 1000} </h1>
      <div className="bg-white w-full max-w-md mx-4 my-4 p-4 rounded-lg h-full">
        <div className="flex flex-col h-full">
          <div className="mb-4">
            <h2 className="text-xl font-semibold font-black">Modal Header</h2>
            {/* Add more header content here if needed */}
          </div>
          <div className="flex flex-grow overflow-hidden">
            <div className="w-1/2 pr-2 flex flex-col h-full">
              <div className="mb-2">
                <h3 className="text-lg font-medium bg-blue-300">
                  Left Column Header
                </h3>
              </div>
              <div className="flex-grow overflow-y-auto">
                <div style={{ color: "black" }}>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                  <p>Scrollable content...</p>
                </div>
              </div>
            </div>
            <div className="w-1/2 pl-2">
              <div style={{ color: "black" }}>
                <h3 className="text-lg font-medium">Right Column</h3>
                <p>Static content...</p>
                <p>Static content...</p>
                <p>Static content...</p>
                <p>Static content...</p>
                <p>Static content...</p>
                <p>Static content...</p>
                <p>Static content...</p>
                <p>Static content...</p>
                <p>Static content...</p>
                <p>Static content...</p>
                <p>Static content...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  /*
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          {
            "Welcome to ken's test site. To get started click the admin link in the top right."
          }
        </p>
      </div>
    </main>
  );
  */
}

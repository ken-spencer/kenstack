import TopBar from "components/TopBar";

export default function Template({ children }) {
  return (
    <div>
      <TopBar />
      {children}
    </div>
  );
}

import { useState } from "react";
import Loading from "@kenstack/components/Loading";
import Search from "./Search";


export default function Dialog() {
  const [ keywords, setKeywords ] = useState("");

  return (
    <div className="absolute admin-border bg-white dark:bg-black">
      <Search
        keywords={keywords}
        setKeywords={setKeywords}
        autofocus
      />
      <hr className="border-t border-gray-200 dark:border-gray-800" /> 
      <Loading />
    </div>
  )
}

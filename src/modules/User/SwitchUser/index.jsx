import dynamic from "next/dynamic";
import Loading from "@kenstack/components/Loading";

const SwitchUser = dynamic(() => import("./SwitchUser"), {
  // ssr: false,
  loading: Loading,
});

export default function SwitchUserCont(props) {
  return <SwitchUser {...props} />;
}

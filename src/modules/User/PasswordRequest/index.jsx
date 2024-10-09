import dynamic from "next/dynamic";
import Loading from "@kenstack/components/Loading";

const ResetPasswordField = dynamic(() => import("./ResetPassword"), {
  // ssr: false,
  loading: Loading,
});

export default function ResetPasswordFieldCont(props) {
  return <ResetPasswordField {...props} />;
}

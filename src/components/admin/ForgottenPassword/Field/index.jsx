import dynamic from "next/dynamic";
import Loading from "../../Loading";

const ResetPasswordField = dynamic(() => import("./ResetPassword"), {
  // ssr: false,
  loading: Loading,
});

export default function ResetPasswordFieldCont() {
  return <ResetPasswordField />;
}

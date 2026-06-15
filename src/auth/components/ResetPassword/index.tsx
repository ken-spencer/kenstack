import Suspense from "@kenstack/components/Suspense";
import Loader from "./Loader";

export default async function ResetPasswordFormCont({
  token,
}: {
  token?: string;
}) {
  return (
    <Suspense>
      <Loader token={token} />
    </Suspense>
  );
}

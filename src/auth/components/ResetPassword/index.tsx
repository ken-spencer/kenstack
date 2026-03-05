import Suspense from "@kenstack/components/Suspense";
import Loader from "./Loader";

export default async function ResetPasswordFormCont({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <Suspense>
      <Loader searchParams={searchParams} />
    </Suspense>
  );
}

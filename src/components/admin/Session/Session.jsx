import verifyJWT from "@thaumazo/cms/auth/verifyJWT";
import Revalidate from "./Revalidate";

export default async function Session({ children }) {
  const claims = await verifyJWT(["ADMIN"]);
  if (!claims) {
    return null;
  }

  const secondsRemaining = claims.exp - Date.now() / 1000;

  if (secondsRemaining > 1800) {
    return children;
  }

  return (
    <>
      <Revalidate />
      {children}
    </>
  );
}

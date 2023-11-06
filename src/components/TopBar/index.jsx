import getClaims from "../../auth/getClaims";
import Toolbar from "./Toolbar";

export default async function TopBarCont() {
  const claims = await getClaims();

  return <Toolbar claims={claims} />;
}

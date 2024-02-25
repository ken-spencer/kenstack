import Suspense from "../Suspense";
import Edit from "./Edit";
import Layout from "../Layout";

export default async function AdminEditCont(props) {
  return (
    <Layout>
      <Suspense>
        <Edit {...props} />
      </Suspense>
    </Layout>
  );
}

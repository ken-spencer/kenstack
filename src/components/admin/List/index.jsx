import Suspense from "../Suspense";
import List from "./List";
import Layout from "../Layout";

export default async function AdminListIndex(props) {
  return (
    <Layout>
      <Suspense>
        <List {...props} />
      </Suspense>
    </Layout>
  );
}

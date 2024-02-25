import "server-only";

import Form from "./Form";
import Layout from "../Layout";

export default function ResetPassword() {
  return (
    <Layout>
      <div className="py-6">
        <Form />
      </div>
    </Layout>
  );
}

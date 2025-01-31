/**
 * You can use this component to setup your intial user. Be sure to remove it
 * from any production build as culd be a security risk.
 **/

// import saveAction from "./saveAction";

import Form from "./Form";
import Notice from "@kenstack/components/Notice";

export default async function AdminSetup({ session, action }) {
  const User = session.userModel;
  const user = await User.findOne();

  if (user) {
    return (
      <Notice error="An administrator has successfully been added. Please remove this component." />
    );
  }

  return <Form action={action} />;
}

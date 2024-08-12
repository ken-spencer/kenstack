import Dialog from "./Dialog";
import AutoForm from "@admin/forms/AutoForm";

import fields from "./Login/fields";
// import loginAction from "./../../auth/loginAction";

export default function AdminLogin({ login, setLogin }) {
  const handleResponse = (evt, form) => {
    if (form.state.authenticated) {
      setLogin(null);
    }
  };

  const handleSubmit = (evt, form) => {
    evt.preventDefault();
    const formData = new FormData(form.ref.current);
    fetch(thaumazoAdmin.pathName("/api/login"), {
      method: "POST",
      body: formData,
      cache: "no-store", // This tells the browser not to cache the response
    })
      .then((res) => res.json())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
      })
      .then((json) => {
        form.state = json;
      });
  };

  return (
    <Dialog
      fullWidth={true}
      maxWidth="xs"
      open={login ? true : false}
      title="Login required"
    >
      <div style={{ width: "100%" }} />
      <AutoForm
        description={login}
        fields={fields}
        onSubmit={handleSubmit}
        submit="Sign in"
        onResponse={handleResponse}
      />
    </Dialog>
  );
}
/*
        action={loginAction}
        */

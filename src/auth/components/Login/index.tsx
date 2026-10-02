import { Suspense } from "react";

import { loadLoginFormProps } from "./loadFormProps";

import Form from "./Form";

// The remembered method lives in a cookie so the server renders the preferred
// form on first paint; the Suspense boundary keeps that runtime read and the
// active verification lookup prerender-safe.
export default function LoginForm() {
  return (
    <Suspense fallback={<div className="min-h-72 animate-pulse" />}>
      <RememberedForm />
    </Suspense>
  );
}

async function RememberedForm() {
  const formProps = await loadLoginFormProps();

  return <Form {...formProps} />;
}

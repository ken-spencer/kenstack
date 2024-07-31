import Notice from "../Notice";

import useForm from "@admin/forms/useForm";

export default function EditNotice() {
  const form = useForm();

  // avoid seing a breif notice if leaving page
  if (form.state.redirect) {
    return null;
  }

  return <Notice formState={form.state} />;
}

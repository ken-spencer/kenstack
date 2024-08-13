import Section from "@kenstack/components/admin/Section";
import Input from "@kenstack/forms/Input";
import Form from "@kenstack/forms/Form";

import useLibrary from "../useLibrary";
import saveAction from "./api/saveAction";
import defaultError from "@kenstack/defaultError";

export default function EditForm({ file }) {
  const { setError } = useLibrary();

  return (
    <Section className="h-full" header="Details">
      <Form className="flex flex-wrap gap-4">
        <Input
          name="alt"
          label="Alternate text"
          onBlur={(evt) => {
            saveAction({
              action: "alt",
              id: file.id,
              alt: evt.target.value,
            }).then(
              (res) => {
                if (res.error) {
                  setError(res.error);
                }
              },
              (e) => {
                setError(defaultError);
              },
            );
          }}
        />
      </Form>
    </Section>
  );
}

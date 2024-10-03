import React, { memo, useMemo } from "react";
import sentenceCase from "@kenstack/utils/sentenceCase";
import { twMerge } from "tailwind-merge";

// import GridItem from "../Grid/Item";

import pick from "lodash/pick";
import omit from "lodash/omit";
import InputField from "../Input";
import TextArea from "../TextArea";
import Password from "../Password";
import Checkbox from "../Checkbox";
import CheckboxList from "../CheckboxList";
import Radio from "../Radio";
import Select from "../Select";
import Slug from "../Slug";

function Field({ field = "text", span = "", containerClass = "", ...props }) {
  props.containerClass = useMemo(
    () => twMerge("col-span-12", containerClass),
    [containerClass, span],
  );

  const fieldProps = useMemo(() => {
    let retval = props;

    if (!("label" in retval)) {
      retval.label = sentenceCase(retval.name);
    }

    return retval;
  }, [props]);

  return (
    <>
      {(() => {
        if (typeof field === "function" || typeof field === "object") {
          // const Lazy = React.lazy(field);
          // return <Suspense><Lazy {...fieldProps}/></Suspense>;
          const Field = field;
          return <Field {...fieldProps} />;
        }

        switch (field.toLowerCase()) {
          case "text":
          case "input":
            return <InputField {...fieldProps} />;
          case "textarea":
            return <TextArea {...fieldProps} />;
          case "password":
            return <Password {...fieldProps} />;
          case "checkbox":
            return <Checkbox {...fieldProps} />;
          case "checkboxlist":
            return <CheckboxList {...fieldProps} />;
          case "radio":
            return <Radio {...fieldProps} />;
          case "select":
            return <Select {...fieldProps} />;
          case "slug":
            return <Slug {...fieldProps} />;
          default:
            throw Error("unknown field type: " + field);
        }
      })()}
    </>
  );
}

export default memo(Field);

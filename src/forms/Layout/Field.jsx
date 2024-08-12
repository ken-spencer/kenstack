import React, { memo, useMemo } from "react";
import sentenceCase from "@admin/utils/sentenceCase";

import GridItem from "../Grid/Item";

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

import gridPropsList from "./gridProps";

function Field({ field = "text", ...props }) {
  const gridProps = useMemo(() => {
    let retval = pick(props, gridPropsList);

    if (Object.keys(retval).length === 0) {
      retval.md = 12;
    }
    return retval;
  }, [props]);

  const fieldProps = useMemo(() => {
    let retval = omit(props, gridPropsList);
    /*
    pick(props, [
      "value",
      "label",
      "max",
      "min",
      "pattern",
      "placeholder",
      "required",
      "type",
    ]);
    */

    if (!("label" in retval)) {
      retval.label = sentenceCase(retval.name);
    }

    return retval;
  }, [props]);
  return (
    <GridItem {...gridProps}>
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
    </GridItem>
  );
}

export default memo(Field);

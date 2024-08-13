import { useReducer, useMemo, useId, useRef, useEffect } from "react";

import omit from "lodash/omit";
import sentenceCase from "@kenstack/utils/sentenceCase";
import checkInputValidity from "./validity/checkInputValidity";
import useForm from "./useForm";

const reducer = (count) => count + 1;
const validities = ["required", "pattern"];

export default function useField(
  { onChange, onBlur, ...props },
  userRef = null,
) {
  const ref = useRef();
  const { name } = props;
  const form = useForm();
  const id = name + "-" + useId().slice(2, -1);
  const [change, reRender] = useReducer(reducer, 0);
  useEffect(() => {
    form.notifySubscribers(name);
  }, [form, name, change]);

  if (!name) {
    throw Error("Name is required.");
  }

  const { [name]: initial = "" } = form.initialValues || {};
  // const [, setValue] = useState(initial);

  function checkValidity() {
    return checkInputValidity(form, field, props);
  }

  let field;
  if (form.fields.has(name)) {
    field = form.fields.get(name);
  } else {
    field = new FieldState(reRender);
    field.name = name;
    field.ref = userRef || ref;
    field.initialValue = initial;
    field.interacted = false;
    form.fields.set(name, field);
    field.initProp("value", initial);
    field.initProp("blurred", false);
    field.initProp("error", "");
  }
  field.label =
    props.label === undefined ? sentenceCase(props.name) : props.label;
  field.checkValidity = checkValidity;

  const fieldErrors = form.state?.fieldErrors || {};
  let errorMessage = fieldErrors[name];
  if (
    !errorMessage &&
    form.noValidate == false &&
    ((field.blurred && field.interacted) || form.showErrors)
  ) {
    errorMessage = field.checkValidity();
  }
  field.error = errorMessage;

  const disabled = form.disabled;
  const fieldProps = form.fieldProps;
  field.props = useMemo(() => {
    let retval = omit(props, [
      "label",
      "message",
      "email",
      "unique",
      "password",
      "matches",
    ]);

    if (!retval.id) {
      retval.id = id;
    }

    if (disabled) {
      retval.disabled = true;
    }

    if (fieldProps) {
      Object.assign(retval, fieldProps);
    }

    for (let check of validities) {
      const info = retval[check];
      if (!info || info === true) {
        continue;
      }

      if (check === "required") {
        retval[check] = true;
      }

      if (check === "pattern" && typeof info === "object") {
        retval[check] = info.pattern;
      }
    }

    /*
    if (errorMessage) {
      retval.helperText = errorMessage;
      retval.FormHelperTextProps = {
        error: true,
      };
    }
    */

    retval.onChange = (evt) => {
      if (onChange) {
        onChange(evt, field);
      }
      const input = evt.target;
      if (input.type === "checkbox") {
        // Checkbox list
        // if (input.name.at(-1) === "]") {
        if (field.props.options) {
          // const pos = input.name.indexOf("[");
          // if (pos === -1) {
          // throw Error("[ character expected in name");
          // }
          if (field.value && !Array.isArray(field.value)) {
            throw Error("CheckboxList requires it's value to be an array");
          }
          const last = field.value ? [...field.value] : [];
          // const key = input.name.slice(pos + 1, -1);

          if (input.checked) {
            if (!last.includes(input.value)) {
              last.push(input.value);
            }
            field.value = last;
            return;
          }
          field.value = last.filter((v) => v !== input.value);
          return;
        }

        field.value = input.checked ? input.value : "";
        return;
      }

      field.value = input.value;
    };

    retval.onBlur = (evt) => {
      if (onBlur) {
        onBlur(evt, field);
      }

      if (
        !evt.relatedTarget ||
        evt.target.nodeName !== evt.relatedTarget.nodeName ||
        evt.target.name !== evt.relatedTarget.name
      ) {
        field.blurred = true;
      }
    };

    return retval;
  }, [props, disabled, fieldProps, id, onBlur, onChange, field]);

  return field;
}

class FieldState {
  initialValue = null;
  #props = new Map();

  constructor(reRender) {
    this.reRender = reRender;
  }

  initProp(name, initial) {
    this.#props.set(name, initial);

    Object.defineProperty(this, name, {
      get: function () {
        return this.#props.get(name);
      },
      set: function (value) {
        if (this.#props.get(name) === value) {
          return;
        }
        this.#props.set(name, value);
        if (name === "value") {
          this.interacted = true;
        }

        this.reRender();
        // hack until better idea to update error validation on password match filed
        if (this.matchField) {
          this.matchField.reRender();
        }
      },
      enumerable: true,
      configurable: true,
    });
  }

  toString() {
    return "";
  }
}

"use client";

import { createStore } from "zustand";

import sentenceCase from "@kenstack/utils/sentenceCase";
import checkValue from "../validity/checkValue";
// import { nanoid } from "nanoid";
import messageStore from "@kenstack/mixins/messageStore";
import getField from "@kenstack/forms/lib/getField";

const empty = {};
export default function createFormStore(
  form,
  { values: initialValues = empty, apiPath = null }
) {
  return createStore((set, get) => {
    const setField = (name, ...args) => {
      set((state) => {
        let newValue;
        const [arg] = args;
        if (args.length > 1) {
          if (state.fields[name][arg] === args[1]) {
            return state;
          }
          newValue = { [arg]: args[1] };
        } else if (arg instanceof Function) {
          newValue = arg(state.fields[name]);
          if (newValue === state.fields[name]) {
            return state;
          }
        } else {
          newValue = arg;
        }

        return {
          // ...state,
          fields: {
            ...state.fields,
            [name]: {
              ...state.fields[name],
              ...newValue,
            },
          },
        };
      });
    };

    const handleInvalid = (invalidFields, name, error) => {
      if (error) {
        if (invalidFields.has(name) === false) {
          let newInvalidFields = new Set(invalidFields);
          newInvalidFields.add(name);
          return {
            invalidFields: newInvalidFields,
            invalid: true,
          };
        }
      } else {
        if (invalidFields.has(name) === true) {
          let newInvalidFields = new Set(invalidFields);
          newInvalidFields.delete(name);
          return {
            invalidFields: newInvalidFields,
            invalid: newInvalidFields.size > 0,
          };
        }
      }

      return {
        invalidFields,
        invalid: invalidFields.size > 0,
      };
    };

    const fieldStore = {};
    const valueStore = {};
    for (const [name, field] of Object.entries(form.fields)) {
      // const initialValue = initialValues[name] || field.default || "";
      const initialValue = getInitialValue(initialValues, name, field);
      valueStore[name] = initialValue;
      fieldStore[name] = {
        value: initialValue,
        getInitialValue: () => get().initialValues[name],
        setValue: (value) => get().setValue(name, value),
        error: "",
        setError: (error) =>
          set((state) => {
            const errorField = state.fields[name];
            if (errorField.error === error) {
              return state;
            }

            return {
              ...handleInvalid(state.invalidFields, name, error),
              fields: {
                ...state.fields,
                [name]: {
                  ...errorField,
                  error,
                },
              },
            };
          }),
        disabled: false,
        setDisabled: (value) => setField(name, "disabled", value),
        blurred: false,
        setBlurred: (value) => setField(name, "blurred", value),
        interacted: false,
        ...field,
        name,
        label: field.label || sentenceCase(name),
      };
    }

    const getInitialInvalid = (values) => {
      let retval = {
        invalidFields: new Set(),
        invalid: false,
      };
      for (const [name, field] of Object.entries(form.fields)) {
        let error = checkValue(name, field, values);
        retval = handleInvalid(retval.invalidFields, name, error);
      }
      return retval;
    };
    const initialInvalid = getInitialInvalid(valueStore);

    const initialState = {
      apiPath,
      noValidate: false,
      setNoValidate: (noValidate) => set({ noValidate }),
      ...initialInvalid,
      disabled: false,
      setDisabled: (disabled) => set({ disabled }),
      pending: false,
      setPending: (pending) => set({ pending }),
      uploading: new Set(), // list of fields that are uploading
      setUploading: (update) =>
        set((state) => ({
          uploading:
            typeof update === "function" ? update(state.uploading) : update,
        })),
      showErrors: false,
      setShowErrors: (showErrors) =>
        set((state) => {
          if (state.showErrors === showErrors) {
            return {};
          }

          const values = state.values;
          // let invalid = {invalidFields: state.invalidFields};
          for (let field of Object.values(state.fields)) {
            let error = "";
            if (!state.noValidate && showErrors) {
              error = checkValue(field.name, field, values);
            }
            field.setError(error);
            // invalid = handleInvalid(state.invalidFields, name, error);
          }

          return { showErrors };
        }),
      fields: fieldStore,
      setField,
      initialValues: valueStore,
      values: valueStore,
      setValue: (name, value) =>
        set((state) => {
          const field = state.fields[name];
          if (state.values[name] === value) {
            return state;
          }

          let changedFields = state.changedFields;
          if (value !== state.initialValues[name]) {
            if (changedFields.has(name) === false) {
              changedFields = new Set(changedFields);
              changedFields.add(name);
            }
          } else {
            if (changedFields.has(name) === true) {
              changedFields = new Set(changedFields);
              changedFields.delete(name);
            }
          }

          const newFields = {
            ...state.fields,
            [name]: {
              ...field,
              value,
              interacted: true,
            },
          };

          const newValues = { ...state.values, [name]: value };
          let invalid = {};
          if (!state.noValidate) {
            let error = checkValue(field.name, field, newValues);
            if (state.showErrors || (field.blurred && field.interacted)) {
              newFields[name].error = error;
            }
            invalid = handleInvalid(state.invalidFields, name, error);
          }

          return {
            // ...state,
            ...invalid,
            values: newValues,
            changedFields,
            changed: changedFields.size > 0,
            fields: newFields,
          };
        }),

      changedFields: new Set(),
      changed: false,
      schema: form,
      // getValues: () => {
      //   const values = {};
      //   for (let [key, field] of Object.entries(get().fields)) {
      //     values[key] = field.value;
      //   }
      //   return values;
      // },
      setValues: (values) =>
        set((state) => {
          if (values === state.values) {
            return state;
          }

          const fields = {};
          for (const [name, f] of Object.entries(state.fields)) {
            const field = {
              ...f,
              value: getInitialValue(values, name, form.fields[name]), //values[name] || "",
            };
            fields[name] = field;
            values[name] = field.value;
          }

          const invalid = getInitialInvalid(values);
          return {
            values,
            initialValues: values,
            changedFields: new Set(),
            changed: false,
            ...invalid,
            fields,
          };
        }),
      fieldErrors: {},
      setFieldErrors: (fieldErrors) => set({ fieldErrors }),
    };

    // put things in here that we don't want to reset.
    return {
      ...initialState,
      reset: () => {
        // this does not play nice with zustand.
        // if (values) {
        //   initialState.initialValues = {};
        //   initialState.values = {};
        //   const fields = {};
        //   for (const [name, f] of Object.entries(form.fields)) {
        //     const field = { ...f };
        //     field.value = values[name] || "";
        //     initialState.initialValues[name] = field.value;
        //     initialState.values[name] = field.value;
        //     fields[name] = field;arguments
        //   }
        //   initialState.fields = fields;
        // }
        set(initialState);
      },
      // messages: [],
      // addMessage: (message) => {
      //   const newMessage = { ...message, key: nanoid() };
      //   set((state) => {
      //     return { messages: [...state.messages, newMessage] };
      //   });
      // },
      // removeMessage: (message) =>
      //   set((state) => {
      //     const messages = state.messages.filter((m) => m !== message);
      //     // If no message was actually removed, return the original state
      //     return state.messages.length === messages.length
      //       ? state
      //       : { messages };
      //   }),
      // setMessages: (messages) =>
      //   set({ messages: messages.map((m) => ({ key: nanoid(), ...m })) }),
      ...messageStore(set),
    };
  });
}

// Note that some fields are null in the database, but have to be an empty string to work with forms
function getInitialValue(initialValues, name, field) {
  const Field = getField(field.field ?? "text");

  if (!Field) {
    // throw Error(`Unknown field type ${field.name} for ${ name }`);
    return;
  }

  // console.log(name, typeof(nitialValues));
  const iv = initialValues[name];
  if (iv || iv === false) {
    if (Field.initializeValue) {
      return Field.initializeValue(iv);
    }
    return initialValues[name];
  }

  if (field.default !== undefined) {
    return field.default;
  }

  if (Field.defaultValue !== undefined) {
    return Field.defaultValue;
  }

  return "";

  // switch (field.field) {
  //   case "checkbox":
  //     return false;
  //   case "multi-select":
  //     return [];
  //   case "checkbox-list":
  //     return [];
  //   case "tags":
  //     return [];
  //   case "image":
  //     return null;
  // }
}

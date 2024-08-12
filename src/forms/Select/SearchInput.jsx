import { useEffect, useCallback, useState } from "react";

export default function SearchInput({
  field,
  setOptions,
  toggleSelect,
  searchRef,
}) {
  const lookupValue = useCallback(() => {
    if (!field.value) {
      return "";
    }

    const options = field.props.options || [];
    const option = options.find(([key]) => key == field.value);

    return option ? option[1] : "";
  }, [field.value, field.props.options]);

  const [value, setValue] = useState(lookupValue);

  const handleChange = useCallback(
    (evt) => {
      const value = evt.target.value;
      setValue(value);
      const options = field.props.options || [];
      const newOptions = options.filter(([, text = ""]) => {
        return text.toLowerCase().includes(value.toLowerCase());
      });
      setOptions(newOptions);
    },
    [field.props.options, setOptions],
  );

  const handleFocus = useCallback(() => {
    toggleSelect(true);
  }, [toggleSelect]);

  const handleBlur = useCallback(() => {
    // if clicking menu, we need a moment to allow the click to fire
    setTimeout(() => {
      toggleSelect(false);
    }, 100);
  }, [toggleSelect]);

  useEffect(() => {
    if (field.value) {
      setValue(lookupValue());
    }
  }, [field.value, lookupValue]);

  return (
    <input
      id={field.props.id}
      placeholder={field.props.placeholder || "Choose"}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      // className={styles.selectButton}
      ref={searchRef}
    />
  );
}

import { useMemo } from "react";
import useField from "../useField";

import Field from "../Field";
import Input from "../base/Input";

export default function DateTimeField({ ...initialProps }) {
  const { field, fieldProps } = useField(initialProps);
  const dateObj = new Date(field.value);

  const [dateStr, timeStr] = useMemo(() => {
    if (!field.value) {
      return ["", ""];
    }

    const pad = (n) => n.toString().padStart(2, "0");

    const year = dateObj.getFullYear();
    const month = pad(dateObj.getMonth() + 1); // Months are 0-indexed
    const day = pad(dateObj.getDate());
    const hours = pad(dateObj.getHours());
    const minutes = pad(dateObj.getMinutes());

    return [`${year}-${month}-${day}`, `${hours}:${minutes}`];
  }, [field.value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Field {...fieldProps}>
      <div className="flex items-center gap-2">
        <Input
          className="!w-fit"
          value={dateStr}
          // value={field.value}
          type="date"
          placeholder="yyyy-mm-dd"
          onChange={(evt) => {
            const value = evt.target.value;
            if (value) {
              if (value.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
                const [year, month, day] = value.split("-");
                dateObj.setFullYear(parseInt(year, 10));
                dateObj.setMonth(parseInt(month, 10) - 1);
                dateObj.setDate(parseInt(day, 10));
                field.setValue(dateObj.toString());
              }
            } else {
              field.setValue("");
            }
          }}
        />
        @
        <Input
          className="!w-fit"
          value={timeStr}
          // value={field.value}
          type="time"
          placeholder="hh:mm"
          onChange={(evt) => {
            const value = evt.target.value;
            if (value) {
              if (value.match(/^[0-9]{2}:[0-9]{2}$/)) {
                const [hour, min] = value.split(":");
                dateObj.setHours(parseInt(hour, 10));
                dateObj.setMinutes(parseInt(min, 10));
                field.setValue(dateObj.toString());
              }
            } else {
              dateObj.setHours(0);
              dateObj.setMinutes(0);
              field.setValue(dateObj.toString());
            }
          }}
        />
      </div>
    </Field>
  );
}

DateTimeField.defaultValue = "";

// DateTimeField.initializeValue = (value) => {
//   if (value) {
//     // return value.slice(0, 10);
//   }
//   return "";
// };

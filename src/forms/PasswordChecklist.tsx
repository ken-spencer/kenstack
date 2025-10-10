import { Check, X } from "lucide-react";
import { useFormContext } from "react-hook-form";
const rules = [
  {
    test: (val) => /[a-z]/.test(val),
    label: "Have at least one lower case letter",
  },
  {
    test: (val) => /[A-Z]/.test(val),
    label: "Have at least one upper case letter",
  },
  {
    test: (val) => /\d/.test(val),
    label: "Include at least one number",
  },
  {
    test: (val) => val.length >= 8,
    label: "Be at least 8 characters long",
  },
];

export default function PassowrdChecklist() {
  const { watch } = useFormContext();
  const value = watch("password");
  return (
    <div>
      <p>Password must: </p>

      {rules.map(({ test, label }, index) => (
        <div key={index} className="flex items-center gap-2">
          {test(value) ? <Check className="text-green-500" /> : <X />}
          {label}
        </div>
      ))}
    </div>
  );
}

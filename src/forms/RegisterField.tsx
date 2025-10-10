import { useController, useFormContext } from "react-hook-form";

/**
 * Registers an invisible field so that resetField will work properly.
 */
const RegisterField = ({ name }: { name: string }) => {
  const { control } = useFormContext();

  useController({
    name,
    control,
  });

  return null;
};

export default RegisterField;

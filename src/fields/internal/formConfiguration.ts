const declaredFormProperties = Symbol("kenstack.declaredFormProperties");
const configuredFormProps = Symbol("kenstack.configuredFormProps");
const commonFormProperties = ["description", "label", "placeholder"];

export function declareFormProperties<TProperties extends object>(
  properties: readonly Extract<keyof TProperties, string>[],
): Partial<TProperties> {
  const declaration: Partial<TProperties> = {};
  // The private marker must survive the object spreads in defineField().
  Object.defineProperty(declaration, declaredFormProperties, {
    enumerable: true,
    value: properties,
  });
  return declaration;
}

export function configureFormProps<TField extends object>(
  field: TField,
  additionalProperties: readonly string[] = [],
): TField {
  const fieldProperties: readonly string[] =
    Object.getOwnPropertyDescriptor(field, declaredFormProperties)?.value ?? [];
  const configuredField = { ...field };
  Reflect.deleteProperty(configuredField, declaredFormProperties);
  const properties = [
    ...commonFormProperties,
    ...additionalProperties,
    ...fieldProperties,
  ];
  const formProps = Object.fromEntries(
    properties.flatMap((property) =>
      property in configuredField
        ? [[property, Reflect.get(configuredField, property)]]
        : [],
    ),
  );

  // Defined field maps also copy fields with object spread before forms use them.
  Object.defineProperty(configuredField, configuredFormProps, {
    enumerable: true,
    value: formProps,
  });
  return configuredField;
}

export function getConfiguredFormProps(field: object) {
  const formProps: Record<string, unknown> | undefined =
    Object.getOwnPropertyDescriptor(field, configuredFormProps)?.value;
  return formProps ?? {};
}

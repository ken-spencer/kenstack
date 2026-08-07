function propertyName(property) {
  if (property.computed) {
    return undefined;
  }

  if (property.key.type === "Identifier") {
    return property.key.name;
  }

  return property.key.type === "Literal" ? property.key.value : undefined;
}

function calleeName(callee) {
  if (callee.type === "Identifier") {
    return callee.name;
  }

  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }

  return undefined;
}

function isFieldFactoryCall(call) {
  const name = calleeName(call.callee);
  return name === "field" || name === "defineField" || name?.endsWith("Field");
}

const noFieldDefaultAssertion = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow type assertions that steer field default inference.",
    },
    messages: {
      defaultAssertion:
        "Use a bare field default. Derive value types from the field schema instead of steering inference with a type assertion.",
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function checkAssertion(node) {
      if (
        node.type === "TSAsExpression" &&
        sourceCode.getText(node.typeAnnotation) === "const"
      ) {
        return;
      }

      const property = node.parent;
      if (
        property?.type !== "Property" ||
        property.value !== node ||
        propertyName(property) !== "default"
      ) {
        return;
      }

      const object = property.parent;
      const call = object?.parent;
      if (
        object?.type !== "ObjectExpression" ||
        call?.type !== "CallExpression" ||
        !call.arguments.includes(object) ||
        !isFieldFactoryCall(call)
      ) {
        return;
      }

      context.report({ messageId: "defaultAssertion", node });
    }

    return {
      TSAsExpression: checkAssertion,
      TSTypeAssertion: checkAssertion,
    };
  },
};

export default noFieldDefaultAssertion;

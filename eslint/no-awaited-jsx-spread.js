const noAwaitedJsxSpread = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require awaited values to resolve before they are spread into JSX.",
    },
    messages: {
      awaitedSpread:
        "Resolve the awaited value before constructing JSX, then spread the resolved binding so async work remains visible.",
    },
    schema: [],
  },
  create(context) {
    const reportedSpreads = new WeakSet();

    return {
      AwaitExpression(node) {
        let ancestor = node.parent;

        while (ancestor) {
          if (ancestor.type === "JSXSpreadAttribute") {
            if (!reportedSpreads.has(ancestor)) {
              reportedSpreads.add(ancestor);
              context.report({ messageId: "awaitedSpread", node: ancestor });
            }
            return;
          }

          if (
            ancestor.type === "ArrowFunctionExpression" ||
            ancestor.type === "FunctionDeclaration" ||
            ancestor.type === "FunctionExpression"
          ) {
            return;
          }

          ancestor = ancestor.parent;
        }
      },
    };
  },
};

export default noAwaitedJsxSpread;

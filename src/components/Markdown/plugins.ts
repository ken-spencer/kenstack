// import type { Plugin } from "unified";
// import type { Root } from "mdast";
// import { visit } from "unist-util-visit";

// export function remarkShiftHeadings(): ReturnType<Plugin<[], Root>> {
//   return (tree: Root) => {
//     visit(tree, "heading", (node) => {
//       if (node.depth < 6) {
//         node.depth += 1;
//       }
//     });
//   };
// }
// Note this function is moot because it strips out underlines
// export function remarkUnderline() {
//   return (tree, file) => {
//     visit(tree, "strong", (node, index, parent) => {
//       if (!node.position || !parent) {
//         return;
//       }
//       const startOffset = node.position.start.offset;
//       const endOffset = node.position.end.offset;

//       const raw = file.value.slice(startOffset, endOffset);
//       if (raw.startsWith("__") && raw.endsWith("__")) {
//         const props = ((node.data ||= {}).hProperties ||= {});
//       }
//     });
//   };
// }

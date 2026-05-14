import type { ComponentProps } from "react";

const colors = {
  ken: "#6f6b83",
  stack: "#a86186",
};

export default function KenstackLogoSimple(
  props: Omit<ComponentProps<"svg">, "viewBox" | "role">,
) {
  return (
    <svg aria-label="Kenstack" viewBox="0 0 300 72" role="img" {...props}>
      <text
        x="2"
        y="43"
        fill={colors.ken}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="54"
        fontWeight="700"
      >
        ken
      </text>
      <text
        x="94"
        y="58"
        fill={colors.stack}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="54"
        fontWeight="700"
      >
        stack
      </text>
    </svg>
  );
}

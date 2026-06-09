import * as React from "react";

import { Button, buttonVariants } from "./ui/button";
import ProgressIcon from "@kenstack/icons/Progress";

import { twMerge } from "tailwind-merge";

import { type VariantProps } from "class-variance-authority";
import Tooltip, { type TooltipBreakpoint } from "./Tooltip";

const collapseButtonClassNames = {
  sm: "aspect-square gap-0 px-0 has-data-[icon=inline-start]:pl-0 has-data-[icon=inline-end]:pr-0 sm:aspect-auto sm:gap-1.5 sm:px-2.5 sm:has-data-[icon=inline-start]:pl-2 sm:has-data-[icon=inline-end]:pr-2",
  md: "aspect-square gap-0 px-0 has-data-[icon=inline-start]:pl-0 has-data-[icon=inline-end]:pr-0 md:aspect-auto md:gap-1.5 md:px-2.5 md:has-data-[icon=inline-start]:pl-2 md:has-data-[icon=inline-end]:pr-2",
  lg: "aspect-square gap-0 px-0 has-data-[icon=inline-start]:pl-0 has-data-[icon=inline-end]:pr-0 lg:aspect-auto lg:gap-1.5 lg:px-2.5 lg:has-data-[icon=inline-start]:pl-2 lg:has-data-[icon=inline-end]:pr-2",
  xl: "aspect-square gap-0 px-0 has-data-[icon=inline-start]:pl-0 has-data-[icon=inline-end]:pr-0 xl:aspect-auto xl:gap-1.5 xl:px-2.5 xl:has-data-[icon=inline-start]:pl-2 xl:has-data-[icon=inline-end]:pr-2",
  "2xl":
    "aspect-square gap-0 px-0 has-data-[icon=inline-start]:pl-0 has-data-[icon=inline-end]:pr-0 2xl:aspect-auto 2xl:gap-1.5 2xl:px-2.5 2xl:has-data-[icon=inline-start]:pl-2 2xl:has-data-[icon=inline-end]:pr-2",
} satisfies Record<TooltipBreakpoint, string>;

const collapseContentClassNames = {
  sm: "gap-0 sm:gap-1.5",
  md: "gap-0 md:gap-1.5",
  lg: "gap-0 lg:gap-1.5",
  xl: "gap-0 xl:gap-1.5",
  "2xl": "gap-0 2xl:gap-1.5",
} satisfies Record<TooltipBreakpoint, string>;

const collapseLabelClassNames = {
  sm: "hidden sm:inline",
  md: "hidden md:inline",
  lg: "hidden lg:inline",
  xl: "hidden xl:inline",
  "2xl": "hidden 2xl:inline",
} satisfies Record<TooltipBreakpoint, string>;

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    collapseBelow?: TooltipBreakpoint;
    isPending?: boolean;
    asChild?: boolean;
    icon?: React.ComponentType<React.ComponentProps<"svg">>;
    iconPosition?: "start" | "end";
    tooltip?: React.ReactNode;
  };

export default function ButtonGR({
  asChild = false,
  collapseBelow,
  icon: Icon,
  iconPosition = "start",
  isPending = false,
  disabled = false,
  tooltip,
  className,
  children,
  ...props
}: ButtonProps) {
  const ButtonIcon = isPending && Icon ? ProgressIcon : Icon;
  const icon = ButtonIcon ? (
    <ButtonIcon
      className={twMerge("size-4", isPending && "animate-spin")}
      data-icon={iconPosition === "end" ? "inline-end" : "inline-start"}
    />
  ) : null;

  const renderContent = (label: React.ReactNode) => {
    const visibleLabel = collapseBelow ? (
      <span className={collapseLabelClassNames[collapseBelow]}>{label}</span>
    ) : (
      label
    );

    return (
      <>
        {iconPosition === "start" ? icon : null}
        {visibleLabel}
        {iconPosition === "end" ? icon : null}
      </>
    );
  };

  const buttonClassName = twMerge(
    "relative cursor-pointer",
    isPending && "disabled:opacity-100",
    collapseBelow && collapseButtonClassNames[collapseBelow],
    className,
  );

  if (asChild) {
    const child = React.Children.only(children);
    const content =
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      (ButtonIcon || collapseBelow)
        ? React.cloneElement(
            child,
            undefined,
            renderContent(child.props.children),
          )
        : child;

    const button = (
      <Button
        className={buttonClassName}
        disabled={disabled || isPending}
        asChild
        {...props}
      >
        {content}
      </Button>
    );

    return tooltip ? (
      <Tooltip content={tooltip} onlyBelow={collapseBelow}>
        {button}
      </Tooltip>
    ) : (
      button
    );
  }

  const showOverlayPending = isPending && !Icon;

  const button = (
    <Button
      className={buttonClassName}
      disabled={disabled || isPending}
      {...props}
    >
      {showOverlayPending ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <ProgressIcon className="animate-spin" />
        </span>
      ) : null}
      <span
        className={twMerge(
          "inline-flex items-center justify-center gap-1.5",
          collapseBelow && collapseContentClassNames[collapseBelow],
          showOverlayPending && "opacity-25",
        )}
      >
        {renderContent(children)}
      </span>
    </Button>
  );

  return tooltip ? (
    <Tooltip content={tooltip} onlyBelow={collapseBelow}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}

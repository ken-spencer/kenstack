import * as React from "react";

import ProgressIcon from "@kenstack/icons/Progress";

import { twMerge } from "tailwind-merge";

import { cva, type VariantProps } from "class-variance-authority";
import Tooltip, { type TooltipBreakpoint } from "./Tooltip";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

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

export default function Button({
  asChild = false,
  collapseBelow,
  icon: Icon,
  iconPosition = "start",
  isPending = false,
  disabled = false,
  size = "default",
  tooltip,
  variant = "default",
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
    buttonVariants({ variant, size }),
    isPending && "disabled:opacity-100",
    collapseBelow && collapseButtonClassNames[collapseBelow],
    className,
  );

  if (asChild) {
    const child = React.Children.only(children);
    if (
      !React.isValidElement<
        React.HTMLAttributes<HTMLElement> & {
          children?: React.ReactNode;
          "data-size"?: VariantProps<typeof buttonVariants>["size"];
          "data-slot"?: string;
          "data-variant"?: VariantProps<typeof buttonVariants>["variant"];
          disabled?: boolean;
        }
      >(child)
    ) {
      throw new Error("Button asChild requires a single React element child.");
    }

    const content =
      ButtonIcon || collapseBelow
        ? React.cloneElement(
            child,
            undefined,
            renderContent(child.props.children),
          )
        : child;

    const button = React.cloneElement(content, {
      ...props,
      className: twMerge(buttonClassName, child.props.className),
      "data-size": size,
      "data-slot": "button",
      "data-variant": variant,
      disabled: disabled || isPending,
    });

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
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
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
    </button>
  );

  return tooltip ? (
    <Tooltip content={tooltip} onlyBelow={collapseBelow}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}

export { Button, buttonVariants };

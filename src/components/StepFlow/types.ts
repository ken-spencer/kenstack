import type {
  ComponentType,
  MouseEventHandler,
  ReactElement,
  ReactNode,
} from "react";

export type StepHeaderProps = {
  headingId: string;
  summary?: ReactNode;
  title: string;
};

export type StepActionsProps = {
  children?: ReactNode;
  next?:
    | string
    | {
        disabled?: boolean;
        isPending?: boolean;
        label?: ReactNode;
        onClick?: MouseEventHandler<HTMLButtonElement>;
        type?: "button" | "submit";
      }
    | ReactElement
    | null;
};

export type Step = {
  content: ReactNode;
  controller?: ReactElement;
  final?: true;
  // Whether the step belongs in this visit; a skipped step counts as done. Default false.
  skipped?: boolean;
  // Whether the step's condition holds; a shown step is done once continued and satisfied. Default
  // true, for a step with no condition. Both are first-render values its controller then reports.
  satisfied?: boolean;
  title: string;
};

export type StepFlowProps = {
  // Requested: a site replaces the action and header markup to restyle or
  // extend a flow. No Civic flow overrides them yet; the next site will.
  // Both renderers cross into the client renderer, so they must come from a
  // "use client" module.
  Actions?: ComponentType<StepActionsProps>;
  basePath: string;
  Header?: ComponentType<StepHeaderProps>;
  // Requested: distinguishes the region and fragment target when a page
  // hosts more than one flow.
  id?: string;
  steps: Record<string, Step | null | Promise<Step | null>>;
  summary?: ReactNode;
};

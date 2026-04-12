export type AuditLogger = (
  args: (
    | {
        userId: number | null;
      }
    | {
        isSystem: boolean;
      }
  ) & {
    action: string;
    table?: string;
    rowId?: number | null;
    data?: Record<string, unknown>;
  },
) => Promise<void>;

export type Logger = {
  audit: AuditLogger;
};

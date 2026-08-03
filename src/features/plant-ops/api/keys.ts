/** Query keys for the prototype's plant-operations cards. One unfiltered read. */
export const plantOpsKeys = {
  all: ["plant-operations"] as const,
  summary: () => [...plantOpsKeys.all, "summary"] as const,
};

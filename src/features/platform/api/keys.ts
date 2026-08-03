/** Query keys for the Super User's dashboard cards. One unfiltered read. */
export const platformKeys = {
  all: ["platform"] as const,
  overview: () => [...platformKeys.all, "overview"] as const,
};

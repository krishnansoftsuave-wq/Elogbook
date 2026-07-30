import { ShieldAlert } from "lucide-react";

/** Used when the server sent no message of its own. */
export const PERMISSION_DENIED_MESSAGE =
  "You do not have permission for this. Ask an administrator if you need access.";

interface PermissionDeniedProps {
  /**
   * The server's own 403 message. Untrusted network content — rendered as React
   * text, never as markup (NFR-06).
   */
  message?: string;
}

/**
 * The 403 state. `authentication_flow.md` §3 and §8.6 draw the line: a 401 means
 * the token is no good and the session ends; a 403 means the token is fine and
 * this one action is not — "keep them logged in but show a permission-denied
 * state". So this renders *inside* the app shell and never redirects, which is
 * also why the axios interceptor deliberately leaves a 403 alone.
 *
 * A section-level heading, because the page it sits in keeps its own `<h1>`.
 */
export const PermissionDenied = ({ message }: PermissionDeniedProps) => (
  <div
    className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center"
    role="alert"
  >
    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <ShieldAlert className="size-6" aria-hidden />
    </span>
    <h2 className="text-lg font-semibold">
      You don&apos;t have access to this
    </h2>
    {/* `wrap-anywhere`: the server's message is untrusted text, and an
        unbroken token in it otherwise widens the page past the viewport. */}
    <p className="max-w-[420px] text-sm leading-relaxed wrap-anywhere text-muted-foreground">
      {message ?? PERMISSION_DENIED_MESSAGE}
    </p>
  </div>
);

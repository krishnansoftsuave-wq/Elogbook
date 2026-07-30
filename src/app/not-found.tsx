import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      {/* A link styled as a button, not a `Button` rendering a link: Base UI's
          `Button` assumes a native `<button>` and, told otherwise via
          `nativeButton={false}`, stamps `role="button"` on the anchor — which
          overrides its implicit `link` role. This navigates, so it stays a
          link. `buttonVariants` is shadcn's documented pattern for exactly this. */}
      <Link href="/" className={buttonVariants()}>
        Back to start
      </Link>
    </main>
  );
}

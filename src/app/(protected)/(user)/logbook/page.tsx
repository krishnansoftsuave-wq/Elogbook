import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { LogbookPanels } from "@/features/logbook/components/LogbookPanels";

export const metadata: Metadata = { title: "Logbook" };

export default function LogbookPage() {
  return (
    <>
      <PageHeader
        title="Logbook"
        description="Your entries, and the ones waiting on your signature."
        actions={
          // A link styled as a button. Base UI's `Button` assumes a native
          // `<button>`; told otherwise it stamps `role="button"` on the anchor
          // and overrides its implicit `link` role. This navigates, so it
          // stays a link — `buttonVariants` is shadcn's pattern for that.
          <Link href={ROUTES.ENTRY_ADD} className={buttonVariants()}>
            <Plus aria-hidden />
            New entry
          </Link>
        }
      />
      <LogbookPanels />
    </>
  );
}

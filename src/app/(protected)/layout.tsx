import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Sidebar } from "@/components/layout/Sidebar";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard>
      <div className="flex flex-1 flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          {/*
            `min-w-0` is load-bearing, not defensive. A flex item defaults to
            `min-width: auto`, which means it refuses to shrink below its
            content — so this column grew to the width of the widest table and
            the page scrolled sideways, while `DataTable`'s own
            `overflow-x-auto` sat there with nothing to clamp. Measured 163px of
            horizontal page scroll at 375px before this; `.claude/rules/01`
            requires none at any breakpoint.
          */}
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
            <Footer />
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

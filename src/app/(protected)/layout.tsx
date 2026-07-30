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
          <div className="flex flex-1 flex-col">
            <main className="flex-1 p-4 lg:p-6">{children}</main>
            <Footer />
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

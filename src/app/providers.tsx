"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useCrossTabAuthSync } from "@/features/auth/hooks/useCrossTabAuthSync";
import { useThemeSync } from "@/hooks/useThemeSync";
import { getQueryClient } from "@/lib/query-client";

/** Side effects that must sit inside the query provider. */
const AppEffects = ({ children }: { children: ReactNode }) => {
  useCrossTabAuthSync();
  useThemeSync();
  return <>{children}</>;
};

interface ProvidersProps {
  children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  // useState keeps the same client across re-renders without re-creating it.
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppEffects>{children}</AppEffects>
      </TooltipProvider>
      <Toaster richColors closeButton position="top-right" />
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      ) : null}
    </QueryClientProvider>
  );
};

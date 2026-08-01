import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The loading placeholder for the whole Trends & KPIs screen — shaped like the
 * real layout (period pills, five KPI cards, four compliance tiles + chart,
 * the equipment/flare/ship grid) rather than a spinner. `GET /trends` answers
 * every section in one call (`schemas.ts`'s note on `trendsSummaryWireSchema`),
 * so there is exactly one loading state to cover, not five independent ones.
 *
 * `FullPageSpinner` is deliberately not reused here — its own docblock scopes
 * it to a whole-route auth wait (root redirect, `RoleGuard`), not a
 * data-loading placeholder inside an already-mounted route.
 */
export const TrendsSkeleton = () => (
  <div className="flex flex-col gap-6" role="status" aria-live="polite">
    <span className="sr-only">Loading trends…</span>

    <div className="flex items-center gap-2" aria-hidden>
      <Skeleton className="h-4 w-14" />
      <Skeleton className="h-8 w-20 rounded-lg" />
      <Skeleton className="h-8 w-20 rounded-lg" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>

    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
      aria-hidden
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-2.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>

    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-hidden
    >
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-2 py-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>

    <Card aria-hidden>
      <CardHeader>
        <Skeleton className="h-5 w-72" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>

    <div
      className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_1fr]"
      aria-hidden
    >
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

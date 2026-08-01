import { EquipmentOutOfServiceCard } from "@/features/trends/components/EquipmentOutOfServiceCard";
import { FlarePurgeCard } from "@/features/trends/components/FlarePurgeCard";
import { NextShipsCard } from "@/features/trends/components/NextShipsCard";
import { OletCard } from "@/features/trends/components/OletCard";
import type {
  AreaCount,
  EquipmentOutOfService,
  FlarePurgeArea,
  OletSummary,
  ShipArrival,
} from "@/features/trends/schemas";
import { cn } from "@/lib/utils";

/**
 * Equipment, Flare & Shipping — the prototype's two-column layout
 * (app-source.txt 1978–1981): the equipment card on the left, flare/OLET/ships
 * stacked on the right. `1.4fr 1fr` matches the prototype's own ratio, applied
 * only from `xl` up — a single column below that, mobile-first, since a
 * 1.4:1 split of two already-narrow columns is illegible under ~900px.
 *
 * Purely compositional: no logic of its own, so it carries no test — each
 * child card owns and tests its own derived numbers.
 *
 * **`min-w-0` on both grid items.** Tailwind's `grid-cols-1` sets the
 * *track* to `minmax(0,1fr)`, but a grid item's own default `min-width: auto`
 * would otherwise let its content dictate a wider minimum than the track —
 * defensive, since `EquipmentOutOfServiceCard`'s table already contains its
 * own overflow in an `overflow-x-auto` wrapper and does not depend on this.
 * (A real 375px page-overflow bug was found and fixed separately, in
 * `ChartFrame.tsx`'s accessible table — see that file's `table-fixed`.)
 */

export interface EquipmentFlareShipGridProps {
  equipmentOutOfService: readonly EquipmentOutOfService[];
  equipmentOutOfServiceByArea: readonly AreaCount[];
  flarePurgeAreas: readonly FlarePurgeArea[];
  olet: OletSummary;
  nextShips: readonly ShipArrival[];
  className?: string;
}

export const EquipmentFlareShipGrid = ({
  equipmentOutOfService,
  equipmentOutOfServiceByArea,
  flarePurgeAreas,
  olet,
  nextShips,
  className,
}: EquipmentFlareShipGridProps) => (
  <div
    className={cn(
      "grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_1fr]",
      className
    )}
  >
    <EquipmentOutOfServiceCard
      className="min-w-0"
      equipmentOutOfService={equipmentOutOfService}
      equipmentOutOfServiceByArea={equipmentOutOfServiceByArea}
    />
    <div className="flex min-w-0 flex-col gap-4">
      <FlarePurgeCard flarePurgeAreas={flarePurgeAreas} />
      <OletCard olet={olet} />
      <NextShipsCard nextShips={nextShips} />
    </div>
  </div>
);

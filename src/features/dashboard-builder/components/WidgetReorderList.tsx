"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BarChart3,
  FileText,
  GripVertical,
  LineChart,
  List,
  PieChart,
  Table as TableIcon,
  Trash2,
  Type,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type {
  DashboardBuilderWidget,
  DashboardBuilderWidgetType,
} from "@/features/dashboard-builder/schemas";

const WIDGET_TYPE_LABEL: Record<DashboardBuilderWidgetType, string> = {
  kpi: "KPI",
  list: "LIST",
  summary: "SUMMARY",
  table: "TABLE",
  line: "LINE",
  bar: "BAR",
  pie: "PIE",
  text: "TEXT",
};

const WIDGET_TYPE_ICON: Record<DashboardBuilderWidgetType, typeof List> = {
  kpi: BarChart3,
  list: List,
  summary: FileText,
  table: TableIcon,
  line: LineChart,
  bar: BarChart3,
  pie: PieChart,
  text: Type,
};

interface WidgetRowProps {
  widget: DashboardBuilderWidget;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}

const WidgetRow = ({ widget, onToggle, onRemove }: WidgetRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });
  const TypeIcon = WIDGET_TYPE_ICON[widget.type];

  return (
    <div
      ref={setNodeRef}
      // @dnd-kit/sortable's required drag-transform API: an arbitrary
      // per-frame translate with no static Tailwind equivalent. Approved
      // exception (user, 2026-08-01) to the repo's blanket inline-style ban.
      // eslint-disable-next-line no-restricted-syntax
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 border-b px-3.5 py-3 last:border-0 data-dragging:z-10 data-dragging:bg-accent/50"
      data-dragging={isDragging ? "" : undefined}
    >
      <button
        type="button"
        className="flex shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label={`Reorder ${widget.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4.5" aria-hidden />
      </button>
      <TypeIcon className="size-4.5 shrink-0 text-primary" aria-hidden />
      <span className="flex-1 text-sm font-medium">{widget.label}</span>
      <Badge variant="secondary">{WIDGET_TYPE_LABEL[widget.type]}</Badge>
      <Switch
        aria-label={`${widget.label} enabled`}
        checked={widget.enabled}
        onCheckedChange={onToggle}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${widget.label}`}
        className="flex text-destructive"
      >
        <Trash2 className="size-4.5" aria-hidden />
      </button>
    </div>
  );
};

interface WidgetReorderListProps {
  widgets: readonly DashboardBuilderWidget[];
  onChange: (widgets: readonly DashboardBuilderWidget[]) => void;
}

/**
 * The prototype's `wRow`/drag list (`app-source.txt` 2085–2091). ⚠️
 * PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 *
 * `@dnd-kit` was already a dependency, unused anywhere in `src/` before this
 * — the prototype's own gap list names its `dropWidget` handler as exactly
 * this library's target (`SCREENS.md`). The keyboard sensor is what keeps
 * this reachable without a pointer (§3 "Testing & Review" accessibility
 * bar): Tab to the grip handle, Space to pick up, arrow keys to move, Space
 * to drop.
 */
export const WidgetReorderList = ({
  widgets,
  onChange,
}: WidgetReorderListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = widgets.findIndex((widget) => widget.id === active.id);
    const newIndex = widgets.findIndex((widget) => widget.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(
      arrayMove([...widgets], oldIndex, newIndex).map((widget, index) => ({
        ...widget,
        order: index,
      }))
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={widgets.map((widget) => widget.id)}
        strategy={verticalListSortingStrategy}
      >
        <div role="list" aria-label="Widgets in this dashboard">
          {widgets.map((widget) => (
            <WidgetRow
              key={widget.id}
              widget={widget}
              onToggle={(enabled) =>
                onChange(
                  widgets.map((candidate) =>
                    candidate.id === widget.id
                      ? { ...candidate, enabled }
                      : candidate
                  )
                )
              }
              onRemove={() =>
                onChange(
                  widgets.filter((candidate) => candidate.id !== widget.id)
                )
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

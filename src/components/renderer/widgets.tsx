"use client";

import { NormalizedEntity, NormalizedWidget } from "@/lib/config/schema";
import { useRecords } from "@/lib/hooks";
import { Badge, Card, Spinner } from "@/components/ui";

interface WidgetProps {
  appId: string;
  entity: NormalizedEntity;
  widget: NormalizedWidget;
}

function StatWidget({ appId, entity, widget }: WidgetProps) {
  const { data, isLoading } = useRecords(appId, entity.name, { pageSize: 100 });
  const items = data?.items ?? [];
  const total = data?.pagination.total ?? 0;

  const [op, fieldFromMetric] = (widget.metric ?? "count").split(":");
  const fieldName = fieldFromMetric || widget.field;

  let value: number = total;
  let caption = entity.labelPlural;

  if (op === "sum" && fieldName) {
    value = items.reduce((s, r) => s + (Number(r.data[fieldName]) || 0), 0);
    caption = `Sum of ${fieldName}`;
  } else if (op === "avg" && fieldName) {
    const nums = items.map((r) => Number(r.data[fieldName]) || 0);
    value = nums.length
      ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
      : 0;
    caption = `Average ${fieldName}`;
  }

  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted">{widget.title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        {isLoading ? "—" : value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-muted">{caption}</p>
      {widget.unknownType && (
        <Badge tone="amber" className="mt-2">
          unknown widget “{widget.unknownType}”
        </Badge>
      )}
    </Card>
  );
}

function ListWidget({ appId, entity, widget }: WidgetProps) {
  const limit = widget.limit ?? 5;
  const { data, isLoading } = useRecords(appId, entity.name, {
    pageSize: limit,
    sort: "createdAt",
    order: "desc",
  });
  const items = data?.items ?? [];

  return (
    <Card className="p-4">
      <p className="text-sm font-medium">{widget.title}</p>
      {isLoading ? (
        <div className="mt-3">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-2 text-xs text-muted">No records yet.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((r) => (
            <li key={r.id} className="truncate text-sm">
              {String(r.data[entity.displayField] ?? "(untitled)")}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function BreakdownWidget({ appId, entity, widget }: WidgetProps) {
  const field = widget.field || widget.metric || entity.displayField;
  const { data, isLoading } = useRecords(appId, entity.name, { pageSize: 100 });
  const items = data?.items ?? [];

  const counts = new Map<string, number>();
  for (const r of items) {
    const key = String(r.data[field] ?? "—");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...rows.map((r) => r[1]));

  return (
    <Card className="p-4">
      <p className="text-sm font-medium">{widget.title}</p>
      <p className="text-xs text-muted">by {field}</p>
      {isLoading ? (
        <div className="mt-3">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-xs text-muted">No data.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map(([key, count]) => (
            <div key={key}>
              <div className="flex justify-between text-xs">
                <span className="truncate">{key}</span>
                <span className="tabular-nums text-muted">{count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-[var(--brand)]"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function Widget(props: WidgetProps) {
  switch (props.widget.type) {
    case "list":
      return <ListWidget {...props} />;
    case "breakdown":
      return <BreakdownWidget {...props} />;
    case "stat":
    default:
      return <StatWidget {...props} />;
  }
}

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DashboardAlert } from "@/lib/types";
import { Alert } from "@/components/ui/alert";

function AlertItem({ alert }: { alert: DashboardAlert }) {
  const variant = alert.severity === "danger" ? "danger" : "warning";
  return (
    <Alert variant={variant}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-semibold">{alert.skater_name}</strong>
        {" — "}
        {alert.message}
      </span>
    </Alert>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <span>No attention items — everything is on track.</span>
    </div>
  );
}

/** Attention & Alerts panel: missing program layouts and at-risk goals. */
export function AttentionPanel({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <section
      aria-label="Attention Required"
      className="space-y-3"
    >
      <h2 className="text-lg font-semibold text-slate-900">Attention Required</h2>
      {alerts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <AlertItem key={`${a.kind}-${a.skater_id}`} alert={a} />
          ))}
        </div>
      )}
    </section>
  );
}

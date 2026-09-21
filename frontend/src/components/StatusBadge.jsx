import { Clock, CheckCircle2, XCircle, Ban } from "lucide-react";

const CONFIG = {
  PENDING: { cls: "badge-pending", icon: Clock, label: "Pending" },
  APPROVED: { cls: "badge-approved", icon: CheckCircle2, label: "Approved" },
  REJECTED: { cls: "badge-rejected", icon: XCircle, label: "Rejected" },
  CANCELLED: { cls: "badge-cancelled", icon: Ban, label: "Cancelled" },
};

export default function StatusBadge({ status }) {
  const conf = CONFIG[status] || CONFIG.PENDING;
  const Icon = conf.icon;
  return (
    <span className={`badge ${conf.cls}`}>
      <Icon size={12} />
      {conf.label}
    </span>
  );
}

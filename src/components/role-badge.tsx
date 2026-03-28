import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/app-types";
import { roleLabels } from "@/lib/app-types";

const roleStyles: Record<Role, string> = {
  admin: "border-rose-200 bg-rose-50 text-rose-700",
  rh: "border-sky-200 bg-sky-50 text-sky-700",
  chefe: "border-violet-200 bg-violet-50 text-violet-700",
  gerente: "border-amber-200 bg-amber-50 text-amber-700",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleStyles[role]}`}>
      {roleLabels[role]}
    </Badge>
  );
}

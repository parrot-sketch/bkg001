import { cn } from "@/lib/utils";
import { AppointmentStatus } from "@prisma/client";

const status_color: Record<string, string> = {
  PENDING: "bg-golden-orange-500/15 text-golden-orange-500", // #ee9b00
  PENDING_DOCTOR_CONFIRMATION: "bg-amber-500/15 text-amber-500",
  SCHEDULED: "bg-dark-cyan-500/15 text-dark-cyan-500", // #0a9396
  CONFIRMED: "bg-emerald-500/15 text-emerald-500",
  CANCELLED: "bg-brown-red-500/15 text-brown-red-500", // #9b2226
  COMPLETED: "bg-dark-teal-500/15 text-dark-teal-500", // #005f73
  NO_SHOW: "bg-slate-500/15 text-slate-500",
};

export const AppointmentStatusIndicator = ({
  status,
}: {
  status: string;
}) => {
  const colorClass = status_color[status] || "bg-gray-100 text-gray-700";

  return (
    <p
      className={cn(
        "w-fit px-2 py-1 rounded-full capitalize text-xs lg:text-sm",
        colorClass
      )}
    >
      {status.replace(/_/g, " ").toLowerCase()}
    </p>
  );
};

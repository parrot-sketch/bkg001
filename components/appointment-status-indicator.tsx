import { cn } from "@/lib/utils";
import { AppointmentStatus } from "@prisma/client";

const status_color = {
  PENDING: "bg-golden-orange-500/15 text-golden-orange-500", // #ee9b00
  SCHEDULED: "bg-dark-cyan-500/15 text-dark-cyan-500", // #0a9396
  CANCELLED: "bg-brown-red-500/15 text-brown-red-500", // #9b2226
  COMPLETED: "bg-dark-teal-500/15 text-dark-teal-500", // #005f73
};

export const AppointmentStatusIndicator = ({
  status,
}: {
  status: AppointmentStatus;
}) => {
  return (
    <p
      className={cn(
        "w-fit px-2 py-1 rounded-full capitalize text-xs lg:text-sm",
        status_color[status]
      )}
    >
      {status}
    </p>
  );
};

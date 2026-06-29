import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import Image from "next/image";

export const ProfileImage = ({
  url,
  name,
  className,
  textClassName,
  bgColor,
}: {
  url?: string;
  name: string;
  className?: string;
  textClassName?: string;
  bgColor?: string;
}) => {
  if (url) {
    const sizeMatch = className?.match(/(?:w-|h-|size-)(\d+)/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 40;
    
    return (
      <div className={cn("relative rounded-full overflow-hidden bg-slate-100", className)}>
        <Image
          src={url}
          alt={name}
          fill
          className="object-contain"
          sizes={`${size}px`}
        />
      </div>
    );
  }

  if (name) {
    return (
      <div
        className={cn(
          "flex w-10 h-10 rounded-full text-white text-xs items-center justify-center font-medium",
          className
        )}
        style={{ backgroundColor: bgColor || "#0c5d69" }}
      >
        <p className={textClassName}>{getInitials(name)}</p>
      </div>
    );
  }
};

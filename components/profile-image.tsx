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
    // Extract size from className for sizes attribute
    const sizeMatch = className?.match(/(?:w-|h-|size-)(\d+)/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 40;
    
    return (
      <div className={cn("relative rounded-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100", className)}>
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
          "flex md:hidden lg:flex w-10 h-10 rounded-full text-white text-base items-center justify-center font-light",
          className
        )}
        style={{ backgroundColor: bgColor || "#2563eb" }}
      >
        <p className={textClassName}>{getInitials(name)}</p>
      </div>
    );
  }
};

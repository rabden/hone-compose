import honeLogoImport from "@/assets/hone-logo.png";
import { cn } from "@/lib/utils";

// Next.js static image imports yield a StaticImageData object; Vite yielded a URL string.
const honeLogoUrl =
  typeof honeLogoImport === "string" ? honeLogoImport : honeLogoImport.src;

interface HoneLogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

export function HoneLogo({
  size = 32,
  className,
  alt = "Hone",
}: HoneLogoProps) {
  return (
    <img
      src={honeLogoUrl}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      draggable={false}
    />
  );
}

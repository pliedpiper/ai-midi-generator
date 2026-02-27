import Image from "next/image";
import React from "react";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
  alt?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "h-10 w-auto",
  priority = false,
  alt = "AI MIDI Generator",
}) => (
  <Image
    src="/midi-logo-6.svg"
    alt={alt}
    width={250}
    height={250}
    priority={priority}
    className={className}
  />
);

export default BrandLogo;

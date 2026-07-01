import React from "react";

interface LexRegLogoProps {
  className?: string;
  size?: number;
}

export function LexRegLogoMark({ className, size = 28 }: LexRegLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/logo.png"
      alt="LexReg Africa"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

import React from "react";

interface LexRegLogoProps {
  className?: string;
  size?: number;
  africaColor?: string;
  swooshColor?: string;
}

export function LexRegLogoMark({
  className,
  size = 28,
  africaColor = "#1A1A2E",
  swooshColor = "#C9A227",
}: LexRegLogoProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.15)}
      viewBox="0 0 90 105"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LexReg Africa logo mark"
    >
      {/* Africa continent outline
          Clockwise from Morocco NW → Mediterranean → Horn → Cape → Gulf of Guinea → back
          Coordinates normalised to 90×105 viewBox matching real geography */}
      <path
        d="
          M 18,4
          C 40,2 56,5 64,9
          L 68,18
          C 70,23 72,26 72,28
          L 75,33
          C 74,37 72,40 70,44
          C 69,50 68,56 66,62
          C 64,70 62,77 57,86
          C 54,93 51,99 48,102
          C 46,103 44,102 42,100
          C 38,96 34,90 30,83
          C 28,77 27,70 28,62
          C 29,58 30,54 31,52
          C 30,51 26,51 20,52
          C 14,53 8,50 5,46
          C 3,43 2,38 2,34
          C 2,28 4,22 9,16
          C 12,11 15,7 18,4
          Z
        "
        stroke={africaColor}
        strokeWidth="4.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Swoosh — sweeps from upper-left over the continent to the right */}
      <path
        d="M 2,40 C 16,8 52,-4 82,22"
        stroke={swooshColor}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

"use client";

import { IconPlus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Regulator = { abbr: string; name: string };
type LogoCloudProps = React.ComponentProps<"div">;

function RegulatorMark({ abbr, name }: Regulator) {
  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <span
        className="font-bold leading-none"
        style={{
          fontSize: "12px",
          color: "#1A1A2E",
          fontFamily: "SF Pro Display, var(--font-geist-sans), system-ui, sans-serif",
          letterSpacing: "-0.4px",
        }}
      >
        {abbr}
      </span>
      <span
        className="text-center leading-tight"
        style={{
          fontSize: "8px",
          color: "#737373",
          fontFamily: "SF Pro Text, var(--font-geist-sans), system-ui, sans-serif",
          maxWidth: "64px",
        }}
      >
        {name}
      </span>
    </div>
  );
}

type LogoCardProps = React.ComponentProps<"div"> & { regulator: Regulator };

function LogoCard({ regulator, className, children, ...props }: LogoCardProps) {
  return (
    <div
      className={cn("relative flex items-center justify-center px-2 py-4", className)}
      {...props}
    >
      <RegulatorMark {...regulator} />
      {children}
    </div>
  );
}

const bc = { borderColor: "rgba(0,0,0,0.07)" };
const tinted = { ...bc, backgroundColor: "rgba(26,26,46,0.03)" };

export function LogoCloud({ className, ...props }: LogoCloudProps) {
  return (
    <div
      className={cn("relative grid grid-cols-4 border-x", className)}
      style={bc}
      {...props}
    >
      <div className="-translate-x-1/2 -top-px pointer-events-none absolute left-1/2 w-screen border-t" style={bc} />

      {/* Row 1 */}
      <LogoCard className="border-r border-b" style={tinted}
        regulator={{ abbr: "BRS", name: "Business Registration Service" }}>
        <IconPlus className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-5 text-neutral-300" stroke={1} />
      </LogoCard>

      <LogoCard className="border-r border-b" style={bc}
        regulator={{ abbr: "KRA", name: "Kenya Revenue Authority" }} />

      <LogoCard className="border-r border-b" style={tinted}
        regulator={{ abbr: "CAK", name: "Communications Authority of Kenya" }}>
        <IconPlus className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-5 text-neutral-300" stroke={1} />
        <IconPlus className="-bottom-[12.5px] -left-[12.5px] absolute z-10 size-5 text-neutral-300" stroke={1} />
      </LogoCard>

      <LogoCard className="border-b" style={bc}
        regulator={{ abbr: "CMA", name: "Capital Markets Authority" }} />

      {/* Row 2 */}
      <LogoCard className="border-r" style={bc}
        regulator={{ abbr: "CBK", name: "Central Bank of Kenya" }} />

      <LogoCard className="border-r" style={tinted}
        regulator={{ abbr: "KEBS", name: "Kenya Bureau of Standards" }} />

      <LogoCard className="border-r" style={bc}
        regulator={{ abbr: "ODPC", name: "Office of the Data Protection Commissioner" }} />

      <LogoCard className="" style={tinted}
        regulator={{ abbr: "NSSF", name: "National Social Security Fund" }} />

      <div className="-translate-x-1/2 -bottom-px pointer-events-none absolute left-1/2 w-screen border-b" style={bc} />
    </div>
  );
}

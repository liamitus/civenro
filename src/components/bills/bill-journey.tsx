import dayjs from "dayjs";
import type { JourneyStep } from "@/lib/bill-helpers";

function circleClass(status: JourneyStep["status"]): string {
  switch (status) {
    case "completed":
      return "bg-navy text-white";
    case "current":
      return "bg-civic-gold text-white ring-4 ring-civic-gold/20";
    case "failed":
      return "bg-failed text-white ring-4 ring-failed/20";
    case "upcoming":
      return "bg-muted text-muted-foreground";
  }
}

function labelClass(status: JourneyStep["status"]): string {
  switch (status) {
    case "completed":
      return "text-foreground/70";
    case "current":
      return "text-foreground font-semibold";
    case "failed":
      return "text-failed font-semibold";
    case "upcoming":
      return "text-muted-foreground";
  }
}

function connectorClass(status: JourneyStep["status"]): string {
  switch (status) {
    case "completed":
      return "bg-navy";
    case "current":
      return "bg-gradient-to-r from-civic-gold to-border";
    case "failed":
      return "bg-gradient-to-r from-failed to-border";
    case "upcoming":
      return "bg-border";
  }
}

function StepIcon({ status, index, size }: { status: JourneyStep["status"]; index: number; size: "sm" | "lg" }) {
  const iconClass = size === "lg" ? "h-5 w-5" : "h-4 w-4";

  if (status === "completed") {
    return (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  if (status === "failed") {
    return (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }

  return <span>{index + 1}</span>;
}

export function BillJourney({ steps }: { steps: JourneyStep[] }) {
  return (
    <div className="w-full">
      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:flex items-start">
        {steps.map((step, i) => (
          <div key={`${step.label}-${i}`} className="flex items-start flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center group relative">
              <div
                className={`
                  relative flex h-10 w-10 items-center justify-center rounded-full
                  text-sm font-bold transition-all shrink-0
                  ${circleClass(step.status)}
                `}
              >
                <StepIcon status={step.status} index={i} size="lg" />
              </div>
              <span
                className={`mt-2 text-xs text-center font-medium leading-tight max-w-[6rem] ${labelClass(step.status)}`}
              >
                {step.label}
              </span>
              {step.date && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {dayjs(step.date).format("MMM D")}
                </span>
              )}
              {/* Tooltip for detail on desktop */}
              {step.detail && (
                <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2 w-56 p-2.5 rounded-lg bg-popover border shadow-md text-xs text-muted-foreground leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                  {step.detail}
                </div>
              )}
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="flex-1 flex items-center px-1 mt-5">
                <div className={`h-0.5 w-full rounded-full ${connectorClass(step.status)}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical stepper */}
      <div className="sm:hidden space-y-0">
        {steps.map((step, i) => (
          <div key={`${step.label}-${i}`} className="flex gap-3">
            {/* Vertical line + circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full
                  text-xs font-bold shrink-0
                  ${circleClass(step.status)}
                `}
              >
                <StepIcon status={step.status} index={i} size="sm" />
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-4 ${
                    step.status === "completed" ? "bg-navy" : step.status === "failed" ? "bg-failed" : "bg-border"
                  }`}
                />
              )}
            </div>

            {/* Label + date + detail */}
            <div className="pb-4 pt-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={`text-sm font-medium ${labelClass(step.status)}`}>
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {dayjs(step.date).format("MMM D, YYYY")}
                  </span>
                )}
              </div>
              {(step.status === "current" || step.status === "failed") && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}
              {step.detail && (
                <p className="text-xs text-muted-foreground mt-1 pl-3 border-l-2 border-civic-gold/30 leading-relaxed">
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

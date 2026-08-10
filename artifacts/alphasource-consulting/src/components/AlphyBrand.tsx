export type AlphyState = "idle" | "thinking" | "found" | "needs-you";

type AlphyMarkProps = {
  state?: AlphyState;
  className?: string;
  decorative?: boolean;
  label?: string;
};

const stateLabels: Record<AlphyState, string> = {
  idle: "alphy ready",
  thinking: "alphy processing",
  found: "alphy completed",
  "needs-you": "alphy needs attention",
};

export function AlphyMark({
  state = "idle",
  className = "",
  decorative = true,
  label,
}: AlphyMarkProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}alphy/${state}.svg`}
      alt={decorative ? "" : label || stateLabels[state]}
      aria-hidden={decorative || undefined}
      width="220"
      height="210"
      decoding="async"
      className={`block shrink-0 object-contain ${className}`}
    />
  );
}

export function PoweredByAlphy({
  className = "",
  markClassName = "h-6 w-6",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      <AlphyMark className={markClassName} />
      <span>
        powered by <strong className="font-bold">alphy</strong>
      </span>
    </span>
  );
}

export function ConsultingHeaderLogo() {
  return (
    <span className="relative block aspect-[150/29] w-[170px] sm:w-[190px] lg:w-[220px]" aria-hidden="true">
      <img
        src={`${import.meta.env.BASE_URL}logo-color-no-bg.webp`}
        alt=""
        width="600"
        height="116"
        decoding="async"
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: "inset(0 0 0 21.6666667%)" }}
      />
      <span className="absolute left-[-3%] top-1/2 h-[150%] -translate-y-1/2">
        <AlphyMark className="alphy-header-float h-full w-auto" />
      </span>
    </span>
  );
}

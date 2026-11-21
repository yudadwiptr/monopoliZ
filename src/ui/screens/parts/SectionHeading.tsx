import type { ReactNode } from 'react';

/** Numbered section title used on the setup screen. */
export function SectionHeading({
  step,
  title,
  hint,
  right,
  id,
}: {
  step: number;
  title: string;
  hint?: string;
  right?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 text-lg font-bold text-white shadow-[0_3px_0_#1C5290]">
          {step}
        </span>
        <div>
          <h2 id={id} className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">
            {title}
          </h2>
          {hint && <p className="text-xs text-ink-300 sm:text-sm">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

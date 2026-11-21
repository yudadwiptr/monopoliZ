import clsx from 'clsx';
import { Button } from '@/ui/common';

export interface IconButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  /** Optional visible text next to the icon */
  text?: string;
  /** Show a hover/focus tooltip below the button (desktop) */
  tip?: boolean;
  pressed?: boolean;
  className?: string;
}

/** Square glass HUD button (>=44px touch target) with an optional tooltip. */
export function IconButton({ label, icon, onClick, text, tip = true, pressed, className }: IconButtonProps) {
  return (
    <span className="group relative inline-flex">
      <Button
        variant="glass"
        size="sm"
        aria-label={label}
        aria-pressed={pressed}
        title={tip ? undefined : label}
        onClick={onClick}
        icon={icon}
        className={clsx('!h-11 !min-w-11 !rounded-2xl', text ? '!px-3' : '!px-0', className)}
      >
        {text && <span className="text-sm">{text}</span>}
      </Button>
      {tip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-ink-950/90 px-2 py-1 text-xs font-medium text-ink-100 opacity-0 shadow-glass transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 md:block"
        >
          {label}
        </span>
      )}
    </span>
  );
}

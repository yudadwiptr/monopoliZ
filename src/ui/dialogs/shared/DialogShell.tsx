import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { sfx } from '@/audio';
import { useIsDesktop } from './hooks';

export interface DialogShellProps {
  labelledBy: string;
  describedBy?: string;
  /** Hex colour of the soft glow behind the top of the panel */
  accent?: string;
  /** Extra classes for the panel (e.g. a wider `sm:max-w-*`) */
  className?: string;
  /** Ring colour around the panel for dramatic moments (acquire, debt) */
  ring?: string;
  children: ReactNode;
}

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;

/**
 * Non-blocking decision container: a bottom sheet on phones, a compact floating card on wider screens.
 * Only the panel catches pointer events — the board and HUD stay visible (and the HUD stays usable).
 */
export function DialogShell({ labelledBy, describedBy, accent, className, ring, children }: DialogShellProps) {
  const desktop = useIsDesktop();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    sfx.play('open');
    // Move focus into the decision so Tab / screen readers land here, without scrolling the page.
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:px-6">
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 60% at 50% 50%, rgba(5,8,26,0.68) 0%, rgba(5,8,26,0.32) 65%, rgba(5,8,26,0) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
      />
      <motion.section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={clsx(
          'glass-strong pointer-events-auto relative flex w-full flex-col overflow-hidden outline-none',
          'max-h-[92dvh] max-w-[23.5rem] rounded-3xl border',
          'sm:max-h-[86dvh] sm:max-w-[25.5rem] sm:rounded-4xl',
          className,
        )}
        style={ring ? { boxShadow: `0 0 0 1.5px ${ring}66, 0 0 40px -6px ${ring}88, 0 24px 60px -12px rgba(0,0,0,0.7)` } : undefined}
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.94 }}
        transition={SPRING}
      >
        {accent && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{ background: accent }}
          />
        )}
        <div className="batik-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-4">
          {children}
        </div>
      </motion.section>
    </div>
  );
}

/** Sticky-ish action row at the bottom of a dialog. */
export function DialogActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mt-3 flex items-stretch gap-2', className)}>{children}</div>;
}

/** Two-line label for money actions: big verb, price underneath (never truncates on 360px phones). */
export function ActionLabel({ verb, amount }: { verb: ReactNode; amount?: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col items-start leading-none">
      <span className="truncate">{verb}</span>
      {amount !== undefined && amount !== null && (
        <span className="num mt-0.5 truncate text-[13px] font-semibold opacity-80">{amount}</span>
      )}
    </span>
  );
}

/** Classes for the secondary "skip" button beside a primary action. */
export const SKIP_BTN = 'shrink-0 whitespace-nowrap px-4 sm:px-5';

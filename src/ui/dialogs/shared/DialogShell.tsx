import { motion } from 'framer-motion';
import clsx from 'clsx';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { sfx } from '@/audio';

export type DialogVariant = 'parchment' | 'dark';

const DialogVariantContext = createContext<DialogVariant>('dark');

export function useDialogVariant(): DialogVariant {
  return useContext(DialogVariantContext);
}

export interface DialogShellProps {
  labelledBy: string;
  describedBy?: string;
  /** Hex colour of the soft glow behind the top of the panel */
  accent?: string;
  /** Extra classes for the panel (e.g. a wider `sm:max-w-*`) */
  className?: string;
  /** Ring colour around the panel for dramatic moments (acquire, debt) */
  ring?: string;
  /** Visual frame variant: 'parchment' uses `/ui/card_beli_properti_blank.png` for the full modal frame */
  variant?: DialogVariant;
  children: ReactNode;
}

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;

/**
 * Non-blocking decision container:
 * - When `variant="parchment"`, uses `/ui/card_beli_properti_blank.png` as the entire 3:4 modal frame.
 * - When `variant="dark"`, uses the dark glass container for non-property dialogs.
 */
export function DialogShell({
  labelledBy,
  describedBy,
  accent,
  className,
  ring,
  variant = 'dark',
  children,
}: DialogShellProps) {
  const panelRef = useRef<HTMLElement>(null);
  const isParchment = variant === 'parchment';

  useEffect(() => {
    sfx.play('open');
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <DialogVariantContext.Provider value={variant}>
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
        {isParchment ? (
          <motion.section
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="false"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            className={clsx('pointer-events-auto outline-none select-none', className)}
            style={{
              width: 'min(92vw, 380px)',
              aspectRatio: '3 / 4',
              maxHeight: '92dvh',
              backgroundImage: "url('/ui/card_beli_properti_blank.png')",
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              position: 'relative',
              filter: 'drop-shadow(0 20px 38px rgba(0, 0, 0, 0.6))',
            }}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={SPRING}
          >
            <div
              className="flex h-full w-full flex-col justify-between"
              style={{
                paddingTop: '39.5%',
                paddingBottom: '8.8%',
                paddingLeft: '11%',
                paddingRight: '11%',
                boxSizing: 'border-box',
              }}
            >
              {children}
            </div>
          </motion.section>
        ) : (
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
            style={
              ring
                ? { boxShadow: `0 0 0 1.5px ${ring}66, 0 0 40px -6px ${ring}88, 0 24px 60px -12px rgba(0,0,0,0.7)` }
                : undefined
            }
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
        )}
      </div>
    </DialogVariantContext.Provider>
  );
}

/** Sticky-ish action row at the bottom of a dialog. */
export function DialogActions({ children, className }: { children: ReactNode; className?: string }) {
  const variant = useDialogVariant();
  if (variant === 'parchment') {
    return (
      <div
        className={clsx('mt-1', className)}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.45fr',
          gap: '10px',
          alignItems: 'stretch',
        }}
      >
        {children}
      </div>
    );
  }
  return <div className={clsx('mt-3 flex items-stretch gap-2', className)}>{children}</div>;
}

/** Label for money actions: compact inline row on parchment cards, two-line on dark modals. */
export function ActionLabel({ verb, amount }: { verb: ReactNode; amount?: ReactNode }) {
  const variant = useDialogVariant();
  if (variant === 'parchment') {
    return (
      <span className="inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap text-[13px] font-extrabold leading-[1.1]">
        <span>{verb}</span>
        {amount !== undefined && amount !== null && <span className="num font-black">{amount}</span>}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-col items-start leading-none">
      <span className="truncate">{verb}</span>
      {amount !== undefined && amount !== null && (
        <span className="num mt-0.5 truncate text-[12px] font-bold opacity-90">{amount}</span>
      )}
    </span>
  );
}

/** Classes for the secondary "skip" button beside a primary action. */
export const SKIP_BTN =
  'shrink-0 whitespace-nowrap !h-10 !px-3 !py-2 !text-[13px] !bg-[#ebd5b3] hover:!bg-[#dfc396] !text-[#2b1d12] !border-2 !border-[#5c4028] !shadow-[0_3px_0_#5c4028] font-extrabold';

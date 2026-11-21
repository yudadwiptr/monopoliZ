import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useEffect } from 'react';
import { sfx } from '@/audio';

export interface ModalProps {
  open: boolean;
  onClose?: () => void; // omit to make the modal non-dismissable
  children: React.ReactNode;
  className?: string;
  /** Accent glow colour behind the card */
  accent?: string;
  /** 'center' (default) or 'bottom' sheet on mobile */
  placement?: 'center' | 'bottom';
  labelledBy?: string;
}

/**
 * Animated dialog with a dimmed, blurred backdrop. Springs in from below.
 */
export function Modal({ open, onClose, children, className, accent, placement = 'center', labelledBy }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    sfx.play('open');
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={clsx(
            'fixed inset-0 z-50 flex justify-center p-4',
            placement === 'bottom' ? 'items-end sm:items-center' : 'items-center',
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
        >
          <motion.div
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={clsx('glass-strong relative w-full max-w-md overflow-hidden p-6', className)}
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {accent && (
              <div
                className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
                style={{ background: accent }}
              />
            )}
            <div className="relative">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

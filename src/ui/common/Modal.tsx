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
            className="absolute inset-0 bg-black/65"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={clsx(
              'relative w-full max-w-md overflow-hidden rounded-[1.85rem] border-[3.5px] border-[#2b1d12] p-2 text-[#2b1d12]',
              className,
            )}
            style={{
              background: 'linear-gradient(180deg, #7c4d25 0%, #5c3718 55%, #462810 100%)',
              boxShadow: '0 8px 0 #2b1d12, 0 24px 55px -10px rgba(0,0,0,0.75)',
            }}
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <div
              className="relative overflow-hidden rounded-[1.35rem] border-2 border-[#8c6239] p-4 sm:p-5"
              style={{
                background: 'linear-gradient(180deg, #fff9ea 0%, #f5e6c8 55%, #ebd4a9 100%)',
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.75)',
              }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

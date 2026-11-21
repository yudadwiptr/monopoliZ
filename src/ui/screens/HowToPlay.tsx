import { AnimatePresence, motion, type PanInfo, type Variants } from 'framer-motion';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useGame } from '@/store/gameStore';
import { sfx } from '@/audio';
import { Button } from '@/ui/common';
import { MenuBackdrop } from './parts/MenuBackdrop';
import { IconButton } from './parts/IconButton';
import { alpha } from './parts/color';
import { SLIDES, type Slide } from './parts/howto/slides';

export interface HowToPlayProps {
  /** When provided (e.g. opened from the pause menu) the guide closes via this instead of going to the menu. */
  onClose?: () => void;
}

const slideVariants: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '55%' : dir < 0 ? '-55%' : 0, opacity: 0, scale: 0.94 }),
  center: { x: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: (dir: number) => ({
    x: dir > 0 ? '-55%' : '55%',
    opacity: 0,
    scale: 0.94,
    transition: { duration: 0.22, ease: 'easeIn' },
  }),
};

function SlideBody({ slide, index }: { slide: Slide; index: number }) {
  return (
    <div className="glass-strong relative mx-auto my-auto max-h-full w-full max-w-4xl overflow-y-auto overflow-x-hidden p-5 scrollbar-thin sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[28rem] -translate-x-1/2 rounded-full"
        style={{ background: `radial-gradient(closest-side, ${alpha(slide.accent, 0.35)}, transparent)` }}
      />
      <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
        <motion.div
          className={clsx('flex w-full justify-center', slide.points.length > 0 && 'md:w-1/2')}
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.08 }}
        >
          {slide.art}
        </motion.div>
        {slide.points.length > 0 && (
          <div className="w-full md:w-1/2">
            <ul className="space-y-2.5">
              {slide.points.map((p, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.15 + i * 0.07 }}
                  className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 text-sm leading-relaxed text-ink-200"
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {p.icon}
                  </span>
                  <span>{p.text}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <span className="sr-only">
        Halaman {index + 1} dari {SLIDES.length}
      </span>
    </div>
  );
}

/** Paged, swipeable illustrated guide. Arrows, dots, keyboard ← → and swipe all work. */
export function HowToPlay({ onClose }: HowToPlayProps = {}) {
  const setScreen = useGame((s) => s.setScreen);
  const [[page, dir], setPage] = useState<[number, number]>([0, 0]);
  const last = SLIDES.length - 1;
  const slide = SLIDES[page];
  const modal = !!onClose;

  const close = useCallback(() => (onClose ? onClose() : setScreen('menu')), [onClose, setScreen]);
  const finish = useCallback(() => (onClose ? onClose() : setScreen('setup')), [onClose, setScreen]);

  const go = useCallback(
    (to: number) => {
      const t = Math.max(0, Math.min(last, to));
      if (t === page) return;
      sfx.play('whoosh', { volume: 0.5 });
      setPage([t, t > page ? 1 : -1]);
    },
    [page, last],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'ArrowRight') go(page + 1);
      else if (e.key === 'ArrowLeft') go(page - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(last);
      else if (e.key === 'Escape') close();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, close, page, last]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -70) go(page + 1);
    else if (swipe > 70) go(page - 1);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <MenuBackdrop variant="calm" tint={slide.accent} skyline={false} />

      {/* header */}
      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <IconButton label={modal ? 'Tutup panduan' : 'Kembali ke menu'} onClick={close}>
          {modal ? <X size={22} /> : <ChevronLeft size={24} />}
        </IconButton>
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ background: alpha(slide.accent, 0.2), color: slide.accent }}
              >
                {slide.kicker}
              </span>
              <h1 className="truncate font-display text-2xl font-bold leading-tight text-white sm:text-3xl" aria-live="polite">
                {slide.title}
              </h1>
            </motion.div>
          </AnimatePresence>
        </div>
        <span className="num shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm text-ink-100">
          {page + 1}/{SLIDES.length}
        </span>
      </header>

      {/* stage */}
      <section
        aria-roledescription="carousel"
        aria-label="Panduan cara main"
        className="relative z-10 min-h-0 flex-1 px-4 py-4"
      >
        <div className="relative h-full w-full">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={page}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.22}
              onDragEnd={onDragEnd}
              className="absolute inset-0 flex cursor-grab active:cursor-grabbing"
              role="group"
              aria-roledescription="slide"
              aria-label={`${page + 1} dari ${SLIDES.length}: ${slide.title}`}
            >
              <SlideBody slide={slide} index={page} />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* nav */}
      <nav
        aria-label="Navigasi panduan"
        className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <IconButton label="Halaman sebelumnya" onClick={() => go(page - 1)} disabled={page === 0}>
          <ChevronLeft size={24} />
        </IconButton>

        <div className="flex items-center">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ke halaman ${i + 1}: ${s.title}`}
              aria-current={i === page ? 'step' : undefined}
              className="group grid h-11 w-6 place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-300/60 sm:w-8"
            >
              <span className="relative block h-2.5 w-2.5">
                <span className="absolute inset-0 rounded-full bg-white/25 transition-colors group-hover:bg-white/50" />
                {i === page && (
                  <motion.span
                    layoutId="howto-dot"
                    className="absolute -inset-1 rounded-full"
                    style={{ background: slide.accent, boxShadow: `0 0 12px ${alpha(slide.accent, 0.8)}` }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>

        {page < last ? (
          <IconButton label="Halaman berikutnya" variant="primary" onClick={() => go(page + 1)}>
            <ChevronRight size={24} />
          </IconButton>
        ) : (
          <Button
            variant="gold"
            size="md"
            className="!px-4"
            icon={<Play size={18} fill="currentColor" aria-hidden />}
            onClick={finish}
          >
            {modal ? (
              'Lanjut'
            ) : (
              <>
                <span className="sm:hidden">Gas!</span>
                <span className="hidden sm:inline">Gas Main!</span>
              </>
            )}
          </Button>
        )}
      </nav>
    </div>
  );
}

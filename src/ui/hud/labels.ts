import type { BotLevel, LogEntry } from '@/engine/types';

export const BOT_LEVEL_LABEL: Record<BotLevel, string> = {
  mudah: 'Mudah',
  sedang: 'Sedang',
  sulit: 'Sulit',
};

/** Board sides as used by `monopolyStatus().jalur[].side` (0 bottom, 1 left, 2 top, 3 right). */
export const SIDE_LABEL = ['Jalur Selatan', 'Jalur Barat', 'Jalur Utara', 'Jalur Timur'] as const;

export const TONE_TEXT: Record<LogEntry['tone'], string> = {
  good: 'text-daun-400',
  bad: 'text-merah-300',
  info: 'text-ink-100',
};

export const TONE_RING: Record<LogEntry['tone'], string> = {
  good: 'border-daun-500/50',
  bad: 'border-merah-500/55',
  info: 'border-white/15',
};

/** Tourist tiles get their own swatch colour (laut teal). */
export const TOURIST_COLOR = '#22D3C5';

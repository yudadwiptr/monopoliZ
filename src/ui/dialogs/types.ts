import type { Pending } from '@/engine/types';

/** Narrow the Pending union to one decision kind, e.g. `PendingOf<'buy'>`. */
export type PendingOf<K extends Pending['kind']> = Extract<Pending, { kind: K }>;

/**
 * Mini illustrations for the "Cara Main" guide. Numbers come from economy.ts so the guide never
 * drifts from the real rules.
 */
import clsx from 'clsx';
import { Avatar } from '@/ui/common';
import { CHARACTERS } from '@/data/characters';
import { MAPS } from '@/data/maps';
import {
  ACQUIRE_MULT,
  DEFAULT_SALARY,
  FESTIVAL_MULT,
  ISLAND_ESCAPE_FEE,
  ISLAND_MAX_TURNS,
  LANDMARK_LEVEL,
  LEVEL_ICONS,
  LEVEL_NAMES,
  MONOPOLY_COLOR_SETS_TO_WIN,
  TAX_RATE,
  acquirePrice,
  cityToll,
  levelCost,
  purchaseCost,
} from '@/engine/economy';
import { groupTiles, sidePropertyTiles, touristTiles, WIN_REASON_LABEL } from '@/engine/selectors';
import type { MapDef, TileDef, TileKind } from '@/engine/types';
import { formatRp } from '@/lib/format';
import { FlatDie } from '../Dice';
import { RpCoin } from '../RpCoin';
import { IsoBlock } from '../IsoBlock';

const NUSA: MapDef = MAPS.find((m) => m.id === 'nusantara') ?? MAPS[0];

/** Example city used to show real costs/tolls from the economy formulas. */
export const SAMPLE_CITY: TileDef = { index: 0, kind: 'city', name: 'Contoh', icon: '🏙️', price: 100 };

const bob = (delay = 0, dur = 3) => ({ animation: `mz-bob ${dur}s ease-in-out ${delay}s infinite` });

// ───────────────────────── 1. goal ─────────────────────────

export function GoalArt() {
  const paths = [
    { emoji: '💸', text: 'Bikin semua lawan bangkrut' },
    { emoji: '🏆', text: 'Kuasai salah satu monopoli' },
    { emoji: '⏱️', text: 'Paling tajir pas ronde habis' },
  ];
  return (
    <div className="flex w-full max-w-[360px] flex-col items-center gap-5">
      <div className="relative grid h-40 w-40 place-items-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'repeating-conic-gradient(rgba(255,194,31,0.18) 0deg 10deg, transparent 10deg 24deg)',
            WebkitMaskImage: 'radial-gradient(closest-side, #000 35%, transparent 100%)',
            maskImage: 'radial-gradient(closest-side, #000 35%, transparent 100%)',
            animation: 'mz-rays 30s linear infinite',
          }}
        />
        <div className="relative" style={bob()}>
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl" aria-hidden>
            👑
          </span>
          <Avatar characterId={CHARACTERS[3].id} size={104} />
        </div>
      </div>
      <div className="grid w-full grid-cols-3 gap-2">
        {paths.map((p, i) => (
          <div
            key={p.text}
            className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-3 text-center"
            style={bob(i * 0.4, 3.6)}
          >
            <span className="text-2xl" aria-hidden>
              {p.emoji}
            </span>
            <span className="text-[11px] font-semibold leading-tight text-ink-100">{p.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── 2. turn & gas meter ─────────────────────────

export function TurnArt() {
  return (
    <div className="flex w-full max-w-[320px] flex-col items-center gap-7 pt-4">
      <div className="relative flex items-end gap-4">
        <div style={{ animation: 'mz-roll 2.6s ease-in-out infinite' }}>
          <FlatDie value={6} size={68} />
        </div>
        <div style={{ animation: 'mz-roll 2.6s ease-in-out 0.12s infinite' }}>
          <FlatDie value={6} size={68} />
        </div>
        <span className="absolute -right-14 -top-6 rotate-12">
          <span
            className="block rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-3 py-1 font-display text-sm font-bold text-ink-950 shadow-btn-gold"
            style={{ animation: 'mz-pop 1.3s ease-in-out infinite' }}
          >
            DOUBLE!
          </span>
        </span>
      </div>
      <div className="w-full">
        <div className="mb-1.5 flex justify-between text-[11px] font-bold uppercase tracking-wide">
          <span className="text-daun-400">Pelan</span>
          <span className="text-merah-400">Gas pol!</span>
        </div>
        <div className="relative h-7 overflow-hidden rounded-full border border-white/15 bg-ink-950/70 p-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-gradient-to-r from-daun-500 via-gold-400 to-merah-500">
            <div
              className="absolute inset-0 origin-right bg-ink-950"
              style={{ animation: 'mz-gauge-cover 2.4s ease-in-out infinite' }}
            />
          </div>
          <div className="pointer-events-none absolute inset-1 flex justify-between px-[8%]">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="h-full w-px bg-white/15" />
            ))}
          </div>
        </div>
        <div className="mt-2 text-center font-display text-sm font-semibold text-white">⚡ Gas Meter</div>
      </div>
    </div>
  );
}

// ───────────────────────── 3. buy & build ─────────────────────────

export function BuildArt() {
  const levels = LEVEL_NAMES.map((name, l) => ({
    name,
    icon: LEVEL_ICONS[l],
    cost: levelCost(SAMPLE_CITY, l),
    toll: cityToll(SAMPLE_CITY, l),
    landmark: l === LANDMARK_LEVEL,
  }));
  return (
    <div className="w-full max-w-[400px]">
      <div className="grid grid-cols-[2.75rem_repeat(5,minmax(0,1fr))] items-end gap-x-1.5 gap-y-1 text-center">
        <span />
        {levels.map((lv, l) => (
          <div key={lv.name} className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl" style={bob(l * 0.18)} aria-hidden>
              {lv.icon}
            </span>
            <div
              className={clsx(
                'mt-1 w-full rounded-t-xl shadow-[inset_0_2px_0_rgba(255,255,255,0.35)]',
                lv.landmark ? 'bg-gradient-to-b from-gold-300 to-gold-600' : 'bg-gradient-to-b from-brand-400 to-brand-700',
              )}
              style={{ height: 18 + l * 18 }}
            />
          </div>
        ))}

        <span />
        {levels.map((lv) => (
          <span
            key={lv.name}
            className={clsx('font-display text-[12px] font-semibold', lv.landmark ? 'text-gold-300' : 'text-white')}
          >
            {lv.name}
          </span>
        ))}

        <span className="text-left text-[10px] font-bold uppercase text-ink-300">Biaya</span>
        {levels.map((lv) => (
          <span key={lv.name} className="num rounded-md bg-white/[0.06] py-1 text-[11px] text-ink-100">
            {formatRp(lv.cost, { short: true })}
          </span>
        ))}

        <span className="text-left text-[10px] font-bold uppercase text-ink-300">Sewa</span>
        {levels.map((lv) => (
          <span key={lv.name} className="num rounded-md bg-merah-500/15 py-1 text-[11px] text-merah-300">
            {formatRp(lv.toll, { short: true })}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-300">
        Contoh kota harga tanah {formatRp(SAMPLE_CITY.price ?? 0)} — semua biaya & sewa ikut harga tanah.
      </p>
    </div>
  );
}

// ───────────────────────── 4. toll & acquisition ─────────────────────────

export function TollArt() {
  const payer = CHARACTERS[1];
  const owner = CHARACTERS[0];
  const hotelToll = cityToll(SAMPLE_CITY, 3);
  const invested = purchaseCost(SAMPLE_CITY, 3);
  const takeover = acquirePrice(SAMPLE_CITY, 3);
  return (
    <div className="flex w-full max-w-[360px] flex-col items-center gap-4">
      <div className="flex w-full items-end justify-between px-1">
        <div className="flex flex-col items-center gap-1.5">
          <Avatar characterId={payer.id} size={60} />
          <span className="text-[11px] font-semibold text-ink-200">Kamu mampir</span>
        </div>
        <div className="relative mb-10 h-10 flex-1">
          <div className="absolute inset-x-3 top-1/2 border-t-2 border-dashed border-white/20" />
          <div className="absolute left-1/2 top-1/2 -ml-4 -mt-4" style={{ animation: 'mz-pay 1.8s ease-in infinite' }}>
            <RpCoin size={32} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative">
            <IsoBlock width={58} color={owner.color} height={44} lit={0.7} seed={4} />
            <span className="absolute -bottom-2 -right-3">
              <Avatar characterId={owner.id} size={30} />
            </span>
          </div>
          <span className="text-[11px] font-semibold text-ink-200">Hotel lawan</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold">
        <span className="num rounded-full bg-merah-500/20 px-3 py-1 text-merah-300">Sewa: {formatRp(hotelToll)}</span>
        <span className="num rounded-full bg-gold-500/20 px-3 py-1 text-gold-300">
          🎆 Pesta ×{FESTIVAL_MULT}: {formatRp(hotelToll * FESTIVAL_MULT)}
        </span>
      </div>
      <div className="flex w-full items-center gap-3 rounded-2xl border border-brand-300/30 bg-brand-500/15 p-3">
        <span className="text-3xl" aria-hidden>
          🤝
        </span>
        <div className="text-xs leading-relaxed text-ink-200">
          <div className="font-display text-sm font-semibold text-white">Akuisisi = {ACQUIRE_MULT}× nilai investasi</div>
          Hotel senilai <b className="num text-white">{formatRp(invested)}</b> bisa kamu rebut dengan{' '}
          <b className="num text-gold-300">{formatRp(takeover)}</b>.
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── 5. special tiles ─────────────────────────

const SPECIALS: { kind: TileKind; desc: string; tone: string }[] = [
  {
    kind: 'start',
    desc: `Lewat = gajian ${formatRp(DEFAULT_SALARY)}. Mendarat pas = upgrade 1 kotamu.`,
    tone: 'from-daun-500/25 border-daun-500/30',
  },
  {
    kind: 'island',
    desc: `Terdampar maks ${ISLAND_MAX_TURNS} giliran. Kabur pakai double, bayar ${formatRp(ISLAND_ESCAPE_FEE)}, atau kartu.`,
    tone: 'from-laut-500/25 border-laut-400/30',
  },
  {
    kind: 'festival',
    desc: `Pilih propertimu jadi tuan rumah pesta — sewanya ×${FESTIVAL_MULT}!`,
    tone: 'from-gold-500/25 border-gold-400/30',
  },
  {
    kind: 'airport',
    desc: 'Giliran berikutnya kamu boleh terbang ke petak mana aja.',
    tone: 'from-brand-500/25 border-brand-300/30',
  },
  {
    kind: 'chance',
    desc: 'Kartu Rezeki: bisa cuan, bisa apes. Ada kartu yang bisa disimpan!',
    tone: 'from-[#B36BFF]/25 border-[#B36BFF]/30',
  },
  {
    kind: 'tax',
    desc: `Bayar ${Math.round(TAX_RATE * 100)}% dari total nilai propertimu.`,
    tone: 'from-merah-500/25 border-merah-400/30',
  },
];

export function SpecialTilesArt() {
  return (
    <div className="grid w-full max-w-[520px] grid-cols-2 gap-2 sm:grid-cols-3">
      {SPECIALS.map((s, i) => {
        const tile = NUSA.tiles.find((t) => t.kind === s.kind);
        return (
          <div
            key={s.kind}
            className={clsx('flex flex-col gap-1 rounded-2xl border bg-gradient-to-b to-transparent p-3', s.tone)}
          >
            <span className="text-3xl" style={bob(i * 0.25, 3.4)} aria-hidden>
              {tile?.icon ?? '❔'}
            </span>
            <span className="font-display text-sm font-semibold leading-tight text-white">{tile?.name ?? s.kind}</span>
            <span className="text-[11px] leading-snug text-ink-200">{s.desc}</span>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── 6. how to win ─────────────────────────

function MiniTile({ color, children }: { color: string; children?: React.ReactNode }) {
  return (
    <span
      className="grid h-8 w-8 place-items-center rounded-lg text-base shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)]"
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

export function WinArt() {
  const tourists = touristTiles(NUSA).map((i) => NUSA.tiles[i]);
  const side = sidePropertyTiles(NUSA, 0).map((i) => NUSA.tiles[i]);
  const colorOf = (t: TileDef) =>
    t.kind === 'tourist' ? '#22D3C5' : NUSA.groups.find((g) => g.id === t.group)?.color ?? '#8C96C9';
  const groups = NUSA.groups.slice(0, MONOPOLY_COLOR_SETS_TO_WIN);

  const cards = [
    {
      title: WIN_REASON_LABEL.monopoli_wisata,
      desc: `Punya semua ${tourists.length} destinasi wisata.`,
      art: tourists.map((t) => (
        <MiniTile key={t.index} color="#22D3C5">
          {t.icon}
        </MiniTile>
      )),
    },
    {
      title: WIN_REASON_LABEL.monopoli_jalur,
      desc: `Kuasai ${side.length} properti di satu sisi papan.`,
      art: side.map((t) => <MiniTile key={t.index} color={colorOf(t)} />),
    },
    {
      title: WIN_REASON_LABEL.monopoli_warna,
      desc: `Lengkapi ${MONOPOLY_COLOR_SETS_TO_WIN} grup warna kota.`,
      art: groups.map((g) => (
        <span key={g.id} className="flex gap-0.5 rounded-lg bg-white/5 p-0.5">
          {groupTiles(NUSA, g.id).map((i) => (
            <span key={i} className="h-6 w-3.5 rounded" style={{ background: g.color }} />
          ))}
        </span>
      )),
    },
  ];

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-2">
      {cards.map((c, i) => (
        <div
          key={c.title}
          className="flex items-center gap-3 rounded-2xl border border-gold-400/25 bg-gradient-to-r from-gold-500/15 to-transparent p-3"
        >
          <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-500 text-sm font-bold text-ink-950">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-semibold text-white">{c.title}</div>
            <div className="text-[11px] text-ink-200">{c.desc}</div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">{c.art}</div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── 7. tips ─────────────────────────

export function TipsArt() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-2xl border border-white/15 bg-white/10 px-4 py-2 font-display text-sm font-semibold text-white">
        Psst… bocoran dari sultan 🤫
        <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-white/15 bg-[#232B52]" />
      </div>
      <div className="flex items-end gap-3">
        <div className="flex flex-col-reverse items-center" style={bob(0.3)}>
          {[0, 1, 2].map((i) => (
            <RpCoin key={i} size={34} className={i ? '-mb-6' : ''} />
          ))}
        </div>
        <div style={bob()}>
          <Avatar characterId={CHARACTERS[4].id} size={96} />
        </div>
        <IsoBlock width={54} color="#FFC21F" height={46} roof="spire" lit={0.8} seed={9} />
      </div>
    </div>
  );
}

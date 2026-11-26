import { Box, Diamond, Gauge, LayoutGrid, ScanSearch, Music, Rabbit, Settings, Turtle, Vibrate, Volume2, VolumeX, X } from 'lucide-react';
import { Button, Modal } from '@/ui/common';
import { sfx } from '@/audio';
import { haptic, SPEED_LABEL, useSettings, type CameraMode, type GameSpeed } from '@/store/settingsStore';
import clsx from 'clsx';
import { DICE_SKINS, type DiceSkin } from '@/data/diceSkins';
import { RangeSlider } from './parts/RangeSlider';
import { Segmented, type SegOption } from './parts/Segmented';
import { Toggle } from './parts/Toggle';
import { IconButton } from './parts/IconButton';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SPEED_OPTIONS: SegOption<GameSpeed>[] = [
  { value: 'santai', label: SPEED_LABEL.santai, icon: <Turtle size={16} aria-hidden /> },
  { value: 'normal', label: SPEED_LABEL.normal, icon: <Gauge size={16} aria-hidden /> },
  { value: 'ngebut', label: SPEED_LABEL.ngebut, icon: <Rabbit size={16} aria-hidden /> },
];

const CAMERA_OPTIONS: SegOption<CameraMode>[] = [
  { value: 'iso', label: 'Isometrik', icon: <Diamond size={16} aria-hidden /> },
  { value: '3d', label: '3D', icon: <Box size={16} aria-hidden /> },
  { value: 'top', label: 'Atas', icon: <LayoutGrid size={16} aria-hidden /> },
];

/** Pip slots (row, col) of a "5" face; the centre pip uses the skin's accent colour. */
const FIVE: [number, number][] = [
  [1, 1],
  [1, 3],
  [2, 2],
  [3, 1],
  [3, 3],
];

function SkinPicker({ value, onChange }: { value: DiceSkin; onChange: (s: DiceSkin) => void }) {
  return (
    <div role="radiogroup" aria-label="Skin dadu" className="grid grid-cols-3 gap-2">
      {DICE_SKINS.map((skin) => {
        const active = skin.id === value;
        return (
          <button
            key={skin.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              onChange(skin.id);
              sfx.play('dice_land');
              haptic(10);
            }}
            className={clsx(
              'flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 pb-2 pt-3 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-amber-500/50',
              active
                ? 'border-[#d97706] bg-[#fef3c7] shadow-[0_2px_0_#b45309]'
                : 'border-[#c8a97e] bg-[#fff8e7] hover:border-[#8c6239] hover:bg-[#fef3c7]/60',
            )}
          >
            <span className="bz-skin-face" data-skin={skin.id} aria-hidden>
              {FIVE.map(([r, c], i) => (
                <span
                  key={i}
                  className={clsx('bz-pip', i === 2 && 'bz-pip-red')}
                  style={{ gridRow: r, gridColumn: c }}
                />
              ))}
            </span>
            <span className="font-display text-xs font-black text-[#2b1d12]">{skin.name}</span>
            <span className="line-clamp-1 text-[10px] font-semibold leading-tight text-[#5c4028]">{skin.tagline}</span>
          </button>
        );
      })}
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="font-display text-base font-black text-[#2b1d12]">{title}</div>
        {hint && <div className="text-xs font-semibold text-[#5c4028]">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/** Audio, speed, camera and haptics preferences (persisted by useSettings, 2D Parchment & Wood theme). */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const s = useSettings();

  return (
    <Modal open={open} onClose={onClose} accent="#3A8CD6" labelledBy="settings-title" placement="bottom">
      <div className="-m-2 max-h-[calc(100dvh-7rem)] overflow-y-auto p-2 text-[#2b1d12] scrollbar-thin">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-[#2b1d12] bg-gradient-to-b from-[#fef3c7] to-[#f59e0b] text-[#2b1d12] shadow-[0_3px_0_#2b1d12]">
            <Settings size={22} strokeWidth={2.5} aria-hidden />
          </span>
          <div className="flex-1">
            <h2 id="settings-title" className="font-display text-2xl font-black leading-none text-[#2b1d12]">
              Pengaturan
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#5c4028]">Atur sesukamu, otomatis tersimpan.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#2b1d12] bg-[#4a3525] text-[#f6eedc] shadow-[0_2px_0_#2b1d12] transition-transform hover:scale-105 active:scale-95"
          >
            <X size={20} strokeWidth={2.6} />
          </button>
        </div>

        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border-2 border-[#8c6239] bg-[#fff8e7] p-3.5 shadow-[0_2px_0_rgba(140,98,57,0.25)]">
            <RangeSlider
              label="Efek Suara"
              icon={s.sfxVolume === 0 ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
              value={s.sfxVolume}
              onChange={s.setSfxVolume}
              onCommit={() => sfx.play('click')}
            />
            <RangeSlider
              label="Musik"
              icon={<Music size={18} aria-hidden />}
              value={s.musicVolume}
              onChange={s.setMusicVolume}
              onCommit={() => sfx.play('click')}
              accent="gold"
            />
          </section>

          <Row title="Kecepatan Animasi" hint="Ngebut = giliran bot lebih cepat kelar.">
            <Segmented options={SPEED_OPTIONS} value={s.speed} onChange={s.setSpeed} ariaLabel="Kecepatan animasi" />
          </Row>

          <Row title="Kamera Papan" hint="Atas (2D Flat) paling gampang dibaca dan ringan.">
            <Segmented
              options={CAMERA_OPTIONS}
              value={s.camera}
              onChange={s.setCamera}
              ariaLabel="Mode kamera"
              accent="laut"
            />
          </Row>

          <Row title="Skin Dadu" hint="Pilih gaya dadu favoritmu — berlaku untuk semua pemain.">
            <SkinPicker value={s.diceSkin} onChange={s.setDiceSkin} />
          </Row>

          <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-[#8c6239] bg-[#fff8e7] p-3.5 shadow-[0_2px_0_rgba(140,98,57,0.25)]">
            <div className="flex items-center gap-3">
              <ScanSearch size={20} className="shrink-0 text-[#1d4ed8]" aria-hidden />
              <div>
                <div className="font-display text-base font-black text-[#2b1d12]">Kamera Ikut Pion</div>
                <div className="text-xs font-semibold text-[#5c4028]">Zoom ke petak tujuan pion, lalu balik lihat seluruh papan.</div>
              </div>
            </div>
            <Toggle checked={s.followCam} label="Kamera ikut pion" onChange={s.setFollowCam} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-[#8c6239] bg-[#fff8e7] p-3.5 shadow-[0_2px_0_rgba(140,98,57,0.25)]">
            <div className="flex items-center gap-3">
              <Vibrate size={20} className="shrink-0 text-[#15803d]" aria-hidden />
              <div>
                <div className="font-display text-base font-black text-[#2b1d12]">Getar</div>
                <div className="text-xs font-semibold text-[#5c4028]">Getaran kecil pas dadu & momen penting.</div>
              </div>
            </div>
            <Toggle
              checked={s.haptics}
              label="Getar"
              onChange={(on) => {
                s.setHaptics(on);
                if (on) haptic(25);
              }}
            />
          </div>
        </div>

        <Button
          variant="gold"
          size="lg"
          block
          className="mt-5 !border-2 !border-[#2b1d12] !font-black !text-[#2b1d12] !shadow-[0_4px_0_#2b1d12]"
          onClick={onClose}
        >
          Sip, beres!
        </Button>
      </div>
    </Modal>
  );
}

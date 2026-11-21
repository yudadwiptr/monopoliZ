import { Box, Gauge, LayoutGrid, Music, Rabbit, Settings, Turtle, Vibrate, Volume2, VolumeX, X } from 'lucide-react';
import { Button, Modal } from '@/ui/common';
import { sfx } from '@/audio';
import { haptic, SPEED_LABEL, useSettings, type CameraMode, type GameSpeed } from '@/store/settingsStore';
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
  { value: '3d', label: '3D', icon: <Box size={16} aria-hidden /> },
  { value: 'top', label: 'Atas', icon: <LayoutGrid size={16} aria-hidden /> },
];

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="font-display text-base font-semibold text-white">{title}</div>
        {hint && <div className="text-xs text-ink-300">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/** Audio, speed, camera and haptics preferences (persisted by useSettings). */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const s = useSettings();

  return (
    <Modal open={open} onClose={onClose} accent="#3A8CD6" labelledBy="settings-title" placement="bottom">
      <div className="-m-2 max-h-[calc(100dvh-5rem)] overflow-y-auto p-2 scrollbar-thin">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-[0_4px_0_#1C5290]">
            <Settings size={22} aria-hidden />
          </span>
          <div className="flex-1">
            <h2 id="settings-title" className="font-display text-2xl font-bold leading-none text-white">
              Pengaturan
            </h2>
            <p className="mt-1 text-xs text-ink-300">Atur sesukamu, otomatis tersimpan.</p>
          </div>
          <IconButton label="Tutup pengaturan" variant="ghost" onClick={onClose}>
            <X size={22} />
          </IconButton>
        </div>

        <div className="space-y-5">
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
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

          <Row title="Kamera Papan" hint="3D biar sinematik, Atas biar gampang dibaca.">
            <Segmented
              options={CAMERA_OPTIONS}
              value={s.camera}
              onChange={s.setCamera}
              ariaLabel="Mode kamera"
              accent="laut"
            />
          </Row>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <Vibrate size={20} className="shrink-0 text-daun-400" aria-hidden />
              <div>
                <div className="font-display text-base font-semibold text-white">Getar</div>
                <div className="text-xs text-ink-300">Getaran kecil pas dadu & momen penting.</div>
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

        <Button variant="primary" size="lg" block className="mt-6" onClick={onClose}>
          Sip, beres!
        </Button>
      </div>
    </Modal>
  );
}

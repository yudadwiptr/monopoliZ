import type { ReactNode } from 'react';
import {
  ACQUIRE_MULT,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_SALARY,
  FESTIVAL_MULT,
  MAX_DOUBLES,
  PARITY_CHARGES,
} from '@/engine/economy';
import { formatRp } from '@/lib/format';
import { BuildArt, GoalArt, SpecialTilesArt, TipsArt, TollArt, TurnArt, WinArt } from './art';

export interface SlidePoint {
  icon: string;
  text: ReactNode;
}

export interface Slide {
  id: string;
  kicker: string;
  title: string;
  /** hex accent for the kicker chip and glow */
  accent: string;
  art: ReactNode;
  points: SlidePoint[];
}

const B = ({ children }: { children: ReactNode }) => <b className="font-semibold text-white">{children}</b>;

export const SLIDES: Slide[] = [
  {
    id: 'tujuan',
    kicker: 'Misi utama',
    title: 'Tujuan Game',
    accent: '#FFC21F',
    art: <GoalArt />,
    points: [
      { icon: '🏙️', text: <>Beli kota, bangun sampai <B>Landmark</B>, terus tarik sewa dari lawan.</> },
      { icon: '🏆', text: <>Menang kalau semua lawan <B>bangkrut</B>, kamu dapet <B>monopoli</B>, atau paling tajir saat ronde habis.</> },
      { icon: '🤝', text: <>Main 2–4 orang: lawan teman (gantian 1 HP) atau lawan bot.</> },
    ],
  },
  {
    id: 'giliran',
    kicker: 'Giliran',
    title: 'Dadu, Gas Meter & Genap/Ganjil',
    accent: '#3A8CD6',
    art: <TurnArt />,
    points: [
      { icon: '⚡', text: <>Lempar dua dadu pakai <B>Gas Meter</B> — makin penuh, makin gede peluang angka besar. Tapi tetap ada hokinya!</> },
      { icon: '🎯', text: <>Pilih <B>Genap</B> atau <B>Ganjil</B> biar peluangnya condong ke situ. Jatahnya cuma <B>{PARITY_CHARGES}×</B>, tambah 1 tiap lewat Titik Nol.</> },
      { icon: '🎲', text: <>Dapat <B>double</B>? Habis jalan, kamu lempar lagi.</> },
      { icon: '🏝️', text: <><B>{MAX_DOUBLES}× double</B> beruntun = langsung terdampar di pulau. Jangan serakah!</> },
      { icon: '💰', text: <>Tiap lewat Titik Nol kamu gajian <B>{formatRp(DEFAULT_SALARY)}</B>.</> },
    ],
  },
  {
    id: 'bangun',
    kicker: 'Properti',
    title: 'Beli & Bangun',
    accent: '#FFC21F',
    art: <BuildArt />,
    points: [
      { icon: '🚩', text: <>Mendarat di kota kosong? Beli tanahnya — bisa langsung sekalian bangun.</> },
      { icon: '🔄', text: <>Sebelum 1 putaran cuma sampai <B>Rumah</B>. Sudah lewat Titik Nol? Boleh sampai <B>Hotel</B>.</> },
      { icon: '🏛️', text: <><B>Landmark</B> cuma bisa dari Hotel. Sewanya paling sadis dan <B>kebal akuisisi</B>!</> },
    ],
  },
  {
    id: 'sewa',
    kicker: 'Cuan & rebutan',
    title: 'Sewa & Akuisisi',
    accent: '#FF3B5C',
    art: <TollArt />,
    points: [
      { icon: '💸', text: <>Mampir ke properti lawan = bayar <B>sewa</B>. Makin tinggi bangunannya, makin mahal.</> },
      { icon: '🎆', text: <>Properti tuan rumah <B>Pesta Rakyat</B> sewanya ×{FESTIVAL_MULT}.</> },
      { icon: '🤝', text: <>Habis bayar sewa, kamu boleh <B>akuisisi</B>: bayar {ACQUIRE_MULT}× nilai investasi, bangunannya ikut pindah ke kamu.</> },
      { icon: '🛡️', text: <>Landmark nggak bisa direbut. Kartu <B>Asuransi</B> bikin bebas sewa sekali.</> },
    ],
  },
  {
    id: 'spesial',
    kicker: 'Petak spesial',
    title: 'Kenali Petaknya',
    accent: '#22D3C5',
    art: <SpecialTilesArt />,
    points: [],
  },
  {
    id: 'menang',
    kicker: '3 cara monopoli',
    title: 'Cara Menang',
    accent: '#2EE59D',
    art: <WinArt />,
    points: [
      { icon: '💥', text: <>Duit kurang buat bayar? Jual properti dulu. Kalau tetap nggak cukup — <B>bangkrut</B>, out dari game.</> },
      {
        icon: '⏱️',
        text: <>Ada <B>batas ronde</B> (default {DEFAULT_MAX_ROUNDS}). Pas habis, total aset (uang + properti) terbanyak yang menang.</>,
      },
      { icon: '🚨', text: <>Ada yang tinggal 1 petak lagi monopoli? Bakal muncul peringatan <B>Awas Monopoli!</B></> },
    ],
  },
  {
    id: 'tips',
    kicker: 'Rahasia sultan',
    title: 'Tips Sultan',
    accent: '#FFC21F',
    art: <TipsArt />,
    points: [
      { icon: '🛒', text: <>Awal game, <B>borong</B> tanah murah. Makin banyak properti, makin sering lawan bayar.</> },
      { icon: '🏛️', text: <>Kejar <B>Landmark</B> di kota mahal — kebal akuisisi dan sewanya bikin nangis.</> },
      { icon: '👀', text: <>Pantau <B>Awas Monopoli!</B> dan rebut petak yang lagi diincar lawan.</> },
      { icon: '🪙', text: <>Sisain duit cadangan. Jual properti itu opsi terakhir.</> },
      { icon: '🛫', text: <>Di <B>Bandara</B>, terbang ke kota incaran atau ke Titik Nol buat upgrade.</> },
    ],
  },
];

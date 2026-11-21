/** Dice skins — purely cosmetic, picked in Pengaturan. Colours live in board.css under [data-skin]. */
export type DiceSkin = 'klasik' | 'sultan' | 'batik' | 'merah-putih' | 'giok' | 'neon';

export interface DiceSkinDef {
  id: DiceSkin;
  name: string;
  tagline: string;
}

export const DICE_SKINS: DiceSkinDef[] = [
  { id: 'klasik', name: 'Klasik', tagline: 'Putih gading, titik navy' },
  { id: 'sultan', name: 'Sultan', tagline: 'Emas 24 karat' },
  { id: 'batik', name: 'Batik', tagline: 'Motif kawung, titik emas' },
  { id: 'merah-putih', name: 'Merah Putih', tagline: 'Semangat 17-an' },
  { id: 'giok', name: 'Giok', tagline: 'Batu giok hijau' },
  { id: 'neon', name: 'Neon', tagline: 'Gelap & menyala' },
];

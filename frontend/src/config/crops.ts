import type { Crop, CropId } from '../types';

export const CROPS_LIST: Crop[] = [
  {
    id: 'onion',
    emoji: '🧅',
    name_en: 'Onion',
    name_hi: 'प्याज',
    name_mr: 'कांदा',
    shelfLifeDays: 45,
  },
  {
    id: 'tomato',
    emoji: '🍅',
    name_en: 'Tomato',
    name_hi: 'टमाटर',
    name_mr: 'टोमॅटो',
    shelfLifeDays: 4,
  },
  {
    id: 'soybean',
    emoji: '🫘',
    name_en: 'Soybean',
    name_hi: 'सोयाबीन',
    name_mr: 'सोयाबीन',
    shelfLifeDays: 240,
  },
];

export const CROPS: Record<string, Crop & { icon: string; name: string; defaultPricePerQuintal: number }> = {
  onion: {
    ...CROPS_LIST[0],
    icon: '🧅',
    name: 'Onion',
    defaultPricePerQuintal: 2450,
  },
  tomato: {
    ...CROPS_LIST[1],
    icon: '🍅',
    name: 'Tomato',
    defaultPricePerQuintal: 1850,
  },
  soybean: {
    ...CROPS_LIST[2],
    icon: '🫘',
    name: 'Soybean',
    defaultPricePerQuintal: 4850,
  },
};

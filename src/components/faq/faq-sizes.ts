/** Catalogue sizes the FAQ sandbox offers, with the figures its worked examples use. */

export const STANDARD_BEAMS: Record<
  string,
  { massKgM: number; areaMm2: number; h: number; b: number; tw: number; tf: number }
> = {
  "HEA 100": { massKgM: 16.7, areaMm2: 2124, h: 96, b: 100, tw: 5.0, tf: 8.0 },
  "HEA 120": { massKgM: 19.9, areaMm2: 2534, h: 114, b: 120, tw: 5.0, tf: 8.0 },
  "HEA 140": { massKgM: 24.7, areaMm2: 3142, h: 133, b: 140, tw: 5.5, tf: 8.5 },
  "HEA 160": { massKgM: 30.4, areaMm2: 3877, h: 152, b: 160, tw: 6.0, tf: 9.0 },
  "HEA 180": { massKgM: 35.5, areaMm2: 4525, h: 171, b: 180, tw: 6.0, tf: 9.5 },
  "HEA 200": { massKgM: 42.3, areaMm2: 5383, h: 190, b: 200, tw: 6.5, tf: 10.0 },
  "IPE 100": { massKgM: 8.1, areaMm2: 1032, h: 100, b: 55, tw: 4.1, tf: 5.7 },
  "IPE 120": { massKgM: 10.4, areaMm2: 1321, h: 120, b: 64, tw: 4.4, tf: 6.3 },
  "IPE 140": { massKgM: 12.9, areaMm2: 1643, h: 140, b: 73, tw: 4.7, tf: 6.9 },
  "IPE 160": { massKgM: 15.8, areaMm2: 2009, h: 160, b: 82, tw: 5.0, tf: 7.4 },
  "IPE 180": { massKgM: 18.8, areaMm2: 2395, h: 180, b: 91, tw: 5.3, tf: 8.0 },
  "IPE 200": { massKgM: 22.4, areaMm2: 2848, h: 200, b: 100, tw: 5.6, tf: 8.5 },
  "HEB 100": { massKgM: 20.4, areaMm2: 2604, h: 100, b: 100, tw: 6.0, tf: 10.0 },
  "HEB 120": { massKgM: 26.7, areaMm2: 3401, h: 120, b: 120, tw: 6.5, tf: 11.0 },
  "HEB 140": { massKgM: 33.7, areaMm2: 4296, h: 140, b: 140, tw: 7.0, tf: 12.0 },
  "HEB 160": { massKgM: 42.6, areaMm2: 5425, h: 160, b: 160, tw: 8.0, tf: 13.0 },
  "HEB 200": { massKgM: 61.3, areaMm2: 7808, h: 200, b: 200, tw: 9.0, tf: 15.0 },
};

export const STANDARD_CHANNELS: Record<string, { massKgM: number; areaMm2: number }> = {
  "UPN 80": { massKgM: 8.64, areaMm2: 1100 },
  "UPN 100": { massKgM: 10.6, areaMm2: 1350 },
  "UPN 120": { massKgM: 13.4, areaMm2: 1700 },
  "UPN 140": { massKgM: 16.0, areaMm2: 2040 },
  "UPN 160": { massKgM: 18.8, areaMm2: 2400 },
  "UPN 200": { massKgM: 25.3, areaMm2: 3220 },
  "UPE 80": { massKgM: 7.9, areaMm2: 1010 },
  "UPE 100": { massKgM: 9.82, areaMm2: 1251 },
  "UPE 120": { massKgM: 12.1, areaMm2: 1541 },
  "UPE 140": { massKgM: 14.5, areaMm2: 1842 },
  "UPE 160": { massKgM: 17.0, areaMm2: 2167 },
  "UPE 200": { massKgM: 22.8, areaMm2: 2900 },
};

export const STANDARD_TEES: Record<string, { massKgM: number; areaMm2: number }> = {
  "T 40x40x5": { massKgM: 2.96, areaMm2: 377 },
  "T 50x50x6": { massKgM: 4.44, areaMm2: 566 },
  "T 60x60x7": { massKgM: 6.23, areaMm2: 794 },
  "T 70x70x8": { massKgM: 8.32, areaMm2: 1060 },
  "T 80x80x9": { massKgM: 10.7, areaMm2: 1360 },
  "T 100x100x10": { massKgM: 15.1, areaMm2: 1920 },
};

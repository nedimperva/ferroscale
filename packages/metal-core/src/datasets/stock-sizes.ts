import type { DimensionKey, ProfileId } from "./types";
import { ANGLE_CATALOG } from "./profiles/angles";

/**
 * The sizes a buyer can expect to find for the manual profiles — so a line can
 * say, quietly, when the size typed is not one of them, and offer the ones
 * that are.
 *
 * This is procurement data, not calculation data: the engine weighs any size
 * the same way, and nothing here changes a result. Every list is transcribed
 * from a named table:
 *
 *   · hollow sections — the size tables of DIN EN 10219-2 (cold-formed) and
 *     DIN EN 10210-2 (hot-finished) as ezzat.org publishes them;
 *   · round bar — the preferred diameters of EN 10060:2003, Table 1;
 *   · angles — the EN 10056-1 catalogue the angle profile already carries;
 *   · flat and square bar, sheet and plate thicknesses, gas and construction
 *     pipe — the stock list of a German steel merchant (Eisen-Stoll, 15.08.2025),
 *     because the EN 10058 / 10059 tables were not to be had and a stockist's
 *     list answers the actual question: can I buy this off the shelf.
 *
 * A list only speaks for the range it covers. A 60 mm square bar is beyond the
 * merchant's 50 mm and gets no note either way — silence, not a false alarm.
 */

export type StockSourceId =
  | "en-10219-2"
  | "en-10210-2"
  | "en-10060"
  | "en-10056-1"
  | "eisen-stoll-2025";

export interface StockSource {
  /** What a note has room for. */
  shortLabel: string;
  label: string;
  url?: string;
}

export const STOCK_SOURCES: Record<StockSourceId, StockSource> = {
  "en-10219-2": {
    shortLabel: "EN 10219-2",
    label: "DIN EN 10219-2 cold-formed hollow sections — Querschnittswerte tables (ezzat.org)",
    url: "https://www.ezzat.org/de/Querschnittswerte/querschnittswerte.php",
  },
  "en-10210-2": {
    shortLabel: "EN 10210-2",
    label: "DIN EN 10210-2 hot-finished hollow sections — Querschnittswerte tables (ezzat.org)",
    url: "https://www.ezzat.org/de/Querschnittswerte/querschnittswerte.php",
  },
  "en-10060": {
    shortLabel: "EN 10060",
    label: "EN 10060:2003 hot rolled round steel bars, Table 1 — preferred dimensions",
  },
  "en-10056-1": {
    shortLabel: "EN 10056-1",
    label: "EN 10056-1 angle catalogue (see profiles/angles.ts for its sources)",
  },
  "eisen-stoll-2025": {
    shortLabel: "merchant stock",
    label: "Eisen-Stoll price lists, 15.08.2025 — Stabstahl, Bleche, Rohre",
    url: "https://www.eisen-stoll.de/download/stahl/Stab.pdf",
  },
};

type Dims = Partial<Record<DimensionKey, number>>;

interface StockSeries {
  source: StockSourceId;
  sizes: readonly (readonly number[])[];
}

interface StockFamily {
  /** Dimension keys, in the order each size tuple lists them. */
  keys: readonly DimensionKey[];
  /** Leading keys that describe the same section in either order (RHS 60×40 = 40×60). */
  unordered?: number;
  series: readonly StockSeries[];
}

const one = (values: readonly number[]) => values.map((v) => [v]);

// DIN EN 10219-2 / 10210-2 as tabulated on ezzat.org (a × t, h × b × t, D × t).
const SHS_COLD = [
    [20, 2], [25, 2], [25, 2.5], [25, 3], [30, 2], [30, 2.5], [30, 3], [40, 2], [40, 2.5],
    [40, 3], [40, 4], [50, 2], [50, 2.5], [50, 3], [50, 4], [50, 5], [60, 2], [60, 2.5],
    [60, 3], [60, 4], [60, 5], [60, 6], [60, 6.3], [70, 2.5], [70, 3], [70, 4], [70, 5],
    [70, 6], [70, 6.3], [80, 3], [80, 4], [80, 5], [80, 6], [80, 6.3], [80, 8], [90, 3],
    [90, 4], [90, 5], [90, 6], [90, 6.3], [90, 8], [100, 3], [100, 4], [100, 5], [100, 6],
    [100, 6.3], [100, 8], [100, 10], [100, 12], [100, 12.5], [120, 3], [120, 4], [120, 5],
    [120, 6], [120, 6.3], [120, 8], [120, 10], [120, 12], [120, 12.5], [140, 4], [140, 5],
    [140, 6], [140, 6.3], [140, 8], [140, 10], [140, 12], [140, 12.5], [150, 4], [150, 5],
    [150, 6], [150, 6.3], [150, 8], [150, 10], [150, 12], [150, 12.5], [150, 16], [160, 4],
    [160, 5], [160, 6], [160, 6.3], [160, 8], [160, 10], [160, 12], [160, 12.5], [160, 16],
    [180, 4], [180, 5], [180, 6], [180, 6.3], [180, 8], [180, 10], [180, 12], [180, 12.5],
    [180, 16], [200, 4], [200, 5], [200, 6], [200, 6.3], [200, 8], [200, 10], [200, 12],
    [200, 12.5], [200, 16], [220, 5], [220, 6], [220, 6.3], [220, 8], [220, 10], [220, 12],
    [220, 12.5], [220, 16], [250, 5], [250, 6], [250, 6.3], [250, 8], [250, 10], [250, 12],
    [250, 12.5], [250, 16], [260, 6], [260, 6.3], [260, 8], [260, 10], [260, 12], [260,
    12.5], [260, 16], [300, 6], [300, 6.3], [300, 8], [300, 10], [300, 12], [300, 12.5],
    [300, 16], [350, 8], [350, 10], [350, 12], [350, 12.5], [350, 16], [400, 10], [400, 12],
    [400, 12.5], [400, 16],
];
const SHS_HOT = [
    [40, 2.6], [40, 3.2], [40, 4], [40, 5], [50, 2.6], [50, 3.2], [50, 4], [50, 5], [50,
    6.3], [60, 2.6], [60, 3.2], [60, 4], [60, 5], [60, 6.3], [60, 8], [70, 3.2], [70, 4],
    [70, 5], [70, 6.3], [70, 8], [80, 3.2], [80, 4], [80, 5], [80, 6.3], [80, 8], [90, 4],
    [90, 5], [90, 6.3], [90, 8], [100, 4], [100, 5], [100, 6.3], [100, 8], [100, 10], [120,
    5], [120, 6.3], [120, 8], [120, 10], [120, 12.5], [140, 5], [140, 6.3], [140, 8], [140,
    10], [140, 12.5], [150, 5], [150, 6.3], [150, 8], [150, 10], [150, 12.5], [150, 14.2],
    [150, 16], [160, 5], [160, 6.3], [160, 8], [160, 10], [160, 12.5], [160, 14.2], [160,
    16], [180, 5], [180, 6.3], [180, 8], [180, 10], [180, 12.5], [180, 14.2], [180, 16],
    [200, 5], [200, 6.3], [200, 8], [200, 10], [200, 12.5], [200, 14.2], [200, 16], [220,
    6.3], [220, 8], [220, 10], [220, 12.5], [220, 14.2], [220, 16], [250, 6.3], [250, 8],
    [250, 10], [250, 12.5], [250, 14.2], [250, 16], [260, 6.3], [260, 8], [260, 10], [260,
    12.5], [260, 14.2], [260, 16], [300, 6.3], [300, 8], [300, 10], [300, 12.5], [300,
    14.2], [300, 16], [350, 8], [350, 10], [350, 12.5], [350, 14.2], [350, 16], [400, 10],
    [400, 12.5], [400, 14.2], [400, 16], [400, 20],
];
const RHS_COLD = [
    [40, 20, 2], [40, 20, 2.5], [40, 20, 3], [50, 30, 2], [50, 30, 2.5], [50, 30, 3], [50,
    30, 4], [60, 40, 2], [60, 40, 2.5], [60, 40, 3], [60, 40, 4], [60, 40, 5], [70, 50, 2],
    [70, 50, 2.5], [70, 50, 3], [70, 50, 4], [70, 50, 5], [80, 40, 2], [80, 40, 2.5], [80,
    40, 3], [80, 40, 4], [80, 40, 5], [80, 60, 2], [80, 60, 2.5], [80, 60, 3], [80, 60, 4],
    [80, 60, 5], [90, 50, 2], [90, 50, 2.5], [90, 50, 3], [90, 50, 4], [90, 50, 5], [100,
    40, 2.5], [100, 40, 3], [100, 40, 4], [100, 40, 5], [100, 50, 2.5], [100, 50, 3], [100,
    50, 4], [100, 50, 5], [100, 50, 6], [100, 50, 6.3], [100, 60, 2.5], [100, 60, 3], [100,
    60, 4], [100, 60, 5], [100, 60, 6], [100, 60, 6.3], [100, 80, 2.5], [100, 80, 3], [100,
    80, 4], [100, 80, 5], [100, 80, 6], [100, 80, 6.3], [120, 60, 4], [120, 60, 5], [120,
    60, 6], [120, 60, 6.3], [120, 80, 4], [120, 80, 5], [120, 80, 6], [120, 80, 6.3], [120,
    80, 8], [140, 80, 4], [140, 80, 5], [140, 80, 6], [140, 80, 6.3], [140, 80, 8], [150,
    100, 4], [150, 100, 5], [150, 100, 6], [150, 100, 6.3], [150, 100, 8], [160, 80, 4],
    [160, 80, 5], [160, 80, 6], [160, 80, 6.3], [160, 80, 8], [180, 100, 4], [180, 100, 5],
    [180, 100, 6], [180, 100, 6.3], [180, 100, 8], [180, 100, 10], [200, 100, 4], [200, 100,
    5], [200, 100, 6], [200, 100, 6.3], [200, 100, 8], [200, 100, 10], [200, 120, 4], [200,
    120, 5], [200, 120, 6], [200, 120, 6.3], [200, 120, 8], [200, 120, 10], [250, 150, 5],
    [250, 150, 6], [250, 150, 6.3], [250, 150, 8], [250, 150, 10], [250, 150, 12], [260,
    180, 5], [260, 180, 6.3], [260, 180, 8], [260, 180, 10], [260, 180, 12], [260, 180,
    12.5], [300, 100, 6], [300, 100, 6.3], [300, 100, 8], [300, 100, 10], [300, 100, 12],
    [300, 100, 12.5], [300, 100, 16], [300, 150, 6], [300, 150, 6.3], [300, 150, 8], [300,
    150, 10], [300, 150, 12], [300, 150, 12.5], [300, 150, 16], [300, 200, 6], [300, 200,
    6.3], [300, 200, 8], [300, 200, 10], [300, 200, 12], [300, 200, 12.5], [300, 200, 16],
    [350, 250, 6], [350, 250, 6.3], [350, 250, 8], [350, 250, 10], [350, 250, 12], [350,
    250, 12.5], [350, 250, 16], [400, 200, 8], [400, 200, 12.5], [400, 200, 16], [400, 300,
    8], [400, 300, 10], [400, 300, 12], [400, 300, 12.5], [400, 300, 16],
];
const RHS_HOT = [
    [50, 30, 2.6], [50, 30, 3.2], [50, 30, 4], [50, 30, 5], [60, 40, 2.6], [60, 40, 3.2],
    [60, 40, 4], [60, 40, 5], [60, 40, 6.3], [80, 40, 3.2], [80, 40, 4], [80, 40, 5], [80,
    40, 6.3], [80, 40, 8], [90, 50, 3.2], [90, 50, 4], [90, 50, 5], [90, 50, 6.3], [90, 50,
    8], [100, 50, 3.2], [100, 50, 4], [100, 50, 5], [100, 50, 6.3], [100, 50, 8], [100, 60,
    3.2], [100, 60, 4], [100, 60, 5], [100, 60, 6.3], [100, 60, 8], [120, 60, 4], [120, 60,
    5], [120, 60, 6.3], [120, 60, 8], [120, 60, 10], [120, 80, 4], [120, 80, 5], [120, 80,
    6.3], [120, 80, 8], [120, 80, 10], [140, 80, 4], [140, 80, 5], [140, 80, 6.3], [140, 80,
    8], [140, 80, 10], [150, 100, 4], [150, 100, 5], [150, 100, 6.3], [150, 100, 8], [150,
    100, 10], [150, 100, 12.5], [160, 80, 4], [160, 80, 5], [160, 80, 6.3], [160, 80, 8],
    [160, 80, 10], [160, 80, 12.5], [180, 100, 4], [180, 100, 5], [180, 100, 6.3], [180,
    100, 8], [180, 100, 10], [180, 100, 12.5], [200, 100, 4], [200, 100, 5], [200, 100,
    6.3], [200, 100, 8], [200, 100, 10], [200, 100, 12.5], [200, 100, 16], [200, 120, 6.3],
    [200, 120, 8], [200, 120, 10], [200, 120, 12.5], [250, 150, 6.3], [250, 150, 8], [250,
    150, 10], [250, 150, 12.5], [250, 150, 14.2], [250, 150, 16], [260, 180, 6.3], [260,
    180, 8], [260, 180, 10], [260, 180, 12.5], [260, 180, 14.2], [260, 180, 16], [300, 200,
    6.3], [300, 200, 8], [300, 200, 10], [300, 200, 12.5], [300, 200, 14.2], [300, 200, 16],
    [350, 250, 6.3], [350, 250, 8], [350, 250, 10], [350, 250, 12.5], [350, 250, 14.2],
    [350, 250, 16], [400, 200, 8], [400, 200, 10], [400, 200, 12.5], [400, 200, 14.2], [400,
    200, 16], [450, 250, 8], [450, 250, 10], [450, 250, 12.5], [450, 250, 14.2], [450, 250,
    16], [500, 300, 10], [500, 300, 12.5], [500, 300, 14.2], [500, 300, 16], [500, 300, 20],
];
const CHS_COLD = [
    [21.3, 2], [21.3, 2.5], [21.3, 3], [26.9, 2], [26.9, 2.5], [26.9, 3], [33.7, 2], [33.7,
    2.5], [33.7, 3], [42.4, 2], [42.4, 2.5], [42.4, 3], [42.4, 4], [48.3, 2], [48.3, 2.5],
    [48.3, 3], [48.3, 4], [48.3, 5], [60.3, 2], [60.3, 2.5], [60.3, 3], [60.3, 4], [60.3,
    5], [76.1, 2], [76.1, 2.5], [76.1, 3], [76.1, 4], [76.1, 5], [76.1, 6], [76.1, 6.3],
    [88.9, 2], [88.9, 2.5], [88.9, 3], [88.9, 4], [88.9, 5], [88.9, 6], [88.9, 6.3], [101.6,
    2], [101.6, 2.5], [101.6, 3], [101.6, 4], [101.6, 5], [101.6, 6], [101.6, 6.3], [114.3,
    2.5], [114.3, 3], [114.3, 4], [114.3, 5], [114.3, 6], [114.3, 6.3], [114.3, 8], [139.7,
    3], [139.7, 4], [139.7, 5], [139.7, 6], [139.7, 6.3], [139.7, 8], [139.7, 10], [168.3,
    3], [168.3, 4], [168.3, 5], [168.3, 6], [168.3, 6.3], [168.3, 8], [168.3, 10], [177.8,
    4], [177.8, 5], [177.8, 6], [177.8, 6.3], [177.8, 8], [177.8, 10], [177.8, 12], [177.8,
    12.5], [193.7, 4], [193.7, 5], [193.7, 6], [193.7, 6.3], [193.7, 8], [193.7, 10],
    [193.7, 12], [193.7, 12.5], [219.1, 4], [219.1, 5], [219.1, 6], [219.1, 6.3], [219.1,
    8], [219.1, 10], [219.1, 12], [219.1, 12.5], [244.5, 5], [244.5, 6], [244.5, 6.3],
    [244.5, 8], [244.5, 10], [244.5, 12], [244.5, 12.5], [273, 5], [273, 6], [273, 6.3],
    [273, 8], [273, 10], [273, 12], [273, 12.5], [323.9, 5], [323.9, 6], [323.9, 6.3],
    [323.9, 8], [323.9, 10], [323.9, 12], [323.9, 12.5], [355.6, 5], [355.6, 6], [355.6,
    6.3], [355.6, 8], [355.6, 10], [355.6, 12], [355.6, 12.5], [355.6, 16], [355.6, 20],
    [406.4, 6], [406.4, 6.3], [406.4, 8], [406.4, 10], [406.4, 12], [406.4, 12.5], [406.4,
    16], [406.4, 20], [406.4, 25], [457, 6], [457, 6.3], [457, 8], [457, 10], [457, 12],
    [457, 12.5], [457, 16], [457, 20], [457, 25], [457, 30], [508, 6], [508, 6.3], [508, 8],
    [508, 10], [508, 12], [508, 12.5], [508, 16], [508, 20], [508, 25], [508, 30], [610, 6],
    [610, 6.3], [610, 8], [610, 10], [610, 12], [610, 12.5], [610, 16], [610, 20], [610,
    25], [610, 30], [711, 6], [711, 6.3], [711, 8], [711, 10], [711, 12], [711, 12.5], [711,
    16], [711, 20], [711, 25], [711, 30],
];
const CHS_HOT = [
    [21.3, 2.3], [21.3, 2.6], [21.3, 3.2], [26.9, 2.3], [26.9, 2.6], [26.9, 3.2], [33.7,
    2.6], [33.7, 3.2], [33.7, 4], [42.4, 2.6], [42.4, 3.2], [42.4, 4], [48.3, 2.6], [48.3,
    3.2], [48.3, 4], [48.3, 5], [60.3, 2.6], [60.3, 3.2], [60.3, 4], [60.3, 5], [76.1, 2.6],
    [76.1, 3.2], [76.1, 4], [76.1, 5], [88.9, 3.2], [88.9, 4], [88.9, 5], [88.9, 6], [88.9,
    6.3], [101.6, 3.2], [101.6, 4], [101.6, 5], [101.6, 6], [101.6, 6.3], [101.6, 8],
    [101.6, 10], [114.3, 3.2], [114.3, 4], [114.3, 5], [114.3, 6], [114.3, 6.3], [114.3, 8],
    [114.3, 10], [139.7, 4], [139.7, 5], [139.7, 6], [139.7, 6.3], [139.7, 8], [139.7, 10],
    [139.7, 12], [139.7, 12.5], [168.3, 4], [168.3, 5], [168.3, 6.3], [168.3, 8], [168.3,
    10], [168.3, 12.5], [177.8, 5], [177.8, 6.3], [177.8, 8], [177.8, 10], [177.8, 12.5],
    [193.7, 5], [193.7, 6.3], [193.7, 8], [193.7, 10], [193.7, 12.5], [193.7, 14.2], [193.7,
    16], [219.1, 5], [219.1, 6.3], [219.1, 8], [219.1, 10], [219.1, 12.5], [219.1, 14.2],
    [219.1, 16], [219.1, 20], [244.5, 5], [244.5, 6.3], [244.5, 8], [244.5, 10], [244.5,
    12.5], [244.5, 14.2], [244.5, 16], [244.5, 20], [244.5, 25], [273, 5], [273, 6.3], [273,
    8], [273, 10], [273, 12.5], [273, 14.2], [273, 16], [273, 20], [273, 25], [323.9, 5],
    [323.9, 6.3], [323.9, 8], [323.9, 10], [323.9, 12.5], [323.9, 14.2], [323.9, 16],
    [323.9, 20], [323.9, 25], [355.6, 6.3], [355.6, 8], [355.6, 10], [355.6, 12.5], [355.6,
    14.2], [355.6, 16], [355.6, 20], [355.6, 25], [406.4, 6.3], [406.4, 8], [406.4, 10],
    [406.4, 12.5], [406.4, 14.2], [406.4, 16], [406.4, 20], [406.4, 25], [406.4, 30],
    [406.4, 40], [457, 6.3], [457, 8], [457, 10], [457, 12.5], [457, 14.2], [457, 16], [457,
    20], [457, 25], [457, 30], [457, 40], [508, 6.3], [508, 8], [508, 10], [508, 12.5],
    [508, 14.2], [508, 16], [508, 20], [508, 25], [508, 30], [508, 40], [508, 50], [610,
    6.3], [610, 8], [610, 10], [610, 12.5], [610, 14.2], [610, 16], [610, 20], [610, 25],
    [610, 30], [610, 40], [610, 50], [711, 6.3], [711, 8], [711, 10], [711, 12.5], [711,
    14.2], [711, 16], [711, 20], [711, 25], [711, 30], [711, 40], [711, 50], [711, 60],
];
// Eisen-Stoll Rohre: EN 10255 gas pipe and welded construction tube, D × t.
const CHS_STOCK = [
    [13.5, 2.35], [17.2, 2.35], [21.3, 1.75], [21.3, 2], [21.3, 2.65], [26.9, 2], [26.9,
    2.3], [26.9, 2.65], [33.7, 2], [33.7, 2.5], [33.7, 2.6], [33.7, 3.25], [38, 2.6], [42.4,
    2], [42.4, 2.5], [42.4, 2.6], [42.4, 3.25], [48.3, 2], [48.3, 2.5], [48.3, 2.6], [48.3,
    3.25], [51, 2.6], [57, 2.9], [60.3, 2], [60.3, 2.5], [60.3, 2.9], [60.3, 3.65], [70,
    2.9], [76.1, 2.9], [76.1, 3.65], [82.5, 3.2], [88.9, 3.2], [88.9, 4], [101.6, 3.6],
    [108, 3.6], [114.3, 3.6], [133, 4], [139.7, 4],
];
// EN 10060:2003 Table 1, preferred diameters.
const ROUND_EN = [
    10, 12, 13, 14, 15, 16, 18, 19, 20, 22, 24, 25, 26, 27, 28, 30, 32, 35, 36, 38, 40, 42,
    45, 48, 50, 52, 55, 60, 63, 65, 70, 73, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120,
    125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 190, 200, 220, 250,
];
// Eisen-Stoll Stabstahl, 6 m bars.
const ROUND_STOCK = [
    6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 30, 35, 40,
];
const SQUARE_STOCK = [
    6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 25, 30, 35, 40, 45, 50,
];
// Flachstahl, Bandstahl and Breitflachstahl, width × thickness.
const FLAT_STOCK = [
    [10, 4], [10, 5], [12, 3], [12, 4], [12, 5], [12, 6], [14, 3], [14, 4], [14, 5], [14,
    6], [15, 3], [15, 5], [16, 3], [16, 4], [16, 5], [16, 6], [16, 8], [18, 3], [18, 4],
    [18, 5], [18, 6], [18, 8], [20, 3], [20, 4], [20, 5], [20, 6], [20, 8], [20, 10], [20,
    12], [20, 15], [25, 3], [25, 4], [25, 5], [25, 6], [25, 8], [25, 10], [25, 12], [25,
    15], [30, 3], [30, 4], [30, 5], [30, 6], [30, 8], [30, 10], [30, 12], [30, 15], [30,
    20], [35, 3], [35, 4], [35, 5], [35, 6], [35, 8], [35, 10], [35, 12], [35, 15], [40, 3],
    [40, 4], [40, 5], [40, 6], [40, 8], [40, 10], [40, 12], [40, 15], [40, 20], [40, 25],
    [40, 30], [45, 3], [45, 4], [45, 5], [45, 6], [45, 8], [45, 10], [45, 12], [50, 3], [50,
    4], [50, 5], [50, 6], [50, 8], [50, 10], [50, 12], [50, 15], [50, 20], [50, 25], [55,
    5], [60, 3], [60, 4], [60, 5], [60, 6], [60, 8], [60, 10], [60, 12], [60, 15], [60, 20],
    [60, 25], [60, 30], [60, 40], [70, 3], [70, 4], [70, 5], [70, 6], [70, 8], [70, 10],
    [70, 12], [70, 15], [70, 20], [70, 25], [80, 3], [80, 4], [80, 5], [80, 6], [80, 8],
    [80, 10], [80, 12], [80, 15], [80, 20], [90, 3], [90, 4], [90, 5], [90, 6], [90, 8],
    [90, 10], [90, 12], [90, 15], [90, 20], [100, 3], [100, 4], [100, 5], [100, 6], [100,
    8], [100, 10], [100, 12], [100, 15], [100, 20], [100, 25], [110, 5], [120, 5], [120, 6],
    [120, 8], [120, 10], [120, 12], [120, 15], [120, 20], [130, 6], [130, 10], [130, 12],
    [130, 15], [140, 5], [140, 6], [140, 8], [140, 10], [140, 12], [140, 15], [140, 20],
    [150, 5], [150, 8], [150, 10], [150, 12], [150, 15], [150, 20], [160, 6], [160, 8],
    [160, 10], [160, 12], [160, 15], [160, 20], [180, 6], [180, 8], [180, 10], [180, 12],
    [180, 15], [180, 20], [200, 5], [200, 6], [200, 8], [200, 10], [200, 12], [200, 15],
    [200, 20], [220, 8], [220, 10], [220, 12], [220, 15], [220, 20], [240, 10], [240, 12],
    [240, 15], [240, 20], [250, 8], [250, 10], [250, 12], [250, 15], [250, 20], [250, 30],
    [300, 10], [300, 12], [300, 15], [300, 20], [300, 25], [300, 30],
];
// Eisen-Stoll Bleche: cold-rolled DC01 and galvanised sheet, hot-rolled sheet and plate.
const PANEL_STOCK = [
    0.63, 0.75, 0.88, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6,
    8, 10, 12, 15, 20, 25, 30, 35, 40,
];

const PANEL: StockFamily = {
  keys: ["thickness"],
  series: [{ source: "eisen-stoll-2025", sizes: one(PANEL_STOCK) }],
};

const STOCK: Partial<Record<ProfileId, StockFamily>> = {
  round_bar: {
    keys: ["diameter"],
    series: [
      { source: "en-10060", sizes: one(ROUND_EN) },
      { source: "eisen-stoll-2025", sizes: one(ROUND_STOCK) },
    ],
  },
  square_bar: {
    keys: ["side"],
    series: [{ source: "eisen-stoll-2025", sizes: one(SQUARE_STOCK) }],
  },
  flat_bar: {
    keys: ["width", "thickness"],
    series: [{ source: "eisen-stoll-2025", sizes: FLAT_STOCK }],
  },
  square_hollow: {
    keys: ["side", "wallThickness"],
    series: [
      { source: "en-10219-2", sizes: SHS_COLD },
      { source: "en-10210-2", sizes: SHS_HOT },
    ],
  },
  rectangular_tube: {
    keys: ["width", "height", "wallThickness"],
    unordered: 2,
    series: [
      { source: "en-10219-2", sizes: RHS_COLD },
      { source: "en-10210-2", sizes: RHS_HOT },
    ],
  },
  pipe: {
    keys: ["outerDiameter", "wallThickness"],
    series: [
      { source: "en-10219-2", sizes: CHS_COLD },
      { source: "en-10210-2", sizes: CHS_HOT },
      { source: "eisen-stoll-2025", sizes: CHS_STOCK },
    ],
  },
  angle: {
    keys: ["legA", "legB", "thickness"],
    unordered: 2,
    series: [
      { source: "en-10056-1", sizes: ANGLE_CATALOG.map((row) => [row.hMm, row.bMm, row.tMm]) },
    ],
  },
  sheet: PANEL,
  plate: PANEL,
};

const MATCH_MM = 0.01;

/** Size tuple in canonical order: the unordered leading keys largest first. */
function canonical(family: StockFamily, values: readonly number[]): number[] {
  const n = family.unordered ?? 0;
  if (n < 2) return [...values];
  const head = values.slice(0, n).sort((a, b) => b - a);
  return [...head, ...values.slice(n)];
}

function tupleOf(family: StockFamily, dims: Dims): number[] | null {
  const values: number[] = [];
  for (const key of family.keys) {
    const v = dims[key];
    if (v == null || !Number.isFinite(v) || v <= 0) return null;
    values.push(v);
  }
  return canonical(family, values);
}

function sameTuple(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= MATCH_MM);
}

export interface StockSize {
  dims: Dims;
  sources: StockSourceId[];
}

const mergedCache = new Map<ProfileId, StockSize[]>();

/** Every listed size for a manual profile, deduplicated across sources, smallest first. */
export function getStockSizes(profileId: ProfileId): StockSize[] {
  const cached = mergedCache.get(profileId);
  if (cached) return cached;
  const family = STOCK[profileId];
  if (!family) return [];
  const merged: Array<{ tuple: number[]; sources: StockSourceId[] }> = [];
  for (const series of family.series) {
    for (const size of series.sizes) {
      const tuple = canonical(family, size);
      const hit = merged.find((m) => sameTuple(m.tuple, tuple));
      if (hit) {
        if (!hit.sources.includes(series.source)) hit.sources.push(series.source);
      } else {
        merged.push({ tuple, sources: [series.source] });
      }
    }
  }
  merged.sort((a, b) => {
    for (let i = 0; i < a.tuple.length; i++) {
      if (a.tuple[i] !== b.tuple[i]) return a.tuple[i] - b.tuple[i];
    }
    return 0;
  });
  const sizes = merged.map(({ tuple, sources }) => ({
    dims: Object.fromEntries(family.keys.map((key, i) => [key, tuple[i]])) as Dims,
    sources,
  }));
  mergedCache.set(profileId, sizes);
  return sizes;
}

export interface StockCheck {
  standard: boolean;
  /** The tables whose range covers this size — the ones a non-standard size is missing from. */
  sources: StockSourceId[];
  /** Up to three listed sizes closest to the one typed; empty when it is standard. */
  nearest: Dims[];
}

/**
 * Is `dims` a listed size? Null when the profile has no list, a dimension is
 * missing, or the size lies outside the range every list covers.
 */
export function checkStockSize(profileId: ProfileId, dims: Dims, maxNearest = 3): StockCheck | null {
  const family = STOCK[profileId];
  if (!family) return null;
  const tuple = tupleOf(family, dims);
  if (!tuple) return null;

  // Coverage is judged on the leading dimension alone (diameter, side, the
  // long leg, the width): within a list's range a missing size means something.
  const lead = tuple[0];
  const covering = family.series.filter((series) => {
    const leads = series.sizes.map((size) => canonical(family, size)[0]);
    return lead >= Math.min(...leads) - MATCH_MM && lead <= Math.max(...leads) + MATCH_MM;
  });
  if (covering.length === 0) return null;

  const sizes = getStockSizes(profileId);
  const listed = sizes.some((size) => sameTuple(tupleOf(family, size.dims)!, tuple));
  if (listed) return { standard: true, sources: covering.map((s) => s.source), nearest: [] };

  const scored = sizes
    .map((size) => {
      const other = tupleOf(family, size.dims)!;
      const score = other.reduce((sum, v, i) => sum + Math.abs(Math.log(v / tuple[i])), 0);
      return { size, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, maxNearest);

  // Keep the order the user typed a two-way section in (60×40 stays wide-first
  // when they typed it that way, 40×60 stays tall-first).
  const n = family.unordered ?? 0;
  const typedAscending = n >= 2 && (dims[family.keys[0]] ?? 0) < (dims[family.keys[1]] ?? 0);
  const nearest = scored.map(({ size }) => {
    if (!typedAscending) return size.dims;
    const flipped: Dims = { ...size.dims };
    flipped[family.keys[0]] = size.dims[family.keys[1]];
    flipped[family.keys[1]] = size.dims[family.keys[0]];
    return flipped;
  });

  return { standard: false, sources: covering.map((s) => s.source), nearest };
}

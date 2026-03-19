import type { StandardProfileDefinition } from "../types";
import { mapSizes } from "../standard-section-mm";

export const BEAM_PROFILES: StandardProfileDefinition[] = [
  /* ------------------------------------------------------------------ */
  /*  IPE – European I-Beam (EN 10365)                                  */
  /* ------------------------------------------------------------------ */
  {
    id: "beam_ipe_en",
    label: "IPE Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: mapSizes([
      { id: "ipe80", label: "IPE 80", areaMm2: 764, perimeterMm: 328, referenceLabel: "EN 10365" },
      { id: "ipe100", label: "IPE 100", areaMm2: 1032, perimeterMm: 400, referenceLabel: "EN 10365" },
      { id: "ipe120", label: "IPE 120", areaMm2: 1321, perimeterMm: 475, referenceLabel: "EN 10365" },
      { id: "ipe140", label: "IPE 140", areaMm2: 1643, perimeterMm: 551, referenceLabel: "EN 10365" },
      { id: "ipe160", label: "IPE 160", areaMm2: 2009, perimeterMm: 623, referenceLabel: "EN 10365" },
      { id: "ipe180", label: "IPE 180", areaMm2: 2395, perimeterMm: 698, referenceLabel: "EN 10365" },
      { id: "ipe200", label: "IPE 200", areaMm2: 2848, perimeterMm: 768, referenceLabel: "EN 10365" },
      { id: "ipe220", label: "IPE 220", areaMm2: 3337, perimeterMm: 848, referenceLabel: "EN 10365" },
      { id: "ipe240", label: "IPE 240", areaMm2: 3912, perimeterMm: 922, referenceLabel: "EN 10365" },
      { id: "ipe270", label: "IPE 270", areaMm2: 4594, perimeterMm: 1041, referenceLabel: "EN 10365" },
      { id: "ipe300", label: "IPE 300", areaMm2: 5381, perimeterMm: 1160, referenceLabel: "EN 10365" },
      { id: "ipe330", label: "IPE 330", areaMm2: 6261, perimeterMm: 1254, referenceLabel: "EN 10365" },
      { id: "ipe360", label: "IPE 360", areaMm2: 7273, perimeterMm: 1353, referenceLabel: "EN 10365" },
      { id: "ipe400", label: "IPE 400", areaMm2: 8446, perimeterMm: 1467, referenceLabel: "EN 10365" },
      { id: "ipe450", label: "IPE 450", areaMm2: 9882, perimeterMm: 1605, referenceLabel: "EN 10365" },
      { id: "ipe500", label: "IPE 500", areaMm2: 11552, perimeterMm: 1744, referenceLabel: "EN 10365" },
      { id: "ipe550", label: "IPE 550", areaMm2: 13442, perimeterMm: 1877, referenceLabel: "EN 10365" },
      { id: "ipe600", label: "IPE 600", areaMm2: 15598, perimeterMm: 2015, referenceLabel: "EN 10365" },
    ]),
  },

  /* ------------------------------------------------------------------ */
  /*  IPN – Standard I-Beam (EN 10024)                                  */
  /* ------------------------------------------------------------------ */
  {
    id: "beam_ipn_en",
    label: "IPN Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10024",
    sizes: mapSizes([
      { id: "ipn80", label: "IPN 80", areaMm2: 786, perimeterMm: 304, referenceLabel: "EN 10024" },
      { id: "ipn100", label: "IPN 100", areaMm2: 1058, perimeterMm: 370, referenceLabel: "EN 10024" },
      { id: "ipn120", label: "IPN 120", areaMm2: 1422, perimeterMm: 439, referenceLabel: "EN 10024" },
      { id: "ipn140", label: "IPN 140", areaMm2: 1826, perimeterMm: 502, referenceLabel: "EN 10024" },
      { id: "ipn160", label: "IPN 160", areaMm2: 2282, perimeterMm: 575, referenceLabel: "EN 10024" },
      { id: "ipn180", label: "IPN 180", areaMm2: 2790, perimeterMm: 640, referenceLabel: "EN 10024" },
      { id: "ipn200", label: "IPN 200", areaMm2: 3352, perimeterMm: 709, referenceLabel: "EN 10024" },
      { id: "ipn220", label: "IPN 220", areaMm2: 3942, perimeterMm: 775, referenceLabel: "EN 10024" },
      { id: "ipn240", label: "IPN 240", areaMm2: 4614, perimeterMm: 844, referenceLabel: "EN 10024" },
      { id: "ipn260", label: "IPN 260", areaMm2: 5314, perimeterMm: 912, referenceLabel: "EN 10024" },
      { id: "ipn280", label: "IPN 280", areaMm2: 6096, perimeterMm: 982, referenceLabel: "EN 10024" },
      { id: "ipn300", label: "IPN 300", areaMm2: 6908, perimeterMm: 1052, referenceLabel: "EN 10024" },
      { id: "ipn320", label: "IPN 320", areaMm2: 7827, perimeterMm: 1122, referenceLabel: "EN 10024" },
      { id: "ipn340", label: "IPN 340", areaMm2: 8686, perimeterMm: 1192, referenceLabel: "EN 10024" },
      { id: "ipn360", label: "IPN 360", areaMm2: 9704, perimeterMm: 1262, referenceLabel: "EN 10024" },
      { id: "ipn380", label: "IPN 380", areaMm2: 10738, perimeterMm: 1332, referenceLabel: "EN 10024" },
      { id: "ipn400", label: "IPN 400", areaMm2: 11826, perimeterMm: 1402, referenceLabel: "EN 10024" },
    ]),
  },

  /* ------------------------------------------------------------------ */
  /*  HEA – Wide Flange Light (EN 10365)                                */
  /* ------------------------------------------------------------------ */
  {
    id: "beam_hea_en",
    label: "HEA Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: mapSizes([
      { id: "hea100", label: "HEA 100", areaMm2: 2124, perimeterMm: 561, referenceLabel: "EN 10365" },
      { id: "hea120", label: "HEA 120", areaMm2: 2534, perimeterMm: 677, referenceLabel: "EN 10365" },
      { id: "hea140", label: "HEA 140", areaMm2: 3142, perimeterMm: 794, referenceLabel: "EN 10365" },
      { id: "hea160", label: "HEA 160", areaMm2: 3877, perimeterMm: 906, referenceLabel: "EN 10365" },
      { id: "hea180", label: "HEA 180", areaMm2: 4525, perimeterMm: 1024, referenceLabel: "EN 10365" },
      { id: "hea200", label: "HEA 200", areaMm2: 5383, perimeterMm: 1136, referenceLabel: "EN 10365" },
      { id: "hea220", label: "HEA 220", areaMm2: 6434, perimeterMm: 1255, referenceLabel: "EN 10365" },
      { id: "hea240", label: "HEA 240", areaMm2: 7684, perimeterMm: 1369, referenceLabel: "EN 10365" },
      { id: "hea260", label: "HEA 260", areaMm2: 8682, perimeterMm: 1484, referenceLabel: "EN 10365" },
      { id: "hea280", label: "HEA 280", areaMm2: 9726, perimeterMm: 1603, referenceLabel: "EN 10365" },
      { id: "hea300", label: "HEA 300", areaMm2: 11253, perimeterMm: 1717, referenceLabel: "EN 10365" },
      { id: "hea320", label: "HEA 320", areaMm2: 12444, perimeterMm: 1756, referenceLabel: "EN 10365" },
      { id: "hea340", label: "HEA 340", areaMm2: 13330, perimeterMm: 1795, referenceLabel: "EN 10365" },
      { id: "hea360", label: "HEA 360", areaMm2: 14278, perimeterMm: 1834, referenceLabel: "EN 10365" },
      { id: "hea400", label: "HEA 400", areaMm2: 15898, perimeterMm: 1912, referenceLabel: "EN 10365" },
      { id: "hea450", label: "HEA 450", areaMm2: 17800, perimeterMm: 2011, referenceLabel: "EN 10365" },
      { id: "hea500", label: "HEA 500", areaMm2: 19782, perimeterMm: 2110, referenceLabel: "EN 10365" },
      { id: "hea550", label: "HEA 550", areaMm2: 21192, perimeterMm: 2209, referenceLabel: "EN 10365" },
      { id: "hea600", label: "HEA 600", areaMm2: 22646, perimeterMm: 2308, referenceLabel: "EN 10365" },
      { id: "hea650", label: "HEA 650", areaMm2: 24158, perimeterMm: 2407, referenceLabel: "EN 10365" },
      { id: "hea700", label: "HEA 700", areaMm2: 26058, perimeterMm: 2505, referenceLabel: "EN 10365" },
      { id: "hea800", label: "HEA 800", areaMm2: 28558, perimeterMm: 2704, referenceLabel: "EN 10365" },
      { id: "hea900", label: "HEA 900", areaMm2: 32098, perimeterMm: 2904, referenceLabel: "EN 10365" },
      { id: "hea1000", label: "HEA 1000", areaMm2: 34698, perimeterMm: 3101, referenceLabel: "EN 10365" },
    ]),
  },

  /* ------------------------------------------------------------------ */
  /*  HEB – Wide Flange Medium (EN 10365)                               */
  /* ------------------------------------------------------------------ */
  {
    id: "beam_heb_en",
    label: "HEB Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: mapSizes([
      { id: "heb100", label: "HEB 100", areaMm2: 2604, perimeterMm: 567, referenceLabel: "EN 10365" },
      { id: "heb120", label: "HEB 120", areaMm2: 3401, perimeterMm: 686, referenceLabel: "EN 10365" },
      { id: "heb140", label: "HEB 140", areaMm2: 4296, perimeterMm: 805, referenceLabel: "EN 10365" },
      { id: "heb160", label: "HEB 160", areaMm2: 5425, perimeterMm: 918, referenceLabel: "EN 10365" },
      { id: "heb180", label: "HEB 180", areaMm2: 6525, perimeterMm: 1037, referenceLabel: "EN 10365" },
      { id: "heb200", label: "HEB 200", areaMm2: 7808, perimeterMm: 1151, referenceLabel: "EN 10365" },
      { id: "heb220", label: "HEB 220", areaMm2: 9104, perimeterMm: 1270, referenceLabel: "EN 10365" },
      { id: "heb240", label: "HEB 240", areaMm2: 10600, perimeterMm: 1384, referenceLabel: "EN 10365" },
      { id: "heb260", label: "HEB 260", areaMm2: 11845, perimeterMm: 1499, referenceLabel: "EN 10365" },
      { id: "heb280", label: "HEB 280", areaMm2: 13138, perimeterMm: 1618, referenceLabel: "EN 10365" },
      { id: "heb300", label: "HEB 300", areaMm2: 14908, perimeterMm: 1732, referenceLabel: "EN 10365" },
      { id: "heb320", label: "HEB 320", areaMm2: 16129, perimeterMm: 1771, referenceLabel: "EN 10365" },
      { id: "heb340", label: "HEB 340", areaMm2: 17090, perimeterMm: 1810, referenceLabel: "EN 10365" },
      { id: "heb360", label: "HEB 360", areaMm2: 18060, perimeterMm: 1849, referenceLabel: "EN 10365" },
      { id: "heb400", label: "HEB 400", areaMm2: 19782, perimeterMm: 1927, referenceLabel: "EN 10365" },
      { id: "heb450", label: "HEB 450", areaMm2: 21808, perimeterMm: 2026, referenceLabel: "EN 10365" },
      { id: "heb500", label: "HEB 500", areaMm2: 23858, perimeterMm: 2125, referenceLabel: "EN 10365" },
      { id: "heb550", label: "HEB 550", areaMm2: 25358, perimeterMm: 2224, referenceLabel: "EN 10365" },
      { id: "heb600", label: "HEB 600", areaMm2: 27000, perimeterMm: 2323, referenceLabel: "EN 10365" },
      { id: "heb650", label: "HEB 650", areaMm2: 28558, perimeterMm: 2422, referenceLabel: "EN 10365" },
      { id: "heb700", label: "HEB 700", areaMm2: 30638, perimeterMm: 2520, referenceLabel: "EN 10365" },
      { id: "heb800", label: "HEB 800", areaMm2: 33438, perimeterMm: 2719, referenceLabel: "EN 10365" },
      { id: "heb900", label: "HEB 900", areaMm2: 37098, perimeterMm: 2917, referenceLabel: "EN 10365" },
      { id: "heb1000", label: "HEB 1000", areaMm2: 40000, perimeterMm: 3116, referenceLabel: "EN 10365" },
    ]),
  },

  /* ------------------------------------------------------------------ */
  /*  HEM – Wide Flange Heavy (EN 10365)                                */
  /* ------------------------------------------------------------------ */
  {
    id: "beam_hem_en",
    label: "HEM Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: mapSizes([
      { id: "hem100", label: "HEM 100", areaMm2: 5320, perimeterMm: 619, referenceLabel: "EN 10365" },
      { id: "hem120", label: "HEM 120", areaMm2: 6621, perimeterMm: 738, referenceLabel: "EN 10365" },
      { id: "hem140", label: "HEM 140", areaMm2: 8135, perimeterMm: 857, referenceLabel: "EN 10365" },
      { id: "hem160", label: "HEM 160", areaMm2: 9726, perimeterMm: 970, referenceLabel: "EN 10365" },
      { id: "hem180", label: "HEM 180", areaMm2: 11320, perimeterMm: 1089, referenceLabel: "EN 10365" },
      { id: "hem200", label: "HEM 200", areaMm2: 13130, perimeterMm: 1203, referenceLabel: "EN 10365" },
      { id: "hem220", label: "HEM 220", areaMm2: 14943, perimeterMm: 1322, referenceLabel: "EN 10365" },
      { id: "hem240", label: "HEM 240", areaMm2: 19990, perimeterMm: 1460, referenceLabel: "EN 10365" },
      { id: "hem260", label: "HEM 260", areaMm2: 22042, perimeterMm: 1575, referenceLabel: "EN 10365" },
      { id: "hem280", label: "HEM 280", areaMm2: 24024, perimeterMm: 1694, referenceLabel: "EN 10365" },
      { id: "hem300", label: "HEM 300", areaMm2: 30310, perimeterMm: 1832, referenceLabel: "EN 10365" },
    ]),
  },

];

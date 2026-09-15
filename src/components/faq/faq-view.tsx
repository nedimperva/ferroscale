"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useTheme } from "@/hooks/useTheme";
import { DeskIcon } from "@/components/command/desktop/desk-atoms";

type FaqCategoryId =
  | "all"
  | "general"
  | "sheets"
  | "tubes"
  | "bars"
  | "beams"
  | "materials"
  | "tolerances";

interface FaqItemMeta {
  id: string;
  category: FaqCategoryId;
}

const FAQ_ITEMS: FaqItemMeta[] = [
  { id: "generalFormula", category: "general" },
  { id: "sheetPlate", category: "sheets" },
  { id: "chequeredPlate", category: "sheets" },
  { id: "expandedMetal", category: "sheets" },
  { id: "corrugatedSheet", category: "sheets" },
  { id: "roundBar", category: "bars" },
  { id: "squareBar", category: "bars" },
  { id: "flatBar", category: "bars" },
  { id: "hexBar", category: "bars" },
  { id: "roundTube", category: "tubes" },
  { id: "boxSection", category: "tubes" },
  { id: "structuralBeams", category: "beams" },
  { id: "angleIron", category: "beams" },
  { id: "teeProfile", category: "beams" },
  { id: "channelSection", category: "beams" },
  { id: "densitiesComparison", category: "materials" },
  { id: "rollingTolerances", category: "tolerances" },
  { id: "cuttingWaste", category: "tolerances" },
  { id: "galvanizingWeight", category: "tolerances" },
  { id: "paintSurfaceArea", category: "tolerances" },
];

// The data sheet at the top of the page: every profile that has a governing
// formula, in the order a fabricator scans for one. The six remaining FAQ
// items (general principles, densities, tolerances, waste, galvanizing, paint)
// are not profiles and appear only as questions.
const DATA_SHEET_ROWS: string[] = [
  "sheetPlate",
  "chequeredPlate",
  "expandedMetal",
  "corrugatedSheet",
  "roundBar",
  "squareBar",
  "flatBar",
  "hexBar",
  "roundTube",
  "boxSection",
  "angleIron",
  "structuralBeams",
  "channelSection",
  "teeProfile",
];

const CATEGORIES: FaqCategoryId[] = [
  "all",
  "general",
  "sheets",
  "tubes",
  "bars",
  "beams",
  "materials",
  "tolerances",
];

export type ShapeType =
  | "sheet"
  | "roundBar"
  | "roundTube"
  | "rectTube"
  | "flatBar"
  | "squareBar"
  | "chequered"
  | "angle"
  | "beam"
  | "channel"
  | "tee"
  | "hexBar"
  | "paint"
  | "galv";

export type MaterialType = "steel" | "stainless" | "aluminum";

const MATERIAL_DENSITIES: Record<MaterialType, { density: number; grade: string }> = {
  steel: { density: 7.85, grade: "s235" },
  stainless: { density: 7.93, grade: "inox" },
  aluminum: { density: 2.7, grade: "alu" },
};

const STANDARD_BEAMS: Record<
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

const STANDARD_CHANNELS: Record<string, { massKgM: number; areaMm2: number }> = {
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

const STANDARD_TEES: Record<string, { massKgM: number; areaMm2: number }> = {
  "T 40x40x5": { massKgM: 2.96, areaMm2: 377 },
  "T 50x50x6": { massKgM: 4.44, areaMm2: 566 },
  "T 60x60x7": { massKgM: 6.23, areaMm2: 794 },
  "T 70x70x8": { massKgM: 8.32, areaMm2: 1060 },
  "T 80x80x9": { massKgM: 10.7, areaMm2: 1360 },
  "T 100x100x10": { massKgM: 15.1, areaMm2: 1920 },
};

interface SandboxPreset {
  shape: ShapeType;
  material?: MaterialType;
  thickness?: string;
  width?: string;
  height?: string;
  diameter?: string;
  side?: string;
  lengthM?: string;
  legA?: string;
  legB?: string;
  beamSize?: string;
  channelSize?: string;
  teeSize?: string;
  hexSize?: string;
}

const FAQ_SANDBOX_PRESETS: Record<string, SandboxPreset> = {
  generalFormula: { shape: "roundBar", diameter: "20", lengthM: "6", material: "steel" },
  sheetPlate: { shape: "sheet", thickness: "5", width: "1000", lengthM: "2", material: "steel" },
  chequeredPlate: { shape: "chequered", thickness: "4", width: "1000", lengthM: "2", material: "steel" },
  expandedMetal: { shape: "sheet", thickness: "2", width: "1000", lengthM: "2", material: "steel" },
  corrugatedSheet: { shape: "sheet", thickness: "0.75", width: "1000", lengthM: "3", material: "steel" },
  roundBar: { shape: "roundBar", diameter: "20", lengthM: "6", material: "steel" },
  squareBar: { shape: "squareBar", side: "20", lengthM: "6", material: "steel" },
  flatBar: { shape: "flatBar", width: "50", thickness: "10", lengthM: "6", material: "steel" },
  hexBar: { shape: "hexBar", hexSize: "24", lengthM: "3", material: "steel" },
  roundTube: { shape: "roundTube", diameter: "60.3", thickness: "3.2", lengthM: "6", material: "steel" },
  boxSection: { shape: "rectTube", width: "100", height: "50", thickness: "4", lengthM: "6", material: "steel" },
  structuralBeams: { shape: "beam", beamSize: "HEA 120", lengthM: "6", material: "steel" },
  angleIron: { shape: "angle", legA: "50", legB: "50", thickness: "5", lengthM: "6", material: "steel" },
  teeProfile: { shape: "tee", teeSize: "T 60x60x7", lengthM: "6", material: "steel" },
  channelSection: { shape: "channel", channelSize: "UPN 160", lengthM: "12", material: "steel" },
  densitiesComparison: { shape: "rectTube", width: "50", height: "50", thickness: "3", lengthM: "6", material: "aluminum" },
  rollingTolerances: { shape: "beam", beamSize: "HEA 160", lengthM: "12", material: "steel" },
  cuttingWaste: { shape: "beam", beamSize: "IPE 200", lengthM: "4", material: "steel" },
  galvanizingWeight: { shape: "galv", beamSize: "HEA 140", lengthM: "6", material: "steel" },
  paintSurfaceArea: { shape: "paint", width: "100", height: "50", lengthM: "6", material: "steel" },
};

export function FaqView() {
  const t = useTranslations("faq");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FaqCategoryId>("all");

  // One answer at a time: the data sheet above already carries every formula,
  // so an open answer is something the reader asked for rather than the default.
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightVerifier, setHighlightVerifier] = useState(false);
  const [verifierOpen, setVerifierOpen] = useState(false);

  // Sandbox state
  const [shape, setShape] = useState<ShapeType>("roundTube");
  const [material, setMaterial] = useState<MaterialType>("steel");
  const [thickness, setThickness] = useState("3.2");
  const [width, setWidth] = useState("100");
  const [height, setHeight] = useState("50");
  const [diameter, setDiameter] = useState("60.3");
  const [side, setSide] = useState("20");
  const [lengthM, setLengthM] = useState("6");
  const [legA, setLegA] = useState("50");
  const [legB, setLegB] = useState("50");
  const [beamSize, setBeamSize] = useState("HEA 120");
  const [channelSize, setChannelSize] = useState("UPN 160");
  const [teeSize, setTeeSize] = useState("T 60x60x7");
  const [hexSize, setHexSize] = useState("24");

  const searchInputId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' focuses search; 'Escape' clears search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      if (e.key === "/" && !isInputActive) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const switchLocale = useCallback(
    (nextLocale: AppLocale) => {
      if (nextLocale === locale) return;
      router.replace(pathname, { locale: nextLocale });
    },
    [locale, pathname, router],
  );

  const toggleOpen = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const loadIntoVerifier = useCallback((preset: Partial<SandboxPreset>) => {
    setVerifierOpen(true);
    if (preset.shape) setShape(preset.shape);
    if (preset.material) setMaterial(preset.material);
    if (preset.thickness !== undefined) setThickness(preset.thickness);
    if (preset.width !== undefined) setWidth(preset.width);
    if (preset.height !== undefined) setHeight(preset.height);
    if (preset.diameter !== undefined) setDiameter(preset.diameter);
    if (preset.side !== undefined) setSide(preset.side);
    if (preset.lengthM !== undefined) setLengthM(preset.lengthM);
    if (preset.legA !== undefined) setLegA(preset.legA);
    if (preset.legB !== undefined) setLegB(preset.legB);
    if (preset.beamSize !== undefined) setBeamSize(preset.beamSize);
    if (preset.channelSize !== undefined) setChannelSize(preset.channelSize);
    if (preset.teeSize !== undefined) setTeeSize(preset.teeSize);
    if (preset.hexSize !== undefined) setHexSize(preset.hexSize);

    setHighlightVerifier(true);
    setTimeout(() => setHighlightVerifier(false), 1800);

    // The panel may still be collapsed on this frame, so wait for it to mount.
    if (typeof document !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.getElementById("sandbox-heading");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, []);

  // Opening a data-sheet row clears the filters so the answer cannot be
  // scrolled to while a category or query is hiding it.
  const jumpToQuestion = useCallback((questionId: string) => {
    setOpenId(questionId);
    setSelectedCategory("all");
    setSearchQuery("");

    if (typeof document !== "undefined") {
      requestAnimationFrame(() => {
        const elem = document.getElementById(`faq-${questionId}`);
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, []);

  const copyToClipboard = useCallback((text: string, identifier: string) => {
    const handleSuccess = () => {
      setCopiedId(identifier);
      setTimeout(() => {
        setCopiedId((current) => (current === identifier ? null : current));
      }, 2000);
    };

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(handleSuccess, () => {
        try {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (ok) handleSuccess();
        } catch {
          // ignore
        }
      });
      return;
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (ok) handleSuccess();
    } catch {
      // ignore
    }
  }, []);

  // Category counts reflecting active search query
  const categoryCounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const counts: Record<FaqCategoryId, number> = {
      all: 0,
      general: 0,
      sheets: 0,
      tubes: 0,
      bars: 0,
      beams: 0,
      materials: 0,
      tolerances: 0,
    };

    for (const item of FAQ_ITEMS) {
      let matches = true;
      if (query) {
        const q = t(`items.${item.id}.question`).toLowerCase();
        const s = t(`items.${item.id}.summary`).toLowerCase();
        const f = t(`items.${item.id}.formula`).toLowerCase();
        const e = t(`items.${item.id}.explanation`).toLowerCase();
        const ex = t(`items.${item.id}.example`).toLowerCase();
        const tip = t(`items.${item.id}.tip`).toLowerCase();
        const cmd = t(`items.${item.id}.command`).toLowerCase();

        matches =
          q.includes(query) ||
          s.includes(query) ||
          f.includes(query) ||
          e.includes(query) ||
          ex.includes(query) ||
          tip.includes(query) ||
          cmd.includes(query);
      }

      if (matches) {
        counts.all += 1;
        counts[item.category] += 1;
      }
    }
    return counts;
  }, [searchQuery, t]);

  // The data sheet answers to the search box but not to the topic filter:
  // the topics name kinds of question, not kinds of profile.
  const dataSheetRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return DATA_SHEET_ROWS;

    return DATA_SHEET_ROWS.filter((id) => {
      const name = t(`dataSheet.rows.${id}.name`).toLowerCase();
      const formula = t(`dataSheet.rows.${id}.formula`).toLowerCase();
      const example = t(`dataSheet.rows.${id}.example`).toLowerCase();
      const question = t(`items.${id}.question`).toLowerCase();
      const command = t(`items.${id}.command`).toLowerCase();

      return (
        name.includes(query) ||
        formula.includes(query) ||
        example.includes(query) ||
        question.includes(query) ||
        command.includes(query)
      );
    });
  }, [searchQuery, t]);

  // Filter items based on category and search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (!query) return true;

      const question = t(`items.${item.id}.question`).toLowerCase();
      const summary = t(`items.${item.id}.summary`).toLowerCase();
      const formula = t(`items.${item.id}.formula`).toLowerCase();
      const explanation = t(`items.${item.id}.explanation`).toLowerCase();
      const example = t(`items.${item.id}.example`).toLowerCase();
      const tip = t(`items.${item.id}.tip`).toLowerCase();
      const command = t(`items.${item.id}.command`).toLowerCase();

      return (
        question.includes(query) ||
        summary.includes(query) ||
        formula.includes(query) ||
        explanation.includes(query) ||
        example.includes(query) ||
        tip.includes(query) ||
        command.includes(query)
      );
    });
  }, [searchQuery, selectedCategory, t]);

  // Calculation sandbox logic covering all profiles and engineering checks
  const calculationTrace = useMemo(() => {
    const mat = MATERIAL_DENSITIES[material];
    const L = Math.max(0.001, parseFloat(lengthM) || 1);
    const densityGcm3 = mat.density;

    let areaMm2 = 0;
    let step1Formula = "";
    let step2Formula = "";
    let linearOrSurfaceMass = 0;
    let totalMass = 0;
    let commandStr = "";

    if (shape === "sheet") {
      const th = Math.max(0.1, parseFloat(thickness) || 1);
      const wMm = Math.max(1, parseFloat(width) || 1000);
      const lMm = Math.max(1, L * 1000);
      const wM = wMm / 1000;
      const lM = lMm / 1000;
      const surfaceAreaM2 = wM * lM;
      const kgPerM2 = th * densityGcm3;
      totalMass = surfaceAreaM2 * kgPerM2;
      linearOrSurfaceMass = kgPerM2;
      areaMm2 = th * wMm;
      step1Formula = `${th} mm × ${wMm} mm = ${areaMm2.toLocaleString(locale, { maximumFractionDigits: 1 })} mm²`;
      step2Formula = `${th} mm × ${densityGcm3.toFixed(2)} = ${kgPerM2.toFixed(2)} kg/m² (${surfaceAreaM2.toFixed(2)} m²)`;
      commandStr = `sht${th} ${wMm}x${Math.round(lMm)} ${mat.grade}`;
    } else if (shape === "chequered") {
      const th = Math.max(0.5, parseFloat(thickness) || 4);
      const wMm = Math.max(1, parseFloat(width) || 1000);
      const lMm = Math.max(1, L * 1000);
      const wM = wMm / 1000;
      const lM = lMm / 1000;
      const surfaceAreaM2 = wM * lM;
      const baseKgPerM2 = th * densityGcm3;
      const patternAllowance = 2.5; // typical durbar pattern allowance in Europe
      const totalKgPerM2 = baseKgPerM2 + patternAllowance;
      totalMass = surfaceAreaM2 * totalKgPerM2;
      linearOrSurfaceMass = totalKgPerM2;
      areaMm2 = th * wMm;
      step1Formula = `Base: ${th} mm × ${densityGcm3.toFixed(2)} = ${baseKgPerM2.toFixed(2)} kg/m²`;
      step2Formula = `Base + Tear-drop Pattern (+${patternAllowance.toFixed(2)} kg/m²) = ${totalKgPerM2.toFixed(2)} kg/m²`;
      commandStr = `chq${th} ${wMm}x${Math.round(lMm)} ${mat.grade}`;
    } else if (shape === "roundBar") {
      const d = Math.max(1, parseFloat(diameter) || 20);
      const r = d / 2;
      areaMm2 = Math.PI * r * r;
      const kgPerM = (areaMm2 * densityGcm3) / 1000;
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `π × (${d}/2)² = ${areaMm2.toFixed(1)} mm²`;
      step2Formula = `(${areaMm2.toFixed(1)} mm² × ${densityGcm3.toFixed(2)}) ÷ 1,000 = ${kgPerM.toFixed(3)} kg/m`;
      commandStr = `rd${d} ${L}m ${mat.grade}`;
    } else if (shape === "hexBar") {
      const s = Math.max(2, parseFloat(hexSize) || 24);
      // Area of regular hexagon with across-flats width s: (sqrt(3)/2) * s^2
      areaMm2 = (Math.sqrt(3) / 2) * s * s;
      const kgPerM = (areaMm2 * densityGcm3) / 1000;
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `(√3 / 2) × ${s}² mm = ${areaMm2.toFixed(1)} mm²`;
      step2Formula = `(${areaMm2.toFixed(1)} mm² × ${densityGcm3.toFixed(2)}) ÷ 1,000 = ${kgPerM.toFixed(3)} kg/m`;
      commandStr = `hex${s} ${L}m ${mat.grade}`;
    } else if (shape === "roundTube") {
      const D = Math.max(2, parseFloat(diameter) || 60.3);
      const th = Math.max(0.5, Math.min(D / 2 - 0.1, parseFloat(thickness) || 3.2));
      areaMm2 = Math.PI * (D - th) * th;
      const kgPerM = (areaMm2 * densityGcm3) / 1000;
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `π × (${D} - ${th}) × ${th} = ${areaMm2.toFixed(1)} mm²`;
      step2Formula = `(${areaMm2.toFixed(1)} mm² × ${densityGcm3.toFixed(2)}) ÷ 1,000 = ${kgPerM.toFixed(3)} kg/m`;
      commandStr = `tube${D}x${th} ${L}m ${mat.grade}`;
    } else if (shape === "rectTube") {
      const wVal = Math.max(5, parseFloat(width) || 100);
      const hVal = Math.max(5, parseFloat(height) || 50);
      const th = Math.max(0.5, Math.min(Math.min(wVal, hVal) / 2 - 0.1, parseFloat(thickness) || 4));
      areaMm2 = wVal * hVal - (wVal - 2 * th) * (hVal - 2 * th);
      const kgPerM = (areaMm2 * densityGcm3) / 1000;
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `(${wVal} × ${hVal}) - (${wVal - 2 * th} × ${hVal - 2 * th}) = ${areaMm2.toFixed(1)} mm²`;
      step2Formula = `(${areaMm2.toFixed(1)} mm² × ${densityGcm3.toFixed(2)}) ÷ 1,000 = ${kgPerM.toFixed(3)} kg/m`;
      commandStr = `tub${wVal}x${hVal}x${th} ${L}m ${mat.grade}`;
    } else if (shape === "flatBar") {
      const wVal = Math.max(5, parseFloat(width) || 50);
      const th = Math.max(0.5, parseFloat(thickness) || 10);
      areaMm2 = wVal * th;
      const kgPerM = (areaMm2 * densityGcm3) / 1000;
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `${wVal} mm × ${th} mm = ${areaMm2.toFixed(1)} mm²`;
      step2Formula = `(${areaMm2.toFixed(1)} mm² × ${densityGcm3.toFixed(2)}) ÷ 1,000 = ${kgPerM.toFixed(3)} kg/m`;
      commandStr = `flat${wVal}x${th} ${L}m ${mat.grade}`;
    } else if (shape === "squareBar") {
      const sVal = Math.max(2, parseFloat(side) || 20);
      areaMm2 = sVal * sVal;
      const kgPerM = (areaMm2 * densityGcm3) / 1000;
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `${sVal} mm × ${sVal} mm = ${areaMm2.toFixed(1)} mm²`;
      step2Formula = `(${areaMm2.toFixed(1)} mm² × ${densityGcm3.toFixed(2)}) ÷ 1,000 = ${kgPerM.toFixed(3)} kg/m`;
      commandStr = `sq${sVal} ${L}m ${mat.grade}`;
    } else if (shape === "angle") {
      const lA = Math.max(5, parseFloat(legA) || 50);
      const lB = Math.max(5, parseFloat(legB) || 50);
      const th = Math.max(0.5, Math.min(Math.min(lA, lB) - 0.5, parseFloat(thickness) || 5));
      areaMm2 = (lA + lB - th) * th;
      const kgPerM = (areaMm2 * densityGcm3) / 1000;
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `(${lA} + ${lB} - ${th}) × ${th} = ${areaMm2.toFixed(1)} mm²`;
      step2Formula = `(${areaMm2.toFixed(1)} mm² × ${densityGcm3.toFixed(2)}) ÷ 1,000 = ${kgPerM.toFixed(3)} kg/m`;
      commandStr = lA === lB ? `l${lA}x${th} ${L}m ${mat.grade}` : `l${lA}x${lB}x${th} ${L}m ${mat.grade}`;
    } else if (shape === "beam") {
      const std = STANDARD_BEAMS[beamSize] || STANDARD_BEAMS["HEA 120"];
      areaMm2 = std.areaMm2;
      const kgPerM = std.massKgM * (densityGcm3 / 7.85);
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `EN 10365 cross-section: ${std.h}×${std.b} mm, tw=${std.tw} mm, tf=${std.tf} mm (A = ${std.areaMm2.toLocaleString()} mm²)`;
      step2Formula = `Published EN catalog weight: ${std.massKgM.toFixed(2)} kg/m (scaled to ${mat.grade}: ${kgPerM.toFixed(2)} kg/m)`;
      commandStr = `${beamSize.toLowerCase().replace(" ", "")} ${L}m ${mat.grade}`;
    } else if (shape === "channel") {
      const std = STANDARD_CHANNELS[channelSize] || STANDARD_CHANNELS["UPN 160"];
      areaMm2 = std.areaMm2;
      const kgPerM = std.massKgM * (densityGcm3 / 7.85);
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `EN standard channel cross-section (with tapered flanges & fillets): A = ${std.areaMm2.toLocaleString()} mm²`;
      step2Formula = `Published catalog weight: ${std.massKgM.toFixed(2)} kg/m`;
      commandStr = `${channelSize.toLowerCase().replace(" ", "")} ${L}m ${mat.grade}`;
    } else if (shape === "tee") {
      const std = STANDARD_TEES[teeSize] || STANDARD_TEES["T 60x60x7"];
      areaMm2 = std.areaMm2;
      const kgPerM = std.massKgM * (densityGcm3 / 7.85);
      totalMass = kgPerM * L;
      linearOrSurfaceMass = kgPerM;
      step1Formula = `EN 10055 standard cross-section: A = ${std.areaMm2.toLocaleString()} mm²`;
      step2Formula = `Standard catalog linear mass: ${std.massKgM.toFixed(2)} kg/m`;
      commandStr = `${teeSize.toLowerCase().replace(/\s+/g, "")} ${L}m ${mat.grade}`;
    } else if (shape === "paint") {
      const wVal = Math.max(5, parseFloat(width) || 100);
      const hVal = Math.max(5, parseFloat(height) || 50);
      const perimeterMm = 2 * (wVal + hVal);
      const areaM2PerM = perimeterMm / 1000;
      const totalAreaM2 = areaM2PerM * L;
      areaMm2 = perimeterMm;
      linearOrSurfaceMass = areaM2PerM;
      totalMass = totalAreaM2;
      step1Formula = `Outer perimeter: 2 × (${wVal} + ${hVal}) mm = ${perimeterMm} mm`;
      step2Formula = `Coating surface per metre: ${perimeterMm} ÷ 1,000 = ${areaM2PerM.toFixed(3)} m²/m`;
      commandStr = `tub${wVal}x${hVal}x4 ${L}m`;
    } else {
      // Hot-dip galvanizing pickup calculation
      const std = STANDARD_BEAMS[beamSize] || STANDARD_BEAMS["HEA 140"];
      const baseSteelMass = std.massKgM * L;
      const zincFactor = 0.05; // 5% average pickup
      const zincMass = baseSteelMass * zincFactor;
      totalMass = baseSteelMass + zincMass;
      linearOrSurfaceMass = std.massKgM * 1.05;
      areaMm2 = std.areaMm2;
      step1Formula = `Black steel mass: ${std.massKgM.toFixed(2)} kg/m × ${L} m = ${baseSteelMass.toFixed(1)} kg`;
      step2Formula = `EN ISO 1461 hot-dip zinc pickup (+5.0%): +${zincMass.toFixed(1)} kg zinc`;
      commandStr = `${beamSize.toLowerCase().replace(" ", "")} ${L}m x4`;
    }

    return {
      areaMm2,
      step1Formula,
      step2Formula,
      linearOrSurfaceMass,
      totalMass,
      commandStr,
      isSheet: shape === "sheet" || shape === "chequered",
      isPaint: shape === "paint",
    };
  }, [
    beamSize,
    channelSize,
    diameter,
    height,
    hexSize,
    legA,
    legB,
    lengthM,
    locale,
    material,
    shape,
    side,
    teeSize,
    thickness,
    width,
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      {/* Top breadcrumb & navigation bar */}
      <nav
        aria-label="FAQ Navigation"
        className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-faint)]"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-foreground transition-colors hover:text-[var(--accent)]"
        >
          <span
            aria-hidden="true"
            className="w-3.5 h-3.5 bg-[var(--accent)] inline-block flex-shrink-0"
          />
          <span>← {t("back")}</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/qa"
            className="text-xs font-medium text-foreground-secondary hover:text-foreground transition-colors hidden sm:inline"
          >
            {t("nav.qa")}
          </Link>
          <Link
            href="/contact"
            className="text-xs font-medium text-foreground-secondary hover:text-foreground transition-colors hidden sm:inline"
          >
            {t("nav.contact")}
          </Link>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title={t("themeToggle")}
            aria-label={t("themeToggle")}
            className="p-1 border border-[var(--border)] bg-[var(--surface)] text-foreground-secondary hover:text-foreground hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            <span className="hidden dark:block">
              <DeskIcon name="sun" size={15} />
            </span>
            <span className="block dark:hidden">
              <DeskIcon name="moon" size={15} />
            </span>
          </button>

          {/* Language toggle */}
          <div className="inline-flex border border-[var(--border)] p-0.5 text-[11px] font-mono bg-[var(--surface)]">
            <button
              type="button"
              onClick={() => switchLocale("en")}
              className={`px-2 py-0.5 transition-colors cursor-pointer ${
                locale === "en"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-bold"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => switchLocale("bs")}
              className={`px-2 py-0.5 transition-colors cursor-pointer ${
                locale === "bs"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-bold"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              BS
            </button>
          </div>
        </div>
      </nav>

      {/* Hero header — the search rides with the title instead of taking its own band */}
      <header className="flex flex-col gap-6 pt-10 pb-7 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3 font-mono text-[11px] uppercase tracking-wider text-foreground-secondary">
            <span>{t("badge")}</span>
            <span>·</span>
            <span>{t("standardsBadge")}</span>
          </div>
          <h1 className="fs-title text-2xl sm:text-3xl leading-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm text-foreground-secondary max-w-xl leading-relaxed text-pretty">
            {t("subtitle")}
          </p>
        </div>

        <div className="relative w-full md:w-[17rem] md:flex-shrink-0">
          <label htmlFor={searchInputId} className="sr-only">
            {t("searchAria")}
          </label>
          <input
            id={searchInputId}
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full px-3 py-2 pr-9 text-xs border border-[var(--border)] bg-[var(--surface)] text-foreground placeholder:text-muted focus:outline-none focus:border-[var(--foreground)]"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label={t("clearSearch")}
                className="text-xs text-muted hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono border border-[var(--border)] text-muted bg-[var(--surface-raised)]"
              >
                /
              </kbd>
            )}
          </div>
        </div>
      </header>

      {/* Standard profile data sheet — the page's lead content */}
      <section aria-labelledby="data-sheet-heading">
        <h2 id="data-sheet-heading" className="sr-only">
          {t("dataSheet.heading")}
        </h2>

        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2 border-b border-[var(--foreground)]">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-medium">
            {t("dataSheet.eyebrow")}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent-text)] font-medium">
            {t("dataSheet.multipliers")}
          </span>
        </div>

        {dataSheetRows.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => jumpToQuestion(id)}
            className="group grid w-full grid-cols-[minmax(0,1fr)_1.25rem] items-baseline gap-x-4 gap-y-0.5 border-t border-[var(--border-faint)] py-2.5 text-left transition-colors hover:bg-[var(--surface-inset)] cursor-pointer md:grid-cols-[11rem_16rem_minmax(0,1fr)_1.25rem] md:gap-y-0"
          >
            <span className="col-start-1 text-[13px] font-medium text-foreground">
              {t(`dataSheet.rows.${id}.name`)}
            </span>
            <span className="col-start-1 font-mono text-xs text-foreground tabular-nums md:col-start-2">
              {t(`dataSheet.rows.${id}.formula`)}
            </span>
            <span className="col-start-1 font-mono text-[11.5px] text-muted tabular-nums md:col-start-3">
              {t(`dataSheet.rows.${id}.example`)}
            </span>
            <span
              aria-hidden="true"
              className="row-start-1 col-start-2 text-right font-mono text-xs text-[var(--border-strong)] transition-colors group-hover:text-[var(--accent)] md:col-start-4"
            >
              →
            </span>
          </button>
        ))}

        {dataSheetRows.length === 0 && (
          <div className="border-t border-[var(--border-faint)] py-4 text-xs text-muted">
            {t("dataSheet.empty")}
          </div>
        )}

        <div className="border-b border-[var(--border-faint)]" />
      </section>

      {/* Formula verifier — one strip until it is asked for */}
      {!verifierOpen && (
        <button
          type="button"
          onClick={() => setVerifierOpen(true)}
          className="mt-4 flex w-full flex-wrap items-center justify-between gap-3 bg-[var(--surface-inset)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface)] hover:shadow-[inset_0_0_0_1px_var(--border)] cursor-pointer"
        >
          <span className="flex flex-wrap items-center gap-2.5">
            <span aria-hidden="true" className="inline-block w-2.5 h-2.5 bg-[var(--foreground)] flex-shrink-0" />
            <span className="text-[13.5px] font-medium text-foreground">
              {t("verifierStrip.title")}
            </span>
            <span className="text-[13px] text-foreground-secondary">
              {t("verifierStrip.subtitle")}
            </span>
          </span>
          <span className="whitespace-nowrap text-xs font-semibold text-[var(--accent-text)]">
            {t("verifierStrip.open")} ↓
          </span>
        </button>
      )}

      {verifierOpen && (
      <section
        aria-labelledby="sandbox-heading"
        className={`mt-4 border transition-all ${
          highlightVerifier
            ? "border-[var(--foreground)] ring-1 ring-[var(--foreground)] bg-[var(--surface)]"
            : "border-[var(--border)] bg-[var(--surface)]"
        }`}
      >
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--border-faint)] bg-[var(--surface-raised)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="sandbox-heading" className="fs-title text-base sm:text-lg text-foreground flex items-center gap-2">
              <span aria-hidden="true" className="inline-block w-2.5 h-2.5 bg-[var(--foreground)]" />
              {t("sandbox.title")}
            </h2>
            <p className="text-xs text-foreground-secondary mt-0.5">{t("sandbox.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted font-semibold tracking-wider uppercase border border-[var(--border-faint)] bg-[var(--surface)] px-2 py-0.5">
              {t("verifierBadge")}
            </span>
            <button
              type="button"
              onClick={() => setVerifierOpen(false)}
              className="px-2 py-0.5 text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              {t("verifierStrip.close")} ↑
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* Shape & Material selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-mono text-muted font-semibold uppercase tracking-wider mb-1.5">
                {t("sandbox.profile")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {(
                  [
                    ["roundTube", t("sandbox.shapeRoundTube")],
                    ["roundBar", t("sandbox.shapeRoundBar")],
                    ["rectTube", t("sandbox.shapeRectTube")],
                    ["flatBar", t("sandbox.shapeFlatBar")],
                    ["squareBar", t("sandbox.shapeSquareBar")],
                    ["sheet", t("sandbox.shapeSheet")],
                    ["chequered", t("sandbox.shapeChequered")],
                    ["angle", t("sandbox.shapeAngle")],
                    ["beam", t("sandbox.shapeBeam")],
                    ["channel", t("sandbox.shapeChannel")],
                    ["tee", t("sandbox.shapeTee")],
                    ["hexBar", t("sandbox.shapeHexBar")],
                    ["paint", t("sandbox.shapePaint")],
                    ["galv", t("sandbox.shapeGalv")],
                  ] as const
                ).map(([key, label]) => {
                  const isActive = shape === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setShape(key)}
                      className={`px-2 py-1.5 text-xs text-left border transition-colors cursor-pointer flex items-center justify-between gap-1 ${
                        isActive
                          ? "border-[var(--foreground)] bg-[var(--surface-inset)] font-bold text-foreground"
                          : "border-[var(--border)] bg-[var(--surface)] text-foreground hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] font-medium"
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      {isActive && <span className="w-1.5 h-1.5 bg-[var(--foreground)] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted font-semibold uppercase tracking-wider mb-1.5">
                {t("sandbox.material")}
              </label>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ["steel", t("sandbox.steel")],
                    ["stainless", t("sandbox.stainless")],
                    ["aluminum", t("sandbox.aluminum")],
                  ] as const
                ).map(([key, label]) => {
                  const isActive = material === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMaterial(key)}
                      className={`px-3 py-1.5 text-xs text-left border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isActive
                          ? "border-[var(--foreground)] bg-[var(--surface-inset)] font-bold text-foreground"
                          : "border-[var(--border)] bg-[var(--surface)] text-foreground hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] font-medium"
                      }`}
                    >
                      <span>{label}</span>
                      {isActive && <span className="w-1.5 h-1.5 bg-[var(--foreground)] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dimension Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border)] mb-5">
            {shape === "roundBar" && (
              <div>
                <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                  {t("sandbox.diameter")} [mm]
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={diameter}
                  onChange={(e) => setDiameter(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                />
              </div>
            )}

            {shape === "hexBar" && (
              <div>
                <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                  {t("sandbox.hexSize")} [mm]
                </label>
                <input
                  type="number"
                  step="1"
                  min="2"
                  value={hexSize}
                  onChange={(e) => setHexSize(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                />
              </div>
            )}

            {shape === "squareBar" && (
              <div>
                <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                  {t("sandbox.side")} [mm]
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={side}
                  onChange={(e) => setSide(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                />
              </div>
            )}

            {shape === "flatBar" && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.width")} [mm]
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.thickness")} [mm]
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0.5"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
              </>
            )}

            {shape === "roundTube" && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.diameter")} [mm]
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="2"
                    value={diameter}
                    onChange={(e) => setDiameter(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.thickness")} [mm]
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
              </>
            )}

            {(shape === "rectTube" || shape === "paint") && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.width")} [mm]
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.height")} [mm]
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
                {shape === "rectTube" && (
                  <div>
                    <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                      {t("sandbox.thickness")} [mm]
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={thickness}
                      onChange={(e) => setThickness(e.target.value)}
                      className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                    />
                  </div>
                )}
              </>
            )}

            {(shape === "sheet" || shape === "chequered") && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.thickness")} [mm]
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.width")} [mm]
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="10"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
              </>
            )}

            {shape === "angle" && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.legA")} [mm]
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    value={legA}
                    onChange={(e) => setLegA(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.legB")} [mm]
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    value={legB}
                    onChange={(e) => setLegB(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                    {t("sandbox.thickness")} [mm]
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                  />
                </div>
              </>
            )}

            {(shape === "beam" || shape === "galv") && (
              <div className="col-span-2">
                <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                  {t("sandbox.beamSize")}
                </label>
                <select
                  value={beamSize}
                  onChange={(e) => setBeamSize(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                >
                  {Object.keys(STANDARD_BEAMS).map((size) => (
                    <option key={size} value={size}>
                      {size} ({STANDARD_BEAMS[size].massKgM} kg/m)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {shape === "channel" && (
              <div className="col-span-2">
                <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                  {t("sandbox.channelSize")}
                </label>
                <select
                  value={channelSize}
                  onChange={(e) => setChannelSize(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                >
                  {Object.keys(STANDARD_CHANNELS).map((size) => (
                    <option key={size} value={size}>
                      {size} ({STANDARD_CHANNELS[size].massKgM} kg/m)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {shape === "tee" && (
              <div className="col-span-2">
                <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                  {t("sandbox.teeSize")}
                </label>
                <select
                  value={teeSize}
                  onChange={(e) => setTeeSize(e.target.value)}
                  className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
                >
                  {Object.keys(STANDARD_TEES).map((size) => (
                    <option key={size} value={size}>
                      {size} ({STANDARD_TEES[size].massKgM} kg/m)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono text-foreground-secondary font-medium mb-1">
                {t("sandbox.length")} [m]
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={lengthM}
                onChange={(e) => setLengthM(e.target.value)}
                className="w-full font-mono text-xs px-2.5 py-1.5 border border-[var(--border)] bg-[var(--background)] text-foreground focus:outline-none focus:border-[var(--foreground)]"
              />
            </div>
          </div>

          {/* Trace Results Box */}
          <div className="p-4 border border-[var(--border)] bg-[var(--surface-inset)] flex flex-col gap-3 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 border-b border-[var(--border-faint)] pb-2">
              <span className="text-muted font-medium">{t("sandbox.step1Area")}:</span>
              <span className="font-semibold text-foreground tabular-nums">{calculationTrace.step1Formula}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 border-b border-[var(--border-faint)] pb-2">
              <span className="text-muted font-medium">{t("sandbox.step2Linear")}:</span>
              <span className="font-semibold text-foreground tabular-nums">{calculationTrace.step2Formula}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-1 pt-1">
              <span className="font-bold text-foreground">{t("sandbox.step3Total")}:</span>
              <span className="text-2xl font-bold tracking-tight text-[var(--accent)] tabular-nums">
                {calculationTrace.totalMass.toLocaleString(locale, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {calculationTrace.isPaint ? "m²" : "kg"}
              </span>
            </div>

            {/* Generated Command Line Token */}
            <div className="mt-2 pt-3 border-t border-[var(--border-faint)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                <span className="text-[11px] text-muted font-mono uppercase tracking-wider">
                  {t("sandbox.command")}:
                </span>
                <code className="text-xs font-mono font-bold px-2.5 py-1 bg-[var(--surface)] border border-[var(--border)] text-foreground">
                  {calculationTrace.commandStr}
                </code>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(calculationTrace.commandStr, "sandbox")}
                  className="px-3 py-1 text-xs border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] transition-colors text-foreground font-medium cursor-pointer"
                >
                  {copiedId === "sandbox" ? t("sandbox.copied") : t("sandbox.copy")}
                </button>
                <Link
                  href={`/?q=${encodeURIComponent(calculationTrace.commandStr)}`}
                  className="px-3.5 py-1 text-xs font-bold bg-[var(--action)] text-[var(--action-contrast)] hover:opacity-90 transition-opacity"
                >
                  {t("sandbox.openInApp")} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Derivations — how each formula in the data sheet is reached */}
      <section aria-labelledby="faq-list-heading" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2.5 border-b border-[var(--foreground)]">
          <h2 id="faq-list-heading" className="fs-title text-lg sm:text-xl text-foreground">
            {t("answersHeading")}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-medium">
            {t("questionsCount", { count: filteredItems.length })}
          </span>
        </div>

        {/* Topic filter — plain text, so it reads as a filter rather than a toolbar */}
        <div
          role="tablist"
          aria-label="FAQ Categories"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3.5 pb-1"
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "text-foreground font-semibold shadow-[inset_0_-2px_0_0_var(--foreground)] pb-1"
                    : "text-foreground-secondary hover:text-foreground pb-1"
                }`}
              >
                <span>{t(`categories.${cat}`)}</span>{" "}
                <span className="font-mono text-[11px] text-muted tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="border-t border-b border-[var(--border-faint)] py-7">
            <h3 className="text-sm font-semibold text-foreground">{t("noResultsTitle")}</h3>
            <p className="text-xs text-foreground-secondary mt-1.5 max-w-md leading-relaxed">
              {t("noResultsDesc")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="px-3 py-1.5 text-xs border border-[var(--border)] bg-[var(--surface)] text-foreground hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
              >
                {t("clearSearch")}
              </button>
              {selectedCategory !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="px-3 py-1.5 text-xs bg-[var(--action)] text-[var(--action-contrast)] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {t("searchInAllCategories")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Answers — one open at a time, flattened to a reading order */}
        <div className="mt-1.5">
          {filteredItems.map((item) => {
            const isOpen = openId === item.id;
            const question = t(`items.${item.id}.question`);
            const summary = t(`items.${item.id}.summary`);
            const formula = t(`items.${item.id}.formula`);
            const explanation = t(`items.${item.id}.explanation`);
            const example = t(`items.${item.id}.example`);
            const tip = t(`items.${item.id}.tip`);
            const command = t(`items.${item.id}.command`);
            const preset = FAQ_SANDBOX_PRESETS[item.id];

            return (
              <article key={item.id} id={`faq-${item.id}`} className="scroll-mt-6">
                <button
                  type="button"
                  onClick={() => toggleOpen(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                  className={`flex w-full items-baseline justify-between gap-5 border-t py-4 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--foreground)] cursor-pointer group ${
                    isOpen
                      ? "border-[var(--foreground)] text-foreground"
                      : "border-[var(--border-faint)] text-foreground hover:text-[var(--accent-text)]"
                  }`}
                >
                  <span
                    className={`text-sm sm:text-[15px] leading-snug ${isOpen ? "font-semibold" : ""}`}
                  >
                    {question}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`font-mono text-sm flex-shrink-0 transition-transform duration-150 ${
                      isOpen ? "rotate-45 text-foreground" : "text-[var(--border-strong)]"
                    }`}
                  >
                    +
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${item.id}`}
                    className="flex max-w-2xl flex-col gap-4 pt-1 pb-7"
                  >
                    <p className="text-[15px] leading-relaxed text-foreground">{summary}</p>

                    <div className="font-mono text-[13px] sm:text-sm tabular-nums bg-[var(--surface-inset)] px-4 py-3 leading-relaxed text-foreground overflow-x-auto">
                      {formula}
                    </div>

                    <p className="text-sm leading-relaxed text-foreground-secondary">{explanation}</p>

                    <p className="text-sm leading-relaxed text-foreground-secondary tabular-nums">
                      <span className="block mb-1 font-mono text-[10px] uppercase tracking-wider text-muted font-medium">
                        {t("labels.example")}
                      </span>
                      {example}
                    </p>

                    <p className="text-sm leading-relaxed text-foreground-secondary">
                      <strong className="text-foreground font-semibold">
                        {t("labels.workshopTip")} —{" "}
                      </strong>
                      {tip}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-0.5">
                      <code className="font-mono text-[13px] px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-foreground">
                        {command}
                      </code>
                      <Link
                        href={`/?q=${encodeURIComponent(command)}`}
                        className="px-3.5 py-2 text-[13px] font-semibold bg-[var(--action)] text-[var(--action-contrast)] hover:opacity-90 transition-opacity"
                      >
                        {t("labels.tryCommand")} →
                      </Link>
                      {preset && (
                        <button
                          type="button"
                          onClick={() => loadIntoVerifier(preset)}
                          className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                          {t("labels.testInSandbox")} ↑
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(command, item.id)}
                        className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                      >
                        {copiedId === item.id ? t("sandbox.copied") : t("sandbox.copy")}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {filteredItems.length > 0 && <div className="border-b border-[var(--border-faint)]" />}
      </section>


      {/* Footer Navigation */}
      <footer className="mt-12 pt-6 border-t border-[var(--border-faint)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground-secondary">
        <div>
          <span>{t("footer")} &copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-foreground transition-colors font-medium">
            {t("nav.calculator")}
          </Link>
          <Link href="/qa" className="hover:text-foreground transition-colors font-medium">
            {t("nav.qa")}
          </Link>
          <Link href="/contact" className="hover:text-foreground transition-colors font-medium">
            {t("nav.contact")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

import type {
  DimensionKey,
  GeometryIssue,
  ManualDimsMm,
  ManualProfileDefinition,
  ResolvedSectionArea,
  ResolvedSectionPerimeter,
} from "../types";

const f = (value: number) => value.toFixed(3);
const round2 = (value: number) => Math.round(value * 100) / 100;
const dim = (dims: ManualDimsMm, key: DimensionKey): number => dims[key] ?? 0;

/** Solid rectangular section: flat bar, sheet, plate, expanded, corrugated. */
function rectangularArea(dims: ManualDimsMm): ResolvedSectionArea {
  const width = dim(dims, "width");
  const thickness = dim(dims, "thickness");
  return {
    areaMm2: width * thickness,
    expression: `A = ${f(width)} × ${f(thickness)}`,
  };
}

/** Sheet-like sections are painted on both faces; edges are negligible. */
function twoFacePerimeter(dims: ManualDimsMm): ResolvedSectionPerimeter {
  const width = dim(dims, "width");
  return {
    perimeterMm: 2 * width,
    expression: `P = 2 × ${f(width)} (two faces)`,
  };
}

function wallIssue(message: string, messageKey: string, messageValues: Record<string, number>): GeometryIssue {
  return {
    field: "manualDimensions.wallThickness",
    message,
    messageKey,
    messageValues,
  };
}

export const MANUAL_PROFILES: ManualProfileDefinition[] = [
  /* ---- Bars ---- */
  {
    id: "round_bar",
    label: "Round Bar",
    category: "bars",
    mode: "manual",
    formulaLabel: "A = π × d² / 4",
    referenceLabel: "EN 10060",
    dimensions: [
      { key: "diameter", label: "Diameter", minMm: 4, maxMm: 600, defaultMm: 30 },
    ],
    area(dims) {
      const diameter = dim(dims, "diameter");
      return {
        areaMm2: (Math.PI * diameter * diameter) / 4,
        expression: `A = pi * ${f(diameter)}^2 / 4`,
      };
    },
    perimeter(dims) {
      const diameter = dim(dims, "diameter");
      return {
        perimeterMm: Math.PI * diameter,
        expression: `P = π × ${f(diameter)}`,
      };
    },
  },
  {
    id: "square_bar",
    label: "Square Bar",
    category: "bars",
    mode: "manual",
    formulaLabel: "A = a²",
    referenceLabel: "EN 10059",
    dimensions: [
      { key: "side", label: "Side", minMm: 4, maxMm: 500, defaultMm: 30 },
    ],
    area(dims) {
      const side = dim(dims, "side");
      return {
        areaMm2: side * side,
        expression: `A = ${f(side)}^2`,
      };
    },
    perimeter(dims) {
      const side = dim(dims, "side");
      return {
        perimeterMm: 4 * side,
        expression: `P = 4 × ${f(side)}`,
      };
    },
  },
  {
    id: "flat_bar",
    label: "Flat Bar",
    category: "bars",
    mode: "manual",
    formulaLabel: "A = b × t",
    referenceLabel: "EN 10058",
    dimensions: [
      { key: "width", label: "Width", minMm: 10, maxMm: 1000, defaultMm: 80 },
      { key: "thickness", label: "Thickness", minMm: 2, maxMm: 120, defaultMm: 8 },
    ],
    area: rectangularArea,
    perimeter(dims) {
      const width = dim(dims, "width");
      const thickness = dim(dims, "thickness");
      return {
        perimeterMm: 2 * (width + thickness),
        expression: `P = 2 × (${f(width)} + ${f(thickness)})`,
      };
    },
  },
  {
    id: "angle",
    label: "Angle (L)",
    category: "structural",
    mode: "manual",
    formulaLabel: "A = (a + b − t) × t",
    referenceLabel: "EN 10056",
    dimensions: [
      { key: "legA", label: "Leg A", minMm: 15, maxMm: 300, defaultMm: 60 },
      { key: "legB", label: "Leg B", minMm: 15, maxMm: 300, defaultMm: 60 },
      { key: "thickness", label: "Thickness", minMm: 2, maxMm: 35, defaultMm: 6 },
    ],
    area(dims) {
      const legA = dim(dims, "legA");
      const legB = dim(dims, "legB");
      const thickness = dim(dims, "thickness");
      return {
        areaMm2: (legA + legB - thickness) * thickness,
        expression: `A = (${f(legA)} + ${f(legB)} − ${f(thickness)}) × ${f(thickness)}`,
      };
    },
    perimeter(dims) {
      const legA = dim(dims, "legA");
      const legB = dim(dims, "legB");
      return {
        perimeterMm: 2 * (legA + legB),
        expression: `P = 2 × (${f(legA)} + ${f(legB)})`,
      };
    },
    validateGeometry(dims) {
      const legAMm = dims.legA;
      const legBMm = dims.legB;
      const tMm = dims.thickness;
      if (legAMm == null || legBMm == null || tMm == null) return [];
      if (tMm < Math.min(legAMm, legBMm)) return [];
      return [{
        field: "manualDimensions.thickness",
        message: "Thickness must be less than the shorter leg.",
        messageKey: "validation.angleThickness",
        messageValues: {
          thicknessMm: round2(tMm),
          shorterLegMm: round2(Math.min(legAMm, legBMm)),
        },
      }];
    },
  },

  /* ---- Tubes ---- */
  {
    id: "pipe",
    label: "Pipe / Circular Tube",
    category: "tubes",
    mode: "manual",
    formulaLabel: "A = π × (OD² − ID²) / 4",
    referenceLabel: "EN 10255 / EN 10216",
    dimensions: [
      { key: "outerDiameter", label: "Outer Diameter", minMm: 10, maxMm: 1200, defaultMm: 60.3 },
      { key: "wallThickness", label: "Wall Thickness", minMm: 1.2, maxMm: 80, defaultMm: 3.2 },
    ],
    area(dims) {
      const outerDiameter = dim(dims, "outerDiameter");
      const wallThickness = dim(dims, "wallThickness");
      const innerDiameter = outerDiameter - wallThickness * 2;
      return {
        areaMm2: (Math.PI * (outerDiameter * outerDiameter - innerDiameter * innerDiameter)) / 4,
        expression: `A = pi * (${f(outerDiameter)}^2 - ${f(innerDiameter)}^2) / 4`,
      };
    },
    perimeter(dims) {
      const outerDiameter = dim(dims, "outerDiameter");
      return {
        perimeterMm: Math.PI * outerDiameter,
        expression: `P = π × ${f(outerDiameter)}`,
      };
    },
    validateGeometry(dims) {
      const odMm = dims.outerDiameter;
      const wallMm = dims.wallThickness;
      if (odMm == null || wallMm == null) return [];
      if (wallMm * 2 < odMm) return [];
      return [wallIssue(
        "Wall thickness must be less than half of the outer diameter.",
        "validation.pipeWall",
        { wallMm: round2(wallMm), halfOdMm: round2(odMm / 2) },
      )];
    },
  },
  {
    id: "rectangular_tube",
    label: "Rectangular Tube",
    category: "tubes",
    mode: "manual",
    formulaLabel: "A = B×H − (B−2t)×(H−2t)",
    referenceLabel: "EN 10219 / EN 10210",
    dimensions: [
      { key: "width", label: "Width (B)", minMm: 20, maxMm: 500, defaultMm: 120 },
      { key: "height", label: "Height (H)", minMm: 20, maxMm: 500, defaultMm: 80 },
      { key: "wallThickness", label: "Wall Thickness", minMm: 1.5, maxMm: 40, defaultMm: 4 },
    ],
    area(dims) {
      const width = dim(dims, "width");
      const height = dim(dims, "height");
      const wallThickness = dim(dims, "wallThickness");
      return {
        areaMm2: width * height - (width - wallThickness * 2) * (height - wallThickness * 2),
        expression: `A = ${f(width)}×${f(height)} − (${f(width)}−2×${f(wallThickness)})×(${f(height)}−2×${f(wallThickness)})`,
      };
    },
    perimeter(dims) {
      const width = dim(dims, "width");
      const height = dim(dims, "height");
      return {
        perimeterMm: 2 * (width + height),
        expression: `P = 2 × (${f(width)} + ${f(height)})`,
      };
    },
    validateGeometry(dims) {
      const widthMm = dims.width;
      const heightMm = dims.height;
      const wallMm = dims.wallThickness;
      if (widthMm == null || heightMm == null || wallMm == null) return [];
      if (wallMm * 2 < Math.min(widthMm, heightMm)) return [];
      return [wallIssue(
        "Wall thickness must be less than half of width and height.",
        "validation.rectangularWall",
        { wallMm: round2(wallMm), maxWallMm: round2(Math.min(widthMm, heightMm) / 2) },
      )];
    },
  },
  {
    id: "square_hollow",
    label: "Square Hollow Section",
    category: "tubes",
    mode: "manual",
    formulaLabel: "A = a² − (a−2t)²",
    referenceLabel: "EN 10219 / EN 10210",
    dimensions: [
      { key: "side", label: "Side (a)", minMm: 20, maxMm: 500, defaultMm: 80 },
      { key: "wallThickness", label: "Wall Thickness", minMm: 1.5, maxMm: 40, defaultMm: 4 },
    ],
    area(dims) {
      const side = dim(dims, "side");
      const wallThickness = dim(dims, "wallThickness");
      return {
        areaMm2: side * side - (side - wallThickness * 2) * (side - wallThickness * 2),
        expression: `A = ${f(side)}² − (${f(side)}−2×${f(wallThickness)})²`,
      };
    },
    perimeter(dims) {
      const side = dim(dims, "side");
      return {
        perimeterMm: 4 * side,
        expression: `P = 4 × ${f(side)}`,
      };
    },
    validateGeometry(dims) {
      const sideMm = dims.side;
      const wallMm = dims.wallThickness;
      if (sideMm == null || wallMm == null) return [];
      if (wallMm * 2 < sideMm) return [];
      return [wallIssue(
        "Wall thickness must be less than half of the side length.",
        "validation.squareWall",
        { wallMm: round2(wallMm), halfSideMm: round2(sideMm / 2) },
      )];
    },
  },

  /* ---- Plates & Sheets ---- */
  {
    id: "sheet",
    label: "Sheet",
    category: "plates_sheets",
    mode: "manual",
    formulaLabel: "A = width × thickness",
    referenceLabel: "EN 10051",
    dimensions: [
      { key: "width", label: "Width", minMm: 10, maxMm: 3000, defaultMm: 1250 },
      { key: "thickness", label: "Thickness", minMm: 0.4, maxMm: 6, defaultMm: 2 },
    ],
    area: rectangularArea,
    perimeter: twoFacePerimeter,
  },
  {
    id: "plate",
    label: "Plate",
    category: "plates_sheets",
    mode: "manual",
    formulaLabel: "A = width × thickness",
    referenceLabel: "EN 10029",
    dimensions: [
      { key: "width", label: "Width", minMm: 10, maxMm: 4000, defaultMm: 1500 },
      { key: "thickness", label: "Thickness", minMm: 6, maxMm: 250, defaultMm: 20 },
    ],
    area: rectangularArea,
    perimeter: twoFacePerimeter,
  },
  {
    id: "chequered_plate",
    label: "Chequered Plate",
    category: "plates_sheets",
    mode: "manual",
    formulaLabel: "A = w × (t + pattern×0.5)",
    referenceLabel: "EN 10363",
    dimensions: [
      { key: "width", label: "Width", minMm: 10, maxMm: 4000, defaultMm: 1500 },
      { key: "thickness", label: "Base Thickness", minMm: 2, maxMm: 20, defaultMm: 5 },
      { key: "patternHeight", label: "Pattern Height", minMm: 1, maxMm: 5, defaultMm: 2 },
    ],
    area(dims) {
      const width = dim(dims, "width");
      const thickness = dim(dims, "thickness");
      const patternHeight = dim(dims, "patternHeight");
      return {
        areaMm2: width * (thickness + patternHeight * 0.5),
        expression: `A = ${f(width)} × (${f(thickness)} + ${f(patternHeight)} × 0.5)`,
      };
    },
    perimeter: twoFacePerimeter,
  },
  {
    id: "expanded_metal",
    label: "Expanded Metal",
    category: "plates_sheets",
    mode: "manual",
    formulaLabel: "A = width × eff. thickness",
    referenceLabel: "ISO 16573",
    dimensions: [
      { key: "width", label: "Width", minMm: 10, maxMm: 3000, defaultMm: 1250 },
      { key: "thickness", label: "Eff. Thickness", minMm: 0.5, maxMm: 10, defaultMm: 3 },
    ],
    area: rectangularArea,
    perimeter: twoFacePerimeter,
  },
  {
    id: "corrugated_sheet",
    label: "Corrugated Sheet",
    category: "plates_sheets",
    mode: "manual",
    formulaLabel: "A = width × base thickness",
    referenceLabel: "EN 508",
    dimensions: [
      { key: "width", label: "Cover Width", minMm: 10, maxMm: 3000, defaultMm: 1000 },
      { key: "thickness", label: "Base Thickness", minMm: 0.3, maxMm: 3, defaultMm: 0.7 },
    ],
    area: rectangularArea,
    perimeter: twoFacePerimeter,
  },
];

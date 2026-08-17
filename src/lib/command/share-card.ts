/**
 * A PNG of the live result for WhatsApp / Files. Drawn on a canvas so it
 * needs no extra library and works offline. Light cream card regardless of
 * the app theme — this is a quote you send, not a screenshot of the UI.
 */

export interface ShareCardItem {
  label: string;
  weight: string;
  amount: string;
}

export interface ShareCardModel {
  title: string;
  query: string;
  weight: string | null;
  amount: string | null;
  /** Empty for a single-item line; the title is then the part name. */
  items: ShareCardItem[];
}

const WIDTH = 1080;
const PAD = 64;
const MAX_LISTED = 8;
const ROW = 62;

export function shareCardSize(itemCount: number): { width: number; height: number } {
  if (itemCount <= 1) return { width: WIDTH, height: 720 };
  const listed = Math.min(itemCount, MAX_LISTED);
  return { width: WIDTH, height: 500 + listed * ROW + 120 };
}

export function renderShareCard(model: ShareCardModel): Promise<Blob> {
  const listed = model.items.slice(0, MAX_LISTED);
  const overflow = Math.max(0, model.items.length - listed.length);
  const { width, height } = shareCardSize(model.items.length);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("no canvas"));

  const inner = width - PAD * 2;

  ctx.fillStyle = "#f4f0e7";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#c4471a";
  ctx.beginPath();
  ctx.roundRect(PAD, PAD, 56, 56, 14);
  ctx.fill();
  ctx.fillStyle = "#fff6ee";
  ctx.beginPath();
  ctx.roundRect(PAD + 16, PAD + 16, 24, 24, 5);
  ctx.fill();

  ctx.fillStyle = "#1a1612";
  ctx.font = "700 36px system-ui, sans-serif";
  ctx.fillText("FerroScale", PAD + 76, PAD + 40);

  ctx.fillStyle = "#1a1612";
  ctx.font = "800 44px system-ui, sans-serif";
  fillTruncated(ctx, model.title, PAD, 220, inner);

  const hero = model.weight ?? model.amount ?? "—";
  ctx.font = "800 96px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "#1a1612";
  fillTruncated(ctx, hero, PAD, 350, inner);

  if (model.weight && model.amount) {
    ctx.font = "600 36px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#c4471a";
    ctx.fillText(model.amount, PAD, 410);
  }

  let y = 480;
  if (listed.length > 0) {
    listed.forEach((item, index) => {
      ctx.font = "600 22px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "#8a8276";
      ctx.fillText(String(index + 1), PAD, y);

      ctx.font = "700 28px system-ui, sans-serif";
      ctx.fillStyle = "#1a1612";
      fillTruncated(ctx, item.label, PAD + 40, y, 560);

      ctx.font = "600 26px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "#c4471a";
      ctx.textAlign = "right";
      ctx.fillText(item.weight, width - PAD - 220, y);
      ctx.fillStyle = "#6b6358";
      ctx.fillText(item.amount, width - PAD, y);
      ctx.textAlign = "left";
      y += ROW;
    });
    if (overflow > 0) {
      ctx.font = "600 24px system-ui, sans-serif";
      ctx.fillStyle = "#8a8276";
      ctx.fillText(`+${overflow}`, PAD + 40, y);
      y += 40;
    }
  }

  ctx.font = "600 24px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "#6b6358";
  fillTruncated(ctx, model.query, PAD, height - 56, inner);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("toBlob failed"));
    }, "image/png");
  });
}

function fillTruncated(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  let shown = text;
  if (ctx.measureText(shown).width > maxWidth) {
    while (shown.length > 1 && ctx.measureText(`${shown}…`).width > maxWidth) {
      shown = shown.slice(0, -1);
    }
    shown = `${shown}…`;
  }
  ctx.fillText(shown, x, y);
}

export async function shareCalculation(opts: {
  summary: string | null;
  url: string;
  title: string;
  card: ShareCardModel;
}): Promise<"shared" | "copied"> {
  const text = opts.summary ? `${opts.summary}\n\n${opts.url}` : opts.url;
  const nav = typeof navigator !== "undefined" ? navigator : undefined;

  try {
    const blob = await renderShareCard(opts.card);
    const file = new File([blob], "ferroscale.png", { type: "image/png" });
    if (nav?.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text, title: opts.title });
      return "shared";
    }
  } catch {
    // Fall through to text share / clipboard — image is a bonus.
  }

  if (typeof nav?.share === "function") {
    try {
      await nav.share({ text, url: opts.url, title: opts.title });
      return "shared";
    } catch {
      // User cancelled, or the browser rejected the payload.
    }
  }

  if (nav?.clipboard?.writeText) {
    await nav.clipboard.writeText(text);
    return "copied";
  }
  return "copied";
}

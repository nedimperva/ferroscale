/**
 * A PNG of the live result for WhatsApp / Files. Drawn on a canvas so it
 * needs no extra library and works offline. Light cream card regardless of
 * the app theme — this is a quote you send, not a screenshot of the UI.
 */

export interface ShareCardModel {
  name: string;
  query: string;
  weight: string | null;
  amount: string | null;
}

export function renderShareCard(model: ShareCardModel): Promise<Blob> {
  const width = 1080;
  const height = 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("no canvas"));

  ctx.fillStyle = "#f4f0e7";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#c4471a";
  ctx.beginPath();
  ctx.roundRect(64, 64, 56, 56, 14);
  ctx.fill();
  ctx.fillStyle = "#fff6ee";
  ctx.beginPath();
  ctx.roundRect(80, 80, 24, 24, 5);
  ctx.fill();

  ctx.fillStyle = "#1a1612";
  ctx.font = "700 36px system-ui, sans-serif";
  ctx.fillText("FerroScale", 140, 104);

  ctx.fillStyle = "#1a1612";
  ctx.font = "800 44px system-ui, sans-serif";
  fillTruncated(ctx, model.name, 64, 220, width - 128);

  const hero = model.weight ?? model.amount ?? "—";
  ctx.font = "800 120px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "#1a1612";
  fillTruncated(ctx, hero, 64, 400, width - 128);

  if (model.weight && model.amount) {
    ctx.font = "600 36px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#c4471a";
    ctx.fillText(model.amount, 64, 470);
  }

  ctx.font = "600 28px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "#6b6358";
  fillTruncated(ctx, model.query, 64, 640, width - 128);

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

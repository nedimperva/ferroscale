import sharp from "sharp";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const publicDir = join(rootDir, "public");
const splashDir = join(publicDir, "splash");
const iconSource = join(publicDir, "brand", "ferroscale-icon-source.png");
const splashLogoSource = join(publicDir, "brand", "ferroscale-logo-source.png");

const brandBackground = "#111827";
const sourceBuffer = readFileSync(iconSource);
const splashLogoBuffer = readFileSync(splashLogoSource);

const icons = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, flatten: brandBackground },
  { name: "apple-touch-icon.png", size: 180, flatten: brandBackground },
  { name: "splash/apple-icon-180.png", size: 180, flatten: brandBackground },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-48.png", size: 48 },
];

for (const { name, size, flatten } of icons) {
  const pipeline = sharp(sourceBuffer).resize(size, size, { fit: "contain" });

  if (flatten) {
    pipeline.flatten({ background: flatten });
  }

  await pipeline.png().toFile(join(publicDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

await sharp(sourceBuffer)
  .resize(192, 192)
  .flatten({ background: brandBackground })
  .png()
  .toFile(join(splashDir, "manifest-icon-192.maskable.png"));

await sharp(sourceBuffer)
  .resize(512, 512)
  .flatten({ background: brandBackground })
  .png()
  .toFile(join(splashDir, "manifest-icon-512.maskable.png"));

const faviconImages = await Promise.all(
  [16, 32, 48].map(async (size) => ({
    size,
    buffer: await sharp(sourceBuffer)
      .resize(size, size)
      .flatten({ background: brandBackground })
      .ensureAlpha()
      .png()
      .toBuffer(),
  })),
);

writeFileSync(join(rootDir, "src", "app", "favicon.ico"), createIco(faviconImages));

const splashFiles = readdirSync(splashDir).filter((file) =>
  /^apple-splash-\d+-\d+\.jpg$/.test(file),
);

for (const file of splashFiles) {
  const match = file.match(/^apple-splash-(\d+)-(\d+)\.jpg$/);
  if (!match) {
    continue;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  await sharp(splashLogoBuffer)
    .resize(width, height, {
      fit: "contain",
      background: "#33383c",
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(join(splashDir, file));
  console.log(`Generated ${file}`);
}

console.log("\nAll brand icons and startup images generated.");

function createIco(images) {
  const headerSize = 6;
  const directorySize = images.length * 16;
  let offset = headerSize + directorySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  const buffers = [];

  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    buffers.push(image.buffer);
    offset += image.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...buffers]);
}

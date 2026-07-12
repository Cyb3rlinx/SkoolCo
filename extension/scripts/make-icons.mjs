/**
 * Generates the extension icons (16/32/48/128) with zero dependencies:
 * rasterizes the brand mark (white rocket on the violet gradient tile) by
 * supersampled point-membership tests and hand-encodes the PNGs (zlib IDAT).
 *
 * Run: node scripts/make-icons.mjs   (from extension/)
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

// --------------------------------------------------------------------- PNG
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines, filter byte 0 per row
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------ geometry (0..1)
const inTriangle = (px, py, [ax, ay], [bx, by], [cx, cy]) => {
  const s1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  const s2 = (cx - bx) * (py - by) - (cy - by) * (px - bx);
  const s3 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
};
const inRect = (px, py, x0, y0, x1, y1) => px >= x0 && px <= x1 && py >= y0 && py <= y1;
const inCircle = (px, py, cx, cy, r) => (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;

/** White rocket silhouette, defined in unit coordinates. */
function inRocket(x, y) {
  if (inCircle(x, y, 0.5, 0.475, 0.055)) return false; // window (punch-out)
  return (
    inTriangle(x, y, [0.5, 0.15], [0.39, 0.41], [0.61, 0.41]) || // nose
    inRect(x, y, 0.39, 0.41, 0.61, 0.67) || // body
    inTriangle(x, y, [0.39, 0.53], [0.39, 0.73], [0.27, 0.73]) || // left fin
    inTriangle(x, y, [0.61, 0.53], [0.61, 0.73], [0.73, 0.73]) || // right fin
    inRect(x, y, 0.455, 0.67, 0.545, 0.74) // nozzle
  );
}

function inRoundedTile(x, y, r) {
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2 || (inRect(x, y, r, 0, 1 - r, 1) || inRect(x, y, 0, r, 1, 1 - r));
}

// Brand gradient #6D3DFF → #5B2CFF along the diagonal.
const G0 = [0x6d, 0x3d, 0xff];
const G1 = [0x5b, 0x2c, 0xff];

function render(size) {
  const SS = 4; // supersampling grid per pixel
  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          if (!inRoundedTile(x, y, 0.22)) continue;
          let r, g, b;
          if (inRocket(x, y)) {
            r = g = b = 255;
          } else {
            const t = (x + y) / 2;
            r = G0[0] + (G1[0] - G0[0]) * t;
            g = G0[1] + (G1[1] - G0[1]) * t;
            b = G0[2] + (G1[2] - G0[2]) * t;
          }
          rAcc += r; gAcc += g; bAcc += b; aAcc += 255;
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      const a = aAcc / n;
      // premultiplied-ish average against transparency
      rgba[i] = a ? Math.round(rAcc / (aAcc / 255)) : 0;
      rgba[i + 1] = a ? Math.round(gAcc / (aAcc / 255)) : 0;
      rgba[i + 2] = a ? Math.round(bAcc / (aAcc / 255)) : 0;
      rgba[i + 3] = Math.round(a);
    }
  }
  return encodePng(size, rgba);
}

mkdirSync("icons", { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(`icons/icon-${size}.png`, render(size));
  console.log(`icons/icon-${size}.png`);
}
console.log("Íconos regenerados.");

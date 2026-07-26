// Generate PWA icons with no image dependency: an 8x8 chessboard in the brand
// green and warm off-white. Encodes PNG (RGB, filter 0) via zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { crc32 } from "node:zlib";

const DARK = [42, 92, 67]; // #2a5c43 board green
const LIGHT = [233, 228, 216]; // warm off-white
const GREEN_BG = [42, 92, 67];

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

function png(size, { maskable } = {}) {
  const cell = size / 8;
  const margin = maskable ? size * 0.18 : 0;
  const boardSize = size - margin * 2;
  const bcell = boardSize / 8;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // filter byte + RGB
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      let c = GREEN_BG;
      const bx = x - margin;
      const by = y - margin;
      if (bx >= 0 && by >= 0 && bx < boardSize && by < boardSize) {
        const sq = Math.floor(bx / bcell) + Math.floor(by / bcell);
        c = sq % 2 === 0 ? LIGHT : DARK;
      }
      const o = 1 + x * 3;
      row[o] = c[0];
      row[o + 1] = c[1];
      row[o + 2] = c[2];
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const idat = deflateSync(Buffer.concat(rows));

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icon-192.png", png(192));
writeFileSync("public/icon-512.png", png(512));
writeFileSync("public/icon-512-maskable.png", png(512, { maskable: true }));
// Next auto-detects these in app/ for the favicon and iOS home-screen icon.
writeFileSync("app/icon.png", png(192));
writeFileSync("app/apple-icon.png", png(180, { maskable: true }));
console.log("icons written to public/ and app/");

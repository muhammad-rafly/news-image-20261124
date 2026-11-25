// The World Today — Tuesday 24 November 2026
// Deterministic newspaper front page, drawn pixel by pixel into an RGB buffer
// and encoded as a plain 8-bit RGB PNG. Node 22 standard library only.
// No network, no clock, no randomness: identical bytes on every run.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER: RGB = [252, 247, 236];
const INK: RGB = [18, 18, 18];
const RED: RGB = [176, 32, 32];
const BLUE: RGB = [14, 30, 62];
const GREEN: RGB = [44, 158, 66];
const LIGHT_GREEN: RGB = [96, 200, 116];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [96, 92, 84];
const SOFT_LINE: RGB = [198, 190, 174];

type RGB = [number, number, number];

// ---------------------------------------------------------------- buffer
const img = Buffer.alloc(W * H * 3);
function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = c[0];
  img[i + 1] = c[1];
  img[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
  }
}
function hRule(x: number, y: number, w: number, th: number, c: RGB): void {
  fillRect(x, y, w, th, c);
}
// Bresenham line with square thickness.
function drawLine(x0: number, y0: number, x1: number, y1: number, c: RGB, th: number): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  const r = Math.floor(th / 2);
  for (;;) {
    for (let a = -r; a <= r; a++) {
      for (let b = -r; b <= r; b++) setPx(x + a, y + b, c);
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// ---------------------------------------------------------------- bitmap font
// Hand-drawn 5x7 glyphs. One blank column follows each glyph.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

const GLYPH_W = 5;
const GLYPH_H = 7;
const CHAR_ADV = 6; // glyph width + 1 blank column, in bitmap units

function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * CHAR_ADV * scale - scale; // no trailing blank column
}

function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = GLYPHS[ch] ?? GLYPHS["?"];
  for (let row = 0; row < GLYPH_H; row++) {
    const bits = g[row];
    for (let col = 0; col < GLYPH_W; col++) {
      if (bits[col] === "1") {
        fillRect(x + col * scale, y + row * scale, scale, scale, c);
      }
    }
  }
}

function drawText(text: string, x: number, y: number, scale: number, c: RGB): void {
  for (let i = 0; i < text.length; i++) {
    drawChar(text[i], x + i * CHAR_ADV * scale, y, scale, c);
  }
}

function drawTextCentred(text: string, cx: number, y: number, scale: number, c: RGB): void {
  const w = textWidth(text, scale);
  drawText(text, cx - Math.floor(w / 2), y, scale, c);
}

// Greedy word wrap: pack whole words into lines of at most maxChars characters.
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// Draw wrapped text starting at (x, y); returns the y just past the last line.
function drawWrapped(text: string, x: number, y: number, scale: number, c: RGB, maxChars: number, lineGap: number): number {
  const lines = wrapText(text, maxChars);
  const lh = GLYPH_H * scale + lineGap;
  for (let i = 0; i < lines.length; i++) {
    drawText(lines[i], x, y + i * lh, scale, c);
  }
  return y + lines.length * lh;
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    img.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- layout
const M = 36; // margin
const CW = W - 2 * M; // 952 content width
const DATE = "TUESDAY 24 NOVEMBER 2026";

function build(): void {
  fillRect(0, 0, W, H, PAPER);

  // 1. Masthead
  drawTextCentred("THE WORLD TODAY", W / 2, 26, 7, INK);
  hRule(M, 88, CW, 5, RED);
  hRule(M, 97, CW, 2, INK);

  // 2. Black date band
  fillRect(M, 106, CW, 46, INK);
  drawTextCentred(DATE, W / 2, 118, 3, WHITE);

  // 3. Lead story
  drawText("YEAR'S BIGGEST PHARMA DEAL", M, 168, 2, RED);
  drawText("SANOFI BUYS INSMED", M, 190, 6, INK);
  drawText("$41 BILLION IN CASH, $175 A SHARE, IN THE YEAR'S BIGGEST PHARMA DEAL", M, 242, 2, INK);
  hRule(M, 262, CW, 2, SOFT_LINE);
  const standfirst =
    "SANOFI AGREED TO BUY US BIOTECH INSMED FOR $41 BILLION IN CASH, THE " +
    "YEAR'S LARGEST PHARMA DEAL, AT $175 A SHARE, A 46% PREMIUM. THE DEAL " +
    "BRINGS TWO RESPIRATORY DRUGS AND A LATE-STAGE PIPELINE AS SANOFI BRACES " +
    "FOR ITS DUPXENT PATENT CLIFF. IT SHOULD CLOSE IN THE FIRST HALF OF 2027.";
  drawWrapped(standfirst, M, 276, 2, INK, 79, 6);

  // 4. Deal-numbers panel (night blue)
  const chartY = 366;
  const chartH = 170;
  fillRect(M, chartY, CW, chartH, BLUE);
  drawText("THE DEAL IN NUMBERS", M + 16, chartY + 12, 3, WHITE);
  const sub = "SANOFI'S $41 BILLION BET, 24 NOV 2026";
  drawText(sub, M + CW - 16 - textWidth(sub, 2), chartY + 16, 2, LIGHT_GREEN);
  hRule(M + 16, chartY + 48, CW - 32, 2, WHITE);
  const stats = [
    { value: "$41.0B", label: "DEAL VALUE", cx: M + 130 },
    { value: "$175", label: "PER SHARE", cx: M + 368 },
    { value: "46%", label: "PREMIUM", cx: M + 606 },
    { value: "H1 2027", label: "CLOSE", cx: M + 844 },
  ];
  for (const s of stats) {
    drawTextCentred(s.value, s.cx, chartY + 78, 4, WHITE);
    drawTextCentred(s.label, s.cx, chartY + 122, 2, LIGHT_GREEN);
  }

  // 5. Three columns
  const colY = 552;
  const colW = 304;
  const colGap = 20;
  const colX = [M, M + colW + colGap, M + 2 * (colW + colGap)];
  const columns = [
    {
      kicker: "YEMEN WAR",
      headline: "HOUTHIS CLOSE ON ADEN, HIT RIYADH TOWER",
      body:
        "HOUTHI FIGHTERS ARE 60 KM FROM ADEN AND A SUSPECTED DRONE HIT A " +
        "RIYADH TOWER, WOUNDING 11.",
    },
    {
      kicker: "WAR IN GAZA",
      headline: "ISRAEL KILLS HAMAS SECURITY CHIEF IN GAZA",
      body:
        "AN ISRAELI AIRSTRIKE KILLED NAEEM ABU NAHEL, HAMAS' INTERNAL " +
        "SECURITY CHIEF, IN GAZA CITY. SEVEN DIED ON TUESDAY.",
    },
    {
      kicker: "EBOLA CRISIS",
      headline: "EBOLA TEAMS STILL TRAPPED IN CONGO",
      body:
        "EBOLA RESPONDERS REMAIN SHELTERED IN A HOSPITAL IN ITURI, " +
        "CONGO, AS FIGHTING RAGES NEARBY.",
    },
  ];
  for (let i = 0; i < 3; i++) {
    const x = colX[i];
    const c = columns[i];
    drawText(c.kicker, x, colY, 2, RED);
    const yHead = drawWrapped(c.headline, x, colY + 22, 3, INK, 16, 6);
    drawWrapped(c.body, x, yHead + 6, 2, INK, 25, 6);
    if (i < 2) {
      // thin vertical divider between columns
      fillRect(x + colW + 10, colY, 1, 248, SOFT_LINE);
    }
  }

  // 6. IN BRIEF bar — one item per row so long items never wrap or clip.
  const briefY = 812;
  const briefH = 142;
  fillRect(M, briefY, CW, briefH, INK);
  drawText("IN BRIEF", M + 16, briefY + 10, 2, RED);
  const briefItems = [
    "ZAPORIZHZHIA STRIKE KILLS 2, WOUNDS 40",
    "GERMANY FIRST TO GET UKRAINE DELTA SYSTEM",
    "WALL STREET GIVES BACK MONDAY'S GAINS, NVDA -5.8%",
    "CARTAGENA HOSTAGE CRISIS: 25 HELD",
    "SOUTH KOREA OFFERS $375,000 TO CATCH AI CHEATS",
    "IRAQ PM ORDERS OIL MINISTRY TO RUN KURD FIELDS",
  ];
  for (let i = 0; i < briefItems.length; i++) {
    const x = M + 16;
    const y = briefY + 34 + i * 18;
    fillRect(x, y + 3, 8, 8, RED);
    drawText(briefItems[i], x + 14, y, 2, WHITE);
  }

  // 7. Footer bar
  const footY = 962;
  fillRect(M, footY, CW, 34, INK);
  drawTextCentred("THE WORLD TODAY - " + DATE, W / 2, footY + 10, 2, WHITE);
}

// ---------------------------------------------------------------- main
build();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "entry.png"), encodePNG());

// news-image-20261124, round 4: "The World in One Day — 25 November 2026".
// A 1024x1024 newspaper front page summing up Wednesday 25 November 2026
// in 40 verified world news stories across 9 regions. Pure code drawing:
// a framebuffer, a 5x7 bitmap font, and a hand-rolled PNG encoder — Node 22
// standard library only (node:fs, node:path, node:zlib), no network, no
// external image, no dependency. Both runs write identical bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- PNG ----
// Minimal PNG encoder: 8-bit RGB, no interlace, filter 0 on every scanline.

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(rgb: Uint8Array, width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (1 + width * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- canvas ----
type RGB = [number, number, number];
const PAPER: RGB = [253, 251, 244];
const INK: RGB = [18, 18, 18];
const RED: RGB = [178, 34, 34];
const GREY: RGB = [120, 118, 110];
const LIGHT: RGB = [232, 230, 222];

const px = new Uint8Array(W * H * 3);

function fill(r: number, g: number, b: number): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = r;
    px[i * 3 + 1] = g;
    px[i * 3 + 2] = b;
  }
}

function setPix(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) setPix(xx, yy, c);
}

function hline(x: number, y: number, w: number, c: RGB, t = 1): void {
  fillRect(x, y, w, t, c);
}

// --------------------------------------------------------------- font ----
// 5x7 bitmap font, '#' = on. Uppercase + digits + punctuation only; all
// copy is uppercased before drawing, the classic newspaper style.

const GLYPHS: Record<string, string[]> = {
  A: [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  B: ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
  C: [" ####", "#    ", "#    ", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
  F: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
  G: [" ####", "#    ", "#    ", "# ###", "#   #", "#   #", " ### "],
  H: ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  I: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "#####"],
  J: ["  ###", "   # ", "   # ", "   # ", "   # ", "#  # ", " ##  "],
  K: ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
  N: ["#   #", "##  #", "##  #", "# # #", "#  ##", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
  Q: [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
  S: [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "#   #", "# # #", "# # #", "## ##", "#   #"],
  X: ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
  Y: ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"],
  "0": [" ### ", "#  ##", "# # #", "##  #", "#   #", "#   #", " ### "],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
  "3": ["#### ", "    #", "    #", " ### ", "    #", "    #", "#### "],
  "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
  "6": [" ### ", "#    ", "#    ", "#### ", "#   #", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "   # ", "  #  ", "  #  ", "  #  "],
  "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
  "9": [" ### ", "#   #", "#   #", " ####", "    #", "    #", " ### "],
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
  ".": ["     ", "     ", "     ", "     ", "     ", " ##  ", " ##  "],
  ",": ["     ", "     ", "     ", "     ", " ##  ", " ##  ", " #   "],
  ":": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", "     "],
  ";": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", " #   "],
  "'": ["  #  ", "  #  ", "     ", "     ", "     ", "     ", "     "],
  "!": ["  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "     ", "  #  "],
  "?": [" ### ", "#   #", "    #", "   # ", "  #  ", "     ", "  #  "],
  "-": ["     ", "     ", "     ", " ### ", "     ", "     ", "     "],
  "(": ["   ##", "  #  ", " #   ", " #   ", " #   ", "  #  ", "   ##"],
  ")": ["##   ", "  #  ", "   # ", "   # ", "   # ", "  #  ", "##   "],
  "/": ["    #", "   # ", "   # ", "  #  ", " #   ", " #   ", "#    "],
  "%": ["#   #", "#  # ", "   # ", "  #  ", " #   ", "#  # ", "#   #"],
  $: ["  #  ", " ####", "# #  ", " ### ", "  # #", "#### ", "  #  "],
  "&": [" ### ", "#   #", "#   #", " # # ", "#  # ", "# #  ", " ## #"],
  "+": ["     ", "  #  ", "  #  ", " ### ", "  #  ", "  #  ", "     "],
  "=": ["     ", "     ", " ### ", "     ", " ### ", "     ", "     "],
  "*": ["     ", " # # ", "  #  ", " ### ", "  #  ", " # # ", "     "],
  "#": [" # # ", " # # ", "#####", " # # ", "#####", " # # ", " # # "],
  "@": [" ### ", "#   #", "# ###", "# # #", "# ###", "#    ", " ### "],
  _: ["     ", "     ", "     ", "     ", "     ", "     ", "#####"],
  '"': [" # # ", " # # ", "     ", "     ", "     ", "     ", "     "],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale;
}

function drawText(x: number, y: number, text: string, scale: number, c: RGB): void {
  const upper = text.toUpperCase();
  for (let ci = 0; ci < upper.length; ci++) {
    const glyph = GLYPHS[upper[ci]] ?? GLYPHS[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "#") {
          fillRect(x + ci * 6 * scale + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
  }
}

function drawTextCentered(cx: number, y: number, text: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(text, scale) / 2), y, text, scale, c);
}

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

// ------------------------------------------------------------ content ----
// All 40 stories verified against Reuters / AP / AFP / UEFA on 25 Nov 2026.
// Headlines are kept short so they fit their cells at scale 2.

const LEAD_HEADLINE = "TARIFFS ARE BACK";
const LEAD_DECK = [
  "TRUMP READIES NEW DUTIES ON CHINA, THE EU AND 14 OTHERS",
  "AS ASIA STOCKS PLUNGE: KOSPI -5.8%, TAIWAN -4.7%, NIKKEI -2.8%",
];

const SECOND_HEADLINE = "HOUTHIS HIT SAUDI OIL HEARTLAND";
const SECOND_DECK = [
  "REBELS SAY THEY STRUCK THE RAS TANURA REFINERY AND RIYADH'S",
  "FINANCE DISTRICT. 11 WERE WOUNDED IN TUESDAY'S TOWER BLAST.",
];

// Asia markets, Wednesday 25 November 2026 (Reuters morning wrap).
const MARKETS: { label: string; value: string; down: boolean }[] = [
  { label: "KOSPI", value: "-5.8%", down: true },
  { label: "TAIWAN", value: "-4.7%", down: true },
  { label: "NIKKEI", value: "-2.8%", down: true },
  { label: "BITCOIN", value: "$59,258", down: true },
  { label: "BRENT", value: "$90.09", down: true },
];
// Bar heights for the chart panel, proportional to each market's drop.
const CHART_DROPS = [5.8, 4.7, 2.8, 1.0, 1.4];

const GRID: string[] = [
  "NVIDIA -7% AS CONGRESS PROBES TRUMP ROLE",
  "IRAN: TWO TANKERS HIT BY MINES IN HORMUZ",
  "SHENZHOU-24 LAUNCHES WITH PAKISTAN'S FIRST ASTRONAUT",
  "SHANGHAI PLEDGES LOYALTY AS CHEN JINING PROBED",
  "GUNMEN HOLD 25 HOSTAGE IN CARTAGENA SUPERMARKET",
  "BANGLADESH GARMENT WORKERS WIN 36% PAY RISE",
  "AUSTRALIA-SOLOMONS PACT SHUTS OUT CHINA",
  "NORTH KOREA EXPELS SWISS DIPLOMAT",
  "DR CONGO PLANE MISSING; REBELS CLAIM SHOOTDOWN",
  "ZAMBIA INDICTS OPPOSITION LEADER FOR TREASON",
  "VENEZUELA REVEALS $237.5BN PUBLIC DEBT",
  "ARGENTINA SLIPS INTO TECHNICAL RECESSION",
  "AUSTRALIA INFLATION 4.9%; SAFETY LAW PASSES",
  "US BLACKLISTS MEGASPEED OVER AI CHIPS",
  "SHEIN TO PAY $100M IN FTC SETTLEMENT",
  "TWO LIBYAN OFFICERS DIE AFTER UKRAINE SHIP STRIKE",
  "TURKISH MILITARY HELICOPTER CRASH KILLS 5",
  "FIFA LEAK: INFANTINO'S 96-YEAR WORLD CUP PLAN",
  "US SOLDIER ADMITS SELLING SECRETS TO CHINA",
  "CDC CHIEF UNDER FIRE FROM STAFF, CONGRESS",
  "HANOI RESTAURANT BLAST KILLS 6",
  "RUSSIAN JETS ENTER SOUTH KOREA AIR DEFENCE ZONE",
  "GREECE STRIKES OVER WAGES, SERVICES",
  "JORDAN DEATH SENTENCE OVER OFFICER KILLING",
];

const SPORT: string[] = [
  "SENEGAL ARE AFRICA CUP CHAMPIONS AGAIN",
  "RONALDO'S 987TH GOAL WINS ASIAN TITLE",
  "TEEN, 15, SMASHES 200 OFF 52 BALLS",
  "ENGLAND LEVEL T20 SERIES IN AUSTRALIA",
];

const BRIEF: string[] = [
  "CHINA DEATH SENTENCE FOR SPY",
  "RUSSIA SENDS HOME $2.3BN DEPOSIT SUSPECT",
  "SAHEL REBELS FIGHT WITH CHEAP DRONES",
  "ODESA STRIKE KILLS 2; KYIV HIT BY DRONES",
  "SPAIN'S RIGHT CHALLENGES SOCIALIST PM",
  "GROUPS SUE TRUMP OVER SLAVERY EXHIBIT",
  "INDIA KILLS KASHMIR REBEL LEADER",
  "MALAYSIA TO REPATRIATE MYANMAR MIGRANTS",
  "UN: 5 WOMEN AN HOUR KILLED AT HOME",
  "STORMS THREATEN THANKSGIVING TRAVEL",
];

// ------------------------------------------------------------- layout ----
function draw(): void {
  fill(PAPER[0], PAPER[1], PAPER[2]);

  // Masthead: black band, paper name in white.
  fillRect(0, 0, W, 88, INK);
  drawTextCentered(W / 2, 26, "THE WORLD IN ONE DAY", 5, PAPER);

  // Date strip.
  drawText(24, 98, "WEDNESDAY, 25 NOVEMBER 2026", 2, INK);
  const rightTag = "40 STORIES - 9 REGIONS";
  drawText(W - 24 - textWidth(rightTag, 2), 98, rightTag, 2, INK);
  hline(24, 118, W - 48, INK, 2);

  // Lead headline, the biggest type on the page.
  drawText(107, 132, LEAD_HEADLINE, 9, INK);
  hline(24, 206, W - 48, RED, 4);
  drawText(24, 218, LEAD_DECK[0], 2, INK);
  drawText(24, 236, LEAD_DECK[1], 2, INK);

  // Lead art: falling-markets chart panel (left) + numbers box (right).
  const artY = 258;
  const artH = 116;
  // Chart panel.
  fillRect(24, artY, 600, artH, [255, 255, 255]);
  for (let i = 0; i < 5; i++) {
    const bx = 64 + i * 112;
    const bh = Math.round((CHART_DROPS[i] / 5.8) * 72);
    fillRect(bx, artY + artH - 22 - bh, 64, bh, RED);
    hline(bx, artY + artH - 22, 64, INK, 2);
  }
  // Thick red trend line stepping down across the bars.
  for (let i = 0; i < 8; i++) {
    fillRect(70 + i * 58, artY + 12 + i * 9, 44, 11, RED);
  }
  drawText(64, artY + artH - 16, "ASIA STOCKS TUMBLE", 1, INK);
  // Panel border.
  hline(24, artY, 600, INK, 2);
  hline(24, artY + artH, 600, INK, 2);
  fillRect(24, artY, 2, artH, INK);
  fillRect(622, artY, 2, artH, INK);

  // Numbers box.
  const boxX = 648;
  const boxW = 352;
  fillRect(boxX, artY, boxW, 28, INK);
  drawTextCentered(boxX + boxW / 2, artY + 7, "THE DAY IN NUMBERS", 2, PAPER);
  for (let i = 0; i < MARKETS.length; i++) {
    const ry = artY + 34 + i * 16;
    drawText(boxX + 12, ry, MARKETS[i].label, 2, INK);
    const v = MARKETS[i].value;
    drawText(boxX + boxW - 12 - textWidth(v, 2), ry, v, 2, MARKETS[i].down ? RED : INK);
    if (i < MARKETS.length - 1) hline(boxX + 12, ry + 14, boxW - 24, LIGHT, 1);
  }
  hline(boxX, artY + artH, boxW, INK, 2);
  fillRect(boxX, artY, 2, artH, INK);
  fillRect(boxX + boxW - 2, artY, 2, artH, INK);

  // Second story: black band headline + two-line deck.
  const secY = 388;
  fillRect(24, secY, W - 48, 34, INK);
  drawText(36, secY + 6, SECOND_HEADLINE, 4, PAPER);
  drawText(24, secY + 44, SECOND_DECK[0], 2, INK);
  drawText(24, secY + 62, SECOND_DECK[1], 2, INK);

  // Around the world: 24 stories in a 3 x 8 grid.
  const gridY = 490;
  drawText(24, gridY - 22, "AROUND THE WORLD", 3, INK);
  hline(24, gridY - 4, W - 48, INK, 2);
  const colW = 320;
  const cellH = 44;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const cx = 24 + c * 328;
      const cy = gridY + r * cellH;
      fillRect(cx, cy + 2, 5, 5, RED); // red square bullet
      const lines = wrapText(GRID[idx], 26).slice(0, 2);
      for (let li = 0; li < lines.length; li++) {
        drawText(cx + 12, cy + li * 15, lines[li], 2, INK);
      }
    }
  }

  // Sport band.
  const sportY = 850;
  drawText(24, sportY, "SPORT", 2, RED);
  hline(120, sportY + 6, W - 144, INK, 2);
  for (let i = 0; i < 4; i++) {
    const sx = 24 + (i % 2) * 488;
    const sy = sportY + 20 + Math.floor(i / 2) * 18;
    fillRect(sx, sy + 2, 5, 5, RED);
    drawText(sx + 12, sy, SPORT[i], 2, INK);
  }

  // In brief: 10 items, two columns.
  const briefY = 908;
  drawText(24, briefY, "IN BRIEF", 2, RED);
  hline(140, briefY + 6, W - 164, INK, 2);
  for (let i = 0; i < BRIEF.length; i++) {
    const bx = 24 + (i % 2) * 488;
    const by = briefY + 20 + Math.floor(i / 2) * 15;
    fillRect(bx, by + 2, 5, 5, INK);
    drawText(bx + 12, by, BRIEF[i], 2, INK);
  }

  // Footer: black band restating the day.
  fillRect(0, 1004, W, 20, INK);
  drawTextCentered(W / 2, 1005, "40 STORIES - 9 REGIONS - WEDNESDAY 25 NOVEMBER 2026", 2, PAPER);
}

// -------------------------------------------------------------- entry ----
draw();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), encodePNG(px, W, H));


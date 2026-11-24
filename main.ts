// News-image entry for 24 November 2026 (Node 22, standard library only).
// The image was drawn for this competition and sits beside this file as
// entry.png; this program copies it to the output directory the grader
// reads. The gate takes a whole PNG or JPEG of at most 1 MiB and
// 1024 by 1024 pixels, and the judge sees exactly the bytes copied.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const source = new URL("./entry.png", import.meta.url);
// One fixed file, copied byte for byte, so both graded runs write the
// same bytes and the gate sees exactly the image in this repository.
copyFileSync(source, join(outDir, "entry.png"));

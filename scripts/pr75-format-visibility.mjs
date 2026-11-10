import { readFile } from "node:fs/promises";
import prettier from "prettier";

const path = "src/games/visibility-database.test.ts";
const original = await readFile(path, "utf8");
const formatted = await prettier.format(original, { filepath: path });
const start = '    const publicLegacy =';
const end = '    await query("public.save_game_visibility($1)", [';
const a = formatted.indexOf(start);
const b = formatted.indexOf(end, a);
console.log("===PR75-FORMAT-SNIPPET-START===");
console.log(formatted.slice(a, b));
console.log("===PR75-FORMAT-SNIPPET-END===");
console.log("===CHANGED===", original !== formatted);

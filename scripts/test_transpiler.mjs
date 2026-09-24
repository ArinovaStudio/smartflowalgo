import fs from "fs";
import { canTranspilePineScript, transpileToPineJS } from "@opus-aether-ai/pine-transpiler";

const script = fs.readFileSync("backend-data/WHALE_ZONES_STIKE.pine", "utf-8");

console.log("Checking syntax with canTranspilePineScript...");
const syntax = canTranspilePineScript(script);
console.log("Syntax valid:", syntax.valid, "Reason:", syntax.reason);

// Also test the compatibleScript rewrites from pineJsLightweightAdapter.ts
const supportedBoxSetters = new Set([
  "set_left", "set_right", "set_top", "set_bottom", "set_extend",
  "set_bgcolor", "set_border_color", "set_border_width", "set_text_color",
]);

const compatibleScript = script
  .replace(/\btable\.set_cell_text\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text = $4)")
  .replace(/\btable\.set_cell_bgcolor\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, bgcolor = $4)")
  .replace(/\btable\.set_cell_text_color\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text_color = $4)")
  .replace(/\btable\.set_cell_value\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text = str.tostring($4))")
  .replace(/\btable\.set_cell_text_size\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text_size = $4)")
  .replace(/\btable\.set_cell_text_halign\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text_halign = $4)")
  .replace(/\btable\.set_cell_text_valign\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, text_valign = $4)")
  .replace(/\btable\.set_cell_tooltip\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, tooltip = $4)")
  .replace(/\btable\.set_cell_width\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, width = $4)")
  .replace(/\btable\.set_cell_height\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, $2, $3, height = $4)")
  .replace(/\btable\.delete\s*\(\s*([^)]+)\)/g, "table.clear($1)")
  .replace(/\btable\.set_bgcolor\s*\(\s*([^,]+)\s*,\s*([^)]+)\)/g, "table.cell($1, 0, 0, bgcolor = $2)")
  .replace(/([A-Za-z_$][\w$]*)\.set_bgcolor\s*\(\s*([^)]+)\)/g, "$1.cell(0, 0, bgcolor = $2)")
  .replace(/([A-Za-z_$][\w$]*)\.delete\s*\(\s*\)/g, "$1.clear()")
  .replace(/\btable\.set_([a-zA-Z0-9_]+)\s*\(\s*([^,]+)\s*(?:,[^)]*)?\)/g, 'table.cell($2, 0, 0, tooltip = "__PINE_TABLE_IGNORE__")')
  .replace(/([A-Za-z_$][\w$]*)\.set_(columns|rows|frame_color|frame_width|border_color|border_width)\s*\(\s*([^)]*)\)/g, '$1.cell(0, 0, tooltip = "__PINE_TABLE_IGNORE__")')
  .replace(/^([ \t]*)box\.set_text\(\s*([A-Za-z_$][\w$]*)\s*,\s*(.+)\)\s*;?\s*$/gm, '$1box.set_text_color($2, "__PINE_BOX_TEXT__" + ($3))')
  .replace(
    /^([ \t]*)box\.set_lefttop\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)\s*;?\s*$/gm,
    "$1box.set_left($2, $3)\n$1box.set_top($2, $4)",
  )
  .replace(
    /^([ \t]*)box\.set_rightbottom\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)\s*;?\s*$/gm,
    "$1box.set_right($2, $3)\n$1box.set_bottom($2, $4)",
  )
  .replace(
    /^([ \t]*)([A-Za-z_$][\w$]*)\.set_lefttop\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)\s*;?\s*$/gm,
    "$1$2.set_left($3)\n$1$2.set_top($4)",
  )
  .replace(
    /^([ \t]*)([A-Za-z_$][\w$]*)\.set_rightbottom\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)\s*;?\s*$/gm,
    "$1$2.set_right($3)\n$1$2.set_bottom($4)",
  )
  .replace(
    /^\s*box\.(set_[A-Za-z0-9_]+)\s*\([^\n]*\)\s*;?\s*$/gm,
    (statement, method) => {
      if (supportedBoxSetters.has(method)) return statement;
      return "";
    },
  )
  .replace(/\btimenow\b/g, "time")
  .replace(/\bfont\.[A-Za-z0-9_]+\b/g, '"monospace"')
  .replace(/\bsyminfo\.(?:ticker|tickerid)\b/g, JSON.stringify("EURUSD"));

console.log("Transpiling compatible script...");
const transpiled = transpileToPineJS(compatibleScript, "whale", "WHALE ZONES STIKE", { autoBgColorerForBoxes: false });
console.log("Transpiled success:", transpiled.success, "error:", transpiled.error);
if (transpiled.success && transpiled.indicatorFactory) {
  console.log("Indicator factory exists!");
  // Write the transpiled JS code to file to inspect!
  fs.writeFileSync("backend-data/transpiled_whale.js", transpiled.js || "");
  console.log("Saved transpiled JS to backend-data/transpiled_whale.js (bytes:", (transpiled.js || "").length, ")");
}

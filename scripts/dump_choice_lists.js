const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

// Match each list in CHOICE_LISTS
const clBlockMatch = content.match(/export const CHOICE_LISTS[^{]*\{([\s\S]*?)\n\};/);
if (clBlockMatch) {
  const clText = clBlockMatch[1];
  const listRegex = /"([a-zA-Z0-9_]+)":\s*\[([\s\S]*?)\](?=,\s*"|\s*\}|$)/g;
  let lm;
  while ((lm = listRegex.exec(clText)) !== null) {
    const listName = lm[1];
    const itemsText = lm[2];
    const itemRegex = /\{\s*code:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)",\s*labelHi:\s*"([^"]+)"\s*\}/g;
    let im;
    const items = [];
    while ((im = itemRegex.exec(itemsText)) !== null) {
      items.push({ code: im[1], en: im[2], hi: im[3] });
    }
    console.log(`\n### ${listName} (${items.length} options)`);
    items.forEach(it => {
      console.log(`  ${it.code}: ${it.en} / ${it.hi}`);
    });
  }
}

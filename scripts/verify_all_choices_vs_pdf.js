const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

// Inspect CHOICE_LISTS in crfDefinitions
const clRegex = /"([a-zA-Z0-9_]+)":\s*\[([\s\S]*?)\](?=,\s*"|\s*\}|$)/g;
let m;
const lists = {};
while ((m = clRegex.exec(content)) !== null) {
  const name = m[1];
  const itemsText = m[2];
  const itemRegex = /\{\s*code:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)",\s*labelHi:\s*"([^"]+)"\s*\}/g;
  let im;
  const items = [];
  while ((im = itemRegex.exec(itemsText)) !== null) {
    items.push({ code: im[1], en: im[2], hi: im[3] });
  }
  lists[name] = items;
}

const targetLists = [
  'place', 'gender', 'yn', 'res_type', 'client_type', 'kp', 'typ_other', 'caretaker', 'orphan',
  'education', 'occupation', 'marital', 'income', 'relation', 'living', 'hivstat', 'artstat', 'idtype',
  'route', 'artc_type', 'art_init', 'who', 'tb_status', 'sws', 'entitlements', 'condom', 'subfreq',
  'disc_from', 'disability', 'yn_applied', 'yndk', 'death_reason', 'death_place', 'mis_lfu', 'purpose'
];

targetLists.forEach(name => {
  const items = lists[name] || [];
  console.log(`\n=== Choice List: ${name} (${items.length} items) ===`);
  items.forEach(it => console.log(`  [${it.code}] ${it.en} / ${it.hi}`));
});

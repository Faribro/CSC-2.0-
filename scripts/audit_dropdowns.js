const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const choiceListsMatch = content.match(/export const CHOICE_LISTS: Record<string, ChoiceOption\[\]> = ([\s\S]*?);\s*export const REGISTRATION_SECTIONS/);
if (!choiceListsMatch) {
  console.error('Could not find CHOICE_LISTS');
  process.exit(1);
}

const choiceLists = eval('(' + choiceListsMatch[1] + ')');
console.log('Total CHOICE_LISTS:', Object.keys(choiceLists).length);

const startIdx = content.indexOf('export const REGISTRATION_SECTIONS: CrfSectionDef[] =');
const regSecStr = content.slice(startIdx + 'export const REGISTRATION_SECTIONS: CrfSectionDef[] ='.length).trim().replace(/;\s*$/, '');
const sections = eval('(' + regSecStr + ')');
console.log('Total sections in REGISTRATION_SECTIONS:', sections.length);

for (const sec of sections) {
  console.log(`\n=== Section ${sec.code}: ${sec.titleEn} (${sec.fields.length} fields) ===`);
  for (const f of sec.fields) {
    if (f.type === 'select_one' || f.type === 'select_multiple' || f.choiceList) {
      const list = choiceLists[f.choiceList];
      const count = list ? list.length : 'MISSING!';
      console.log(`  [${f.type}] ${f.name} -> choiceList "${f.choiceList}" (${count} options) | Label: ${f.labelEn}`);
      if (!list) {
        console.error(`    >>> ERROR: choiceList "${f.choiceList}" NOT FOUND in CHOICE_LISTS!`);
      }
    }
  }
}

const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const choiceListsMatch = content.match(/export const CHOICE_LISTS: Record<string, ChoiceOption\[\]> = ([\s\S]*?);\s*export const REGISTRATION_SECTIONS/);
const choiceLists = eval('(' + choiceListsMatch[1] + ')');

const startIdx = content.indexOf('export const REGISTRATION_SECTIONS: CrfSectionDef[] =');
const regSecStr = content.slice(startIdx + 'export const REGISTRATION_SECTIONS: CrfSectionDef[] ='.length).trim().replace(/;\s*$/, '');
const sections = eval('(' + regSecStr + ')');

let errors = 0;
for (const sec of sections) {
  for (const f of sec.fields) {
    if (f.choiceList) {
      if (!choiceLists[f.choiceList]) {
        console.error(`ERROR: Field ${f.name} in Section ${sec.code} references missing choiceList: "${f.choiceList}"`);
        errors++;
      } else if (choiceLists[f.choiceList].length === 0) {
        console.error(`ERROR: choiceList "${f.choiceList}" for field ${f.name} is EMPTY!`);
        errors++;
      }
    }
  }
}

if (errors === 0) {
  console.log('SUCCESS: All fields in REGISTRATION_SECTIONS reference valid, non-empty choice lists!');
} else {
  console.log(`FAILED with ${errors} errors.`);
}

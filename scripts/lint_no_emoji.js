// scripts/lint_no_emoji.js
// Automated check enforcing zero emojis in frontend source files, translations, and definitions.

const fs = require('fs');
const path = require('path');

const EMOJI_REGEX = /[\u{10000}-\u{10ffff}]|[\u200d\u20e3\ufe0f]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50\u2b55\u2934\u2935]|[\u25aa-\u25fe]|[\u3030\u303d]|[\u3297\u3299]/u;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

const targetDir = path.resolve(__dirname, '../frontend');
const files = walk(targetDir);
let violations = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (EMOJI_REGEX.test(line)) {
      console.error(`EMOJI VIOLATION: ${file}:${i + 1} -> ${line.trim()}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\nFAILED: Found ${violations} emoji occurrences in source files. Emojis must be replaced with Lucide icons.`);
  process.exit(1);
} else {
  console.log(`PASSED: Zero emojis found across ${files.length} frontend source files.`);
  process.exit(0);
}

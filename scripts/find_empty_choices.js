const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

// Find CHOICE_LISTS object
const start = content.indexOf('export const CHOICE_LISTS');
const sub = content.substring(start);
const matches = sub.match(/([a-zA-Z0-9_]+):\s*\[\s*\]/g);
console.log('Empty choice lists:', matches);

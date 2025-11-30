#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const htmlFiles = walk(ROOT).filter(f => f.endsWith('.html'));
const pattern = /<script[^>]*src\s*=\s*(?:"|')(?:\.?\/?){0,1}assets\/js\/client-error-tracker\.js(?:\?[^"']*)?(?:"|')[^>]*>\s*<\/script>\s*/gi;

let modified = [];

for (const file of htmlFiles) {
  let txt = fs.readFileSync(file, 'utf8');
  const original = txt;
  txt = txt.replace(pattern, '');
  // Remove accidental consecutive blank lines created by removal
  txt = txt.replace(/\n{3,}/g, '\n\n');
  if (txt !== original) {
    fs.writeFileSync(file, txt, 'utf8');
    modified.push(path.relative(ROOT, file));
  }
}

console.log(`Scanned ${htmlFiles.length} HTML files. Removed occurrences from ${modified.length} files.`);
if (modified.length) console.log(modified.join('\n'));

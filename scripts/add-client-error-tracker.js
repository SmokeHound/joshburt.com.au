const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function findHtmlFiles(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git') continue;
      results.push(...findHtmlFiles(full));
    } else if (stat.isFile() && file.toLowerCase().endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const files = findHtmlFiles(root);
const include = '<script src="/assets/js/client-error-tracker.js"></script>';
let changed = 0;
const modifiedFiles = [];
for (const f of files) {
  try {
    let txt = fs.readFileSync(f, 'utf8');
    if (txt.includes('client-error-tracker.js')) continue;
    const match = txt.match(/<\/head>/i);
    if (!match) continue;
    const idx = match.index;
    const before = txt.slice(0, idx);
    const after = txt.slice(idx);
    // Insert include on its own line before </head>
    const insert = include + '\n';
    txt = before + insert + after;
    fs.writeFileSync(f, txt, 'utf8');
    changed++;
    modifiedFiles.push(f);
  } catch (e) {
    console.error('Failed to update', f, e);
  }
}
console.log(`Scanned ${files.length} HTML files. Modified ${changed} files.`);
if (modifiedFiles.length) console.log(modifiedFiles.join('\n'));

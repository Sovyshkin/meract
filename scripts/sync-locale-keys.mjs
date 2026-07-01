import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/shared/i18n/locales');

const en = (await import(pathToFileURL(path.join(localesDir, 'en.js')).href)).default;
const codes = fs.readdirSync(localesDir).filter((f) => f.endsWith('.js') && f !== 'en.js').map((f) => f.replace('.js', ''));

function escape(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

for (const code of codes) {
  const filePath = path.join(localesDir, `${code}.js`);
  const locale = (await import(pathToFileURL(filePath).href)).default;
  const merged = { ...en, ...locale };
  const body = Object.entries(merged)
    .map(([k, v]) => `  ${k}: '${escape(v)}',`)
    .join('\n');
  fs.writeFileSync(filePath, `export default {\n${body}\n};\n`);
  console.log(`Synced ${code}.js (${Object.keys(merged).length} keys)`);
}

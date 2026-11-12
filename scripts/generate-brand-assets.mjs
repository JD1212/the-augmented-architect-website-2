import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// Deterministic vector recreation of the approved interlocking AA reference.
// All exports share this geometry; no reference-sheet pixels are embedded.
function definitions(inverse = false) {
  return `<defs>
    <linearGradient id="navy" x1=".2" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${inverse ? '#FFFFFF' : '#115584'}"/><stop offset="1" stop-color="${inverse ? '#D8E6EF' : '#021B2D'}"/></linearGradient>
    <linearGradient id="back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${inverse ? '#EEF5FA' : '#062B46'}"/><stop offset="1" stop-color="${inverse ? '#B9CFDF' : '#001422'}"/></linearGradient>
    <linearGradient id="cyan" x1=".25" y1="1" x2=".85" y2="0"><stop stop-color="#126294"/><stop offset=".48" stop-color="#64B8D6"/><stop offset="1" stop-color="#00E3EE"/></linearGradient>
    <linearGradient id="blue" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="${inverse ? '#52E0EB' : '#168CD0'}"/><stop offset="1" stop-color="${inverse ? '#ADCBE0' : '#06365B'}"/></linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#164D70"/><stop offset="1" stop-color="#398CB7"/></linearGradient>
  </defs>`;
}
const geometry = `<g>
  <path fill="url(#back)" d="M179 0 292 192H230L147 55Z"/>
  <path fill="url(#navy)" d="M0 192 124 0H179L59 192Z"/>
  <path fill="url(#bar)" d="M249 107H316L338 144H227Z"/>
  <path fill="url(#cyan)" d="M68 192 126 92H218L270 0H316L229 144H154L124 192Z"/>
  <path fill="url(#blue)" d="M316 0 426 192H365L287 53Z"/>
</g>`;
function monogram(inverse = false) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 426 192" width="426" height="192">${definitions(inverse)}${geometry}</svg>\n`; }
function lockup(inverse = false) {
  const color = inverse ? '#F5F2EA' : '#031B2C';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1230 192" width="1230" height="192" role="img" aria-label="The Augmented Architect">${definitions(inverse)}${geometry}<g fill="${color}" font-family="Arial, Helvetica, sans-serif"><text x="464" y="56" font-size="66" font-weight="500" textLength="764" lengthAdjust="spacingAndGlyphs">THE AUGMENTED</text><text x="464" y="172" font-size="106" font-weight="750" textLength="764" lengthAdjust="spacingAndGlyphs">ARCHITECT</text></g></svg>\n`;
}
const appIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><linearGradient id="ground" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0A4D78"/><stop offset=".58" stop-color="#021B30"/><stop offset="1" stop-color="#041421"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#ground)"/>${definitions(true)}<g transform="translate(4 19) scale(.13145)">${geometry}</g></svg>\n`;
await mkdir('public/brand', { recursive: true });
for (const [name, content] of Object.entries({ 'aa-monogram.svg': monogram(), 'aa-monogram-inverse.svg': monogram(true), 'logo-header.svg': lockup(), 'logo-footer.svg': lockup(true), 'app-icon.svg': appIcon })) await writeFile(`public/brand/${name}`, content);
await writeFile('src/app/icon.svg', appIcon);
await sharp(Buffer.from(appIcon)).resize(180, 180).png().toFile('src/app/apple-icon.png');
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(size => sharp(Buffer.from(appIcon)).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);header.writeUInt16LE(1, 2);header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => { const entry = 6 + i * 16; header[entry] = size; header[entry + 1] = size; header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6); header.writeUInt32LE(pngs[i].length, entry + 8); header.writeUInt32LE(offset, entry + 12); offset += pngs[i].length; });
await writeFile('src/app/favicon.ico', Buffer.concat([header, ...pngs]));
console.log('Created transparent monograms, header/footer SVG lockups, SVG/ICO favicons and Apple touch icon.');

/**
 * Generate two PNG variants of the globe badge — gray (idle) and blue
 * (active) — for the Safari fallback in the kiosk header.
 *
 * Safari refused to render the inline SVG reliably in face-kiosk.tsx
 * (every attempt — CSS rotation, SMIL animateTransform, static SVG —
 * either crashed the renderer or rendered nothing). PNG via <img> uses
 * a completely different render path and works dependably.
 *
 * Output: public/globe-gray.png + public/globe-blue.png (72×72, retina
 * for a 36px display slot). Rerun this script whenever the SVG markup
 * in face-kiosk.tsx GlobeBadge changes.
 *
 *   node scripts/generate-globe-png.mjs
 */
import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public')

// Same shapes as the GlobeBadge SVG in face-kiosk.tsx — kept in sync by
// hand. Colour is the only thing that varies between the two outputs.
function svgFor(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="72" height="72">
  <g stroke="${color}" fill="${color}">
    <circle cx="12" cy="12" r="10" fill="none" stroke-width="1.4" />
    <ellipse cx="12" cy="12" rx="10" ry="3.4" fill="none" stroke-width="0.8" opacity="0.6" />
    <ellipse cx="12" cy="12" rx="3.4" ry="10" fill="none" stroke-width="0.8" opacity="0.6" />
    <line x1="12" y1="2" x2="12" y2="22" stroke-width="0.6" opacity="0.35" />
    <ellipse cx="9" cy="9" rx="2" ry="1.3" stroke="none" opacity="0.6" />
    <ellipse cx="15" cy="13" rx="1.6" ry="2.2" stroke="none" opacity="0.6" />
    <circle cx="10" cy="17" r="1.1" stroke="none" opacity="0.6" />
  </g>
</svg>`
}

const variants = [
  { name: 'globe-gray', color: '#94a3b8' /* slate-400 */ },
  { name: 'globe-blue', color: '#38bdf8' /* sky-400 */ },
]

for (const { name, color } of variants) {
  const svg = svgFor(color)
  const out = join(outDir, `${name}.png`)
  await sharp(Buffer.from(svg)).png().toFile(out)
  console.log(`wrote ${out}`)
}

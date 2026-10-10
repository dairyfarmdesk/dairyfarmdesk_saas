import sharp from 'sharp'
import { readFileSync } from 'fs'
const svg = readFileSync('public/favicon.svg')
for (const s of [192, 512]) await sharp(svg).resize(s, s).png().toFile(`public/icon-${s}.png`)
console.log('icons generated')

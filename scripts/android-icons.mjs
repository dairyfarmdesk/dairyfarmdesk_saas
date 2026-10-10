import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'

// Generates Android launcher icons (legacy + adaptive foreground) from public/favicon.svg
const svg = readFileSync('public/favicon.svg')
const res = 'android/app/src/main/res'
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const fg = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }
if (!existsSync(res)) throw new Error('Run `npx cap add android` first')

for (const [d, s] of Object.entries(sizes)) {
  const dir = `${res}/mipmap-${d}`
  await sharp(svg).resize(s, s).png().toFile(`${dir}/ic_launcher.png`)
  await sharp(svg).resize(s, s).png().toFile(`${dir}/ic_launcher_round.png`)
  // adaptive foreground: logo at 60% centred inside the safe zone
  const inner = Math.round(fg[d] * 0.6)
  const logo = await sharp(svg).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: fg[d], height: fg[d], channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, gravity: 'center' }]).png().toFile(`${dir}/ic_launcher_foreground.png`)
}
console.log('android icons generated')

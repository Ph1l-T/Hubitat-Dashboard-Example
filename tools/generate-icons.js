const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generate() {
  const src = path.join(__dirname, '..', 'images', 'photos', 'EletrizeLogo.jpg');
  const outDir = path.join(__dirname, '..', 'images', 'pwa');
  await ensureDir(outDir);

  const variants = [
    { size: 192, file: 'icon-192.png' },
    { size: 512, file: 'icon-512.png' },
    { size: 180, file: 'icon-180.png' }, // recomendado p/ iOS
  ];

  for (const v of variants) {
    const out = path.join(outDir, v.file);
    await sharp(src)
      .resize(v.size, v.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(out);
    console.log('Generated', out);
  }
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});


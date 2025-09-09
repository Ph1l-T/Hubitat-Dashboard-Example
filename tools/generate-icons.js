const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function resolveSource() {
  const jpg = path.join(__dirname, '..', 'images', 'photos', 'EletrizeLogo.jpg');
  const png = path.join(__dirname, '..', 'images', 'photos', 'EletrizeLogo.png');
  // CLI arg --src=path
  const argSrc = process.argv.find((a) => a.startsWith('--src='));
  if (argSrc) {
    const p = argSrc.slice('--src='.length);
    if (!fs.existsSync(p)) throw new Error(`Fonte não encontrada: ${p}`);
    return p;
  }
  if (fs.existsSync(png)) return png;
  if (fs.existsSync(jpg)) return jpg;
  throw new Error('Nenhum arquivo de logo encontrado (EletrizeLogo.png ou EletrizeLogo.jpg)');
}

async function generate() {
  const src = await resolveSource();
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

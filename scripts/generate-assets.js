import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generatePngAssets() {
  const svgBuffer = fs.readFileSync(path.join(process.cwd(), 'public/logo.svg'));
  
  // 1200x1200 high-res logo and OG image
  await sharp(svgBuffer)
    .resize(1200, 1200)
    .png()
    .toFile(path.join(process.cwd(), 'public/og-image.png'));

  await sharp(svgBuffer)
    .resize(1200, 1200)
    .png()
    .toFile(path.join(process.cwd(), 'public/logo.png'));

  // 512x512 icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(process.cwd(), 'public/icon-512.png'));

  // 192x192 icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(process.cwd(), 'public/icon-192.png'));

  // 180x180 Apple touch icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(process.cwd(), 'public/apple-touch-icon.png'));

  // 64x64 favicon.png
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(process.cwd(), 'public/favicon.png'));

  console.log('All logo and search preview assets generated successfully.');
}

generatePngAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});

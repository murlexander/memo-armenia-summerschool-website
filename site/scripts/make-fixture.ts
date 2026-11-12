// Regenerates the fictional fixture images in src/content/ (cut-outs, placeholder photos,
// poster) and the object records with measured alpha bounds. No real material is involved.
// Usage: node scripts/make-fixture.ts
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { contentDir } from '../src/lib/build-env.ts';

const root = contentDir({});

type ObjectSpec = { id: string; projectId: string; label: string; alt: string; svg: string; width: number; height: number };

const objects: ObjectSpec[] = [
  {
    id: 'o9001', projectId: 'p901', label: 'Синий камешек', alt: 'Вымышленный пример: гладкий синий камешек неправильной формы',
    width: 900, height: 700,
    svg: '<path d="M140 380 C120 220 300 120 470 140 C650 160 790 260 760 420 C730 560 520 610 360 580 C230 560 160 500 140 380Z" fill="#4d7592"/><path d="M300 250 C380 210 470 220 520 250" stroke="#9fc1d1" stroke-width="18" fill="none" stroke-linecap="round"/>',
  },
  {
    id: 'o9002', projectId: 'p901', label: 'Глиняный черепок', alt: 'Вымышленный пример: терракотовый черепок с ровным краем',
    width: 800, height: 900,
    svg: '<path d="M180 120 L620 170 L700 560 L470 800 L130 650 Z" fill="#a65e45"/><path d="M180 120 L620 170 L610 230 L190 190 Z" fill="#c98265"/>',
  },
  {
    id: 'o9003', projectId: 'p902', label: 'Латунная пуговица', alt: 'Вымышленный пример: круглая латунная пуговица с четырьмя отверстиями',
    width: 800, height: 800,
    svg: '<circle cx="400" cy="400" r="290" fill="#a98048"/><circle cx="400" cy="400" r="230" fill="none" stroke="#d0ad5a" stroke-width="16"/><g fill="#5c4524"><circle cx="350" cy="350" r="30"/><circle cx="450" cy="350" r="30"/><circle cx="350" cy="450" r="30"/><circle cx="450" cy="450" r="30"/></g>',
  },
  {
    id: 'o9004', projectId: 'p903', label: 'Сухой лист', alt: 'Вымышленный пример: вытянутый сухой лист оливкового цвета',
    width: 700, height: 1000,
    svg: '<path d="M350 80 C560 260 600 560 360 920 C110 600 140 280 350 80Z" fill="#5e6b52"/><path d="M350 120 L360 900" stroke="#8b9362" stroke-width="12"/>',
  },
  {
    id: 'o9005', projectId: 'p903', label: 'Обрывок ленты', alt: 'Вымышленный пример: волнистый обрывок полосатой ленты',
    width: 1000, height: 600,
    svg: '<path d="M90 300 C250 120 420 460 580 260 C700 120 820 220 910 300 L900 400 C800 320 720 260 600 380 C430 560 260 230 100 400 Z" fill="#7762a0"/><path d="M110 330 C260 180 420 500 590 300 C700 180 820 260 905 340" stroke="#d89b74" stroke-width="20" fill="none"/>',
  },
];

async function alphaBounds(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    x: round(minX / info.width),
    y: round(minY / info.height),
    width: round((maxX - minX + 1) / info.width),
    height: round((maxY - minY + 1) / info.height),
  };
}

const svgDoc = (width: number, height: number, body: string) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`);

for (const spec of objects) {
  const dir = path.join(root, 'objects', spec.id);
  fs.mkdirSync(dir, { recursive: true });
  const png = await sharp(svgDoc(spec.width, spec.height, spec.svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
  fs.writeFileSync(path.join(dir, 'image.png'), png);
  const bounds = await alphaBounds(png);
  fs.writeFileSync(path.join(dir, 'index.yaml'), [
    `id: ${spec.id}`,
    `projectId: ${spec.projectId}`,
    'published: true',
    `label: "${spec.label}"`,
    `alt: "${spec.alt}"`,
    `width: ${spec.width}`,
    `height: ${spec.height}`,
    `bounds: { x: ${bounds.x}, y: ${bounds.y}, width: ${bounds.width}, height: ${bounds.height} }`,
    'autoCutout: false',
    '',
  ].join('\n'));
}

// Placeholder "photos": abstract compositions, clearly not photographs.
const photo = (hue: string, accent: string, label: string) => svgDoc(1200, 800, `
  <rect width="1200" height="800" fill="${hue}"/>
  <circle cx="860" cy="300" r="220" fill="${accent}" opacity=".55"/>
  <rect x="140" y="420" width="520" height="240" fill="#eee7db" opacity=".35"/>
  <text x="140" y="300" font-family="sans-serif" font-size="64" fill="#eee7db">${label}</text>`);

const photos: Array<[string, Buffer]> = [
  ['projects/p901/media/01.jpg', photo('#6b7971', '#a98048', 'Пример фото 1')],
  ['projects/p901/media/02.jpg', photo('#a65e45', '#5e6b52', 'Пример фото 2')],
  ['projects/p902/media/01.jpg', photo('#5e6b52', '#a65e45', 'Пример фото 3')],
  ['projects/p902/media/yt-poster.jpg', photo('#26231f', '#6b7971', 'Пример видео')],
  ['projects/p903/media/01.jpg', photo('#a98048', '#4d7592', 'Пример фото 4')],
  ['pages/pokr-ayrum/media/figure-01.jpg', photo('#4d7592', '#a98048', 'Пример иллюстрации')],
];
for (const [relative, svg] of photos) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, await sharp(svg).jpeg({ quality: 70, mozjpeg: true }).toBuffer());
}

console.log(`Fixture images written to ${root}`);

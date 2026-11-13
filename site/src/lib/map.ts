// Map of places: projection, marker layout and interface strings. Pure (no astro:content),
// so the unit tests run in plain Node; PlaceMap.astro reads the content and draws.
import type { MapData, MapPlace } from './schemas.ts';
import type { Lang } from './ui.ts';

export type Box = { west: number; south: number; east: number; north: number };
export type Point = { x: number; y: number };
export type Direction = 'north' | 'south' | 'east' | 'west';

/** Drawing width in SVG units; the height follows the frame's proportions. */
export const viewWidth = 1000;

const metresPerDegreeLat = 110_540;
const metresPerDegreeLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);

/** Equirectangular projection of a lon/lat frame onto a viewWidth-wide drawing (north up). */
export function projection(frame: Box) {
  const midLat = (frame.south + frame.north) / 2;
  const widthM = (frame.east - frame.west) * metresPerDegreeLon(midLat);
  const heightM = (frame.north - frame.south) * metresPerDegreeLat;
  const height = Math.round((viewWidth * heightM) / widthM);
  const project = (lon: number, lat: number): Point => ({
    x: ((lon - frame.west) / (frame.east - frame.west)) * viewWidth,
    y: ((frame.north - lat) / (frame.north - frame.south)) * height,
  });
  return { width: viewWidth, height, project, metresPerUnit: widthM / viewWidth };
}

const round = (value: number) => Math.round(value * 10) / 10;

/** SVG path data for a lon/lat line; closed outlines end with Z. */
export function linePath(line: [number, number][], project: (lon: number, lat: number) => Point, closed = false): string {
  const points = line.map(([lon, lat]) => project(lon, lat));
  return points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${round(x)} ${round(y)}`).join('') + (closed ? 'Z' : '');
}

/**
 * Push overlapping markers apart (deterministically) so each stays readable; markers keep close to
 * their true positions, and PlaceMap draws a leader line where one had to move.
 */
export function spreadMarkers(anchors: Point[], radius: number, bounds: { width: number; height: number }, gap = 3): Point[] {
  const minDistance = 2 * radius + gap;
  const points = anchors.map((point) => ({ ...point }));
  for (let step = 0; step < 400; step += 1) {
    let moved = false;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i];
        const b = points[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= minDistance) continue;
        if (distance < 1e-6) {
          // Same spot: separate along a fixed, index-dependent angle.
          const angle = (i * 2.399963) % (2 * Math.PI);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }
        const push = (minDistance - distance) / 2 + 0.01;
        a.x -= (dx / distance) * push;
        a.y -= (dy / distance) * push;
        b.x += (dx / distance) * push;
        b.y += (dy / distance) * push;
        moved = true;
      }
    }
    for (const [index, point] of points.entries()) {
      // A light pull home keeps the cluster's shape.
      point.x += (anchors[index].x - point.x) * 0.02;
      point.y += (anchors[index].y - point.y) * 0.02;
      point.x = Math.min(bounds.width - radius, Math.max(radius, point.x));
      point.y = Math.min(bounds.height - radius, Math.max(radius, point.y));
    }
    if (!moved) break;
  }
  return points;
}

export const inside = (box: Box, lon: number, lat: number) => lon >= box.west && lon <= box.east && lat >= box.south && lat <= box.north;

/** Where a place outside the frame lies: the main compass direction from the frame's centre and the distance to the frame edge. */
export function offFrame(frame: Box, lon: number, lat: number): { direction: Direction; km: number } {
  const midLat = (frame.south + frame.north) / 2;
  const dx = (lon - (frame.west + frame.east) / 2) * metresPerDegreeLon(midLat);
  const dy = (lat - midLat) * metresPerDegreeLat;
  const direction: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'north' : 'south';
  const outsideX = Math.max(0, frame.west - lon, lon - frame.east) * metresPerDegreeLon(midLat);
  const outsideY = Math.max(0, frame.south - lat, lat - frame.north) * metresPerDegreeLat;
  return { direction, km: Math.max(0.1, Math.round(Math.hypot(outsideX, outsideY) / 100) / 10) };
}

/** A frame of the given size in metres around some places, kept inside the drawn extent. */
export function frameAround(places: Pick<MapPlace, 'lon' | 'lat'>[], extent: Box, widthM: number, heightM: number, marginM = 90): Box {
  const lons = places.map((place) => place.lon);
  const lats = places.map((place) => place.lat);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const perLon = metresPerDegreeLon(midLat);
  // Grow to fit every place with a margin, keeping the requested proportions.
  const needW = (Math.max(...lons) - Math.min(...lons)) * perLon + 2 * marginM;
  const needH = (Math.max(...lats) - Math.min(...lats)) * metresPerDegreeLat + 2 * marginM;
  const scale = Math.max(1, needW / widthM, needH / heightM);
  const halfLon = Math.min((widthM * scale) / perLon / 2, (extent.east - extent.west) / 2);
  const halfLat = Math.min((heightM * scale) / metresPerDegreeLat / 2, (extent.north - extent.south) / 2);
  const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
  const lon = clamp((Math.min(...lons) + Math.max(...lons)) / 2, extent.west + halfLon, extent.east - halfLon);
  const lat = clamp(midLat, extent.south + halfLat, extent.north - halfLat);
  return { west: lon - halfLon, east: lon + halfLon, south: lat - halfLat, north: lat + halfLat };
}

/**
 * The frame grown north and south about its centre until its height is `ratio` times its width (in metres),
 * staying inside the extent. A box taller than the frame then shows more of the surroundings instead of
 * zooming in, and the frame itself stays in the middle.
 */
export function tallerFrame(frame: Box, extent: Box, ratio: number): Box {
  const midLat = (frame.south + frame.north) / 2;
  const widthM = (frame.east - frame.west) * metresPerDegreeLon(midLat);
  const wanted = (widthM * ratio) / metresPerDegreeLat / 2;
  const half = Math.max((frame.north - frame.south) / 2, Math.min(wanted, midLat - extent.south, extent.north - midLat));
  return { ...frame, south: midLat - half, north: midLat + half };
}

export type LaidOutPlace = MapPlace & {
  /** Shown on the dot and in the list; the camp has none. */
  number: number | null;
  anchor: Point;
  marker: Point;
  /** Set for places beyond the frame: the marker sits on the edge, pointing their way. */
  outside?: { direction: Direction; km: number };
};

/**
 * Number and place every marker of the full map: the camp first (unnumbered), then project places
 * and then notes, each west to east, so neighbours get neighbouring numbers.
 */
export function layoutPlaces(map: Pick<MapData, 'places'> & { base: { frame: Box } }, radius: number): { width: number; height: number; places: LaidOutPlace[] } {
  const { frame } = map.base;
  const { width, height, project } = projection(frame);
  const rank = { camp: 0, project: 1, note: 2 } as const;
  const ordered = [...map.places].sort((a, b) => rank[a.kind] - rank[b.kind] || a.lon - b.lon || a.id.localeCompare(b.id));
  let next = 1;
  const placed = ordered.map((place) => {
    const anchor = project(place.lon, place.lat);
    const number = place.kind === 'camp' ? null : next++;
    if (inside(frame, place.lon, place.lat)) return { ...place, number, anchor, marker: anchor };
    const clamped = { x: Math.min(width - radius * 1.6, Math.max(radius * 1.6, anchor.x)), y: Math.min(height - radius * 1.6, Math.max(radius * 1.6, anchor.y)) };
    return { ...place, number, anchor: clamped, marker: clamped, outside: offFrame(frame, place.lon, place.lat) };
  });
  const markers = spreadMarkers(placed.map((place) => place.marker), radius, { width, height });
  return { width, height, places: placed.map((place, index) => ({ ...place, marker: markers[index] })) };
}

type MapStrings = {
  title: string;
  projects: string;
  notes: string;
  where: string;
  allPlaces: string;
  /** Stand-in for a place name or note written only in Russian. */
  placePending: string;
  noProject: string;
  outside: Record<Direction, string>;
};

/** Interface strings for the map, in each language. */
export const mapStrings: Record<Lang, MapStrings> = {
  ru: {
    title: 'Карта мест',
    projects: 'Проекты',
    notes: 'Заметки о деревне',
    where: 'Где это',
    allPlaces: 'Все места на карте',
    placePending: 'Название места',
    noProject: 'Проект не определён',
    outside: { north: 'км к северу', south: 'км к югу', east: 'км к востоку', west: 'км к западу' },
  },
  en: {
    title: 'Map of places',
    projects: 'Projects',
    notes: 'Village notes',
    where: 'Where it is',
    allPlaces: 'All places on the map',
    placePending: 'Place name coming',
    noProject: 'Project not identified',
    outside: { north: 'km north', south: 'km south', east: 'km east', west: 'km west' },
  },
  hy: {
    title: 'Վայրերի քարտեզ',
    projects: 'Նախագծեր',
    notes: 'Նշումներ գյուղի մասին',
    where: 'Որտեղ է',
    allPlaces: 'Բոլոր վայրերը քարտեզի վրա',
    placePending: 'Վայրի անվանումը պատրաստվում է',
    noProject: 'Նախագիծը որոշված չէ',
    outside: { north: 'կմ դեպի հյուսիս', south: 'կմ դեպի հարավ', east: 'կմ դեպի արևելք', west: 'կմ դեպի արևմուտք' },
  },
};

/** "1,7 км к югу", "1.7 km south". */
export function outsideText(lang: Lang, outside: { direction: Direction; km: number }): string {
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(outside.km)} ${mapStrings[lang].outside[outside.direction]}`;
}

// Seeded placement solver for the LOST object field. Contract: docs/collage-algorithm.md.
// Ported from prototype/lib/collage-layout.ts without the placeholder-shape atlas logic.

export type VisibleBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Serializable object descriptor, built at build time and passed to the island. */
export type FieldObject = {
  id: string;
  /** Base-aware project URL. */
  href: string;
  /** Short object name, shown as the touch label. */
  label: string;
  /** The object's story, shown on hover and focus with a fine pointer. */
  story?: string;
  projectTitle: string;
  alt: string;
  /** Optimized web image (webp), with a smaller candidate in srcset. */
  image: { src: string; srcset: string; width: number; height: number };
  /** Pixel size of the original cut-out. */
  intrinsicSize: { width: number; height: number };
  /** Normalized bounding box of the visible (non-transparent) pixels. */
  visibleAlphaBounds: VisibleBounds;
  visualWeight?: number;
};

export type CollageItem = Pick<FieldObject, 'id' | 'visualWeight'>;

export type CollagePlacement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  objectScale: number;
  objectOffset: number;
  layer: number;
};

export type CollageLayout = {
  canvasHeight: number;
  densityColumns: number;
  placements: CollagePlacement[];
};

export const MIN_TARGET = 48;

const clamp = (minimum: number, value: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export function randomUnit(seed: number, key: string) {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489909);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}

type Rect = { x: number; y: number; width: number; height: number };

function horizontalOverlap(left: { x: number; width: number }, right: { x: number; width: number }, gap: number) {
  return left.x < right.x + right.width + gap && left.x + left.width + gap > right.x;
}

function protectedOverlap(candidate: Rect, placement: Rect, gap: number) {
  return horizontalOverlap(candidate, placement, gap)
    && candidate.y < placement.y + placement.height + gap
    && candidate.y + candidate.height + gap > placement.y;
}

function lowestOpenY(x: number, width: number, height: number, startY: number, placements: Rect[], gap: number) {
  let y = startY;
  for (let step = 0; step <= placements.length; step += 1) {
    const blockers = placements.filter((placement) => protectedOverlap({ x, y, width, height }, placement, gap));
    if (blockers.length === 0) return y;
    y = Math.min(...blockers.map((placement) => placement.y + placement.height + gap));
  }
  return y;
}

function createsHorizontalBand(centerY: number, placements: Rect[], span = 72, capacity = 3) {
  const centres = [centerY, ...placements.map((placement) => placement.y + placement.height / 2)].sort((a, b) => a - b);
  for (let index = 0; index + capacity < centres.length; index += 1) {
    if (centres[index + capacity] - centres[index] < span) return true;
  }
  return false;
}

/** Layout constants shared by the solver, the island and the tests. */
export function layoutMetrics(containerWidth: number) {
  const safeWidth = Math.max(280, containerWidth);
  const gutter = clamp(16, safeWidth * .042, 64);
  const usableWidth = safeWidth - gutter * 2;
  const protectedGap = clamp(4, safeWidth * .005, 9);
  const targetCellWidth = clamp(184, safeWidth * .15, 198);
  // Phones get two footprints once they have ~300px to spare (Alex, 2026-11-12); only very narrow screens stay a single stream.
  const minimumColumns = usableWidth >= 300 ? 2 : 1;
  const densityColumns = clamp(minimumColumns, Math.floor((usableWidth + protectedGap) / (targetCellWidth + protectedGap)), 8);
  const nominalWidth = (usableWidth - protectedGap * (densityColumns - 1)) / densityColumns;
  return { safeWidth, gutter, usableWidth, protectedGap, densityColumns, nominalWidth };
}

export function createCollageLayout(objects: CollageItem[], containerWidth: number, seed: number): CollageLayout {
  const { safeWidth, gutter, usableWidth, protectedGap, densityColumns, nominalWidth } = layoutMetrics(containerWidth);
  const single = densityColumns === 1;
  const roomyFactor = clamp(0, (nominalWidth - 178) / 72, 1);
  const ordered = [...objects].sort((a, b) => randomUnit(seed, `${a.id}:order`) - randomUnit(seed, `${b.id}:order`));
  const placements: CollagePlacement[] = [];
  const estimatedCardWidth = nominalWidth * (single ? .88 : .64);
  const estimatedCardHeight = single ? 286 : 184;
  const targetCanvasHeight = single
    ? objects.length * 288
    : Math.max(780, objects.length * estimatedCardWidth * estimatedCardHeight / (usableWidth * .64));
  const topBandCapacity = densityColumns >= 6 ? 3 : 2;

  const rejectsLeadingRow = (candidateY: number) => (
    candidateY < 108 && placements.filter((placement) => placement.y < 108).length >= topBandCapacity
  );

  ordered.forEach((object, placementIndex) => {
    const weight = clamp(.94, object.visualWeight ?? 1, 1.06);
    const widthVariation = single
      ? .76 + randomUnit(seed, `${object.id}:width`) * .22
      : .54 + randomUnit(seed, `${object.id}:width`) * .18;
    const width = Math.max(MIN_TARGET, Math.min(usableWidth, nominalWidth * widthVariation * weight));
    const height = Math.max(MIN_TARGET, single
      ? 260 + randomUnit(seed, `${object.id}:mobile-height`) * 30 + (weight - 1) * 12
      : 158 + randomUnit(seed, `${object.id}:height`) * 42 + (weight - 1) * 12);

    let bestX = gutter;
    let bestY = 12;
    let bestScore = Number.POSITIVE_INFINITY;
    const candidateCount = single ? 1 : 720;
    for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex += 1) {
      const envelopeGrowth = 1 + Math.floor(candidateIndex / 180) * .03;
      const candidateX = single
        ? gutter + randomUnit(seed, `${object.id}:mobile-x`) * Math.max(0, usableWidth - width)
        : gutter + randomUnit(seed, `${object.id}:candidate-x:${candidateIndex}`) * Math.max(0, usableWidth - width);
      const candidateY = single
        ? placementIndex * 288 + 8
        : 10 + randomUnit(seed, `${object.id}:candidate-y:${candidateIndex}`)
          * Math.max(0, targetCanvasHeight * envelopeGrowth - height - 20);
      const candidate = { x: candidateX, y: candidateY, width, height };
      if (placements.some((placement) => protectedOverlap(candidate, placement, protectedGap))) continue;

      const centerX = candidateX + width / 2;
      const centerY = candidateY + height / 2;
      if (!single && createsHorizontalBand(centerY, placements)) continue;
      if (rejectsLeadingRow(candidateY)) continue;

      let alignmentPenalty = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      let closeNeighbours = 0;
      let localCrowdingPenalty = 0;

      placements.forEach((placement) => {
        const dx = centerX - (placement.x + placement.width / 2);
        const dy = centerY - (placement.y + placement.height / 2);
        const distance = Math.hypot(dx, dy);
        nearestDistance = Math.min(nearestDistance, distance);
        const topAlignment = Math.abs(candidateY - placement.y);
        alignmentPenalty += Math.exp(-.5 * (topAlignment / 72) ** 2) * 76;
        const centerAlignment = Math.abs(centerY - (placement.y + placement.height / 2));
        alignmentPenalty += Math.exp(-.5 * (centerAlignment / 66) ** 2) * 64;
        const leftAlignment = Math.abs(candidateX - placement.x);
        alignmentPenalty += Math.exp(-.5 * (leftAlignment / 52) ** 2) * 14;
        if (distance < nominalWidth * 1.65) closeNeighbours += 1;
        localCrowdingPenalty += Math.max(0, nominalWidth * 1.42 - distance) * .5;
      });

      const isolationThreshold = nominalWidth * 2.25;
      const spacingPenalty = Number.isFinite(nearestDistance)
        ? Math.max(0, nearestDistance - isolationThreshold) * .4
        : 0;
      const crowdingPenalty = localCrowdingPenalty + Math.max(0, closeNeighbours - 2) * 54;
      const overflowPenalty = Math.max(0, candidateY + height - targetCanvasHeight) * 8;
      const seededVariation = randomUnit(seed, `${object.id}:candidate-score:${candidateIndex}`) * 24;
      const score = alignmentPenalty + spacingPenalty + crowdingPenalty + overflowPenalty + seededVariation;
      if (score < bestScore) {
        bestScore = score;
        bestX = candidateX;
        bestY = candidateY;
      }
    }

    if (!Number.isFinite(bestScore)) {
      for (let fallbackIndex = 0; fallbackIndex < 96; fallbackIndex += 1) {
        const candidateX = gutter + randomUnit(seed, `${object.id}:fallback-x:${fallbackIndex}`) * Math.max(0, usableWidth - width);
        const candidateY = lowestOpenY(candidateX, width, height, 10, placements, protectedGap);
        const centerY = candidateY + height / 2;
        if (!single && createsHorizontalBand(centerY, placements)) continue;
        if (rejectsLeadingRow(candidateY)) continue;
        if (candidateY < bestY || !Number.isFinite(bestScore)) {
          bestX = candidateX;
          bestY = candidateY;
          bestScore = candidateY;
        }
      }
    }

    if (!Number.isFinite(bestScore)) {
      bestX = gutter + randomUnit(seed, `${object.id}:last-resort-x`) * Math.max(0, usableWidth - width);
      bestY = Math.max(10, ...placements.map((placement) => placement.y + placement.height + protectedGap));
    }

    const x = bestX;
    const y = bestY;
    const rotationRange = single ? 4.5 : 6 + roomyFactor * 3;
    const rotation = (randomUnit(seed, `${object.id}:rotation`) * 2 - 1) * rotationRange;
    const scaleVariation = single
      ? 1 + randomUnit(seed, `${object.id}:scale`) * .08
      : .98 + randomUnit(seed, `${object.id}:scale`) * .16;
    const expansion = single ? 1 : 1 + roomyFactor * (.08 + randomUnit(seed, `${object.id}:expansion`) * .12);
    const objectScale = scaleVariation * expansion;
    const desiredOffset = single
      ? 0
      : (randomUnit(seed, `${object.id}:drift-direction`) > .5 ? 1 : -1)
        * (5 + randomUnit(seed, `${object.id}:drift`) * (14 + roomyFactor * 20));
    const visualWidth = visualBox({ width, height }, single ? 'single' : 'fine').width * objectScale;
    const radians = Math.abs(rotation) * Math.PI / 180;
    const visualHalfWidth = visualWidth * (Math.cos(radians) + (4 / 3) * Math.sin(radians)) / 2;
    const cardCenterX = x + width / 2;
    const objectOffset = clamp(visualHalfWidth - cardCenterX + 14, desiredOffset, safeWidth - visualHalfWidth - cardCenterX - 14);

    placements.push({
      id: object.id,
      x,
      y,
      width,
      height,
      rotation,
      objectScale,
      objectOffset,
      layer: 1 + Math.floor(randomUnit(seed, `${object.id}:layer`) * 8),
    });
  });

  const canvasHeight = Math.max(0, ...placements.map(({ y, height }) => y + height)) + 28;
  return { canvasHeight: Math.ceil(canvasHeight), densityColumns, placements };
}

/**
 * How a card shows its cut-out: one wide stream with a resting label ("single"), several
 * footprints with a resting label on touch ("touch"), or label-free with overflow ("fine").
 */
export type CardMode = 'single' | 'touch' | 'fine' | 'compact';

/** Height reserved for the resting one-line label. */
export const LABEL_HEIGHT = 36;

/** Box the visible cut-out is fitted into, before seeded scale. */
export function visualBox(card: { width: number; height: number }, mode: CardMode) {
  if (mode === 'single') return { width: card.width * .72, height: (card.height - LABEL_HEIGHT) * .8 };
  if (mode === 'touch') return { width: Math.min(card.width * 1.2, 240), height: card.height - LABEL_HEIGHT };
  // Fine pointers and touch phones (compact): small targets, larger cut-outs that may overlap peripherally.
  return { width: Math.min(card.width * 1.55, 272), height: card.height * 1.18 };
}

/**
 * Size and offset of the image so that its visible pixels fill a box and are centred in it.
 * Transparent padding never counts towards the object's apparent size.
 */
export function fitVisibleBounds(
  intrinsic: { width: number; height: number },
  bounds: VisibleBounds,
  box: { width: number; height: number },
) {
  const visibleWidth = Math.max(1, intrinsic.width * bounds.width);
  const visibleHeight = Math.max(1, intrinsic.height * bounds.height);
  const scale = Math.min(box.width / visibleWidth, box.height / visibleHeight);
  const width = intrinsic.width * scale;
  const height = intrinsic.height * scale;
  return {
    width,
    height,
    // Offset from the box centre to the image centre that puts the visible centre in the middle.
    offsetX: (.5 - (bounds.x + bounds.width / 2)) * width,
    offsetY: (.5 - (bounds.y + bounds.height / 2)) * height,
  };
}

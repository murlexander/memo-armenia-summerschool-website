import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  createCollageLayout,
  fitVisibleBounds,
  visualBox,
  type FieldObject,
} from '../lib/collage-layout.ts';

type Props = {
  objects: FieldObject[];
  label: string;
  describedBy?: string;
  /** Prefix for each link's id, so project pages can link back to an object (#object-o009). */
  anchorPrefix: string;
  /** The word for «project» in the page's language, for the screen-reader label. */
  projectWord: string;
};

type CardStyle = CSSProperties & {
  '--object-rotation': string;
  '--object-scale': number;
  '--object-offset': string;
};

const SERVER_SEED = 20261112;
const SERVER_WIDTH = 1024;
const SEED_KEY = 'lost-field-seed';

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** A fresh arrangement per visit; returning with Back restores the previous one. */
function visitSeed(): number {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const stored = Number(storage()?.getItem(SEED_KEY));
  if (navigation?.type === 'back_forward' && Number.isFinite(stored) && stored > 0) return stored;
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  const seed = values[0] || 1;
  try {
    storage()?.setItem(SEED_KEY, String(seed));
  } catch {
    // Storage may be unavailable; the field works without it.
  }
  return seed;
}

export default function ObjectField({ objects, label, describedBy, anchorPrefix, projectWord }: Props) {
  const fieldRef = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(SERVER_WIDTH);
  const [seed, setSeed] = useState(SERVER_SEED);
  const [ready, setReady] = useState(false);
  const [touch, setTouch] = useState(false);
  const layout = useMemo(() => createCollageLayout(objects, width, seed), [objects, width, seed]);
  const objectById = useMemo(() => new Map(objects.map((object) => [object.id, object])), [objects]);
  // Phones with two footprints: no resting labels and no hover card (iOS would need a second tap), just the objects.
  const mode = layout.densityColumns === 1 ? 'single' : touch ? (layout.densityColumns <= 2 ? 'compact' : 'touch') : 'fine';

  useEffect(() => {
    const element = fieldRef.current;
    if (!element) return;
    const measure = () => setWidth(Math.round(element.getBoundingClientRect().width));
    // Must match the CSS that shows resting labels (see .object-label in global.css).
    const touchQuery = window.matchMedia('(hover: none), (pointer: coarse)');
    const updateTouch = () => setTouch(touchQuery.matches);
    setSeed(visitSeed());
    measure();
    updateTouch();
    setReady(true);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    touchQuery.addEventListener('change', updateTouch);
    return () => {
      observer.disconnect();
      touchQuery.removeEventListener('change', updateTouch);
    };
  }, []);

  // Linked from a project page (#object-…): bring that object into view once it is placed.
  useEffect(() => {
    if (!ready) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith(anchorPrefix)) return;
    const target = document.getElementById(id);
    if (!target) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    target.focus({ preventScroll: true });
  }, [ready, anchorPrefix]);

  return (
    <section
      ref={fieldRef}
      className="object-field"
      aria-label={label}
      aria-describedby={describedBy}
      data-ready={ready}
      data-layout-columns={layout.densityColumns}
      data-mode={mode}
      style={{ height: `${layout.canvasHeight}px` }}
    >
      {layout.placements.map((placement, index) => {
        const object = objectById.get(placement.id);
        if (!object) return null;
        const fit = fitVisibleBounds(object.intrinsicSize, object.visibleAlphaBounds, visualBox(placement, mode));
        const style: CardStyle = {
          left: placement.x,
          top: placement.y,
          width: placement.width,
          height: placement.height,
          zIndex: placement.layer,
          '--object-rotation': `${placement.rotation.toFixed(2)}deg`,
          '--object-scale': Number(placement.objectScale.toFixed(3)),
          '--object-offset': `${placement.objectOffset.toFixed(1)}px`,
        };
        return (
          <a
            key={object.id}
            id={`${anchorPrefix}${object.id}`}
            className="object-card"
            href={object.href}
            style={style}
            data-testid="field-object"
          >
            <span className="object-label">
              <b>{object.label}</b>
              <span className="visually-hidden">, {projectWord} «{object.projectTitle}»</span>
              <span className="object-arrow" aria-hidden="true">↗</span>
            </span>
            {object.story && <span className="object-story" aria-hidden="true"><b>{object.label}</b><span>{object.story}</span></span>}
            <span className="object-figure">
              <img
                src={object.image.src}
                srcSet={object.image.srcset}
                sizes={`${Math.ceil(fit.width)}px`}
                width={object.image.width}
                height={object.image.height}
                alt={object.alt}
                loading={index < 8 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                style={{
                  width: `${fit.width.toFixed(1)}px`,
                  height: `${fit.height.toFixed(1)}px`,
                  transform: `translate(calc(-50% + ${fit.offsetX.toFixed(1)}px), calc(-50% + ${fit.offsetY.toFixed(1)}px))`,
                }}
              />
            </span>
          </a>
        );
      })}
    </section>
  );
}

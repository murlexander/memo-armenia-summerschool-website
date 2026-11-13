import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';
import { siteDir } from './build-env.ts';
import { frameAround, layoutPlaces, linePath, offFrame, outsideText, projection, spreadMarkers, tallerFrame } from './map.ts';
import { mapSchema } from './schemas.ts';

const fixture = path.join(siteDir, 'src', 'content');
const readFixture = () => mapSchema.parse({
  ...(parseYaml(fs.readFileSync(path.join(fixture, 'map.yaml'), 'utf8')) as object),
  base: JSON.parse(fs.readFileSync(path.join(fixture, 'map-base.json'), 'utf8')),
});

test('the fixture map parses and links only to fixture projects', () => {
  const map = readFixture();
  const projects = new Set(fs.readdirSync(path.join(fixture, 'projects')));
  for (const place of map.places) {
    for (const id of place.projectIds) assert.ok(projects.has(id), `${place.id} links to unknown project ${id}`);
  }
});

test('projection keeps north up and the frame proportions', () => {
  const { width, height, project } = projection({ west: 10, south: 50, east: 10.01, north: 50.005 });
  assert.equal(width, 1000);
  // 0.01° of longitude at 50° N is about 716 m, 0.005° of latitude about 553 m.
  assert.ok(Math.abs(height - 772) <= 2, `height ${height}`);
  assert.deepEqual(project(10, 50.005), { x: 0, y: 0 });
  assert.deepEqual(project(10.01, 50), { x: 1000, y: height });
  assert.equal(linePath([[10, 50.005], [10.01, 50]], project), `M0 0L1000 ${height}`);
});

test('spread markers do not overlap and stay inside the drawing', () => {
  const anchors = [{ x: 100, y: 100 }, { x: 101, y: 100 }, { x: 100, y: 100 }, { x: 102, y: 103 }, { x: 5, y: 5 }];
  const points = spreadMarkers(anchors, 10, { width: 300, height: 200 });
  for (const [i, a] of points.entries()) {
    assert.ok(a.x >= 10 && a.x <= 290 && a.y >= 10 && a.y <= 190);
    for (const b of points.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 20, 'markers overlap');
  }
});

test('places are numbered camp first (unnumbered), then projects and notes west to east', () => {
  const { places } = layoutPlaces(readFixture(), 12);
  assert.equal(places[0].kind, 'camp');
  assert.equal(places[0].number, null);
  assert.deepEqual(places.slice(1).map((place) => place.number), places.slice(1).map((_, index) => index + 1));
  const projects = places.filter((place) => place.kind === 'project');
  assert.deepEqual(projects.map((place) => place.lon), [...projects.map((place) => place.lon)].sort((a, b) => a - b));
  const far = places.find((place) => place.id === 'pl906');
  assert.equal(far?.outside?.direction, 'north');
});

test('places beyond the frame get a direction and a distance', () => {
  const frame = { west: 10, south: 50, east: 10.01, north: 50.005 };
  assert.deepEqual(offFrame(frame, 10.005, 49.99), { direction: 'south', km: 1.1 });
  assert.equal(outsideText('ru', { direction: 'south', km: 1.1 }), '1,1 км к югу');
  assert.equal(outsideText('en', { direction: 'west', km: 0.5 }), '0.5 km west');
});

test('a project frame fits its places and stays within the extent', () => {
  const extent = { west: 10, south: 50, east: 10.02, north: 50.01 };
  const frame = frameAround([{ lon: 10.0005, lat: 50.0005 }], extent, 600, 400);
  assert.ok(frame.west >= extent.west && frame.south >= extent.south && frame.east <= extent.east && frame.north <= extent.north);
  const wide = frameAround([{ lon: 10.002, lat: 50.005 }, { lon: 10.018, lat: 50.005 }], extent, 600, 400);
  assert.ok(wide.west < 10.002 && wide.east > 10.018);
});

test('a taller frame keeps the frame in its middle and stays within the extent', () => {
  const extent = { west: 10, south: 50, east: 10.02, north: 50.01 };
  const frame = frameAround([{ lon: 10.01, lat: 50.005 }], extent, 600, 400);
  const tall = tallerFrame(frame, extent, 1.4);
  assert.equal(tall.west, frame.west);
  assert.equal(tall.east, frame.east);
  assert.ok(Math.abs((tall.south + tall.north) / 2 - (frame.south + frame.north) / 2) < 1e-9);
  const { width, height } = projection(tall);
  assert.ok(Math.abs(height / width - 1.4) < 0.01, `ratio ${height / width}`);
  // Near the extent's edge it grows only as far as the extent allows, and never shrinks.
  const edge = frameAround([{ lon: 10.01, lat: 50.0095 }], extent, 600, 400);
  const capped = tallerFrame(edge, extent, 1.4);
  assert.ok(capped.north <= extent.north + 1e-9 && capped.south >= edge.south - 1e-9 && capped.north >= edge.north - 1e-9);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/pages/travel.astro', import.meta.url), 'utf8');

test('travel map does not request CARTO tiles without an API key', () => {
  assert.doesNotMatch(source, /basemaps\.cartocdn\.com/);
  assert.match(source, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(source, /https:\/\/www\.openstreetmap\.org\/copyright/);
});

test('map loads the final view only once, and dark mode does not refetch tiles', () => {
  assert.ok(source.indexOf('_map.fitBounds(allBounds.pad(0.2)') < source.indexOf('L.tileLayer(BASEMAP_TILE'));
  assert.match(source, /html\[data-theme="dark"\] \.travel-shell \.leaflet-tile-pane/);
  assert.doesNotMatch(source, /MutationObserver\(setTiles\)/);
});

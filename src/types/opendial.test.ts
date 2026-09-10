import assert from 'node:assert/strict';
import test from 'node:test';
import {
  asTypedDial,
  isLiveDial,
  isMultiPageDial,
  isWeatherDial,
  isFolderDial,
  isStandardDial,
  type DialItem,
  type LiveDial,
  type MultiPageDial,
  type WeatherDial,
  type FolderDial,
  type StandardDial,
} from '../types/opendial';

function makeDial(overrides: Partial<DialItem> = {}): DialItem {
  return {
    id: 'dial-1',
    title: 'Test Dial',
    url: 'https://example.com',
    type: 'standard',
    createdAt: 1000,
    ...overrides,
  };
}

test('asTypedDial returns the correct variant for standard', () => {
  const dial = makeDial({ type: 'standard' });
  const typed = asTypedDial(dial);
  assert.equal((typed as StandardDial).type, 'standard');
});

test('asTypedDial returns the correct variant for live', () => {
  const dial = makeDial({ type: 'live' });
  const typed = asTypedDial(dial);
  assert.equal((typed as LiveDial).type, 'live');
});

test('asTypedDial returns the correct variant for multipage', () => {
  const dial = makeDial({ type: 'multipage' });
  const typed = asTypedDial(dial);
  assert.equal((typed as MultiPageDial).type, 'multipage');
});

test('asTypedDial returns the correct variant for weather', () => {
  const dial = makeDial({ type: 'weather' });
  const typed = asTypedDial(dial);
  assert.equal((typed as WeatherDial).type, 'weather');
});

test('asTypedDial returns the correct variant for folder', () => {
  const dial = makeDial({ type: 'folder', folderId: 'folder-1' });
  const typed = asTypedDial(dial);
  assert.equal((typed as FolderDial).type, 'folder');
  assert.equal((typed as FolderDial).folderId, 'folder-1');
});

test('type guard isLiveDial correctly identifies live dials', () => {
  assert.equal(isLiveDial(makeDial({ type: 'live' })), true);
  assert.equal(isLiveDial(makeDial({ type: 'standard' })), false);
});

test('type guard isMultiPageDial correctly identifies multipage dials', () => {
  assert.equal(isMultiPageDial(makeDial({ type: 'multipage', multiLinks: [] })), true);
  assert.equal(isMultiPageDial(makeDial({ type: 'standard' })), false);
});

test('type guard isWeatherDial correctly identifies weather dials', () => {
  assert.equal(isWeatherDial(makeDial({ type: 'weather' })), true);
  assert.equal(isWeatherDial(makeDial({ type: 'standard' })), false);
});

test('type guard isFolderDial correctly identifies folder dials', () => {
  assert.equal(isFolderDial(makeDial({ type: 'folder', folderId: 'f1' })), true);
  assert.equal(isFolderDial(makeDial({ type: 'standard' })), false);
});

test('type guard isStandardDial correctly identifies standard dials', () => {
  assert.equal(isStandardDial(makeDial({ type: 'standard' })), true);
  assert.equal(isStandardDial(makeDial({ type: 'live' })), false);
});

test('type guards narrow to the correct variant type', () => {
  const dial = makeDial({
    type: 'live',
    liveUrl: 'https://example.com/embed',
    liveZoom: 120,
    liveRefreshInterval: 5,
  });
  if (isLiveDial(dial)) {
    // TypeScript narrows to LiveDial — these should be typed
    assert.equal(dial.liveUrl, 'https://example.com/embed');
    assert.equal(dial.liveZoom, 120);
    assert.equal(dial.liveRefreshInterval, 5);
  } else {
    assert.fail('Expected LiveDial');
  }
});

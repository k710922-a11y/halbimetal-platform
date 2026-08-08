import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('brand and core message are present', () => {
  assert.match(html, /HALBI METAL/);
  assert.match(html, /AGE IS JUST/);
  assert.match(html, /METAL IS ETERNAL/);
});

test('all agreed public IA sections are present', () => {
  for (const id of ['about', 'members', 'join', 'repertoire', 'media', 'contact']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('page has essential accessibility metadata', () => {
  assert.match(html, /lang="ko"/);
  assert.match(html, /viewport/);
  assert.match(html, /<main id="main">/);
});

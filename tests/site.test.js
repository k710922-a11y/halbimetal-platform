import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const adminHtml = await readFile(new URL('../admin.html', import.meta.url), 'utf8');
const hubHtml = await readFile(new URL('../hub.html', import.meta.url), 'utf8');
const adminJs = await readFile(new URL('../src/admin.js', import.meta.url), 'utf8');
const hubJs = await readFile(new URL('../src/hub.js', import.meta.url), 'utf8');
const dbJs = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');

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

test('public site links to the member and admin apps', () => {
  assert.match(html, /hub\.html/);
  assert.match(html, /admin\.html/);
  assert.match(html, /halbimetal-logo-transparent\.png/);
  assert.match(html, /class="hub-nav-button"/);
  assert.match(html, /aria-label="Admin 설정"/);
});

test('admin provides content, song, schedule and notice management', () => {
  for (const id of ['content-form', 'song-form', 'schedule-form', 'notice-form']) assert.match(adminHtml, new RegExp(`id="${id}"`));
});

test('admin song database pages ten rows at a time', () => {
  assert.match(adminHtml, /id="admin-song-pagination"/);
  assert.match(adminJs, /const ADMIN_PAGE_SIZE = 10;/);
});

test('public repertoire contains the agreed five songs', () => {
  for (const song of ['Save Me', 'All She Wrote', 'Too Young to Fall in Love', "Since You've Been Gone", 'Cum on Feel the Noize']) assert.match(html, new RegExp(song));
});

test('public line-up presents all six member positions and portraits', () => {
  for (const role of ['VOCAL', 'LEAD GUITAR', 'SECOND GUITAR', 'BASS', 'KEYBOARD', 'DRUMS']) {
    assert.match(html, new RegExp(role));
  }

  for (const portrait of ['vocal-transparent.webp', 'lead-guitar-transparent.webp', 'second-guitar-transparent.webp', 'bass-transparent.webp', 'keyboard-transparent.webp', 'drums-transparent.webp']) {
    assert.match(html, new RegExp(`members/${portrait}`));
  }
});

test('member hub provides schedule guidance, setlist, notices and member talk', () => {
  for (const id of ['cover-vocal-list', 'wishlist-list', 'notice-list', 'post-form']) assert.match(hubHtml, new RegExp(`id="${id}"`));
  assert.match(hubHtml, /그룹 카카오톡을 참조해주세요/);
  assert.doesNotMatch(hubHtml, /data-rsvp=/);
});

test('admin schedule form includes visible save feedback', () => {
  assert.match(adminHtml, /id="schedule-save-button"/);
  assert.match(adminHtml, /id="schedule-feedback"/);
});

test('rehearsal songs use the requested cover sessions and TBD originals', () => {
  assert.match(hubHtml, /보컬\(joshthejaws\)가 연습\/공연곡/);
  assert.match(hubHtml, /Wish List/);
  assert.match(hubHtml, /편곡\/자작곡/);
  assert.match(hubHtml, /TBD/);
});

test('each rehearsal list has ten-item pagination controls', () => {
  assert.match(hubHtml, /id="vocal-pagination"/);
  assert.match(hubHtml, /id="wishlist-pagination"/);
});

test('song form uploads audio, cover art and tab sheets', () => {
  assert.doesNotMatch(adminHtml, /name="bpm"/);
  assert.match(adminHtml, /id="audio-metadata-feedback"/);
  assert.match(adminHtml, /name="audio" type="file"/);
  assert.match(adminHtml, /name="cover" type="file"/);
  assert.match(adminHtml, /name="tabs" type="file"[^>]*multiple/);
  assert.match(adminHtml, /id="upload-progress"/);
});

test('songs live on the server, not in the browser', () => {
  assert.doesNotMatch(dbJs, /indexedDB/);
  assert.match(dbJs, /from '\.\/supabase\.js'/);
  assert.doesNotMatch(adminHtml, /브라우저 로컬 DB/);
  assert.match(adminHtml, /자체 호스팅 서버 DB/);
});

test('private audio is played through short-lived signed urls', () => {
  assert.match(dbJs, /createSignedUrl/);
  assert.match(adminHtml, /id="admin-player"/);
  assert.match(hubHtml, /id="hub-player"/);
});

test('both member pages require a login before reading data', () => {
  for (const source of [adminJs, hubJs]) assert.match(source, /requireLogin\(/);
});

test('no full storage url is ever written into the database', () => {
  // 서버 이전에서 배운 것: URL 을 통째로 넣으면 도메인이 바뀔 때 DB 를 전부 고쳐야 합니다.
  assert.doesNotMatch(adminJs, /audio_path: *`\$\{/);
  assert.match(dbJs, /버킷 안의 경로만/);
});

test('member hub includes the automated metal news and gig board', () => {
  assert.match(hubHtml, /id="metal-news"/);
  assert.match(hubHtml, /data-news-filter="opportunity"/);
  assert.match(hubHtml, /id="news-list"/);
  assert.match(hubHtml, /id="news-pagination"/);
});

test('admin and member hub use the transparent header logo', () => {
  assert.match(adminHtml, /halbimetal-logo-transparent\.png/);
  assert.match(hubHtml, /halbimetal-logo-transparent\.png/);
});

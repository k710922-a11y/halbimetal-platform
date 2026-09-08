// =============================================================================
// TAB 악보 미리보기 팝업 (Hub / Admin 공용)
//
// 곡 하나의 악보를 악기 파트별 카테고리로 나눠 보여주고, 그 자리에서 바로
// 내려받게 합니다. 파트 구분 규칙은 src/tabs.js 를 그대로 씁니다.
//
// 이미지(jpg·png·webp·gif)는 <img>, PDF 는 <iframe> 으로 띄웁니다.
// 그 밖의 형식(gp5 등)은 미리보기가 불가능하므로 내려받기만 안내합니다.
// =============================================================================
import './tab-viewer.css';
import { BUCKETS, downloadUrl, publicUrl } from './db.js';
import { groupTabs, tabFileName } from './tabs.js';

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg']);

let overlay = null;
let lastFocused = null;
const state = { song: null, groups: [], part: 0, page: 0 };

function esc(value = '') {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function currentItem() {
  return state.groups[state.part]?.items[state.page] || null;
}

function stageHtml(item) {
  if (!item) return '<p class="tab-viewer-empty">등록된 악보가 없습니다.</p>';
  const url = publicUrl(BUCKETS.tab, item.path);
  if (IMAGE_EXT.has(item.ext)) {
    return `<img src="${url}" alt="${esc(state.groups[state.part].label)} 악보 ${item.index}">`;
  }
  if (item.ext === 'pdf') {
    return `<iframe src="${url}#view=FitH" title="${esc(state.groups[state.part].label)} 악보 ${item.index}"></iframe>`;
  }
  return `<p class="tab-viewer-fallback">이 형식(<b>${esc(item.ext || '알 수 없음')}</b>)은 브라우저에서 미리보기를 지원하지 않습니다.<br>아래 내려받기 버튼으로 저장한 뒤 악보 앱에서 열어주세요.</p>`;
}

function render() {
  const song = state.song || {};
  const item = currentItem();
  const group = state.groups[state.part];
  const name = item ? tabFileName(song, item.path, item.index) : '';

  overlay.querySelector('.tab-viewer-title').innerHTML = `${esc(song.artist || '')}${song.artist && song.title ? ' — ' : ''}${esc(song.title || '악보')}`;

  overlay.querySelector('.tab-viewer-parts').innerHTML = state.groups.map((entry, index) => `
    <button type="button" role="tab" data-part="${index}" aria-selected="${index === state.part}">
      ${esc(entry.label)}<i>${entry.items.length}</i>
    </button>`).join('') || '<span class="tab-viewer-empty">파트 없음</span>';

  overlay.querySelector('.tab-viewer-pages').innerHTML = group && group.items.length > 1
    ? group.items.map((entry, index) => `<button type="button" data-page="${index}" aria-current="${index === state.page}">${entry.index}</button>`).join('')
    : '';

  overlay.querySelector('.tab-viewer-stage').innerHTML = stageHtml(item);
  overlay.querySelector('.tab-viewer-name').textContent = name || '';

  const actions = overlay.querySelector('.tab-viewer-actions');
  actions.innerHTML = item
    ? `<a href="${publicUrl(BUCKETS.tab, item.path)}" target="_blank" rel="noopener noreferrer">새 탭에서 열기</a>
       <a class="primary" href="${downloadUrl(BUCKETS.tab, item.path, name)}" download="${esc(name)}" rel="noopener noreferrer">↓ 내려받기</a>`
    : '';
}

function close() {
  if (!overlay) return;
  overlay.hidden = true;
  overlay.querySelector('.tab-viewer-stage').innerHTML = ''; // PDF iframe 을 남겨두지 않습니다.
  document.removeEventListener('keydown', onKeydown);
  lastFocused?.focus?.();
}

function onKeydown(event) {
  if (event.key === 'Escape') close();
}

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'tab-viewer';
  overlay.hidden = true;
  overlay.innerHTML = `<div class="tab-viewer-card" role="dialog" aria-modal="true" aria-label="TAB 악보 미리보기">
    <header class="tab-viewer-head">
      <div><p class="kicker">TAB SHEET</p><h2 class="tab-viewer-title"></h2></div>
      <button type="button" class="tab-viewer-close" aria-label="닫기">✕</button>
    </header>
    <nav class="tab-viewer-parts" role="tablist" aria-label="악기 파트"></nav>
    <div class="tab-viewer-pages"></div>
    <div class="tab-viewer-stage"></div>
    <footer class="tab-viewer-foot">
      <span class="tab-viewer-name"></span>
      <div class="tab-viewer-actions"></div>
    </footer>
  </div>`;

  overlay.addEventListener('click', (event) => {
    // 카드 바깥(배경)을 누르면 닫습니다.
    if (event.target === overlay) { close(); return; }
    if (event.target.closest('.tab-viewer-close')) { close(); return; }
    const part = event.target.closest('[data-part]');
    if (part) { state.part = Number(part.dataset.part); state.page = 0; render(); return; }
    const page = event.target.closest('[data-page]');
    if (page) { state.page = Number(page.dataset.page); render(); }
  });

  document.body.append(overlay);
  return overlay;
}

/** 곡 하나의 악보 팝업을 엽니다. tab_paths 가 비어 있어도 안내 문구로 열립니다. */
export function openTabViewer(song) {
  ensureOverlay();
  lastFocused = document.activeElement;
  state.song = song;
  state.groups = groupTabs(song?.tab_paths || []);
  state.part = 0;
  state.page = 0;
  render();
  overlay.hidden = false;
  document.addEventListener('keydown', onKeydown);
  overlay.querySelector('.tab-viewer-close').focus();
}

export function closeTabViewer() {
  close();
}

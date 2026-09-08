import './portal.css';
import './rehearsal.css';
import './setlist-pagination.css';
import './schedule-feedback.css';
import './song-library.css';
import './tab-sheet.css';
import {
  BUCKETS, createSong, deleteSong, downloadUrl, formatBytes, listSongs, loadJson,
  publicUrl, removeFiles, saveJson, signedAudioUrl, updateSong, uploadFile,
} from './db.js';
import { TAB_INSTRUMENTS, groupTabs, tabFileName } from './tabs.js';
import { openTabViewer } from './tab-viewer.js';
import { extractAudioMetadata, formatDuration } from './audio-metadata.js';
import { mountSignOut, requireLogin, translateError } from './auth.js';

const CONTENT_KEY = 'halbi.content';
const SCHEDULE_KEY = 'halbi.schedule';
const NOTICE_KEY = 'halbi.notices';
const ADMIN_PAGE_SIZE = 10;
let adminSongPage = 1;
let currentRows = [];
const sections = [
  ['about', 'ABOUT', '늦은 시작은 없다. 더 큰 사운드만 있을 뿐.', 'HALBI METAL은 나이를 장벽이 아닌 리듬으로 바꾸는 시니어 메탈 밴드 프로젝트입니다.'],
  ['members', 'MEMBERS', 'THE LINE-UP', '무대를 함께 완성할 HALBI METAL 멤버들입니다.'],
  ['join', 'RECRUITMENT', 'YOUR NEXT STAGE STARTS HERE.', '나이보다 태도, 경력보다 함께할 의지를 봅니다.'],
  ['repertoire', 'REPERTOIRE', 'LOUD. CLASSIC. ALIVE.', '우리의 사운드를 만드는 연습곡과 공연 레퍼토리입니다.'],
  ['media', 'MEDIA', 'FROM THE ROOM TO THE STAGE.', '합주와 공연의 순간을 기록합니다.'],
  ['contact', 'PARTNERSHIP & CONTACT', 'MAKE SOME NOISE WITH US.', '공연, 공간, 장비, 콘텐츠 파트너십을 환영합니다.'],
];
const savedContent = loadJson(CONTENT_KEY, {});
const contentForm = document.querySelector('#content-form');
const FONT_OPTIONS = [
  ['Archivo Black', 'Archivo Black · 메탈 제목'],
  ['Inter', 'Inter · 산세리프'],
  ['Noto Sans KR', 'Noto Sans KR · 한글 고딕'],
  ['Noto Serif KR', 'Noto Serif KR · 한글 명조'],
  ['system-ui', '시스템 기본 글꼴'],
];
const fontOptions = (selected) => FONT_OPTIONS.map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');

contentForm.innerHTML = sections.map(([id, label, title, body]) => {
  const titleSize = Number(savedContent[id]?.titleSize || 72);
  const bodySize = Number(savedContent[id]?.bodySize || 16);
  const titleLineHeight = Number(savedContent[id]?.titleLineHeight || 0.9);
  const bodyLineHeight = Number(savedContent[id]?.bodyLineHeight || 1.8);
  const titleFont = savedContent[id]?.titleFont || 'Archivo Black';
  const bodyFont = savedContent[id]?.bodyFont || 'Inter';
  return `<fieldset class="editor-card"><h3>${label}</h3><label>제목<input name="${id}.title" value="${escapeHtml(savedContent[id]?.title || title)}"><small>줄을 바꾸려면 입력창에서 Enter를 누르세요.</small></label><label>본문<textarea name="${id}.body" rows="4">${escapeHtml(savedContent[id]?.body || body)}</textarea><small>입력한 줄바꿈이 공개 페이지에 그대로 적용됩니다.</small></label><div class="font-controls"><label class="font-control"><span>제목 글꼴</span><select name="${id}.titleFont">${fontOptions(titleFont)}</select></label><label class="font-control"><span>본문 글꼴</span><select name="${id}.bodyFont">${fontOptions(bodyFont)}</select></label><label class="font-control"><span>제목 크기 <b><output for="${id}-title-size">${titleSize}</output>px</b></span><input id="${id}-title-size" name="${id}.titleSize" type="range" min="32" max="128" step="2" value="${titleSize}"></label><label class="font-control"><span>본문 크기 <b><output for="${id}-body-size">${bodySize}</output>px</b></span><input id="${id}-body-size" name="${id}.bodySize" type="range" min="12" max="32" step="1" value="${bodySize}"></label><label class="font-control"><span>제목 줄간격 <b><output for="${id}-title-line-height">${titleLineHeight}</output></b></span><input id="${id}-title-line-height" name="${id}.titleLineHeight" type="range" min="0.75" max="1.6" step="0.05" value="${titleLineHeight}"></label><label class="font-control"><span>본문 줄간격 <b><output for="${id}-body-line-height">${bodyLineHeight}</output></b></span><input id="${id}-body-line-height" name="${id}.bodyLineHeight" type="range" min="1" max="2.5" step="0.05" value="${bodyLineHeight}"></label></div></fieldset>`;
}).join('');
contentForm.addEventListener('input', (event) => {
  if (event.target.type === 'range') event.target.closest('label')?.querySelector('output')?.replaceChildren(event.target.value);
  document.querySelector('#content-feedback').textContent = '서식이 변경되었습니다. 저장 버튼을 눌러 공개 페이지에 적용하세요.';
});
contentForm.addEventListener('change', () => {
  document.querySelector('#content-feedback').textContent = '서식이 변경되었습니다. 저장 버튼을 눌러 공개 페이지에 적용하세요.';
});
contentForm.addEventListener('submit', (event) => {
  event.preventDefault(); const data = new FormData(contentForm); const content = {};
  sections.forEach(([id]) => { content[id] = {
    title: data.get(`${id}.title`),
    body: data.get(`${id}.body`),
    titleFont: data.get(`${id}.titleFont`),
    bodyFont: data.get(`${id}.bodyFont`),
    titleSize: Number(data.get(`${id}.titleSize`)),
    bodySize: Number(data.get(`${id}.bodySize`)),
    titleLineHeight: Number(data.get(`${id}.titleLineHeight`)),
    bodyLineHeight: Number(data.get(`${id}.bodyLineHeight`)),
  }; });
  saveJson(CONTENT_KEY, content); document.querySelector('#content-feedback').textContent = '공개 페이지 콘텐츠와 글꼴 서식이 저장되었습니다.';
});

// =============================================================================
// 곡 · MP3 라이브러리 — 서버 저장
// =============================================================================
const songForm = document.querySelector('#song-form');
const songFeedback = document.querySelector('#song-feedback');
const progressBox = document.querySelector('#upload-progress');
const player = document.querySelector('#admin-player');
let parsedAudio = null;

function showProgress(label, ratio) {
  progressBox.hidden = false;
  progressBox.querySelector('.upload-label').textContent = label;
  progressBox.querySelector('.upload-bar i').style.width = `${Math.round(ratio * 100)}%`;
  progressBox.querySelector('.upload-percent').textContent = `${Math.round(ratio * 100)}%`;
}

function hideProgress() {
  progressBox.hidden = true;
  progressBox.querySelector('.upload-bar i').style.width = '0%';
}

songForm.audio.addEventListener('change', async () => {
  const file = songForm.audio.files[0];
  parsedAudio = file ? await extractAudioMetadata(file) : null;
  if (!parsedAudio) { document.querySelector('#audio-metadata-feedback').textContent = ''; return; }
  if (parsedAudio.artist && !songForm.artist.value) songForm.artist.value = parsedAudio.artist;
  if (parsedAudio.title && !songForm.title.value) songForm.title.value = parsedAudio.title;
  if (parsedAudio.album && !songForm.album.value) songForm.album.value = parsedAudio.album;
  document.querySelector('#audio-metadata-feedback').textContent = `${parsedAudio.fileName} · ${formatDuration(parsedAudio.duration)} · ${formatBytes(parsedAudio.fileSize)} — 저장 버튼을 누르면 서버에 업로드됩니다.`;
});

songForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = songForm.querySelector('button[type="submit"]');
  const audioFile = songForm.audio.files[0] || null;
  const uploaded = []; // 중간에 실패하면 되돌리기 위한 기록

  submitButton.disabled = true;
  songFeedback.textContent = '';

  try {
    const record = {
      artist: songForm.artist.value.trim(),
      title: songForm.title.value.trim(),
      album: songForm.album.value.trim() || null,
      song_key: songForm.key.value.trim() || null,
      progress: Number(songForm.progress.value || 0),
      notes: songForm.notes.value.trim() || null,
      session: 'unassigned',
      tab_paths: [],
    };

    if (audioFile) {
      const metadata = parsedAudio || await extractAudioMetadata(audioFile);
      showProgress(`음원 업로드 — ${audioFile.name}`, 0);
      record.audio_path = await uploadFile(BUCKETS.audio, audioFile, (r) => showProgress(`음원 업로드 — ${audioFile.name}`, r));
      uploaded.push([BUCKETS.audio, record.audio_path]);
      record.audio_name = audioFile.name;
      record.audio_size = audioFile.size;
      record.audio_type = audioFile.type || null;
      record.duration = metadata?.duration || null;
    }

    await createSong(record);

    songForm.reset();
    parsedAudio = null;
    document.querySelector('#audio-metadata-feedback').textContent = '';
    adminSongPage = 1;
    songFeedback.textContent = audioFile
      ? `저장되었습니다. 음원 ${formatBytes(audioFile.size)} 가 서버에 올라갔습니다.`
      : '곡 정보가 저장되었습니다.';
    await renderSongs();
  } catch (error) {
    // 행 저장에 실패했으면 방금 올린 파일들을 지웁니다 — 안 지우면 고아 파일이 쌓입니다.
    for (const [bucket, path] of uploaded) {
      try { await removeFiles(bucket, [path]); } catch { /* 정리 실패는 무시 */ }
    }
    songFeedback.textContent = `저장 실패 — ${translateError(error)}`;
  } finally {
    submitButton.disabled = false;
    hideProgress();
  }
});

// =============================================================================
// TAB 악보 — 파트별 등록 · 다운로드 · 삭제
//
// 파트는 저장소 경로의 첫 칸(guitar/… drum/…)으로 구분합니다(src/tabs.js 참고).
// 서버 DB 스키마를 바꾸지 않아도 되고, 예전에 올린 악보도 '기타 자료'로 남습니다.
// =============================================================================
const SESSION_OPTIONS = [
  ['unassigned', '미분류'],
  ['vocal', '보컬 연습/공연곡'],
  ['wishlist', 'Wish List'],
  ['original', '편곡/자작곡'],
];
let openTabSongId = null;

function fileCell(song) {
  const tabCount = (song.tab_paths || []).length;
  const tabButton = `<button type="button" class="tab-button${tabCount ? '' : ' tab-button--empty'}" data-tabs="${song.id}"
    aria-expanded="${String(String(song.id) === String(openTabSongId))}" aria-controls="tab-row-${song.id}">TAB 관리${tabCount ? `<i>${tabCount}</i>` : ''}</button>`;
  if (!song.audio_path) {
    return `<small>음원 없음</small><div class="track-actions">${tabButton}</div>`;
  }
  return `<div class="track-actions"><button type="button" class="play-button" data-play="${song.id}">▶ 재생</button>${tabButton}</div>
    <small>${escapeHtml(song.audio_name || '음원')}<br>${formatDuration(song.duration)} · ${formatBytes(song.audio_size)}</small>`;
}

/** 곡 행 아래로 펼쳐지는 악보 관리 패널. */
function tabManagerHtml(song) {
  const groups = groupTabs(song.tab_paths || []);
  const parts = groups.map((group) => {
    const files = group.items.map((item) => {
      const name = tabFileName(song, item.path, item.index);
      return `<span class="tab-file"><a href="${downloadUrl(BUCKETS.tab, item.path, name)}" download="${escapeHtml(name)}" rel="noopener noreferrer">↓ ${escapeHtml(name)}</a>
        <button type="button" data-tab-delete="${escapeHtml(item.path)}" data-song="${song.id}" aria-label="${escapeHtml(name)} 삭제">✕</button></span>`;
    }).join('');
    return `<div class="tab-part"><b>${escapeHtml(group.label)}</b>${files}</div>`;
  }).join('') || '<p class="tab-feedback">아직 등록된 악보가 없습니다.</p>';

  const options = TAB_INSTRUMENTS.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join('');
  const count = (song.tab_paths || []).length;
  return `<div class="tab-manager">
    <div class="tab-manager-head">
      <h4>TAB 악보 — ${escapeHtml(song.artist)} · ${escapeHtml(song.title)}</h4>
      <button type="button" class="tab-button" data-tab-preview="${song.id}" aria-haspopup="dialog" ${count ? '' : 'disabled'}>미리보기 팝업${count ? `<i>${count}</i>` : ''}</button>
    </div>
    ${parts}
    <div class="tab-upload">
      <label class="visually-hidden" for="tab-instrument-${song.id}">파트</label>
      <select id="tab-instrument-${song.id}" data-tab-instrument="${song.id}">${options}</select>
      <input type="file" data-tab-file="${song.id}" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" multiple>
      <button type="button" class="metal-button" data-tab-upload="${song.id}">악보 등록 · 업로드</button>
    </div>
    <p class="tab-feedback" data-tab-feedback="${song.id}" role="status">기타 · 드럼 · 키보드 등 파트를 고르고 PDF 또는 이미지 악보를 올리면, Member Hub의 TAB 버튼에서 파트별로 내려받습니다.</p>
  </div>`;
}

function rowHtml(song) {
  const cover = publicUrl(BUCKETS.cover, song.cover_path);
  const options = SESSION_OPTIONS
    .map(([value, label]) => `<option value="${value}" ${(song.session || 'unassigned') === value ? 'selected' : ''}>${label}</option>`)
    .join('');
  const open = String(song.id) === String(openTabSongId);
  return `<tr>
    <td><div class="song-cell">${cover ? `<img class="song-cover" src="${cover}" alt="" loading="lazy">` : '<span class="song-cover song-cover--empty">♪</span>'}<div><b>${escapeHtml(song.artist)} — ${escapeHtml(song.title)}</b><small>${escapeHtml(song.album || '앨범 정보 없음')}</small></div></div></td>
    <td><select class="session-select" data-assign="${song.id}" aria-label="${escapeHtml(song.title)} 연습곡 세션">${options}</select></td>
    <td>${escapeHtml(song.song_key || '—')}</td>
    <td>${fileCell(song)}</td>
    <td><div class="progress"><i style="width:${song.progress}%"></i></div><small>${song.progress}%</small></td>
    <td><button type="button" class="delete-button" data-delete="${song.id}">삭제</button></td>
  </tr>
  <tr class="tab-row" id="tab-row-${song.id}" ${open ? '' : 'hidden'}><td colspan="6">${tabManagerHtml(song)}</td></tr>`;
}

/** 업로드·삭제 후 표 전체를 다시 그리지 않고 해당 패널만 갱신합니다. */
function refreshTabPanel(song) {
  const cell = document.querySelector(`#tab-row-${CSS.escape(String(song.id))} td`);
  if (cell) cell.innerHTML = tabManagerHtml(song);
  const button = document.querySelector(`[data-tabs="${CSS.escape(String(song.id))}"]`);
  if (button) {
    const count = (song.tab_paths || []).length;
    button.innerHTML = `TAB 관리${count ? `<i>${count}</i>` : ''}`;
    button.classList.toggle('tab-button--empty', count === 0);
  }
}

function tabFeedback(songId, message) {
  const line = document.querySelector(`[data-tab-feedback="${CSS.escape(String(songId))}"]`);
  if (line) line.textContent = message;
}

async function renderSongs() {
  const tbody = document.querySelector('#song-table');
  tbody.innerHTML = '<tr><td colspan="6" class="empty">불러오는 중…</td></tr>';
  let result;
  try {
    result = await listSongs({ page: adminSongPage, pageSize: ADMIN_PAGE_SIZE });
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">목록을 불러오지 못했습니다 — ${escapeHtml(translateError(error))}</td></tr>`;
    document.querySelector('#admin-song-pagination').innerHTML = '';
    return;
  }
  adminSongPage = result.page;
  currentRows = result.rows;
  document.querySelector('#song-count').textContent = `${result.total} TRACKS`;
  tbody.innerHTML = result.rows.map(rowHtml).join('') || '<tr><td colspan="6" class="empty">등록된 곡이 없습니다.</td></tr>';
  document.querySelector('#admin-song-pagination').innerHTML = result.totalPages > 1
    ? `<button data-admin-page="prev" ${adminSongPage === 1 ? 'disabled' : ''}>← 이전</button><span>${adminSongPage} / ${result.totalPages}</span><button data-admin-page="next" ${adminSongPage === result.totalPages ? 'disabled' : ''}>다음 →</button>`
    : '';
}

document.querySelector('#song-table').addEventListener('click', async (event) => {
  const playButton = event.target.closest('[data-play]');
  if (playButton) {
    const song = currentRows.find((item) => String(item.id) === playButton.dataset.play);
    if (!song) return;
    playButton.disabled = true;
    try {
      // 비공개 버킷이라 매번 짧게 유효한 주소를 새로 발급받습니다.
      player.src = await signedAudioUrl(song.audio_path);
      player.hidden = false;
      await player.play();
      songFeedback.textContent = `${song.title} 재생 중`;
    } catch (error) {
      songFeedback.textContent = `재생 실패 — ${translateError(error)}`;
    } finally {
      playButton.disabled = false;
    }
    return;
  }

  // ---- TAB 악보 패널 열고 닫기 ----
  const tabToggle = event.target.closest('[data-tabs]');
  if (tabToggle) {
    const id = tabToggle.dataset.tabs;
    const row = document.querySelector(`#tab-row-${CSS.escape(id)}`);
    if (!row) return;
    const open = row.hidden;
    document.querySelectorAll('.tab-row').forEach((item) => { item.hidden = true; });
    document.querySelectorAll('[data-tabs]').forEach((item) => item.setAttribute('aria-expanded', 'false'));
    row.hidden = !open;
    tabToggle.setAttribute('aria-expanded', String(open));
    openTabSongId = open ? id : null;
    return;
  }

  // ---- 악보 미리보기 팝업 ----
  const previewButton = event.target.closest('[data-tab-preview]');
  if (previewButton) {
    const song = currentRows.find((item) => String(item.id) === previewButton.dataset.tabPreview);
    if (song) openTabViewer(song);
    return;
  }

  // ---- 파트별 악보 업로드 ----
  const uploadButton = event.target.closest('[data-tab-upload]');
  if (uploadButton) {
    const id = uploadButton.dataset.tabUpload;
    const song = currentRows.find((item) => String(item.id) === id);
    if (!song) return;
    const instrument = document.querySelector(`[data-tab-instrument="${CSS.escape(id)}"]`)?.value || 'etc';
    const input = document.querySelector(`[data-tab-file="${CSS.escape(id)}"]`);
    const files = Array.from(input?.files || []);
    if (!files.length) { tabFeedback(id, '올릴 악보 파일을 먼저 선택해주세요.'); return; }

    uploadButton.disabled = true;
    const added = [];
    try {
      for (const [index, file] of files.entries()) {
        tabFeedback(id, `업로드 중 ${index + 1}/${files.length} — ${file.name}`);
        // eslint-disable-next-line no-await-in-loop
        const path = await uploadFile(BUCKETS.tab, file, undefined, { prefix: instrument });
        added.push(path);
      }
      const tabPaths = [...(song.tab_paths || []), ...added];
      await updateSong(song.id, { tab_paths: tabPaths });
      song.tab_paths = tabPaths;
      refreshTabPanel(song);
      tabFeedback(id, `${files.length}개 악보를 등록했습니다. Member Hub의 TAB 버튼에서 확인할 수 있습니다.`);
    } catch (error) {
      // 행에 반영하지 못했으면 방금 올린 파일을 지웁니다 — 안 지우면 고아 파일이 남습니다.
      for (const path of added) {
        try { await removeFiles(BUCKETS.tab, [path]); } catch { /* 정리 실패는 무시 */ }
      }
      tabFeedback(id, `업로드 실패 — ${translateError(error)}`);
    } finally {
      uploadButton.disabled = false;
    }
    return;
  }

  // ---- 악보 한 장 삭제 ----
  const tabDelete = event.target.closest('[data-tab-delete]');
  if (tabDelete) {
    const id = tabDelete.dataset.song;
    const song = currentRows.find((item) => String(item.id) === id);
    if (!song) return;
    // 곡 삭제와 같은 방식으로 두 번 눌러야 지워집니다.
    if (tabDelete.dataset.armed !== 'yes') {
      tabDelete.dataset.armed = 'yes';
      tabDelete.textContent = '삭제?';
      setTimeout(() => {
        if (!tabDelete.isConnected) return;
        tabDelete.dataset.armed = '';
        tabDelete.textContent = '✕';
      }, 4000);
      return;
    }
    tabDelete.disabled = true;
    const path = tabDelete.dataset.tabDelete;
    try {
      const remaining = (song.tab_paths || []).filter((item) => item !== path);
      await updateSong(song.id, { tab_paths: remaining });
      song.tab_paths = remaining;
      await removeFiles(BUCKETS.tab, [path]);
      refreshTabPanel(song);
      tabFeedback(id, '악보를 삭제했습니다.');
    } catch (error) {
      tabDelete.disabled = false;
      tabFeedback(id, `삭제 실패 — ${translateError(error)}`);
    }
    return;
  }

  const deleteButton = event.target.closest('[data-delete]');
  if (!deleteButton) return;
  // 확인 대화상자 대신 두 번 누르게 합니다 — 실수로 지우는 사고를 막습니다.
  if (deleteButton.dataset.armed !== 'yes') {
    deleteButton.dataset.armed = 'yes';
    deleteButton.textContent = '정말 삭제?';
    setTimeout(() => {
      if (!deleteButton.isConnected) return;
      deleteButton.dataset.armed = '';
      deleteButton.textContent = '삭제';
    }, 4000);
    return;
  }
  const song = currentRows.find((item) => String(item.id) === deleteButton.dataset.delete);
  if (!song) return;
  deleteButton.disabled = true;
  try {
    await deleteSong(song);
    songFeedback.textContent = `${song.title} 및 관련 파일을 삭제했습니다.`;
    await renderSongs();
  } catch (error) {
    deleteButton.disabled = false;
    songFeedback.textContent = `삭제 실패 — ${translateError(error)}`;
  }
});

document.querySelector('#song-table').addEventListener('change', async (event) => {
  if (!event.target.dataset.assign) return;
  const select = event.target;
  const song = currentRows.find((item) => String(item.id) === select.dataset.assign);
  if (!song) return;
  const previous = song.session;
  const next = select.value;
  select.disabled = true;
  try {
    await updateSong(song.id, { session: next });
    song.session = next;
    songFeedback.textContent = `${song.title}의 연습곡 세션이 변경되었습니다.`;
  } catch (error) {
    select.value = previous;
    // songs.session 에 CHECK 제약이 걸려 있으면 '편곡/자작곡'(original) 이 거부됩니다.
    const constraint = /check constraint|violates|22P02|23514/i.test(error?.message || '') || error?.code === '23514';
    songFeedback.textContent = constraint && next === 'original'
      ? '변경 실패 — 서버 DB의 songs.session 제약에 original 값이 없습니다. docs/TAB-SHEETS.md 의 SQL 을 한 번 실행해주세요.'
      : `변경 실패 — ${translateError(error)}`;
  } finally {
    select.disabled = false;
  }
});

document.querySelector('#admin-song-pagination').addEventListener('click', (event) => {
  const button = event.target.closest('[data-admin-page]');
  if (!button) return;
  adminSongPage += button.dataset.adminPage === 'next' ? 1 : -1;
  renderSongs();
});

const scheduleForm = document.querySelector('#schedule-form'); const schedule = loadJson(SCHEDULE_KEY, {});
scheduleForm.date.value = schedule.date || ''; scheduleForm.venue.value = schedule.venue || ''; scheduleForm.note.value = schedule.note || '';
scheduleForm.addEventListener('submit', (e) => { e.preventDefault(); saveJson(SCHEDULE_KEY, Object.fromEntries(new FormData(scheduleForm))); const button = document.querySelector('#schedule-save-button'); button.textContent = '저장됨 ✓'; button.classList.add('saved'); document.querySelector('#schedule-feedback').textContent = '합주 일정이 저장되었습니다.'; });
scheduleForm.addEventListener('input', () => { const button = document.querySelector('#schedule-save-button'); button.textContent = '일정 저장'; button.classList.remove('saved'); document.querySelector('#schedule-feedback').textContent = ''; });
document.querySelector('#notice-form').addEventListener('submit', (e) => { e.preventDefault(); const form = e.currentTarget; const notices = loadJson(NOTICE_KEY, []); notices.unshift({ ...Object.fromEntries(new FormData(form)), createdAt: new Date().toISOString() }); saveJson(NOTICE_KEY, notices.slice(0, 20)); form.reset(); });
function escapeHtml(value = '') { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

(async () => {
  const session = await requireLogin('관리자 계정으로 로그인해주세요.');
  mountSignOut(session);
  await renderSongs();
})();

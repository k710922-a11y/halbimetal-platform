import './portal.css';
import './rehearsal.css';
import './setlist-pagination.css';
import './schedule-feedback.css';
import './song-library.css';
import {
  BUCKETS, createSong, deleteSong, formatBytes, listSongs, loadJson,
  publicUrl, removeFiles, saveJson, signedAudioUrl, updateSong, uploadFile,
} from './db.js';
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
  const coverFile = songForm.cover.files[0] || null;
  const tabFiles = Array.from(songForm.tabs.files || []);
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

    if (coverFile) {
      showProgress(`커버 업로드 — ${coverFile.name}`, 0);
      record.cover_path = await uploadFile(BUCKETS.cover, coverFile, (r) => showProgress(`커버 업로드 — ${coverFile.name}`, r));
      uploaded.push([BUCKETS.cover, record.cover_path]);
    }

    for (const [index, file] of tabFiles.entries()) {
      showProgress(`악보 업로드 ${index + 1}/${tabFiles.length} — ${file.name}`, 0);
      // eslint-disable-next-line no-await-in-loop
      const path = await uploadFile(BUCKETS.tab, file, (r) => showProgress(`악보 업로드 ${index + 1}/${tabFiles.length} — ${file.name}`, r));
      uploaded.push([BUCKETS.tab, path]);
      record.tab_paths.push(path);
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

function fileCell(song) {
  const tabs = song.tab_paths || [];
  const tabLinks = tabs.map((path, index) => `<a href="${publicUrl(BUCKETS.tab, path)}" target="_blank" rel="noopener noreferrer">악보${index + 1}</a>`).join(' ');
  if (!song.audio_path) {
    return `<small>음원 없음</small>${tabs.length ? `<div class="tab-links">${tabLinks}</div>` : ''}`;
  }
  return `<button type="button" class="play-button" data-play="${song.id}">▶ 재생</button>
    <small>${escapeHtml(song.audio_name || '음원')}<br>${formatDuration(song.duration)} · ${formatBytes(song.audio_size)}</small>
    ${tabs.length ? `<div class="tab-links">${tabLinks}</div>` : ''}`;
}

function rowHtml(song) {
  const cover = publicUrl(BUCKETS.cover, song.cover_path);
  return `<tr>
    <td><div class="song-cell">${cover ? `<img class="song-cover" src="${cover}" alt="" loading="lazy">` : '<span class="song-cover song-cover--empty">♪</span>'}<div><b>${escapeHtml(song.artist)} — ${escapeHtml(song.title)}</b><small>${escapeHtml(song.album || '앨범 정보 없음')}</small></div></div></td>
    <td><select class="session-select" data-assign="${song.id}" aria-label="${escapeHtml(song.title)} 연습곡 세션"><option value="unassigned" ${!song.session || song.session === 'unassigned' ? 'selected' : ''}>미분류</option><option value="vocal" ${song.session === 'vocal' ? 'selected' : ''}>보컬 연습/공연곡</option><option value="wishlist" ${song.session === 'wishlist' ? 'selected' : ''}>Wish List</option></select></td>
    <td>${escapeHtml(song.song_key || '—')}</td>
    <td>${fileCell(song)}</td>
    <td><div class="progress"><i style="width:${song.progress}%"></i></div><small>${song.progress}%</small></td>
    <td><button type="button" class="delete-button" data-delete="${song.id}">삭제</button></td>
  </tr>`;
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
  select.disabled = true;
  try {
    await updateSong(song.id, { session: select.value });
    song.session = select.value;
    songFeedback.textContent = `${song.title}의 연습곡 세션이 변경되었습니다.`;
  } catch (error) {
    select.value = previous;
    songFeedback.textContent = `변경 실패 — ${translateError(error)}`;
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

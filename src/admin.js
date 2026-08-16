import './portal.css';
import './rehearsal.css';
import './setlist-pagination.css';
import './schedule-feedback.css';
import { addSong, deleteSong, formatBytes, getSongs, loadJson, saveJson, updateSong } from './db.js';
import { extractAudioMetadata, formatDuration } from './audio-metadata.js';

const CONTENT_KEY = 'halbi.content';
const SCHEDULE_KEY = 'halbi.schedule';
const NOTICE_KEY = 'halbi.notices';
const ADMIN_PAGE_SIZE = 5;
let adminSongPage = 1;
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

const songForm = document.querySelector('#song-form');
let parsedAudio = null;
songForm.audio.addEventListener('change', async () => {
  const file = songForm.audio.files[0];
  parsedAudio = file ? await extractAudioMetadata(file) : null;
  if (!parsedAudio) return;
  if (parsedAudio.artist && !songForm.artist.value) songForm.artist.value = parsedAudio.artist;
  if (parsedAudio.title && !songForm.title.value) songForm.title.value = parsedAudio.title;
  if (parsedAudio.album && !songForm.album.value) songForm.album.value = parsedAudio.album;
  document.querySelector('#audio-metadata-feedback').textContent = `${parsedAudio.fileName} · ${formatDuration(parsedAudio.duration)} · ${formatBytes(parsedAudio.fileSize)} — 메타데이터만 읽었으며 파일은 저장하지 않습니다.`;
});
songForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const data = new FormData(songForm); const file = data.get('audio');
  const metadata = file?.size ? (parsedAudio || await extractAudioMetadata(file)) : {};
  await addSong({ artist:data.get('artist'), title:data.get('title'), album:data.get('album'), key:data.get('key'), progress:Number(data.get('progress')||0), notes:data.get('notes'), session:'unassigned', ...metadata, createdAt:new Date().toISOString() });
  songForm.reset(); parsedAudio = null; document.querySelector('#audio-metadata-feedback').textContent = ''; adminSongPage = 1; document.querySelector('#song-feedback').textContent = '곡 메타데이터가 추가되었습니다. 오디오 파일은 저장하지 않았습니다.'; renderSongs();
});

async function renderSongs() {
  const songs = (await getSongs()).sort((a,b) => b.id-a.id); document.querySelector('#song-count').textContent = `${songs.length} TRACKS`;
  const totalPages=Math.max(1,Math.ceil(songs.length/ADMIN_PAGE_SIZE));adminSongPage=Math.min(adminSongPage,totalPages);const start=(adminSongPage-1)*ADMIN_PAGE_SIZE;
  document.querySelector('#song-table').innerHTML = songs.slice(start,start+ADMIN_PAGE_SIZE).map((song) => `<tr><td><b>${escapeHtml(song.artist)} — ${escapeHtml(song.title)}</b><small>${escapeHtml(song.album||'앨범 정보 없음')}</small></td><td><select class="session-select" data-assign="${song.id}" aria-label="${escapeHtml(song.title)} 연습곡 세션"><option value="unassigned" ${!song.session||song.session==='unassigned'?'selected':''}>미분류</option><option value="vocal" ${song.session==='vocal'?'selected':''}>보컬 연습/공연곡</option><option value="wishlist" ${song.session==='wishlist'?'selected':''}>Wish List</option></select></td><td>${escapeHtml(song.key||'—')}</td><td><b>${escapeHtml(song.fileName||'직접 입력')}</b><small>${formatDuration(song.duration)} · ${escapeHtml(song.fileType||'—')} · ${formatBytes(song.fileSize)}</small></td><td><div class="progress"><i style="width:${song.progress}%"></i></div><small>${song.progress}%</small></td><td><button class="delete-button" data-delete="${song.id}">삭제</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">등록된 곡이 없습니다.</td></tr>';
  document.querySelector('#admin-song-pagination').innerHTML=songs.length>ADMIN_PAGE_SIZE?`<button data-admin-page="prev" ${adminSongPage===1?'disabled':''}>← 이전</button><span>${adminSongPage} / ${totalPages}</span><button data-admin-page="next" ${adminSongPage===totalPages?'disabled':''}>다음 →</button>`:'';
}
document.querySelector('#song-table').addEventListener('click', async (e) => { if(e.target.dataset.delete){ await deleteSong(Number(e.target.dataset.delete)); renderSongs(); } });
document.querySelector('#song-table').addEventListener('change', async (e) => {
  if (!e.target.dataset.assign) return;
  const songs = await getSongs();
  const song = songs.find((item) => item.id === Number(e.target.dataset.assign));
  if (!song) return;
  song.session = e.target.value;
  await updateSong(song);
  document.querySelector('#song-feedback').textContent = `${song.title}의 연습곡 세션이 변경되었습니다.`;
});
document.querySelector('#admin-song-pagination').addEventListener('click',(event)=>{const button=event.target.closest('[data-admin-page]');if(!button)return;adminSongPage+=button.dataset.adminPage==='next'?1:-1;renderSongs();});

const scheduleForm = document.querySelector('#schedule-form'); const schedule = loadJson(SCHEDULE_KEY, {});
scheduleForm.date.value=schedule.date||''; scheduleForm.venue.value=schedule.venue||''; scheduleForm.note.value=schedule.note||'';
scheduleForm.addEventListener('submit',(e)=>{e.preventDefault();saveJson(SCHEDULE_KEY,Object.fromEntries(new FormData(scheduleForm)));const button=document.querySelector('#schedule-save-button');button.textContent='저장됨 ✓';button.classList.add('saved');document.querySelector('#schedule-feedback').textContent='합주 일정이 저장되었습니다.';});
scheduleForm.addEventListener('input',()=>{const button=document.querySelector('#schedule-save-button');button.textContent='일정 저장';button.classList.remove('saved');document.querySelector('#schedule-feedback').textContent='';});
document.querySelector('#notice-form').addEventListener('submit',(e)=>{e.preventDefault();const form=e.currentTarget;const notices=loadJson(NOTICE_KEY,[]);notices.unshift({...Object.fromEntries(new FormData(form)),createdAt:new Date().toISOString()});saveJson(NOTICE_KEY,notices.slice(0,20));form.reset();});
function escapeHtml(value=''){const div=document.createElement('div');div.textContent=value;return div.innerHTML;}
renderSongs();

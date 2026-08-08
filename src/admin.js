import './portal.css';
import './rehearsal.css';
import './setlist-pagination.css';
import { addSong, deleteSong, formatBytes, getSongs, loadJson, saveJson, updateSong } from './db.js';

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
contentForm.innerHTML = sections.map(([id, label, title, body]) => `<fieldset class="editor-card"><h3>${label}</h3><label>제목<input name="${id}.title" value="${escapeHtml(savedContent[id]?.title || title)}"></label><label>본문<textarea name="${id}.body" rows="4">${escapeHtml(savedContent[id]?.body || body)}</textarea></label></fieldset>`).join('');
contentForm.addEventListener('submit', (event) => {
  event.preventDefault(); const data = new FormData(contentForm); const content = {};
  sections.forEach(([id]) => { content[id] = { title: data.get(`${id}.title`), body: data.get(`${id}.body`) }; });
  saveJson(CONTENT_KEY, content); document.querySelector('#content-feedback').textContent = '공개 페이지 콘텐츠가 저장되었습니다.';
});

const songForm = document.querySelector('#song-form');
songForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const data = new FormData(songForm); const file = data.get('audio');
  await addSong({ artist:data.get('artist'), title:data.get('title'), album:data.get('album'), bpm:data.get('bpm'), key:data.get('key'), progress:Number(data.get('progress')||0), notes:data.get('notes'), session:'unassigned', file:file?.size ? file : null, fileName:file?.name||'', fileType:file?.type||'', fileSize:file?.size||0, createdAt:new Date().toISOString() });
  songForm.reset(); adminSongPage = 1; document.querySelector('#song-feedback').textContent = '곡이 로컬 DB에 추가되었습니다.'; renderSongs();
});

async function renderSongs() {
  const songs = (await getSongs()).sort((a,b) => b.id-a.id); document.querySelector('#song-count').textContent = `${songs.length} TRACKS`;
  const totalPages=Math.max(1,Math.ceil(songs.length/ADMIN_PAGE_SIZE));adminSongPage=Math.min(adminSongPage,totalPages);const start=(adminSongPage-1)*ADMIN_PAGE_SIZE;
  document.querySelector('#song-table').innerHTML = songs.slice(start,start+ADMIN_PAGE_SIZE).map((song) => `<tr><td><b>${escapeHtml(song.artist)} — ${escapeHtml(song.title)}</b><small>${escapeHtml(song.album||'앨범 정보 없음')}</small></td><td><select class="session-select" data-assign="${song.id}" aria-label="${escapeHtml(song.title)} 연습곡 세션"><option value="unassigned" ${!song.session||song.session==='unassigned'?'selected':''}>미분류</option><option value="vocal" ${song.session==='vocal'?'selected':''}>보컬 연습/공연곡</option><option value="wishlist" ${song.session==='wishlist'?'selected':''}>Wish List</option></select></td><td>${song.bpm||'—'} BPM · ${escapeHtml(song.key||'—')}</td><td>${song.file ? `<audio controls src="${URL.createObjectURL(song.file)}"></audio><small>${escapeHtml(song.fileName)} · ${formatBytes(song.fileSize)}</small>`:'파일 없음'}</td><td><div class="progress"><i style="width:${song.progress}%"></i></div><small>${song.progress}%</small></td><td><button class="delete-button" data-delete="${song.id}">삭제</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">등록된 곡이 없습니다.</td></tr>';
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
scheduleForm.addEventListener('submit',(e)=>{e.preventDefault();saveJson(SCHEDULE_KEY,Object.fromEntries(new FormData(scheduleForm)));});
document.querySelector('#notice-form').addEventListener('submit',(e)=>{e.preventDefault();const form=e.currentTarget;const notices=loadJson(NOTICE_KEY,[]);notices.unshift({...Object.fromEntries(new FormData(form)),createdAt:new Date().toISOString()});saveJson(NOTICE_KEY,notices.slice(0,20));form.reset();});
function escapeHtml(value=''){const div=document.createElement('div');div.textContent=value;return div.innerHTML;}
renderSongs();

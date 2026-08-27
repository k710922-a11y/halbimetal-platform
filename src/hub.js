import './portal.css';
import './rehearsal.css';
import './setlist-pagination.css';
import './news-board.css';
import './schedule-feedback.css';
import './song-library.css';
import { BUCKETS, fetchAllSongs, formatBytes, loadJson, publicUrl, saveJson, signedAudioUrl } from './db.js';
import { formatDuration } from './audio-metadata.js';
import { mountSignOut, requireLogin, translateError } from './auth.js';

const SCHEDULE_KEY = 'halbi.schedule'; const NOTICE_KEY = 'halbi.notices'; const POSTS_KEY = 'halbi.posts';
const NEWS_PAGE_SIZE = 5; let newsItems = []; let newsFilter = 'all'; let newsPage = 1;
const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
function updateClock() { const now = new Date(); document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(now); document.querySelector('#clock-time').textContent = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); } updateClock(); setInterval(updateClock, 30000);
const schedule = loadJson(SCHEDULE_KEY, {}); if (schedule.date) { document.querySelector('#rehearsal-date').textContent = dateFmt.format(new Date(schedule.date)); } document.querySelector('#rehearsal-venue').textContent = schedule.venue || '장소를 등록해주세요.'; document.querySelector('#rehearsal-note').textContent = schedule.note || '';

const PAGE_SIZE = 10;
const sessionPages = { vocal: 1, wishlist: 1 };
const sessionSongs = { vocal: [], wishlist: [] };
const player = document.querySelector('#hub-player');
const playerLabel = document.querySelector('#hub-player-label');

function songRows(songs, startIndex, emptyMessage) {
  return songs.map((song, i) => {
    const cover = publicUrl(BUCKETS.cover, song.cover_path);
    const tabs = (song.tab_paths || []).map((path, index) => `<a href="${publicUrl(BUCKETS.tab, path)}" target="_blank" rel="noopener noreferrer">악보${index + 1}</a>`).join(' ');
    return `<div class="setlist-row">
      <span class="track-index">${String(startIndex + i + 1).padStart(2, '0')}</span>
      ${cover ? `<img class="track-cover" src="${cover}" alt="" loading="lazy">` : ''}
      <div class="track-title"><b>${esc(song.title)}</b><small>${esc(song.artist)}${song.album ? ` · ${esc(song.album)}` : ''}</small>${tabs ? `<span class="tab-links">${tabs}</span>` : ''}</div>
      <span class="track-meta">${esc(song.song_key || '—')} · ${formatDuration(song.duration)}${song.audio_size ? ` · ${formatBytes(song.audio_size)}` : ''}</span>
      ${song.audio_path ? `<button type="button" class="play-button" data-play="${song.id}">▶</button>` : '<span class="play-button play-button--empty">—</span>'}
    </div>`;
  }).join('') || `<p class="empty">${emptyMessage}</p>`;
}

function renderSession(name, listId, pagerId, emptyMessage) {
  const songs = sessionSongs[name];
  const totalPages = Math.max(1, Math.ceil(songs.length / PAGE_SIZE));
  sessionPages[name] = Math.min(sessionPages[name], totalPages);
  const start = (sessionPages[name] - 1) * PAGE_SIZE;
  document.querySelector(listId).innerHTML = songRows(songs.slice(start, start + PAGE_SIZE), start, emptyMessage);
  document.querySelector(pagerId).innerHTML = songs.length > PAGE_SIZE
    ? `<button data-session="${name}" data-page="prev" ${sessionPages[name] === 1 ? 'disabled' : ''}>← 이전</button><span>${sessionPages[name]} / ${totalPages}</span><button data-session="${name}" data-page="next" ${sessionPages[name] === totalPages ? 'disabled' : ''}>다음 →</button>`
    : '';
}

let allSongs = [];
async function renderSetlist() {
  try {
    allSongs = (await fetchAllSongs()).sort((a, b) => (b.progress || 0) - (a.progress || 0));
  } catch (error) {
    document.querySelector('#cover-vocal-list').innerHTML = `<p class="empty">목록을 불러오지 못했습니다 — ${esc(translateError(error))}</p>`;
    return;
  }
  sessionSongs.vocal = allSongs.filter((song) => song.session === 'vocal');
  sessionSongs.wishlist = allSongs.filter((song) => song.session === 'wishlist');
  document.querySelector('#hub-song-count').textContent = `${sessionSongs.vocal.length + sessionSongs.wishlist.length} TRACKS`;
  renderSession('vocal', '#cover-vocal-list', '#vocal-pagination', 'Admin에서 보컬 연습/공연곡을 선택해주세요.');
  renderSession('wishlist', '#wishlist-list', '#wishlist-pagination', 'Admin에서 Wish List 곡을 선택해주세요.');
}

document.querySelector('#setlist').addEventListener('click', async (event) => {
  const playButton = event.target.closest('[data-play]');
  if (playButton) {
    const song = allSongs.find((item) => String(item.id) === playButton.dataset.play);
    if (!song) return;
    playButton.disabled = true;
    try {
      // 음원 버킷이 비공개라 재생할 때마다 서명 URL 을 새로 받습니다.
      player.src = await signedAudioUrl(song.audio_path);
      player.hidden = false;
      playerLabel.textContent = `${song.artist} — ${song.title}`;
      await player.play();
    } catch (error) {
      playerLabel.textContent = `재생 실패 — ${translateError(error)}`;
    } finally {
      playButton.disabled = false;
    }
    return;
  }
  const button = event.target.closest('[data-page]');
  if (!button) return;
  sessionPages[button.dataset.session] += button.dataset.page === 'next' ? 1 : -1;
  renderSession(
    button.dataset.session,
    button.dataset.session === 'vocal' ? '#cover-vocal-list' : '#wishlist-list',
    button.dataset.session === 'vocal' ? '#vocal-pagination' : '#wishlist-pagination',
    button.dataset.session === 'vocal' ? 'Admin에서 보컬 연습/공연곡을 선택해주세요.' : 'Admin에서 Wish List 곡을 선택해주세요.',
  );
});

function renderNotices() { const notices = loadJson(NOTICE_KEY, []); document.querySelector('#notice-list').innerHTML = notices.map((n) => `<article class="notice"><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><time>${new Date(n.createdAt).toLocaleString('ko-KR')}</time></article>`).join('') || '<p class="empty">등록된 공지가 없습니다.</p>'; }
function renderPosts() { const posts = loadJson(POSTS_KEY, []); document.querySelector('#post-list').innerHTML = posts.map((p) => `<article class="post"><b>${esc(p.author)}</b><p>${esc(p.message)}</p><time>${new Date(p.createdAt).toLocaleString('ko-KR')}</time></article>`).join('') || '<p class="empty">첫 메시지를 남겨보세요.</p>'; }
function renderNews() { const items = newsFilter === 'all' ? newsItems : newsItems.filter((item) => item.category === newsFilter); const totalPages = Math.max(1, Math.ceil(items.length / NEWS_PAGE_SIZE)); newsPage = Math.min(newsPage, totalPages); const start = (newsPage - 1) * NEWS_PAGE_SIZE; document.querySelector('#news-list').innerHTML = items.slice(start, start + NEWS_PAGE_SIZE).map((item) => `<a class="news-card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span class="news-type">${item.category === 'opportunity' ? 'GIG / OPPORTUNITY' : 'METAL / HARD ROCK'}</span><h3>${esc(item.title)}</h3><footer><span>${esc(item.source)}</span><time>${item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('ko-KR') : '날짜 미상'}</time></footer></a>`).join('') || '<p class="news-loading">현재 표시할 소식이 없습니다. 자동 수집이 실행되면 업데이트됩니다.</p>'; document.querySelector('#news-pagination').innerHTML = items.length > NEWS_PAGE_SIZE ? `<button data-news-page="prev" ${newsPage === 1 ? 'disabled' : ''}>← 이전</button><span>${newsPage} / ${totalPages}</span><button data-news-page="next" ${newsPage === totalPages ? 'disabled' : ''}>다음 →</button>` : ''; }
async function loadNews() { try { const response = await fetch('./data/metal-news.json', { cache: 'no-store' }); if (!response.ok) throw new Error('news fetch failed'); const data = await response.json(); newsItems = Array.isArray(data.items) ? data.items : []; document.querySelector('#news-updated').textContent = data.generatedAt ? `업데이트 ${new Date(data.generatedAt).toLocaleString('ko-KR')}` : '첫 수집 대기 중'; renderNews(); } catch { document.querySelector('#news-updated').textContent = '업데이트 확인 실패'; renderNews(); } }
document.querySelector('.news-toolbar').addEventListener('click', (event) => { const button = event.target.closest('[data-news-filter]'); if (!button) return; newsFilter = button.dataset.newsFilter; newsPage = 1; document.querySelectorAll('[data-news-filter]').forEach((item) => item.classList.toggle('active', item === button)); renderNews(); });
document.querySelector('#news-pagination').addEventListener('click', (event) => { const button = event.target.closest('[data-news-page]'); if (!button) return; newsPage += button.dataset.newsPage === 'next' ? 1 : -1; renderNews(); });
document.querySelector('#post-form').addEventListener('submit', (e) => { e.preventDefault(); const form = e.currentTarget; const posts = loadJson(POSTS_KEY, []); posts.unshift({ ...Object.fromEntries(new FormData(form)), createdAt: new Date().toISOString() }); saveJson(POSTS_KEY, posts.slice(0, 50)); form.reset(); renderPosts(); });
function esc(value = '') { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

renderNotices();
renderPosts();
loadNews();

(async () => {
  const session = await requireLogin('멤버 계정으로 로그인하면 연습곡 음원을 들을 수 있습니다.');
  mountSignOut(session);
  await renderSetlist();
})();

// =============================================================================
// 데이터 계층 — 브라우저 IndexedDB → 자체 호스팅 Supabase
//
// 설계 원칙 (서버 이전에서 얻은 교훈)
//   DB 에는 **버킷 안의 경로만** 저장하고 전체 URL 은 저장하지 않습니다.
//   URL 을 통째로 넣으면 나중에 도메인이 바뀔 때 DB 를 전부 치환해야 합니다.
//   화면에서 필요할 때 SUPABASE_URL 과 합치거나 서명 URL 을 발급합니다.
// =============================================================================
import { ANON_KEY, BUCKETS, SUPABASE_URL, supabase } from './supabase.js';

const TABLE = 'songs';

function requireClient() {
  if (!supabase) throw new Error('Supabase 설정이 없습니다. 환경변수를 확인해주세요.');
  return supabase;
}

// ---- 곡 목록 ---------------------------------------------------------------

/**
 * 서버에서 한 페이지만 가져옵니다. 목록이 아무리 길어져도 브라우저는
 * 항상 pageSize 개만 받습니다.
 * @returns {Promise<{rows: object[], total: number, page: number, totalPages: number}>}
 */
export async function listSongs({ page = 1, pageSize = 10, session = null } = {}) {
  const client = requireClient();
  const run = async (targetPage) => {
    let query = client.from(TABLE).select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (session) query = query.eq('session', session);
    const from = (targetPage - 1) * pageSize;
    return query.range(from, from + pageSize - 1);
  };

  let current = page;
  let { data, error, count } = await run(current);
  // 마지막 페이지에서 곡을 지우면 범위를 벗어날 수 있습니다(PostgREST 416). 1페이지로 되돌립니다.
  if (error && (error.code === 'PGRST103' || /range/i.test(error.message || ''))) {
    current = 1;
    ({ data, error, count } = await run(current));
  }
  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: data ?? [],
    total,
    page: current,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** 곡 수가 적으므로(≤50 기준) 허브는 한 번에 받아 클라이언트에서 나눕니다. */
export async function fetchAllSongs(limit = 500) {
  const { data, error } = await requireClient()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function createSong(fields) {
  const { data, error } = await requireClient().from(TABLE).insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function updateSong(id, patch) {
  const { data, error } = await requireClient().from(TABLE).update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/** 행을 지우기 전에 저장소 파일부터 지웁니다. 순서를 바꾸면 고아 파일이 남습니다. */
export async function deleteSong(song) {
  const client = requireClient();
  await removeFiles(BUCKETS.audio, song.audio_path ? [song.audio_path] : []);
  await removeFiles(BUCKETS.cover, song.cover_path ? [song.cover_path] : []);
  await removeFiles(BUCKETS.tab, song.tab_paths || []);
  const { error } = await client.from(TABLE).delete().eq('id', song.id);
  if (error) throw error;
}

// ---- 파일 ------------------------------------------------------------------

function extensionOf(name = '') {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(name);
  return match ? match[1].toLowerCase() : 'bin';
}

/**
 * 저장소 키는 ASCII 로만 만듭니다.
 * 한글 파일명을 그대로 키로 쓰면 인코딩 문제가 생기기 쉬우므로,
 * 키는 UUID 로 두고 원래 파일명은 DB 컬럼(audio_name)에 남깁니다.
 */
export function storageKey(file) {
  const year = new Date().getFullYear();
  const id = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
  return `${year}/${id}.${extensionOf(file.name)}`;
}

function xhrErrorMessage(xhr) {
  try {
    const body = JSON.parse(xhr.responseText);
    const raw = body.message || body.error || xhr.statusText;
    if (/exceeded the maximum allowed size/i.test(raw)) return '파일이 버킷 용량 제한을 넘었습니다.';
    if (/mime type .* is not supported/i.test(raw)) return '허용되지 않는 파일 형식입니다.';
    return raw;
  } catch {
    return `업로드 실패 (HTTP ${xhr.status})`;
  }
}

/**
 * 진행률이 필요해서 SDK 대신 XHR 로 직접 올립니다.
 * (supabase-js 의 upload 는 진행률 콜백을 주지 않습니다)
 */
export async function uploadFile(bucket, file, onProgress) {
  const client = requireClient();
  const { data } = await client.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('로그인이 만료되었습니다. 새로고침 후 다시 로그인해주세요.');

  const path = storageKey(file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', ANON_KEY);
    xhr.setRequestHeader('x-upsert', 'true');
    if (file.type) xhr.setRequestHeader('content-type', file.type);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve(path);
      } else {
        reject(new Error(xhrErrorMessage(xhr)));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('네트워크 오류로 업로드에 실패했습니다.')));
    xhr.addEventListener('abort', () => reject(new Error('업로드가 취소되었습니다.')));
    xhr.send(file);
  });
}

export async function removeFiles(bucket, paths) {
  if (!paths?.length) return;
  await requireClient().storage.from(bucket).remove(paths);
}

/** 공개 버킷(커버·악보) 전용. 경로가 없으면 빈 문자열. */
export function publicUrl(bucket, path) {
  return path ? `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` : '';
}

/** 비공개 버킷(음원) 전용. 기본 1시간짜리 임시 주소를 발급합니다. */
export async function signedAudioUrl(path, expiresIn = 3600) {
  if (!path) return '';
  const { data, error } = await requireClient().storage.from(BUCKETS.audio).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

// ---- 표시용 도우미 ---------------------------------------------------------

export function formatBytes(bytes = 0) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

// 메뉴 콘텐츠·일정·공지는 아직 브라우저 저장소를 씁니다(이번 작업 범위 밖).
export function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export { BUCKETS };

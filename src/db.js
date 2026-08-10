const DB_NAME = 'halbimetal-band-os';
const DB_VERSION = 2;
const SONGS = 'songs';

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SONGS)) {
        const store = db.createObjectStore(SONGS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('artist', 'artist');
        store.createIndex('title', 'title');
      } else if (request.oldVersion < 2) {
        const store = request.transaction.objectStore(SONGS);
        store.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) return;
          const song = cursor.value;
          delete song.file;
          delete song.bpm;
          cursor.update(song);
          cursor.continue();
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction(mode, action) {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(SONGS, mode);
    const request = action(tx.objectStore(SONGS));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  }));
}

export const getSongs = () => transaction('readonly', (store) => store.getAll());
export const addSong = (song) => transaction('readwrite', (store) => store.add(song));
export const updateSong = (song) => transaction('readwrite', (store) => store.put(song));
export const deleteSong = (id) => transaction('readwrite', (store) => store.delete(id));

export function formatBytes(bytes = 0) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function decodeText(bytes, encoding = 3) {
  if (!bytes.length) return '';
  if (encoding === 0) return new TextDecoder('windows-1252').decode(bytes).replace(/\0+$/g, '');
  if (encoding === 1 || encoding === 2) {
    const littleEndian = encoding === 1 && bytes[0] === 0xff && bytes[1] === 0xfe;
    const hasBom = encoding === 1 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff));
    return new TextDecoder(littleEndian ? 'utf-16le' : 'utf-16be').decode(bytes.slice(hasBom ? 2 : 0)).replace(/\0+$/g, '');
  }
  return new TextDecoder().decode(bytes).replace(/\0+$/g, '');
}

function syncSafe(bytes) {
  return ((bytes[0] & 0x7f) << 21) | ((bytes[1] & 0x7f) << 14) | ((bytes[2] & 0x7f) << 7) | (bytes[3] & 0x7f);
}

function parseId3(buffer) {
  const bytes = new Uint8Array(buffer);
  if (String.fromCharCode(...bytes.slice(0, 3)) !== 'ID3') return {};
  const version = bytes[3];
  const end = Math.min(bytes.length, 10 + syncSafe(bytes.slice(6, 10)));
  const tags = {};
  for (let offset = 10; offset + 10 <= end;) {
    const id = String.fromCharCode(...bytes.slice(offset, offset + 4));
    if (!/^T[A-Z0-9]{3}$/.test(id)) break;
    const size = version === 4 ? syncSafe(bytes.slice(offset + 4, offset + 8)) : new DataView(buffer, offset + 4, 4).getUint32(0);
    if (!size || offset + 10 + size > bytes.length) break;
    const payload = bytes.slice(offset + 10, offset + 10 + size);
    tags[id] = decodeText(payload.slice(1), payload[0]).trim();
    offset += 10 + size;
  }
  return { title: tags.TIT2, artist: tags.TPE1, album: tags.TALB, genre: tags.TCON, track: tags.TRCK };
}

function readDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    const finish = (value = 0) => { URL.revokeObjectURL(url); resolve(Number.isFinite(value) ? Math.round(value) : 0); };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish();
    audio.src = url;
  });
}

export async function extractAudioMetadata(file) {
  return {
    ...parseId3(await file.slice(0, 1024 * 1024).arrayBuffer()),
    fileName: file.name,
    fileType: file.type || file.name.split('.').pop()?.toUpperCase() || '',
    fileSize: file.size,
    duration: await readDuration(file),
  };
}

export function formatDuration(seconds = 0) {
  if (!seconds) return '-';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

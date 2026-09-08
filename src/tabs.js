// =============================================================================
// TAB 악보 — 파트 분류 규칙
//
// 악보 파일은 `halbi-tab` 버킷에 올라가고, DB 에는 경로만 배열로 남습니다.
// 파트(기타·드럼·키보드…)를 따로 저장할 컬럼을 새로 만들면 서버 DB 마이그레이션이
// 필요하므로, **파트를 저장소 경로의 첫 칸에 넣습니다.**
//
//   halbi-tab/guitar/2026/1f0c….pdf   → 기타 악보
//   halbi-tab/drum/2026/9a71….png     → 드럼 악보
//   halbi-tab/2026/6b22….pdf          → (예전 방식) 파트 미지정 → '기타 자료'
//
// 덕분에 기존에 올라간 악보도 그대로 살아 있고, 스키마 변경 없이 파트가 붙습니다.
// =============================================================================

/** 표시 순서 = 무대 순서(현악 → 리듬 → 건반 → 보컬 → 전체). */
export const TAB_INSTRUMENTS = [
  { id: 'guitar', label: '기타', short: 'GTR' },
  { id: 'bass', label: '베이스', short: 'BASS' },
  { id: 'drum', label: '드럼', short: 'DRUM' },
  { id: 'keyboard', label: '키보드', short: 'KEY' },
  { id: 'vocal', label: '보컬', short: 'VOX' },
  { id: 'band', label: '전체 밴드스코어', short: 'BAND' },
  { id: 'etc', label: '기타 자료', short: 'ETC' },
];

/** 파트를 알 수 없는 경로(예전 업로드)는 여기에 모읍니다. */
export const FALLBACK_INSTRUMENT = 'etc';

const BY_ID = new Map(TAB_INSTRUMENTS.map((item) => [item.id, item]));

export function instrumentInfo(id) {
  return BY_ID.get(id) || BY_ID.get(FALLBACK_INSTRUMENT);
}

export function instrumentLabel(id) {
  return instrumentInfo(id).label;
}

/** 경로의 첫 칸이 파트 id 면 그 파트, 아니면 '기타 자료'. */
export function instrumentOf(path = '') {
  const head = String(path).split('/')[0];
  return BY_ID.has(head) ? head : FALLBACK_INSTRUMENT;
}

export function extensionOf(path = '') {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(path);
  return match ? match[1].toLowerCase() : '';
}

/**
 * 악보 경로 배열을 파트별로 묶습니다.
 * 비어 있는 파트는 결과에 넣지 않습니다.
 * @returns {{id:string,label:string,short:string,items:{path:string,index:number,ext:string}[]}[]}
 */
export function groupTabs(paths = []) {
  const buckets = new Map();
  paths.filter(Boolean).forEach((path) => {
    const id = instrumentOf(path);
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id).push(path);
  });
  return TAB_INSTRUMENTS
    .filter((instrument) => buckets.has(instrument.id))
    .map((instrument) => ({
      ...instrument,
      items: buckets.get(instrument.id).map((path, index) => ({
        path,
        index: index + 1,
        ext: extensionOf(path),
      })),
    }));
}

/**
 * 내려받을 때 쓸 파일 이름.
 * 저장소 키는 UUID 라서 그대로 받으면 무슨 악보인지 알 수 없습니다.
 * 한글 파일명은 헤더에서 깨지기 쉬워 ASCII 로만 만듭니다.
 */
export function tabFileName(song, path, index = 1) {
  const instrument = instrumentInfo(instrumentOf(path));
  const ascii = (value = '') => value.normalize('NFKD').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  const stem = [ascii(song?.artist), ascii(song?.title), instrument.short, index]
    .filter((part) => part !== '' && part !== undefined && part !== null)
    .join('-');
  const ext = extensionOf(path);
  return `${stem || 'halbi-tab'}${ext ? `.${ext}` : ''}`;
}

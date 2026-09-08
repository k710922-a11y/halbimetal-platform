# TAB 악보 · 편곡/자작곡 세션 · HUB 접근

## 1. TAB 악보는 어디에 저장되나

악보 파일은 기존과 같이 공개 버킷 `halbi-tab` 에 올라가고, DB 의 `songs.tab_paths`(text[])
에는 **버킷 안 경로만** 저장됩니다. 파트(기타·드럼·키보드…)를 담을 컬럼을 새로 만들면 서버 DB
마이그레이션이 필요하므로, **파트를 경로의 첫 칸에** 넣습니다.

```
halbi-tab/guitar/2026/1f0c….pdf     → 기타
halbi-tab/drum/2026/9a71….png       → 드럼
halbi-tab/keyboard/2026/44b1….pdf   → 키보드
halbi-tab/2026/6b22….pdf            → (예전 업로드) 파트 미지정 → '기타 자료'로 표시
```

덕분에 **스키마 변경 없이** 파트가 붙고, 이전에 올린 악보도 그대로 보입니다.
파트 목록은 `src/tabs.js` 의 `TAB_INSTRUMENTS` 한 곳에서만 관리합니다.

다운로드는 Supabase Storage 의 `?download=파일이름` 을 사용합니다. 허브와 사이트가 서로 다른
도메인이라 `<a download>` 속성만으로는 브라우저가 파일을 저장하지 않고 열어버리기 때문입니다.
파일 이름은 `아티스트-곡명-파트-번호.확장자` 형태로 ASCII 로만 만듭니다.

## 2. 사용 방법

**Admin (`/admin.html`)**

- 새 곡 등록: `타브 악보 파트` 를 고르고 악보 파일을 함께 올립니다.
- 이미 등록된 곡: 곡 목록의 **TAB 관리** 버튼 → 파트 선택 → 파일 선택 → `악보 생성 · 업로드`.
  같은 패널에서 악보를 파트별로 내려받거나 `✕` 를 두 번 눌러 삭제할 수 있습니다.

**Member Hub (`/hub.html`)**

- 곡 카드의 재생(▶) 버튼 **바로 아래** 에 `TAB` 버튼이 있습니다. 숫자는 등록된 악보 수입니다.
- 누르면 카드 안에서 파트별 목록이 펼쳐지고, 링크를 누르면 파일이 내려받아집니다.
- 보컬 연습/공연곡, Wish List, 편곡/자작곡 세 목록 모두 동일하게 동작합니다.

## 3. 편곡/자작곡 세션 (선택 작업)

`songs.session` 에 새 값 `original` 을 씁니다. 컬럼이 그냥 `text` 라면 아무것도 할 필요가 없습니다.
Admin 에서 세션을 `편곡/자작곡` 으로 바꿀 때 `songs.session 제약에 original 값이 없습니다` 라는
메시지가 뜨면, 서버 Supabase(Studio → SQL Editor)에서 아래를 한 번 실행해주세요.

```sql
-- 제약 이름은 환경에 따라 다를 수 있습니다. 먼저 확인:
--   select conname from pg_constraint where conrelid = 'public.songs'::regclass;
alter table public.songs drop constraint if exists songs_session_check;
alter table public.songs
  add constraint songs_session_check
  check (session in ('unassigned', 'vocal', 'wishlist', 'original'));
```

## 4. HUB 버튼을 눌렀을 때 Cloudflare 로그인 건너뛰기

이 부분은 코드가 아니라 **Cloudflare Zero Trust 설정**입니다. 저장소를 배포해도 바뀌지 않습니다.

1. Cloudflare 대시보드 → **Zero Trust** → **Access → Applications**
2. `halbimetal.jawsweb.site` 를 감싸는 애플리케이션을 엽니다.
3. 경로가 사이트 전체(`halbimetal.jawsweb.site`)로 잡혀 있으면, **Admin 전용으로 좁힙니다**:
   - 이 애플리케이션의 도메인을 `halbimetal.jawsweb.site/admin` (Path = `admin*`) 으로 수정
   - 저장 후 `/hub.html` 은 Access 대상에서 빠집니다.
4. 애플리케이션을 그대로 두고 싶다면, 같은 애플리케이션에 **Bypass** 정책을 추가합니다:
   - Policies → Add a policy → Action: **Bypass**, Include: **Everyone**
   - 단, Bypass 는 애플리케이션 전체에 적용되므로 3번(경로 분리)을 먼저 하는 편이 안전합니다.
5. 반영은 보통 1분 안쪽입니다. 브라우저에서 `halbimetal.jawsweb.site/hub.html` 을 새 시크릿 창으로
   열어 로그인 화면 없이 뜨는지 확인합니다. 이미 받은 Access 쿠키가 남아 있으면
   `https://<팀이름>.cloudflareaccess.com/cdn-cgi/access/logout` 으로 지울 수 있습니다.

`/hub.html` 자체는 Supabase 멤버 로그인(`src/auth.js`)이 계속 지키고, 음원은 비공개 버킷의 서명
URL 로만 재생되므로 Access 를 풀어도 곡·음원이 외부에 노출되지 않습니다. 악보 버킷(`halbi-tab`)은
공개 버킷이라 링크를 아는 사람은 파일을 받을 수 있습니다 — 악보도 잠가야 한다면 버킷을 비공개로
바꾸고 `downloadUrl` 을 `createSignedUrl` 로 교체하면 됩니다.

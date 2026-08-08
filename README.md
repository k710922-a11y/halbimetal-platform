# HALBI METAL Platform

> Age is Just a Rhythm. Metal is Eternal.

HALBI METAL의 공식 웹 플랫폼입니다. v0.1은 Public Landing Page와 GitHub Pages 기반의 무료 초기 배포 흐름에 집중합니다.

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm ci
npm run dev
```

검증 및 프로덕션 빌드:

```bash
npm run check
```

빌드 결과는 `dist/`에 생성됩니다.

## 정보 구조

- Home / Hero
- About
- Members
- Recruitment
- Repertoire
- Media
- Partnership & Contact
- Admin Control Room (`/admin.html`)
- Member Hub / BAND OS (`/hub.html`)

## v0.2 로컬 데이터 구조

GitHub Pages는 정적 호스팅이므로 현재 프로토타입은 브라우저 저장소를 사용합니다.

- 메뉴 콘텐츠, 일정, RSVP, 공지, 멤버 메시지: `localStorage`
- 곡 정보와 MP3 파일 Blob: `IndexedDB`의 `songs` object store

같은 브라우저에서는 Admin에서 입력한 내용이 Public Site와 Member Hub에 반영됩니다. 다른 기기·멤버 간 공유, 로그인과 권한 관리는 Supabase/Postgres 같은 원격 DB와 인증을 연결하는 다음 단계에서 구현합니다.

## 배포 주소

무료 초기 도메인 목표는 `https://halbimetal.github.io`입니다. 이 주소를 사용하려면 GitHub 사용자 또는 조직 이름이 `halbimetal`이고 저장소 이름이 `halbimetal.github.io`여야 합니다. 다른 소유자 계정의 프로젝트 저장소를 쓰면 기본 주소는 `https://<owner>.github.io/<repository>/`입니다. `vite.config.js`가 두 배포 경로를 자동 판별합니다.

GitHub 저장소 Settings → Pages → Source를 **GitHub Actions**로 선택하면 `main` 푸시 시 배포됩니다. `public/CNAME.example`은 설명용이며, `github.io` 주소만 쓸 때 실제 `CNAME` 파일은 필요하지 않습니다.

## 로고

사용자가 제공한 승인 로고 원본 2종을 `public/logos/`에 반영했습니다.

## 문서

- [작업 지침](AGENTS.md)
- [변경 이력](CHANGELOG.md)
- [브랜치 전략](docs/BRANCHING.md)

## 라이선스

코드와 브랜드 자산의 라이선스는 정식 공개 전에 별도로 확정합니다. 현재 모든 권리는 HALBI METAL에 유보됩니다.

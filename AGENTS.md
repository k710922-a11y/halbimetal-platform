# AGENTS.md

## Mission

HALBI METAL의 브랜드 문장 “Age is Just a Rhythm. Metal is Eternal.”을 일관되게 유지하며, 누구나 접근할 수 있는 빠르고 단순한 정적 웹사이트를 만든다.

## Working rules

- 기본 작업 브랜치는 `feature/*`, `fix/*`, `docs/*` 중 하나를 사용한다.
- `main`은 언제나 배포 가능한 상태로 유지한다.
- 변경 전후에 `npm run check`를 실행한다.
- 공개 페이지의 합의된 IA(Home, About, Members, Recruitment, Repertoire, Media, Partnership, Contact)를 임의로 삭제하지 않는다.
- 이메일, 일정, 멤버 이름 등 확정되지 않은 정보는 실제 사실처럼 만들지 않는다.
- 브랜드 로고는 승인된 원본만 `public/logos/`에 추가한다. 생성형 대체 로고를 공식 원본으로 표기하지 않는다.
- 접근 가능한 HTML 구조, 키보드 탐색, 충분한 대비, reduced-motion 설정을 유지한다.
- 의존성 추가는 필요성과 유지비를 설명할 수 있을 때만 한다.
- 변경 사항은 `CHANGELOG.md`의 `Unreleased`에 기록한다.

## Pull requests

- 하나의 PR은 하나의 명확한 목적만 가진다.
- PR 본문에 변경 요약, 확인 방법, 화면 변경 여부를 적는다.
- UI 변경 시 데스크톱과 모바일 화면을 확인한다.
- `test` 워크플로가 성공한 뒤 병합한다.

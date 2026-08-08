# Branch strategy

## 원칙

v0.1은 소규모 팀에 맞춘 가벼운 GitHub Flow를 사용합니다. 장기간 유지되는 `develop` 브랜치는 두지 않습니다. `main`이 유일한 통합·배포 브랜치이며, 모든 변경은 짧은 작업 브랜치와 Pull Request를 거칩니다.

## 브랜치

- `main`: 보호되는 프로덕션 브랜치. 병합 시 GitHub Pages 배포.
- `feature/<topic>`: 새 기능 또는 콘텐츠.
- `fix/<topic>`: 오류 수정.
- `docs/<topic>`: 문서 전용 변경.
- `chore/<topic>`: 빌드·도구·유지보수.

예: `feature/member-recruitment`, `fix/mobile-navigation`.

## 병합 흐름

1. 최신 `main`에서 작업 브랜치를 만든다.
2. 작은 단위로 커밋하고 `npm run check`를 통과시킨다.
3. Pull Request를 열면 test와 preview artifact가 실행된다.
4. 리뷰와 필수 검사를 통과한 뒤 squash merge한다.
5. `main`의 deploy가 GitHub Pages에 반영되는지 확인한다.

## 권장 보호 규칙

- Pull Request 없이 `main` 직접 푸시 금지
- 필수 상태 검사: `test`
- 대화 해결 후 병합
- force push와 branch deletion 금지
- 관리자에게도 규칙 적용

## 릴리스

Semantic Versioning을 사용합니다. 릴리스 시 `CHANGELOG.md`의 Unreleased 내용을 버전 섹션으로 이동하고 `v0.1.0` 형태의 태그와 GitHub Release를 만듭니다.

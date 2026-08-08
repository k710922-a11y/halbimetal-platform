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

## 배포 주소

무료 초기 도메인 목표는 `https://halbimetal.github.io`입니다. 이 주소를 사용하려면 GitHub 사용자 또는 조직 이름이 `halbimetal`이고 저장소 이름이 `halbimetal.github.io`여야 합니다. 다른 소유자 계정의 프로젝트 저장소를 쓰면 기본 주소는 `https://<owner>.github.io/<repository>/`입니다. `vite.config.js`가 두 배포 경로를 자동 판별합니다.

GitHub 저장소 Settings → Pages → Source를 **GitHub Actions**로 선택하면 `main` 푸시 시 배포됩니다. `public/CNAME.example`은 설명용이며, `github.io` 주소만 쓸 때 실제 `CNAME` 파일은 필요하지 않습니다.

## 로고

현재 확인 가능한 원본 첨부가 없어 임시 타이포그래픽 배지를 사용합니다. 승인된 원본은 `public/logos/`에 추가하고 해당 폴더의 안내에 따라 교체합니다.

## 문서

- [작업 지침](AGENTS.md)
- [변경 이력](CHANGELOG.md)
- [브랜치 전략](docs/BRANCHING.md)

## 라이선스

코드와 브랜드 자산의 라이선스는 정식 공개 전에 별도로 확정합니다. 현재 모든 권리는 HALBI METAL에 유보됩니다.

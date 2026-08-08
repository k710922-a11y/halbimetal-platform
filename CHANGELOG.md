# Changelog

이 프로젝트는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식을 따르며 Semantic Versioning을 사용합니다.

## [Unreleased]

### Changed

- 뉴스·공연 게시판을 필터별 5개 단위 페이지로 표시하고 Admin/Hub 헤더에 투명 로고 적용
- Admin 곡 DB를 5곡 단위 페이지로 표시하고 Public 레퍼토리를 지정된 5곡으로 교체
- 연습곡 플레이어를 카드 안에 맞게 축소하고 각 세션을 5곡 단위 페이지로 표시
- Public 헤더 로고를 투명 배경 원본으로 교체하고 메뉴를 수직 중앙 정렬
- Public 헤더의 HUB를 흰색 강조 버튼으로, Admin을 설정 아이콘으로 변경
- Member Hub 연습곡을 메탈 커버의 보컬 연습/공연곡과 Wish List, 편곡/자작곡 TBD로 재구성
- Admin 곡 DB에서 업로드된 곡을 연습곡 세션에 지정하도록 개선
- 각 선택 곡에 저장된 MP3 플레이어 연결

## [0.2.0] - 2026-08-09

### Added

- Metal Injection, Blabbermouth 및 국내 밴드 공연·모집 검색 RSS를 6시간마다 수집하는 GitHub Actions 뉴스봇
- Member Hub 메탈·하드록 뉴스와 아마추어 공연 기회 게시판

- Public 메뉴 콘텐츠 편집이 가능한 Admin Control Room
- IndexedDB 기반 곡·MP3·메타데이터 라이브러리
- 합주 일정, RSVP, 세트리스트, 공지, 멤버 소통을 포함한 Member Hub
- 사용자 제공 HALBI METAL 공식 로고 2종

### Changed

- Public Landing Page에 Admin과 Member Hub 진입 경로 추가

## [0.1.0] - 2026-08-08

### Added

- HALBI METAL Public Landing Page 초기 구조
- 브랜드 메시지와 합의된 정보 구조 반영
- 반응형 내비게이션과 기본 접근성 처리
- GitHub Actions test, preview artifact, Pages deploy 초안
- 저장소 운영 문서와 로고 자산 슬롯

# =============================================================================
# halbimetal-platform 배포용 Dockerfile
#
# 이 파일을 halbimetal-platform 저장소 **최상위**에 넣으세요.
# (Caddyfile, .dockerignore 도 같이)
#
# 2단 빌드입니다.
#   1단계  node:20 에서 Vite 빌드 → dist/ 생성
#   2단계  Caddy 이미지에 dist/ 만 복사 → 정적 서빙
# 결과 이미지는 40MB 안팎이라 미니PC에 부담이 없습니다.
#
# ⚠️ 가장 중요한 주의사항 — GITHUB_REPOSITORY 를 절대 설정하지 마세요
#   vite.config.js 가 이렇게 되어 있습니다:
#       base: repository ? (isUserSite ? '/' : `/${repository}/`) : '/'
#   즉 GITHUB_REPOSITORY 가 있으면 base 가 '/halbimetal-platform/' 이 되고,
#   없으면 '/' 가 됩니다.
#   GitHub Actions 는 이 변수를 자동으로 넣기 때문에 Pages 에서는 서브경로가 맞고,
#   서버에서는 변수가 없으므로 자동으로 루트 경로가 됩니다.
#   → 코드를 고칠 필요가 전혀 없습니다. 대신 Coolify 환경변수에
#     GITHUB_REPOSITORY 를 넣으면 CSS·JS 가 전부 404 가 납니다. 넣지 마세요.
# =============================================================================

# ---- 1단계: 빌드 -------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# 의존성 먼저 복사 → 소스만 바뀐 배포에서는 이 레이어가 캐시돼 빌드가 빨라집니다
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 혹시 상위 환경에서 흘러들어올 경우를 대비해 명시적으로 비웁니다
ENV GITHUB_REPOSITORY=""
RUN npm run build

# 빌드 결과 검증 — 세 페이지가 다 나왔는지 확인하고, 없으면 여기서 실패시킵니다
RUN test -f dist/index.html && test -f dist/admin.html && test -f dist/hub.html \
    && echo "빌드 산출물 확인:" && ls -la dist/

# ---- 2단계: 서빙 -------------------------------------------------------------
FROM caddy:2-alpine

COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

# 설정 문법 오류가 있으면 배포 단계에서 바로 잡히도록 빌드 시점에 검사
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

// =============================================================================
// 로그인 게이트
//
// 음원 버킷이 비공개라서, 재생하려면 서명 URL 을 발급받아야 하고
// 서명 URL 은 로그인한 세션에서만 발급됩니다.
// 그래서 /admin 뿐 아니라 /hub 도 이 게이트를 통과해야 합니다.
// (Cloudflare Access 는 '누가 사이트에 들어오나'를 막고,
//  이 로그인은 '누가 데이터를 만지나'를 막습니다. 역할이 다릅니다.)
// =============================================================================
import './auth.css';
import { isConfigured, supabase } from './supabase.js';

const MESSAGES = {
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증이 아직 끝나지 않았습니다.',
  'Failed to fetch': '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
};

export function translateError(error) {
  if (!error) return '';
  const raw = typeof error === 'string' ? error : (error.message || '알 수 없는 오류');
  return MESSAGES[raw] || raw;
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export async function signOut() {
  await supabase?.auth.signOut();
  location.reload();
}

function overlay(inner) {
  const node = document.createElement('div');
  node.className = 'auth-gate';
  node.innerHTML = inner;
  document.body.append(node);
  return node;
}

function fatal(title, body) {
  overlay(`<div class="auth-card auth-card--fatal">
    <p class="auth-kicker">HALBI METAL</p>
    <h1>${title}</h1>
    <p class="auth-sub">${body}</p>
  </div>`);
  // 설정이 없으면 더 진행할 수 없으므로 영원히 대기하는 Promise 를 돌려줍니다.
  return new Promise(() => {});
}

/**
 * 세션이 있으면 즉시 반환하고, 없으면 로그인 화면을 띄운 뒤 성공할 때까지 기다립니다.
 */
export async function requireLogin(subtitle = '') {
  // supabase 가 null 이면 값이 비었거나 주소 형식이 잘못된 것입니다.
  // 이 상태로 로그인 창을 띄우면 누르는 순간 터지므로 여기서 멈춥니다.
  if (!isConfigured || !supabase) {
    return fatal(
      '서버 설정이 없습니다',
      'Coolify 환경변수 <code>VITE_SUPABASE_URL</code> 과 <code>VITE_SUPABASE_ANON_KEY</code> 를 '
      + '<b>Build Variable 로 체크해서</b> 넣은 뒤 다시 배포해주세요. '
      + '주소는 <code>https://</code> 로 시작하는 전체 주소여야 합니다.',
    );
  }

  const existing = await getSession();
  if (existing) return existing;

  const gate = overlay(`<form class="auth-card" id="auth-form" autocomplete="on">
    <p class="auth-kicker">HALBI METAL</p>
    <h1>MEMBER LOGIN</h1>
    <p class="auth-sub">${subtitle || '멤버 계정으로 로그인해주세요.'}</p>
    <label>이메일<input name="email" type="email" required autocomplete="username" placeholder="you@example.com"></label>
    <label>비밀번호<input name="password" type="password" required autocomplete="current-password"></label>
    <button class="metal-button" type="submit">로그인</button>
    <p class="auth-error" id="auth-error" role="alert" aria-live="polite"></p>
  </form>`);

  const form = gate.querySelector('#auth-form');
  const errorLine = gate.querySelector('#auth-error');
  const button = form.querySelector('button');

  return new Promise((resolve) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorLine.textContent = '';
      button.disabled = true;
      button.textContent = '확인 중…';
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.value.trim(),
        password: form.password.value,
      });
      button.disabled = false;
      button.textContent = '로그인';
      if (error) {
        errorLine.textContent = translateError(error);
        form.password.select();
        return;
      }
      gate.remove();
      resolve(data.session);
    });
  });
}

/** 헤더에 로그아웃 버튼을 붙입니다. */
export function mountSignOut(session) {
  const nav = document.querySelector('.portal-header nav');
  if (!nav || nav.querySelector('.auth-signout')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'auth-signout';
  button.title = session?.user?.email || '';
  button.textContent = '로그아웃';
  button.addEventListener('click', signOut);
  nav.append(button);
}

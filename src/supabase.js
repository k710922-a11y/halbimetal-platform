// =============================================================================
// Supabase 클라이언트 (자체 호스팅 미니PC 서버)
//
// 주소와 키는 빌드할 때 주입됩니다. Coolify 환경변수에 아래 두 개를 넣고
// **"Build Variable" 체크를 반드시 켜세요.** Vite 는 빌드 시점에 값을 코드에
// 박아 넣기 때문에, 런타임 변수로만 넣으면 값이 비어 있는 채로 빌드됩니다.
//
//   VITE_SUPABASE_URL       예) https://api-halbi.jawsweb.site
//   VITE_SUPABASE_ANON_KEY  해당 스택의 anon 키
//
// anon 키는 원래 브라우저에 노출되는 공개 키입니다. 비밀은 RLS 정책이 지킵니다.
// service_role 키는 절대 여기에 넣지 마세요.
// =============================================================================
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
export const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(SUPABASE_URL && ANON_KEY);

// 설정이 없거나 주소가 잘못되면 createClient 가 예외를 던집니다.
// 그대로 두면 모듈이 통째로 죽어서 화면이 백지가 됩니다.
// null 로 떨어뜨려 두면 auth.js 가 "서버 설정이 없습니다" 안내를 띄웁니다.
function makeClient() {
  if (!isConfigured) return null;
  try {
    return createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'halbi.auth',
      },
    });
  } catch (error) {
    console.error('Supabase 클라이언트를 만들지 못했습니다. VITE_SUPABASE_URL 을 확인하세요.', error);
    return null;
  }
}

export const supabase = makeClient();

export const BUCKETS = {
  audio: 'halbi-audio',
  cover: 'halbi-cover',
  tab: 'halbi-tab',
};

# ZZON

캐릭터 페어 프롬프트 모음 사이트 (https://zzon.64bit.kr) · 회원 전용

- 회원가입은 초대 코드가 있어야 해요 (Supabase)
- 회원은 footer 의 `edit` 로 페어/갤러리/세계관을 추가·수정
- 페이지 아래 BGM 플레이어: 회원은 곡 추가, 삭제는 owner 만

## 설정

1. Supabase → SQL Editor 에서 `supabase/setup.sql` 실행 (맨 아래 초대 코드만 바꿔서)
2. Supabase → Authentication → Sign In / Providers → Email → **Confirm email 끄기**
3. 사이트에서 가장 먼저 가입한 계정이 owner 가 됨

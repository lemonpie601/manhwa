# 만화상징사 중간 벼락치기 — Cloudflare Pages 배포

## 폴더
- `index.html` 페이지 전체
- `functions/api/ai.js` AI 호출을 대신하는 서버 함수 (키는 여기서만 씀)
- `src/*.pdf` 원본 자료 (링크 가진 사람은 누구나 받을 수 있음)

## 배포 (둘 중 하나)
드래그해서 올리는 방식은 `functions` 폴더가 안 돌아갈 수 있어요. 아래 방법을 쓰세요.

**A. 터미널**
```
npx wrangler login
npx wrangler pages deploy . --project-name manhwa-midterm
```
(이 README가 있는 폴더에서 실행)

**B. GitHub 연결**: 이 폴더를 저장소로 올리고 Cloudflare Pages에서 연결. 빌드 명령은 비우고, 출력 폴더는 `/`.

## 시크릿 · 변수 (Settings → Variables and Secrets)
| 이름 | 종류 | 값 |
|---|---|---|
| `AI_API_KEY` | Secret | linkapi.ai 키 |
| `AI_MODEL` | Text | 게이트웨이 모델 이름 그대로 |
| `ACCESS_PASSWORD` | Secret | 친구들한테만 알려줄 비밀번호 |
| `AI_BASE_URL` | Text (선택) | 기본 `https://linkapi.ai/v1` |
| `AI_PATH` | Text (선택) | 기본 `/chat/completions` |
| `AI_MAX_TOKENS` | Text (선택) | 기본 `4096` |

넣거나 바꾼 뒤에는 **다시 배포**해야 적용돼요.

## 꼭 할 것
1. linkapi.ai 대시보드에서 **키별 사용 한도**를 걸기.
2. `ACCESS_PASSWORD`는 꼭 설정하기. 비우면 링크 가진 누구나 내 키로 AI를 씀.
3. Cloudflare → Security → WAF → Rate limiting rules에서 `/api/ai` 경로에 IP당 분당 20회 정도 제한 걸기.
4. 키를 이 폴더 파일이나 깃에 절대 적지 않기.

## 진단
배포 후 `https://내주소/api/health?key=접속비밀번호` 를 열면 설정과 게이트웨이 응답을 그대로 보여줘요.

## 안 될 때
- 화면에 "서버에 API 키가 설정되지 않았어요" → `AI_API_KEY`·`AI_MODEL` 확인, 또는 게이트웨이가 키를 거절함(401/403).
- 계속 "연결이 끊겼어요" → 게이트웨이 주소와 경로 확인. 다른 형식이면 `AI_BASE_URL`·`AI_PATH`로 맞추기.

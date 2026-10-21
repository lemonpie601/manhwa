# 만화상징사 중간 벼락치기

## 폴더
- `public/` 화면 (index.html, 원본 PDF)
- `worker/` AI 호출을 대신하는 서버 코드 (키는 여기서만 씀)
- `functions/` Pages로 만들었을 때 쓰는 입구 (worker 코드를 그대로 씀)
- `wrangler.jsonc` Workers로 만들었을 때 쓰는 설정

## 배포
Cloudflare에서 프로젝트를 **Workers**로 만들었는지 **Pages**로 만들었는지에 따라 설정이 달라요.

### Workers (요즘 기본값, 주소가 `*.workers.dev`)
- Settings → Build: 빌드 명령은 비우고, Deploy command는 `npx wrangler deploy`
- 저장소에 `wrangler.jsonc`가 있으니 그대로 인식해요.

### Pages (주소가 `*.pages.dev`)
- Build output directory: `public`
- 빌드 명령은 비움. 저장소 루트의 `functions` 폴더를 자동으로 씀.

## 시크릿 · 변수 (Settings → Variables and Secrets)
| 이름 | 종류 | 값 |
|---|---|---|
| `AI_API_KEY` | Secret | linkapi.ai 키 |
| `AI_MODEL` | Text | 게이트웨이 모델 이름 그대로 |
| `ACCESS_PASSWORD` | Secret | 친구들한테만 알려줄 비밀번호 |
| `AI_BASE_URL` | Text (선택) | 기본 `https://linkapi.ai/v1` |
| `AI_PATH` | Text (선택) | 기본 `/chat/completions` |
| `AI_MAX_TOKENS` | Text (선택) | 기본 `4096` |

넣거나 바꾼 뒤에는 다시 배포해야 적용돼요.

## 진단
`https://내주소/api/health?key=접속비밀번호` 를 열면 설정과 게이트웨이 응답을 그대로 보여줘요.
- 이 주소가 **404**면 서버 코드가 배포되지 않은 것 → 위 배포 설정 확인
- `상태코드 404`가 게이트웨이 응답에 있으면 `AI_BASE_URL`이 틀린 것
- `401`/`403`이면 키 또는 잔액 문제

## 꼭 할 것
1. linkapi.ai에서 키별 사용 한도 걸기
2. `ACCESS_PASSWORD` 꼭 설정하기
3. Security → WAF → Rate limiting으로 `/api/ai`에 IP당 분당 20회 정도 제한
4. 키를 파일이나 깃에 절대 적지 않기


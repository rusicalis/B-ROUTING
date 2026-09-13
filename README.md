# BURNING ROUTINE — GitHub Pages Edition v1.5.2

Cloudflare Worker 서버 의존성을 제거하고 GitHub Pages에서 바로 실행할 수 있도록 변환한 버전입니다.

## 배포
1. 이 폴더의 **내용물 전체**를 GitHub 저장소 루트에 업로드합니다.
2. GitHub 저장소 → **Settings → Pages**로 이동합니다.
3. **Deploy from a branch** → `main` / `/(root)`를 선택하고 저장합니다.
4. 생성된 GitHub Pages 주소를 열면 바로 실행됩니다.

## 저장 방식
- 일정, 완료 기록, 설정, 자동 루틴은 브라우저 `localStorage`에 저장됩니다.
- 서버, Cloudflare KV, VAPID 키가 필요 없습니다.
- 브라우저 데이터 삭제/초기화 시 로컬 기록도 삭제됩니다.

## 알림
서버 Web Push 대신 브라우저 로컬 알림을 사용합니다. **앱이 열려 있거나 실행 중일 때** 일정 시간을 확인하여 알림을 표시합니다. 서버가 없으므로 앱이 완전히 종료된 상태에서 정시 푸시를 보내는 기능은 지원하지 않습니다.

## 운동 데이터
자동 루틴은 공개 운동 데이터에서 `body weight` 운동을 가져오되, 철봉·벤치·벽·문·링·로프·머신 등 외부 기구/고정물이 필요한 운동을 추가 필터링합니다. 기존 요청 기준의 허용 장비는 맨몸·케틀벨·밴드·의자입니다.

## PWA
`manifest.webmanifest`와 `service-worker.js`를 포함하므로 지원 브라우저에서 홈 화면에 설치할 수 있습니다.


## V1.5.2 변경사항
- 앱 아이콘 파일을 별도 `icons/` 폴더 없이 GitHub 저장소 루트에 둘 수 있도록 변경했습니다.
- `index.html`, `manifest.webmanifest`, `service-worker.js`, 로컬 알림 아이콘 경로를 모두 루트 상대경로로 통일했습니다.
- B.R 아이콘 디자인과 기존 자동 루틴·로컬 저장·운동 데이터 필터 기능은 그대로 유지합니다.
- 외부 운동 데이터 오류 시 기본 홈트 운동 fallback 기능도 그대로 유지합니다.

# BURNING ROUTINE 3.0

주 7일 근력 운동과 할 일 관리용 한국어 PWA입니다. 맨몸 + 12kg 케틀벨 1개 + 60cm 일자 밴드를 사용합니다.

[앱 실행](https://rusicalis.github.io/B-ROUTING/?view=workout)

| 요일 | 본운동 | 직접 훈련 부위 | 기본 예상 시간 |
|---|---|---|---|
| 월 | 밀기 A | 가슴 · 어깨 · 삼두 | 22.5분 |
| 화 | 당기기 + 다리 A | 등 · 이두 · 허리 · 다리 | 22.2분 |
| 수 | 밀기 B | 가슴 · 어깨 · 삼두 | 21.5분 |
| 목 | 당기기 + 다리 B | 등 · 이두 · 허리 · 다리 | 22.5분 |
| 금 | 밀기 C | 가슴 · 어깨 · 삼두 | 22.5분 |
| 토 | 당기기 C | 등 · 이두 · 허리 | 25.5분 |
| 일 | 다리 C | 다리 | 23.5분 |

- 본운동만 20~30분. 준비/마무리 운동, 점프, 가벼운 전신일을 포함하지 않습니다.
- 가슴/어깨/이두/삼두/등/허리/다리 모두 주3회 직접 훈련합니다. 주말에서 다음 주로 넘어갈 때도 같은 직접 부위를 연속 배치하지 않습니다. 협력근·안정근 사용은 겹칠 수 있습니다.
- 일자 밴드는 문·가구에 고정하지 않고 중앙을 짧게 잡아 저항을 만듭니다. 제품의 허용 신장 범위를 지킵니다.
- 별도 유산소는 점프 없는 걷기/스텝/복싱 5동작을 4라운드, 약21분 진행합니다. 근력 루틴과 성장 기록이 분리됩니다.
- 완료+컨디션에 따른 단계 상승, 당일 중복 상승 방지, 일시정지와 이어하기를 지원합니다.
- 기존 할 일/테마/완료 기록을 유지합니다. 운동 일정은 주7일 분할로 갱신합니다.

## 인체 모델과 iPhone 13 mini

Quaternius의 CC0 연결형 인체 메시와65개 관절을 사용합니다. 갈색 옆가르마와 둥근 안경은 추가 제작했습니다. 얼굴 표정/눈 깜박임/호흡/땀, 휴식 중 땀 닦기/힘내기/회복 제스처가 있습니다. 큰 제스처가 작업 세트의 운동 자세를 대신하지 않습니다.

375px 너비, Safari 도구 막대가 있는375×629 영역과375×812 홈 화면 모드를 검증합니다. 최소44px 터치 영역, 안전 여백, 하단 메뉴/운동 버튼 고정, 설정 접기, 모바일 동작 선택을 제공합니다. 모바일 DPR상한1.5, 최대30fps, 그림자 해제와 비가시 렌더링 중단으로 부담을 줄였습니다. 실제 iPhone 하드웨어의 발열·배터리 수치는 측정하지 않았습니다.

모델은 자체 제작 운동 가이드이며 실제 촬영/모션 캡처/개인별 자세 분석은 아닙니다. 출처와 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요. 데이터는 브라우저의 기존 localStorage 키에 저장됩니다.

## 개발과 검증

빌드 없이 루트를 GitHub Pages에 게시합니다. ES 모듈을 사용하므로 파일 더블클릭 대신 HTTP 서버로 여세요.

```sh
node --test
node --check app.js
node --check motion-studio.js
node --check service-worker.js
```

Playwright Core와 Chrome/WebKit으로 실행하는 검증 스크립트는 scripts/ 아래에 있습니다. PLAYWRIGHT_CORE_PATH, PLAYWRIGHT_BROWSERS_PATH, CHROME_PATH, TEST_URL, TEST_OUTPUT_DIR 환경변수를 사용할 수 있습니다.

- browser-smoke.cjs: 기존 앱, 구성, 진행, 저장, 오프라인
- browser-session-regressions.cjs: 일시정지·재개, 최종 평가, 자정 전후
- iphone-mini.cjs / iphone-fallback.cjs: iPhone 화면/터치/WebKit/텍스트 가이드
- weekly-program.cjs: 주간 일정, 별도 유산소, 날짜 변경
- trainer-reactions.cjs: 표정/땀/휴식 제스처와 작업 세트 복귀

GitHub main 업로드 시 기존 Pages가 자동 배포하고 Workout checks가 Node 테스트를 수행합니다.

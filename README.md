# 한자 탐험대 PWA v2.0.1

기존 PWA v2.0.0에서 **실제 스마트폰 설치·오프라인 실행·카드 진행상황 유지**를 확인한 후 확장한 업데이트입니다.

## 이번 버전

- 홈: 배운 새 한자, 마스터 한자, 별, 연속 학습, 추천 단원
- 배우기: 7급 새 한자 100자(20단원), 8급 복습 50자(10단원), 단원당 5글자, 학습 표시(+2 XP 최초 1회)
- 퀴즈: 출제 범위 8급/7급Ⅰ/7급Ⅱ/신규 100/전체 150/배운 한자; 10문제까지, 훈음·뜻·한자 찾기, 정답 +10 XP
- 복습: 오답은 오늘, 정답은 연속 맞힌 횟수에 따라 +1/+3/+7일. 마스터는 연속 3회 정답과 2일 이상의 정답 기록
- 한자 카드: v2.0.0의 기존 무작위 덱, 카드 진행 위치, 확인 기록을 보존
- 기록: 풀이 수·정답 수·마스터 상태·다음 복습일, 자동 저장
- 백업: PWA JSON v2.0.0(format 1)/v2.0.1(format 2) 복원; 기존 Streamlit `progress` JSON 자료 가져오기

**미구현:** 획순 쓰기, 드래곤 배틀, 클라우드 동기화. 기존 Streamlit 앱은 유지하세요.

## 업데이트하기 (기존 GitHub 저장소에서)

1. 현재 설치된 PWA의 **🏆 기록 → 백업·복원 → JSON 백업 저장**으로 먼저 기록을 보관하세요.
2. `hanja-pwa-v2.0.1.zip` 파일을 PC로 다운로드합니다.
3. GitHub Codespaces에서 기존 **`hanja-study-pwa`** 저장소를 엽니다. `hanja-study`(Streamlit) 저장소와 헷갈리지 마세요.
4. ZIP 파일을 Codespaces 탐색기 영역으로 업로드합니다. 최상위 폴더나 `.devcontainer` 안에 들어가도 됩니다.
5. **새 터미널**에서 아래 명령어를 순서대로 입력합니다.

```bash
cd /workspaces/hanja-study-pwa
ZIP="$(find /workspaces/hanja-study-pwa -type f -name 'hanja-pwa-v2.0.1.zip' -print -quit)"
[ -n "$ZIP" ] || { echo 'ZIP 파일을 찾지 못했습니다. 파일 업로드 위치를 확인하세요.'; exit 1; }
unzip -o "$ZIP" -d /workspaces/hanja-study-pwa
node --check app.js
```

6. 오류가 없으면 **ZIP 파일 자체를 GitHub에 커밋하지 말고**, 아래 변경 파일만 반영합니다.

```bash
git add index.html style.css app.js sw.js manifest.webmanifest README.md QA_REPORT.md
git status -sb
git commit -m "Hanja PWA v2.0.1 learning quiz review"
git push origin main
```

7. 기존 GitHub Pages 주소 `https://roosun1020-creator.github.io/hanja-study-pwa/` (계정/저장소 이름이 동일할 때)를 엽니다. 이전 앱을 **삭제하거나 앱 데이터 초기화를 하지 마세요**.
8. 설치된 PWA에서 새 메뉴가 바로 보이지 않으면 앱을 완전히 닫았다가 다시 열고, 인터넷이 연결된 상태에서 새로고침합니다. Service Worker 업데이트가 다음 실행에 적용될 수 있습니다.

## 기록 관련 주의 사항

- IndexedDB는 기존 v2.0.0과 **동일한 DB 이름 `hanja-pwa-db` / 키 `hanja-pwa-state`**를 사용합니다.
- 처음 v2.0.1을 실행하면 기존 카드 기록을 보존한 상태로 홈·배우기·퀴즈·복습 기록을 위한 필드가 추가됩니다.
- 자동 저장은 **해당 브라우저/설치 앱의 기기 저장소에만** 적용됩니다. 다른 기기와 자동으로 공유되지는 않습니다.
- 기기 데이터 삭제·PWA 제거·저장공간 정리 등으로 기록이 사라질 수 있으므로 백업은 계속 보관하세요.
- 기존 Streamlit의 JSON 백업을 불러오면 **현재 PWA의 학습 진도가 교체**됩니다. 카드 덱 진행은 유지되지만, 복원 직전의 PWA 학습 기록을 먼저 백업해야 합니다.
- 게임 기록(`game`)은 기존 Streamlit 백업에서 가져오면 보존하지만, 이번 PWA에는 드래곤 메뉴가 아직 없습니다.

## 정적 호스팅 안내

- HTML/CSS/JavaScript만 사용하여 GitHub Pages `main / (root)` 설정을 유지합니다.
- Node/npm 설치 없이 실행 가능합니다. `node --check app.js`는 구문 검사 전용입니다.
- 기존 `data/hanja.json` 150자, `icons/`, `assets/`의 파일은 이번 업데이트에서 변경하지 않습니다.
- 새 `sw.js`의 캐시 버전은 `hanja-pwa-v2.0.1-1`입니다. 최초 온라인 실행 이후 오프라인 학습을 다시 확인하세요.

## 이번 업데이트 파일 목록

- `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.webmanifest`
- `README.md`, `QA_REPORT.md`

기존 `data/`, `icons/`, `assets/`는 보존됩니다.

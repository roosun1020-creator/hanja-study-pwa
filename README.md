# 한자 탐험대 PWA 시작판 v2.0.0

이것은 **기존 Streamlit 앱을 교체하는 완성품이 아닌, PWA 설치·오프라인·기기 자동 저장을 확인하는 첫 단계**입니다.

## 들어 있는 기능
- 기존 v1.2.3.8 Python 소스의 실제 한자 150자를 추출한 데이터
- 8급 50자 / 7급Ⅰ 50자 / 7급Ⅱ 50자 / 신규 7급 100자 / 7급 전체 150자 카드
- 카드 터치하면 훈음 보기, 다음 카드, 무작위 순서, 중복 없이 한 바퀴
- IndexedDB 자동 저장 (뒤집기, 다음 카드, 범위 전환)
- JSON PWA 백업/복원 (기존 Streamlit 백업과 **서로 호환되지 않음**, 추후 이관 기능 제작 예정)
- 홈 화면 설치를 위한 manifest / 아이콘 / Service Worker
- 최초 온라인 접속 후 오프라인 카드 학습 가능

미구현: 배우기, 쓰기, 일반 퀴즈, 복습 주기, 드래곤 전투, 기존 Streamlit 학습기록 이관.

## GitHub 새 저장소로 배포
1. GitHub에서 **hanja-study-pwa** 라는 **새 Public 저장소** 생성, Add README On.
2. 해당 저장소의 **Code → Codespaces → Create codespace on main** 열기.
3. `hanja-pwa-starter-v2.0.0.zip`을 파일 탐색기에 업로드.
4. 아래 명령어 실행:

```bash
cd /workspaces/hanja-study-pwa
ZIP=$(find . -type f -name 'hanja-pwa-starter-v2.0.0.zip' -print -quit)
[ -n "$ZIP" ] || { echo 'ZIP 파일을 찾지 못했습니다'; exit 1; }
unzip -o "$ZIP" -d .
git add index.html style.css app.js sw.js manifest.webmanifest data icons assets README.md
git commit -m 'Initial Han-ja PWA prototype v2.0.0'
git push origin main
```

5. GitHub 저장소 웹페이지 **Settings → Pages → Build and deployment** 에서 `Deploy from a branch`, `main`, `/(root)` 선택 후 Save.
6. 배포된 주소 (예상): `https://roosun1020-creator.github.io/hanja-study-pwa/` (생성 및 배포가 끝나기 전에는 접속되지 않음).
7. 안드로이드 Chrome에서 URL 접속 → 메뉴 `⋮` → `앱 설치` 또는 `홈 화면에 추가`.
8. 카드 뒤집기 후 앱 종료/재실행 → 카드 진행상태 유지 확인. 처음 온라인 접속 완료 후 비행기 모드에서 열어 오프라인 확인.

## 개발 참고
- HTML/CSS/JavaScript 순수 정적 앱; `npm install` 불필요
- 파일/이미지 URL은 모두 상대 경로로 되어 있어 GitHub Pages `/hanja-study-pwa/` 경로에 맞습니다.
- `sw.js`의 `CACHE_VERSION` 을 변경해 배포할 때 브라우저 캐시 새로 고침을 유도할 수 있습니다.
- 기록은 **기기 브라우저 내부**에 저장됩니다. 다른 기기로 자동 동기화되지 않습니다. 데이터 삭제·저장공간 부족 등에 대비해 주기적으로 JSON 백업을 보관하세요.
- GitHub Pages 웹사이트와 공개 저장소는 인터넷에 공개됩니다. 아이의 개인 기록을 커밋하지 마세요.

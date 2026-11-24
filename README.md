# 한자 탐험대 PWA v2.0.2

기존 PWA v2.0.1에서 **홈 화면 설치, 비행기 모드, 자동 저장**을 실사용 검증한 후 이식한 버전입니다.

## 변경사항

- **퀴즈 정답 확인 버튼 겹침 수정**: 4개 보기 아래 별도 간격과 버튼 영역을 확보해 모바일에서 겹치지 않도록 함
- **✍️ 쓰기**: 8급·7급Ⅱ·7급Ⅰ의 단원별 5자, 전체 150자, 배운 한자에서 선택. 손가락 자유쓰기, 획순 애니메이션, 획순 자동판정, 획 번호 표시. 자율 연습 기록 자동 저장(퀴즈 점수는 변경 안 함)
- **🐉 드래곤 가디언즈**: 화루·수루·그루 3종과 3단계 진화, 공격 기술 15종(드래곤마다 5), 몬스터 9종, 5문제 배틀, 정답 25 피해·1.5초 공격 이동, 첫 범위 승리 +30 드래곤 XP
- 기존 카드/퀴즈/복습/JSON 기록과 동일한 IndexedDB DB/key 유지; 복원 백업 format 1/2/3 지원

## 새 PWA 설치/업데이트하기

**중요:** 기존 `hanja-study`(Streamlit)가 아니라 **`hanja-study-pwa`** 저장소에서만 작업합니다. 먼저 PWA **기록 → 백업·복원 → JSON 백업**으로 자료를 보관합니다. 새 ZIP을 Codespaces에 업로드하고 터미널에서 다음 명령을 실행하세요.

```bash
cd /workspaces/hanja-study-pwa
ZIP="$(find . -type f -name 'hanja-pwa-v2.0.2.zip' -print -quit)"
[ -n "$ZIP" ] || { echo 'ZIP 파일을 찾지 못했습니다'; exit 1; }
unzip -o "$ZIP" -d .
```

### 획순 기능도 오프라인에서 사용하려면

PWA 기본 파일에는 **인터넷 없이 가능한 자유쓰기**와 **온라인 HanziWriter 획순 애니메이션/판정**이 들어 있습니다. 획순을 오프라인에서도 쓰려면 아래 준비 명령을 한 번 더 실행하세요. Codespaces에서 npm으로 `HanziWriter` 및 `hanzi-writer-data`를 다운로드하여 **150자에 필요한 자료만** `vendor/`와 `strokes/`에 묶습니다.

```bash
bash scripts/bundle_strokes.sh
```

위 명령 실행에 실패해도 다른 모든 기능과 오프라인 자유쓰기는 정상 작동합니다. 설치 후 획순 자료가 누락된 한자는 안내 문구가 나옵니다. **중국식 획순 데이터이므로 한국식 획순 검증 완료 자료는 아닙니다.**

### 검사 후 GitHub 반영

```bash
node --check app.js
node --check writing.js
node --check dragons.js
git add index.html style.css app.js writing.js dragons.js sw.js manifest.webmanifest assets/dragons assets/monsters assets/effects README.md scripts
# 위에서 획순 자료 묶기를 실행한 경우에만 다음 줄도 실행하세요.
git add vendor strokes
git status -sb
git commit -m "Hanja PWA v2.0.2 writing dragons"
git push origin main
```

횡순 자료를 **묶지 않았다면** `git add vendor strokes` 명령은 제외하세요. ZIP 파일 자체와 개인 JSON 기록은 커밋하지 마세요. GitHub Pages 설정은 기존 `main / (root)` 그대로 유지합니다.

## 자동 저장 및 모바일 테스트

1. 기존 한자 카드 진행·배우기·퀴즈·복습 기록이 남아 있는지 확인
2. 퀴즈 4개 보기와 정답 확인 버튼이 겹치지 않는지 확인
3. 쓰기 단원 → 한자 → 자유쓰기 → 연습 완료 기록 → 앱 종료 후 다시 실행해 기록 유지
4. 드래곤 선택 → 8급 복습 배틀 → 기술 선택 → 정답 → 1.5초 공격 연출 → 결과
5. 앱을 온라인으로 한 번 열어 캐시 갱신한 뒤 비행기 모드에서 쓰기·드래곤 실행

**주의:** 쓰기 도중의 손가락 필기선 자체는 자동 저장하지 않습니다. 연습 완료 **횟수와 선택한 글자**만 저장됩니다. 게임과 학습 기록은 기기 내 IndexedDB에 저장되므로 정기 JSON 백업을 권장합니다.

## 출처·라이선스

- HanziWriter: https://hanziwriter.org/docs.html
- HanziWriter 데이터: https://github.com/chanind/hanzi-writer-data (Arphic Public License). `bundle_strokes.sh`로 설치된 경우 재배포 조건은 `vendor/`의 라이선스 파일과 원 출처를 확인하세요.
- 드래곤·몬스터·기술 그래픽은 기존 한자 탐험대 프로젝트에서 제작한 이미지 파일 재사용

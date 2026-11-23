# 엘리먼츠 (Elements) — 한국어판

Patch의 [Elements](https://patch.gg/patch/elements)를 한국어로 옮긴 비공식 한글판입니다. 원작자(Humpalumps) 및 Patch와 무관한 번역본입니다.

**플레이:** https://sigco3111.github.io/elements-ko/

## 소개

황혼의 훈련장에서 클릭 한 번으로 39종의 원소 주문을 시전해 보는 three.js(WebGL2) 데모입니다. 텍스처·모델·사운드 없이 모든 것을 코드로 그립니다. GPU 입자, 물·산성의 FLIP 유체, 불·연기의 연소 시뮬레이션, 레이마칭 볼륨, 번개, 중력 렌즈, 바닥에 남는 그을음·서리·균열까지 실시간으로 계산됩니다.

- 클릭: 선택한 주문을 그곳에 시전
- 드래그: 둘러보기 · 스크롤: 확대/축소
- 첫 클릭 전까지는 스스로 시전하며 장면을 보여 줍니다

## 주요 기능

- 주문 39종: 번개·불·물·얼음·대지·바람·공허·빛·산성·비전, 그리고 둘을 섞은 혼합 3종
- 오른쪽 위 '설정' 패널(독립 배포판 전용): 주문 선택(썸네일), 크기·강도·속도, 하늘(해 질 녘·한낮·밤), 모양 프리셋, 계속 시전/전부 시전, 카메라 흔들림, 섬광 줄이기, 노출·블룸·대비·채도·비네트·모션 블러, 바람, 시야각, 입자 양, 색 직접 지정, 주문별 세부 조절(높이·연기·불똥 등), 지우기
- 처음 열 때 모든 주문을 미리 데워 두므로(로딩 표시 진행) 열린 뒤에는 무거운 작업이 없습니다

## 스크린샷

배포본 화면은 [docs/screenshots/](docs/screenshots/)에 있습니다.

## 설치 및 실행

```bash
npm install
npm run build   # dist/ 에 정적 파일 생성 (docs/ 는 이 결과물입니다)
```

개발 서버: `npm run dev`

## 기술 노트

- 원본은 Patch 호스트(iframe) 안에서 recipe.json의 컨트롤로 설정 UI가 그려지는 구조라, 호스트가 없는 독립 배포판에는 설정 UI가 없었습니다. 이 한글판은 recipe.json을 그대로 읽어 그리는 독립판 전용 설정 패널(panel.js)과 로딩 진행 표시를 추가했습니다. iframe 임베드 시에는 패널이 스스로 비활성화됩니다.
- 한국어 이름 매핑은 names-ko.js 한 곳에 모아 두고, 원본 주문 모듈(lib/ultra-elements)은 수정하지 않았습니다.
- three.js 0.186.1 고정. 빌드는 vite이며 모든 경로는 상대 경로입니다.

## 라이선스 및 원작 크레딧

- 이 저장소의 코드: MIT (원본 LICENSE 그대로 포함: docs/LICENSE.txt)
- 원본: [Ultra Elements by Humpalumps](https://github.com/Humpalumps/ultra-elements) (MIT) — 39개 주문, 훈련장, 하늘, 입자·유체·볼륨·후처리
- 데모 페이지·컨트롤·썸네일: Patch (MIT)
- three.js: MIT / Red Hat Mono 폰트: SIL OFL 1.1
- 자세한 출처: [CREDITS.txt](CREDITS.txt), docs/THIRD_PARTY_NOTICES-ultra-elements.md

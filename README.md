# 온색 · Personal image branding

얼굴 사진에서 피부·헤어·눈동자의 색을 관찰하고, PCCS의 색상·톤 개념을 참고한 팔레트와 메이크업·염색 색상군을 제안하는 React 앱입니다. 상세한 제품·분석 설계는 [PROJECT_PLAN.md](PROJECT_PLAN.md)에 있습니다.

## 실행

Node.js 20 이상이 필요합니다.

```sh
npm install
npm run dev
```

Windows PowerShell에서 `npm.ps1` 실행 정책 오류가 나면 `npm.cmd install`, `npm.cmd run dev`를 사용하세요. 개발 서버 주소는 터미널 출력에서 확인합니다.

```sh
npm run build
npm test
```

개발 서버가 켜져 있고 로컬 인물 사진이 있다면 `node scripts/smoke.mjs <사진 경로>`로 업로드 분석, 수동 색 선택, 가상 카메라 촬영, 모바일 화면을 브라우저에서 확인할 수 있습니다. Windows에서는 설치된 Chrome 경로를 사용하며 필요하면 `CHROME_PATH` 환경 변수로 지정합니다.

웹캠은 localhost 또는 HTTPS 환경에서 권한을 허용해야 사용할 수 있습니다. JPG·PNG·WebP(10MB 이하)를 업로드하거나, 사진 없이 직접 색을 고를 수 있습니다.

## 구현 범위

- MediaPipe Face Landmarker로 단일 얼굴 확인과 피부·홍채 주변 표본 추출.
- MediaPipe SelfieMulticlass 분할 모델로 헤어 영역 색 추출.
- 사진 속 관찰색 확인, 색 선택기 또는 사진 클릭으로 수정.
- 추천 톤 후보와 9색 팔레트, 립·블러셔·아이섀도 및 염색 색상군.
- 사진 옆 색 비교, HEX 복사, 선택한 팔레트를 PNG로 저장.
- 사진은 브라우저에서 처리합니다. 기본 흐름에서 서버에 업로드하거나 저장하지 않습니다.

모델은 최초 사용 시 `/public/models`와 `/public/wasm`에서 브라우저로 다운로드됩니다. 원본 사진은 네트워크로 전송되지 않습니다.

## 결과 해석

사진 조명, 화장, 염색, 컬러렌즈, 화면 설정이 관찰색에 영향을 줍니다. 추천 규칙은 탐색용 초기 가설이며 전문가 검증을 거친 진단이 아닙니다. 팔레트는 PCCS 톤 개념을 참고한 자체 근사 색상으로, 공식 PCCS 색표와 같다고 주장하지 않습니다. 실제 제품 발색과 염색 결과도 다를 수 있습니다.

## 사용한 모델

- [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)
- [MediaPipe Image Segmenter · SelfieMulticlass](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)

모델과 WASM 파일은 서비스가 외부 CDN에 의존하지 않도록 함께 배포합니다. 실제 공개 배포 전 모델과 색표 관련 라이선스, 다양한 촬영 조건에서의 추출 성능을 검토해야 합니다.

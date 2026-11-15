# assets/pixel

게임에 쓰는 도트 그래픽(정리본). 원본(Gemini 생성 파일)은 `_원본/`에 두고 git에는 올리지 않는다.

- 초상 128×128 RGBA: `portrait_{juyeon|jiyoung|chaeun|jiin|gayeon}_{base|shaken|confess}.png` (임주연은 base·shaken만)
- 아바타 48×48: `avatar_*.png` (기본 초상의 얼굴 부분)
- 갤러리: `scene_g4_1_doorbell`, `g4_2_departure`, `g4_3a_visitors_arrive`, `g4_3b_visitors_leave`, `g5_security_selfie`(120×160), `g7_school_photo`, `g10_bookstore_opening`, `g12_sunrise`
- 인터뷰 배경 320×180: `bg_interview_{park|chaeun|sung|gayeon}.png`
- 화면: `screen_title`, `screen_ending`(트루 엔딩 지면 사진), `screen_lockscreen`
- 엔딩: `screen_ending_invite`(트루 엔딩 마지막 장면, 120×68), `screen_ending_partial`·`screen_ending_bad1`(219×122), `screen_ending_bad3`(120×67, 사진 원본을 저해상도로), `screen_ending_bad4`(240×131). 프롬프트는 docs/04_엔딩_이미지_프롬프트.md, 정리는 tools/process_endings.py

정리 과정: Gemini 로고 제거(주변 패턴 복사) → 마젠타 크로마키 제거 → 도트 격자 단위로 축소(칸 중앙값) → 크롭·패딩. 띵동캠은 그림에 박힌 글자 띠를 잘라냄.

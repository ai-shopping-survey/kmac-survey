// ===== 연구자가 수정하는 설정 =====
window.CONFIG = {
  // 구글 Apps Script 배포 후 받은 웹 앱 URL을 따옴표 안에 붙여 넣는다.
  // 비워 두면 응답이 저장되지 않고, 마지막에 데이터 파일 다운로드 버튼만 나온다(테스트용).
  ENDPOINT: "",

  STUDY_ID: "KMAC22-S2",
  VERSION: "1.1",

  PRICE: "7,900원",           // 네 상품 공통 가격 (포장 단위를 조정해 가격을 맞춤)
  START_POINTS: 100,
  PENALTY_WRONG: 5,           // 필요 없는 상품 구매, 필요한 상품 미구매
  PENALTY_CHECK: 0.5,         // 재고 확인, 확인 요청 응답
  P_NEED_REGULAR: 0.90,
  P_NEED_IRREGULAR: 0.65,

  // 보상 안내 문구 (동의서와 마지막 화면에 표시)
  REWARD_TEXT: "주의 점검을 통과한 모든 참가자에게 모바일 기프티콘을 드리고, 최종 점수 상위 20% 참가자에게는 기프티콘을 하나 더 드립니다.",
  CONTACT_EMAIL: "jskim7394@yonsei.ac.kr",
  RESEARCHERS: "김재상, 여민서 (연세대학교 도시공학과)",
  IRB_TEXT: ""                // 심의 번호가 있으면 입력 (예: "연세대학교 IRB 승인번호 7001988-2026XX-SB-XXX-XX")
};

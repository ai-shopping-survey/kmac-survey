// ===== 연구자가 수정하는 설정 =====
window.CONFIG = {
  // 구글 Apps Script 배포 후 받은 웹 앱 URL을 따옴표 안에 붙여 넣는다.
  // 비워 두면 응답이 저장되지 않고, 마지막에 데이터 파일 다운로드 버튼만 나온다(테스트용).
  ENDPOINT: "https://script.google.com/macros/s/AKfycbz9Z4RCaWfrlUE2PNitNV45lWxJRH4zee17iiWaEf_Ls7meOuaAKdtBB-UdD39_D9PbTw/exec",

  STUDY_ID: "KMAC22-S2",
  VERSION: "2.2",

  PRICE: "7,900원",   // 네 상품 공통 가격 (포장 단위를 조정해 가격을 맞춤)

  // 보상 안내 문구 (동의서와 마지막 화면에 표시)
  REWARD_TEXT: "설문을 끝까지 마치고 주의 확인 문항에 바르게 답한 분 가운데 추첨을 통해 10명에게 모바일 기프티콘을 드립니다.",
  CONTACT_EMAIL: "jskim7394@yonsei.ac.kr",
  RESEARCHERS: "김재상, 여민서 (연세대학교 도시공학과)",
  IRB_TEXT: ""        // 심의 번호가 있으면 입력
};

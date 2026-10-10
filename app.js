/* 연구 2: AI 쇼핑 비서 시나리오 실험 (v3)
   설계: 2(구매 방식: 확인 후 구매 / 자동구매, 피험자 간) × 2(상품 유형: 신선식품 / 저장식품, 피험자 내)
   - 확인 후 구매 = 자동화 수준 5단계(사람이 승인하면 실행), 자동구매 = 7단계(실행한 뒤 알림)  [Parasuraman et al. 2000]
   - 알림 문구는 생성형 AI가 통제된 지시문으로 작성한 것을 그대로 사용 (ai_stimuli 폴더 참고)
   - 주문 취소에 관한 정보는 두 조건 모두 제시하지 않음
   - 참가자마다 네 상품(신선: 딸기·우유, 저장: 생수·즉석밥)을 모두 평가, 순서는 무작위
   - 측정: 만족(Bhattacherjee 2001), 정서적 신뢰(Komiak & Benbasat 2006), 이용 의향(같은 두 문헌을 수정),
           선호하는 구매 방식, 지각된 낭비 위험(연구자 작성) */
(function () {
  "use strict";
  const C = window.CONFIG;
  const app = document.getElementById("app");
  const $ = (s, r = document) => r.querySelector(s);
  const now = () => Date.now();
  const rnd = () => Math.random();
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const url = new URL(location.href);

  const CONDS = ["confirm", "auto"];
  // eul: 을/를, eun: 은/는, iga: 이/가, eat: 다 먹지/마시지
  const PRODUCTS = {
    straw: { key: "straw", name: "딸기",   unit: "500g 1팩",     perish: "fresh",  eul: "를", eun: "는", iga: "가", eat: "다 먹지 못하고" },
    milk:  { key: "milk",  name: "우유",   unit: "900mL × 2팩",  perish: "fresh",  eul: "를", eun: "는", iga: "가", eat: "다 마시지 못하고" },
    water: { key: "water", name: "생수",   unit: "500mL × 20병", perish: "stable", eul: "를", eun: "는", iga: "가", eat: "다 마시지 못하고" },
    rice:  { key: "rice",  name: "즉석밥", unit: "210g × 5개",   perish: "stable", eul: "을", eun: "은", iga: "이", eat: "다 먹지 못하고" }
  };

  // ---- 알림 문구: 생성형 AI 출력 원문 (상품명과 조사만 넣음) ----
  const MSG = {
    auto: "고객님은 지난 몇 달 동안 {상품}을(를) 2주마다 규칙적으로 주문해 오셨어요. 마지막 주문 후 2주가 지나서 오늘 {상품}을(를) 주문해 두었어요. 내일 오전 7시 전에 도착할 예정이에요.",
    confirm: "고객님은 지난 몇 달 동안 {상품}을(를) 2주마다 규칙적으로 주문해 오셨어요. 마지막 주문 후 2주가 지나서 오늘 {상품}을(를) 장바구니에 담아 두었어요. 내일 오전 7시 전에 도착하도록 주문할까요?",
    b1: "주문하기", b2: "주문하지 않기"
  };
  const fill = (s, p) => s.replace(/\{상품\}을\(를\)/g, p.name + p.eul).replace(/\{상품\}/g, p.name);

  // 문항 바로 위에 다시 보여 주는 구매 방식 요약
  const METHOD = {
    confirm: "AI 쇼핑 비서가 장바구니에 담아 두고, 내가 ‘주문하기’를 눌러야 주문되는 방식",
    auto: "AI 쇼핑 비서가 내게 묻지 않고 바로 주문하는 방식"
  };

  // ---- 측정 문항 ----
  // 만족: Bhattacherjee (2001)의 의미분별 문항 3개를 번역
  const SAT = [
    ["sat1", "매우 불만족스럽다", "매우 만족스럽다"],
    ["sat2", "매우 마음에 들지 않는다", "매우 마음에 든다"],
    ["sat3", "매우 답답하다", "매우 흡족하다"]
  ];
  // 정서적 신뢰: Komiak & Benbasat (2006) / 이용 의향: Komiak & Benbasat (2006), Bhattacherjee (2001)을 수정
  const EVAL = [
    ["trust1", (p) => `이번 ${p.name} 구매를 AI 쇼핑 비서에게 맡겨도 안심이 된다.`],
    ["trust2", (p) => `이번 ${p.name} 구매를 AI 쇼핑 비서에게 맡기는 것이 마음 편하다.`],
    ["intent1", (p) => `실제로 이 서비스를 쓴다면, ${p.name}${p.eun} 위 구매 방식으로 살 의향이 있다.`],
    ["intent2", (p) => `앞으로도 ${p.name}${p.eun} 위 구매 방식으로 계속 사고 싶다.`]
  ];
  // 지각된 낭비 위험: 연구자 작성 (Featherman & Pavlou 2003의 재무적 위험 개념 참고)
  const RISK = [
    ["risk1", (p) => `위 구매 방식으로 ${p.name}${p.eul} 사면, ${p.eat} 버리는 ${p.name}${p.iga} 생길 것 같다.`],
    ["risk2", (p) => `위 구매 방식으로 ${p.name}${p.eul} 사면, 쓸데없는 데 돈을 쓰게 될 위험이 있다.`]
  ];
  const ITEM_IDS = SAT.map((x) => x[0]).concat(EVAL.map((x) => x[0]), RISK.map((x) => x[0]));
  const CHOICE_OPTS = [
    ["recommend", "AI는 추천만 하고, 주문은 내가 직접 한다"],
    ["confirm", "AI가 장바구니에 담아 두고, 내가 ‘주문하기’를 누를 때만 주문한다"],
    ["auto", "AI가 내게 묻지 않고 바로 주문한다"]
  ];
  const BUY_OPTS = [["often", "자주 산다"], ["some", "가끔 산다"], ["rare", "거의 안 산다"], ["never", "전혀 안 산다"]];

  const S = {
    pid: "P" + now().toString(36).toUpperCase() + Math.floor(rnd() * 1e6).toString(36).toUpperCase(),
    panel_id: url.searchParams.get("pid") || "",
    test: url.searchParams.get("test") === "1",
    cond: null, assign_method: "", order: [], t_start: now(),
    pre: {}, scen: [], choice: {}, manip: {}, demo: {}, att: null
  };

  // ---------- 공통 ----------
  const STEPS = ["consent", "pre", "intro", "s1", "s2", "s3", "s4", "after", "demo", "done"];
  function progress(step) {
    const i = STEPS.indexOf(step);
    document.getElementById("progress").style.width = Math.round((i / (STEPS.length - 1)) * 100) + "%";
    const lab = document.getElementById("progress-label");
    if (lab) lab.textContent = i > 0 && i < STEPS.length - 1 ? `${i} / ${STEPS.length - 2}` : "";
  }
  function render(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function radios(name, opts) {
    return opts.map((o, i) => `<label class="opt"><input type="radio" name="${name}" value="${esc(o[0])}" id="${name}_${i}"><span>${o[1]}</span></label>`).join("");
  }
  function scale7(name, left, right) {
    let h = `<div class="likert" role="radiogroup">`;
    for (let v = 1; v <= 7; v++) h += `<label><input type="radio" name="${name}" value="${v}">${v}</label>`;
    return h + `</div><div class="likert-ends"><span>${left}</span><span>${right}</span></div>`;
  }
  const agreeQ = (name, text) => `<div class="q"><div class="q-title">${esc(text)}</div>${scale7(name, "전혀 그렇지 않다", "매우 그렇다")}</div>`;
  const val = (name) => { const el = $(`input[name="${name}"]:checked`) || $(`[name="${name}"]`); if (!el) return ""; if (el.type === "radio") return el.checked ? el.value : ""; return el.value.trim(); };
  const missing = (names) => names.filter((n) => val(n) === "");
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

  // ---------- 시나리오 화면 구성 ----------
  function historyCard(p) {
    const dots = [["6주 전", "주문"], ["4주 전", "주문"], ["2주 전", "주문"], ["오늘", "?"]]
      .map(([t, s], i) => `<div class="tl-step${i === 3 ? " today" : ""}"><div class="tl-dot">${i === 3 ? "" : "✓"}</div><div class="tl-t">${t}</div><div class="tl-s">${s}</div></div>`).join("");
    return `<div class="sit">
      <div class="product"><div class="thumb"><span>${esc(p.name)}</span><img src="${p.key}.jpg" alt="${esc(p.name)}" onerror="this.remove()"></div>
        <div><div class="pname">${esc(p.name)}</div><div class="pmeta">${esc(p.unit)} · ${esc(C.PRICE)}</div></div></div>
      <div class="tl-head">나의 ${esc(p.name)} 주문 기록</div>
      <div class="timeline2">${dots}</div>
      <p class="sit-note">지난 몇 달 동안 2주마다 규칙적으로 주문해 온 상품입니다. 마지막 주문 후 2주가 지났고, 지금 집에 얼마나 남아 있는지는 아직 확인하지 않았습니다.</p>
    </div>`;
  }
  function phoneScreen(cond, p) {
    const msg = fill(MSG[cond], p);
    const isAuto = cond === "auto";
    const order = `<div class="ocard">
        <div class="ocard-top"><span class="ocard-title">${isAuto ? "주문 내역" : "장바구니"}</span><span class="ochip ${isAuto ? "done" : "cart"}">${isAuto ? "주문 완료" : "주문 전"}</span></div>
        <div class="ocard-body"><img class="othumb" src="${p.key}.jpg" alt="" onerror="this.style.visibility='hidden'">
          <div class="oinfo"><div class="oname">${esc(p.name)} ${esc(p.unit)}</div><div class="oprice">${esc(C.PRICE)}</div>
          <div class="ometa">${isAuto ? "도착 예정 · 내일 오전 7시 전" : "주문하면 · 내일 오전 7시 전 도착"}</div>
          <div class="ometa">결제 수단 · 등록된 카드</div></div></div>
      </div>`;
    const btns = isAuto ? "" : `<div class="obtns"><span class="mbtn primary">${esc(MSG.b1)}</span><span class="mbtn">${esc(MSG.b2)}</span></div>`;
    return `<div class="device">
      <div class="dev-status"><span>오후 8:00</span><span class="dev-icons">LTE <span class="batt"><i></i></span></span></div>
      <div class="dev-app"><span class="av">AI</span><div><div class="dev-name">AI 쇼핑 비서</div><div class="dev-sub">장보기 앱 알림</div></div></div>
      <div class="dev-chat"><div class="bubble2">${esc(msg)}</div>${order}${btns}</div>
    </div>
    <p class="dev-note">이 화면은 상황 설명을 위한 예시입니다. 실제 주문이나 결제는 이루어지지 않으며, 화면을 누를 필요는 없습니다.</p>`;
  }

  // ---------- 1. 동의 ----------
  function pageConsent() {
    progress("consent");
    render(`
      <h1>AI 쇼핑 비서에 관한 설문</h1>
      <div class="card">
        <p>안녕하세요. 이 설문은 AI 쇼핑 비서가 온라인 식료품 구매를 도와줄 때 소비자가 어떻게 느끼는지 알아보기 위한 연구입니다.</p>
        <ul class="tight">
          <li>소요 시간: 약 10분</li>
          <li>내용: 간단한 배경 질문, 쇼핑 상황 네 가지에 대한 평가, 응답자 정보</li>
          <li>보상: ${esc(C.REWARD_TEXT)}</li>
          <li>참여 여부는 자유롭게 결정하실 수 있으며, 언제든 창을 닫아 중단할 수 있습니다. 중단하면 응답은 저장되지 않습니다.</li>
          <li>응답은 연구 목적으로만 사용되며, 분석 자료에는 이름이나 연락처가 포함되지 않습니다. 추첨 응모를 위한 연락처는 마지막에 원하는 분만 따로 받고, 추첨과 발송이 끝나면 파기합니다.</li>
          <li>만 19세 이상만 참여할 수 있습니다.</li>
        </ul>
        <p class="muted">연구자: ${esc(C.RESEARCHERS)} · 문의: ${esc(C.CONTACT_EMAIL)}${C.IRB_TEXT ? " · " + esc(C.IRB_TEXT) : ""}</p>
        <label class="opt"><input type="checkbox" id="agree"><span>위 내용을 읽었으며 설문 참여에 동의합니다.</span></label>
        <div class="nav"><button class="btn" id="next" disabled>시작하기</button></div>
      </div>`);
    $("#agree").onchange = (e) => ($("#next").disabled = !e.target.checked);
    $("#next").onclick = pagePre;
  }

  // ---------- 2. 배경 질문 (무작위 배정 전) ----------
  function pagePre() {
    progress("pre");
    render(`
      <h1>먼저 몇 가지 여쭤볼게요</h1>
      <div class="card">
        <div class="q"><div class="q-title">1. 만 나이</div><input type="number" name="age" min="1" max="110" inputmode="numeric" placeholder="예: 27"></div>
        <div class="q"><div class="q-title">2. 성별</div>${radios("gender", [["M", "남성"], ["F", "여성"], ["NA", "응답하지 않음"]])}</div>
        <div class="q"><div class="q-title">3. 함께 사는 가구원 수 (본인 포함)</div>${radios("hh", [["1", "1명"], ["2", "2명"], ["3", "3명"], ["4+", "4명 이상"]])}</div>
        <div class="q"><div class="q-title">4. 집에서 식료품은 주로 누가 사나요?</div>${radios("shopper", [["me", "주로 내가 산다"], ["shared", "다른 가족과 나누어 산다"], ["other", "주로 다른 사람이 산다"]])}</div>
        <div class="q"><div class="q-title">5. 최근 한 달 동안 온라인으로 식료품을 구매한 횟수</div>${radios("online", [["0", "없음"], ["1-2", "1~2회"], ["3-4", "3~4회"], ["5+", "5회 이상"]])}</div>
        <div class="q"><div class="q-title">6. AI 쇼핑 비서(쇼핑 앱의 AI 추천·상담, ChatGPT 등으로 상품 찾기)를 이용해 본 경험</div>${radios("ai", [["none", "이용해 본 적 없다"], ["some", "몇 번 이용해 봤다"], ["often", "자주 이용한다"], ["dk", "잘 모르겠다"]])}</div>
        <div class="q"><div class="q-title">7. 다음 상품을 평소 본인이나 함께 사는 사람을 위해 얼마나 자주 사시나요?</div>
          ${Object.values(PRODUCTS).map((p) => `<div class="sub-q"><div class="sub-title">${esc(p.name)}</div>${radios("buy_" + p.key, BUY_OPTS)}</div>`).join("")}</div>
        <div class="err" id="err"></div>
        <div class="nav"><button class="btn" id="next">다음</button></div>
      </div>`);
    $("#next").onclick = () => {
      const names = ["age", "gender", "hh", "shopper", "online", "ai"].concat(Object.keys(PRODUCTS).map((k) => "buy_" + k));
      if (missing(names).length) { $("#err").textContent = "모든 문항에 답해 주세요."; return; }
      const age = parseInt(val("age"), 10);
      if (!(age >= 1 && age <= 110)) { $("#err").textContent = "나이를 숫자로 입력해 주세요."; return; }
      names.forEach((n) => (S.pre[n] = val(n)));
      if (age < 19) return render(`<h1>참여해 주셔서 감사합니다</h1><div class="card"><p>이 설문은 만 19세 이상만 참여할 수 있어 여기서 마칩니다. 응답은 저장되지 않았습니다.</p></div>`);
      assign().then(pageIntro);
    };
  }

  // ---------- 무작위 배정 ----------
  async function assign() {
    const forced = url.searchParams.get("c");
    if (CONDS.includes(forced)) { S.cond = forced; S.assign_method = "url"; }
    else {
      S.cond = pick(CONDS); S.assign_method = "random";
      if (C.ENDPOINT) {
        try {
          const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 3500);
          const cnt = await (await fetch(C.ENDPOINT + "?action=counts", { signal: ctl.signal })).json();
          clearTimeout(to);
          const min = Math.min(...CONDS.map((c) => cnt[c] || 0));
          S.cond = pick(CONDS.filter((c) => (cnt[c] || 0) === min)); S.assign_method = "balanced";
        } catch (e) { /* 연결 실패 시 단순 무작위 배정 유지 */ }
      }
    }
    S.order = shuffle(Object.keys(PRODUCTS));
    // 특정 선택지가 늘 같은 자리에 놓이지 않도록 선택지 순서를 참가자마다 무작위로 정한다
    S.choice_opts = shuffle(CHOICE_OPTS);
    S.choice_opt_order = S.choice_opts.map((o) => o[0]).join("-");
  }

  // ---------- 3. 안내 ----------
  function pageIntro() {
    progress("intro");
    render(`
      <h1>상황 안내</h1>
      <div class="card">
        <p>당신이 자주 쓰는 온라인 장보기 앱에 <b>AI 쇼핑 비서</b> 기능이 있다고 가정해 주세요. 이 비서는 당신의 주문 기록을 보고 식료품 구매를 도와줍니다. 당신은 이 기능을 직접 켜 두었고, 결제 수단도 미리 등록해 두었습니다.</p>
        <p>지금부터 상품이 하나씩 다른 상황 <b>네 가지</b>를 차례로 보여 드립니다. 모든 상황에서 당신은 그 상품을 지난 몇 달 동안 <b>2주마다 규칙적으로</b> 주문해 왔고, 마지막 주문 후 2주가 지났습니다. 다만 지금 집에 얼마나 남아 있는지는 아직 확인하지 않았습니다.</p>
        <p>오늘 오후 8시, AI 쇼핑 비서에게서 알림이 왔습니다. 알림을 읽고, 실제로 이 서비스를 쓴다고 생각하며 답해 주세요. 정답은 없습니다.</p>
        <div class="nav"><button class="btn" id="next">첫 번째 상황 보기</button></div>
      </div>`);
    $("#next").onclick = () => pageScenario(0);
  }

  // ---------- 4. 시나리오 4개 ----------
  // 순서: 만족 → 신뢰·이용 의향(무작위) → 선호하는 구매 방식 → 지각된 낭비 위험(무작위).
  // 매개변수(낭비 위험)가 결과변수 응답을 유도하지 않도록 결과변수를 먼저 묻는다.
  function pageScenario(k) {
    progress("s" + (k + 1));
    const pk = S.order[k], p = PRODUCTS[pk], t0 = now();
    const evalItems = shuffle(EVAL);
    const riskItems = shuffle(RISK);
    const riskQs = riskItems.map(([id, f]) => agreeQ(`s${k}_${id}`, f(p)));
    if (k === 2) riskQs.splice(1, 0, agreeQ("att", "응답 확인을 위한 문항입니다. 이 문항에는 3을 선택해 주세요."));
    render(`
      <div class="muted">상황 ${k + 1} / 4</div>
      <h1>${esc(p.name)}${p.eul} 다시 주문할 때가 되었습니다</h1>
      <div class="card">${historyCard(p)}</div>
      <div class="card">${phoneScreen(S.cond, p)}</div>
      <div class="card">
        <div class="method">이번 상황의 구매 방식: ${esc(METHOD[S.cond])}</div>
        <div class="q-title" style="margin-bottom:10px">AI 쇼핑 비서가 이번 ${esc(p.name)} 구매를 처리한 방식에 대해 어떻게 느끼시나요?</div>
        ${SAT.map(([id, l, r]) => `<div class="q sd">${scale7(`s${k}_${id}`, l, r)}</div>`).join("")}
        <p class="muted" style="margin:6px 0 14px">각 문장에 얼마나 동의하시나요?</p>
        ${evalItems.map(([id, f]) => agreeQ(`s${k}_${id}`, f(p))).join("")}
      </div>
      <div class="card"><div class="q-title" style="margin-bottom:8px">실제로 이 서비스를 쓴다면, ${esc(p.name)}${p.eun} 어떤 방식으로 사고 싶으신가요?</div>${radios(`s${k}_choice`, S.choice_opts)}</div>
      <div class="card"><p class="muted" style="margin-bottom:14px">각 문장에 얼마나 동의하시나요?</p>${riskQs.join("")}</div>
      <div class="err" id="err"></div><div class="nav"><button class="btn" id="next">${k < 3 ? "다음 상황 보기" : "다음"}</button></div>`);
    $("#next").onclick = () => {
      const names = ITEM_IDS.map((id) => `s${k}_${id}`).concat([`s${k}_choice`], k === 2 ? ["att"] : []);
      if (missing(names).length) { $("#err").textContent = "응답하지 않은 문항이 있어요."; return; }
      const r = { pos: k + 1, product: pk, perish: p.perish, buy_freq: S.pre["buy_" + pk], sec: Math.round((now() - t0) / 1000),
        item_order: evalItems.map((x) => x[0]).concat(riskItems.map((x) => x[0])).join("-"), choice: val(`s${k}_choice`) };
      ITEM_IDS.forEach((id) => (r[id] = +val(`s${k}_${id}`)));
      r.sat = mean([r.sat1, r.sat2, r.sat3]); r.trust = mean([r.trust1, r.trust2]);
      r.intent = mean([r.intent1, r.intent2]); r.risk = mean([r.risk1, r.risk2]);
      S.choice[pk] = r.choice;
      if (k === 2) S.att = +val("att");
      S.scen.push(r);
      k < 3 ? pageScenario(k + 1) : pageAfter();
    };
  }

  // ---------- 5. 이해 확인과 현실감 ----------
  function pageAfter() {
    progress("after");
    render(`
      <h1>거의 다 왔어요</h1>
      <div class="card"><div class="q-title" style="margin-bottom:8px">1. 앞의 상황들에서 AI 쇼핑 비서는 상품을 어떻게 했나요?</div>
        ${radios("mc_interface", shuffle([["confirm", "장바구니에 담아 두고, 주문할지 내게 물었다"], ["auto", "내게 묻지 않고 주문을 마쳤다"]]).concat([["dk", "잘 모르겠다"]]))}</div>
      <div class="card">${agreeQ("realism", "2. 앞의 상황들은 실제로 일어날 법하다고 느꼈다.")}
        ${agreeQ("cancel_belief", "3. 앞의 상황에서 AI 쇼핑 비서를 통해 주문된 상품은, 원하면 배송 전에 취소할 수 있었을 것이라고 생각한다.")}</div>
      <div class="err" id="err"></div><div class="nav"><button class="btn" id="next">다음</button></div>`);
    $("#next").onclick = () => {
      if (missing(["mc_interface", "realism", "cancel_belief"]).length) { $("#err").textContent = "응답하지 않은 문항이 있어요."; return; }
      S.manip.mc_interface = val("mc_interface"); S.manip.realism = +val("realism"); S.manip.cancel_belief = +val("cancel_belief");
      pageDemo();
    };
  }

  // ---------- 6. 응답자 정보 ----------
  function pageDemo() {
    progress("demo");
    render(`
      <h1>마지막으로 응답자 정보를 여쭤볼게요</h1>
      <div class="card">
        <div class="q"><div class="q-title">1. 직업</div>${radios("job", [["student", "학생"], ["employee", "직장인(회사원·공무원 등)"], ["self", "자영업"], ["home", "전업주부"], ["other", "무직·기타"], ["NA", "응답하지 않음"]])}</div>
        <div class="q"><div class="q-title">2. 최종 학력 (재학 포함)</div>${radios("edu", [["hs", "고등학교 졸업 이하"], ["college", "대학교 재학"], ["grad", "대학교 졸업"], ["post", "대학원 재학 이상"], ["NA", "응답하지 않음"]])}</div>
        <div class="q"><div class="q-title">3. 월평균 가구 소득 (세전, 함께 사는 가구원 전체)</div>${radios("income", [["<200", "200만 원 미만"], ["200-400", "200만~400만 원 미만"], ["400-600", "400만~600만 원 미만"], ["600-800", "600만~800만 원 미만"], ["800+", "800만 원 이상"], ["NA", "잘 모르겠다 / 응답하지 않음"]])}</div>
        <div class="err" id="err"></div>
        <div class="nav"><button class="btn" id="next">제출하기</button></div>
      </div>`);
    $("#next").onclick = () => {
      const names = ["job", "edu", "income"];
      if (missing(names).length) { $("#err").textContent = "모든 문항에 답해 주세요."; return; }
      names.forEach((n) => (S.demo[n] = val(n)));
      submit();
    };
  }

  // ---------- 제출 ----------
  function payload() {
    const t = now();
    const d = {
      type: "response", study: C.STUDY_ID, version: C.VERSION, pid: S.pid, panel_id: S.panel_id, test: S.test ? 1 : 0,
      cond: S.cond, assign_method: S.assign_method, order: S.order.join("-"), choice_opt_order: S.choice_opt_order,
      started_at: new Date(S.t_start).toISOString(), finished_at: new Date(t).toISOString(), duration_sec: Math.round((t - S.t_start) / 1000),
      att: S.att, att_pass: S.att === 3 ? 1 : 0, mc_interface: S.manip.mc_interface, mc_pass: S.manip.mc_interface === S.cond ? 1 : 0,
      realism: S.manip.realism, cancel_belief: S.manip.cancel_belief, user_agent: navigator.userAgent.slice(0, 180), screen_w: window.innerWidth
    };
    Object.entries(S.pre).forEach(([k, v]) => (d["pre_" + k] = v));
    Object.entries(S.demo).forEach(([k, v]) => (d["demo_" + k] = v));
    S.scen.forEach((r) => {
      const pk = r.product;
      d[`${pk}_pos`] = r.pos;
      ["intent", "sat", "trust", "risk"].forEach((m) => (d[`${pk}_${m}`] = r[m]));
      ITEM_IDS.forEach((id) => (d[`${pk}_${id}`] = r[id]));
      d[`${pk}_choice`] = S.choice[pk];
    });
    ["fresh", "stable"].forEach((pe) => {
      const xs = S.scen.filter((r) => r.perish === pe);
      ["intent", "sat", "trust", "risk"].forEach((m) => (d[`${pe}_${m}`] = mean(xs.map((r) => r[m]))));
    });
    d.diff_intent = d.fresh_intent - d.stable_intent;   // 주 분석의 차이 점수 D_i
    d.trials = S.scen.map((r) => Object.assign({}, r));
    return d;
  }
  async function post(data) {
    if (!C.ENDPOINT) return false;
    try { await fetch(C.ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) }); return true; }
    catch (e) { return false; }
  }
  async function submit() {
    render(`<div class="card center"><p>응답을 저장하고 있어요…</p></div>`);
    const data = payload();
    let ok = await post(data); if (!ok && C.ENDPOINT) ok = await post(data);
    pageDone(ok, data);
  }

  // ---------- 7. 완료 ----------
  function pageDone(ok, data) {
    progress("done");
    const dl = !ok ? `<div class="box">${C.ENDPOINT ? "응답 저장에 실패했어요. 아래 버튼으로 파일을 저장해 연구자 이메일로 보내 주세요." : "테스트 모드: 저장 주소가 설정되지 않아 응답이 저장되지 않았습니다."}
      <div style="margin-top:8px"><button class="btn ghost" id="dl">응답 파일 저장</button></div></div>` : "";
    render(`
      <h1>참여해 주셔서 감사합니다</h1>
      ${dl}
      <div class="card">
        <div class="q-title">기프티콘 추첨 응모</div>
        <p class="muted small">${esc(C.REWARD_TEXT)} 응모를 원하시면 휴대전화 번호를 남겨 주세요. 연락처는 응답 자료와 따로 저장되며, 추첨과 발송이 끝나면 파기합니다.</p>
        <input type="tel" name="phone" placeholder="010-0000-0000" inputmode="tel" maxlength="20">
        <label class="opt" style="margin-top:10px"><input type="checkbox" id="pc"><span>기프티콘 추첨과 발송을 위한 휴대전화 번호 수집·이용에 동의합니다.</span></label>
        <div class="err" id="err"></div>
        <div class="row" style="margin-top:12px"><button class="btn" id="send">추첨 응모하기</button><button class="btn ghost" id="skip">응모하지 않고 마치기</button></div>
      </div>
      <div class="card"><div class="q-title">연구 안내</div><p class="small muted">이 연구는 AI 쇼핑 비서가 상품을 장바구니에 담아 두고 주문할지 물어볼 때와 묻지 않고 바로 주문할 때, 상품의 종류에 따라 소비자의 평가가 어떻게 달라지는지 알아보기 위한 것입니다. 참가자마다 두 방식 중 하나를 무작위로 보여 드렸으며, 실제 주문이나 결제는 이루어지지 않았습니다. 알림 문구는 생성형 AI가 작성한 것입니다.</p></div>`);
    if ($("#dl")) $("#dl").onclick = () => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" })); a.download = `${S.pid}.json`; a.click();
    };
    $("#skip").onclick = () => render(`<h1>감사합니다</h1><div class="card"><p>모든 응답이 끝났습니다. 창을 닫으셔도 됩니다.</p></div>`);
    $("#send").onclick = async () => {
      const ph = val("phone").replace(/[^0-9]/g, "");
      if (!/^01[0-9]{8,9}$/.test(ph)) { $("#err").textContent = "휴대전화 번호를 확인해 주세요."; return; }
      if (!$("#pc").checked) { $("#err").textContent = "연락처 수집에 동의해 주세요."; return; }
      $("#send").disabled = true;
      await post({ type: "contact", study: C.STUDY_ID, pid: S.pid, phone: ph, test: S.test ? 1 : 0, at: new Date().toISOString() });
      render(`<h1>감사합니다</h1><div class="card"><p>추첨 응모가 완료되었습니다. 설문 마감 후 추첨하여 당첨되신 분께 기프티콘을 보내 드리겠습니다. 창을 닫으셔도 됩니다.</p></div>`);
    };
  }

  pageConsent();
})();

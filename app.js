/* 연구 2: AI 쇼핑 비서 실험
   피험자 간: 인터페이스(추천 / 확인 후 구매 / 자동구매)
   피험자 내: 부패성(신선 / 저장) × 예측가능성(규칙적 / 불규칙 이력), 칸마다 4회, 총 16회 */
(function () {
  "use strict";
  const C = window.CONFIG;
  const app = document.getElementById("app");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const now = () => Date.now();
  const rnd = () => Math.random();
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (x) => (Math.round(x * 10) / 10).toLocaleString("ko-KR", { maximumFractionDigits: 1 });

  const url = new URL(location.href);
  const CONDS = ["recommend", "confirm", "auto"];
  const COND_KO = { recommend: "추천", confirm: "확인 후 구매", auto: "자동구매" };

  const PRODUCTS = {
    straw: { key: "straw", name: "딸기",   unit: "500g 1팩",     perish: "fresh",  ga: "가", eul: "를" },
    milk:  { key: "milk",  name: "우유",   unit: "900mL × 2팩",  perish: "fresh",  ga: "가", eul: "를" },
    water: { key: "water", name: "생수",   unit: "500mL × 20병", perish: "stable", ga: "가", eul: "를" },
    rice:  { key: "rice",  name: "즉석밥", unit: "210g × 5개",   perish: "stable", ga: "이", eul: "을" }
  };
  const PKEYS = ["straw", "milk", "water", "rice"];

  // ---------- 상태 ----------
  const S = {
    pid: "P" + now().toString(36).toUpperCase() + Math.floor(rnd() * 1e6).toString(36).toUpperCase(),
    panel_id: url.searchParams.get("pid") || "",
    test: url.searchParams.get("test") === "1",
    cond: null, assign_method: "",
    t_start: now(), t_trials_start: null, t_trials_end: null,
    pre: {}, comp_attempts: 0, trials: [], post: {}, choice: {}, manip: {},
    att1: null, att2: null, score: C.START_POINTS, submitted: false
  };

  // ---------- 진행 표시 ----------
  const STEPS = ["consent", "pre", "intro", "quiz", "trials", "post", "choice", "manip", "done"];
  function progress(step, sub) {
    const i = STEPS.indexOf(step);
    let frac = i / (STEPS.length - 1);
    if (step === "trials" && sub != null) frac = (i + sub / 16) / (STEPS.length - 1);
    $("#progress").style.width = Math.round(frac * 100) + "%";
    $("#progress-label").textContent = step === "trials" && sub != null ? `쇼핑 ${Math.min(sub + 1, 16)} / 16` : "";
  }
  function render(html) { app.innerHTML = html; window.scrollTo(0, 0); }

  // ---------- 공통 문항 요소 ----------
  function radios(name, opts) {
    return opts.map((o, i) => `<label class="opt"><input type="radio" name="${name}" value="${esc(o[0])}" id="${name}_${i}"><span>${o[1]}</span></label>`).join("");
  }
  function likert(name, left, right) {
    let h = `<div class="likert" role="radiogroup">`;
    for (let v = 1; v <= 7; v++) h += `<label><input type="radio" name="${name}" value="${v}">${v}</label>`;
    return h + `</div><div class="likert-ends"><span>${left}</span><span>${right}</span></div>`;
  }
  const val = (name) => { const el = $(`input[name="${name}"]:checked`) || $(`[name="${name}"]`); if (!el) return ""; if (el.type === "radio") return el.checked ? el.value : ""; return el.value.trim(); };
  function requireAll(names) {
    const miss = names.filter((n) => val(n) === "");
    return miss;
  }

  // ---------- 1. 동의 ----------
  function pageConsent() {
    progress("consent");
    render(`
      <h1>온라인 식료품 쇼핑과 AI 쇼핑 비서에 관한 연구</h1>
      <div class="card">
        <p>안녕하세요. 이 연구는 AI 쇼핑 비서가 온라인 식료품 쇼핑을 도울 때 소비자가 어떻게 판단하는지 알아보기 위한 것입니다.</p>
        <ul class="tight">
          <li>소요 시간: 약 12~15분</li>
          <li>내용: 간단한 배경 질문, 가상 온라인 쇼핑 16회, 쇼핑 경험에 관한 질문</li>
          <li>보상: ${esc(C.REWARD_TEXT)}</li>
          <li>참여 여부는 자유롭게 결정하실 수 있으며, 언제든 창을 닫아 중단할 수 있습니다. 중단하면 응답은 저장되지 않습니다.</li>
          <li>응답은 연구 목적으로만 사용되며, 분석 자료에는 이름이나 연락처가 포함되지 않습니다. 기프티콘 발송을 위한 연락처는 마지막에 따로 받고 발송 후 파기합니다.</li>
          <li>만 19세 이상만 참여할 수 있습니다.</li>
        </ul>
        <p class="muted">연구자: ${esc(C.RESEARCHERS)} · 문의: ${esc(C.CONTACT_EMAIL)}${C.IRB_TEXT ? " · " + esc(C.IRB_TEXT) : ""}</p>
        <label class="opt"><input type="checkbox" id="agree"><span>위 내용을 읽었으며 연구 참여에 동의합니다.</span></label>
        <div class="nav"><button class="btn" id="next" disabled>시작하기</button></div>
      </div>`);
    $("#agree").onchange = (e) => ($("#next").disabled = !e.target.checked);
    $("#next").onclick = pagePre;
  }

  // ---------- 2. 사전 설문 (무작위 배정 전) ----------
  function pagePre() {
    progress("pre");
    render(`
      <h1>먼저 몇 가지 여쭤볼게요</h1>
      <div class="card">
        <div class="q"><div class="q-title">1. 만 나이</div><input type="number" name="age" min="1" max="110" inputmode="numeric" placeholder="예: 27"></div>
        <div class="q"><div class="q-title">2. 성별</div>${radios("gender", [["M", "남성"], ["F", "여성"], ["NA", "응답하지 않음"]])}</div>
        <div class="q"><div class="q-title">3. 최종 학력</div>${radios("edu", [["hs", "고등학교 졸업 이하"], ["col_in", "대학 재학"], ["col", "대학 졸업"], ["grad", "대학원 재학 이상"]])}</div>
        <div class="q"><div class="q-title">4. 함께 사는 가구원 수 (본인 포함)</div>${radios("hh", [["1", "1명"], ["2", "2명"], ["3", "3명"], ["4", "4명"], ["5", "5명 이상"]])}</div>
        <div class="q"><div class="q-title">5. 집에서 식료품 구매는 주로 누가 하나요?</div>${radios("shopper", [["self", "주로 내가 한다"], ["shared", "다른 가구원과 비슷하게 나누어 한다"], ["other", "주로 다른 가구원이 한다"]])}</div>
        <div class="q"><div class="q-title">6. 최근 한 달 동안 온라인으로 식료품을 구매한 횟수</div>${radios("online", [["0", "없음"], ["1-2", "1~2회"], ["3-4", "3~4회"], ["5+", "5회 이상"]])}</div>
        <div class="q"><div class="q-title">7. 가구의 월평균 식료품 지출</div>${radios("spend", [["<20", "20만 원 미만"], ["20-40", "20~40만 원"], ["40-60", "40~60만 원"], ["60-80", "60~80만 원"], ["80+", "80만 원 이상"], ["dk", "잘 모르겠다"]])}</div>
        <div class="q"><div class="q-title">8. AI 쇼핑 비서를 이용해 본 경험 (쇼핑 앱의 AI 추천·대화형 상담, ChatGPT 등으로 상품 찾기 포함)</div>${radios("ai", [["none", "이용해 본 적 없다"], ["some", "몇 번 이용해 봤다"], ["often", "자주 이용한다"]])}</div>
        <div class="err" id="err"></div>
        <div class="nav"><button class="btn" id="next">다음</button></div>
      </div>`);
    $("#next").onclick = () => {
      const names = ["age", "gender", "edu", "hh", "shopper", "online", "spend", "ai"];
      const miss = requireAll(names);
      if (miss.length) { $("#err").textContent = "모든 문항에 답해 주세요."; return; }
      const age = parseInt(val("age"), 10);
      if (!(age >= 1 && age <= 110)) { $("#err").textContent = "나이를 숫자로 입력해 주세요."; return; }
      names.forEach((n) => (S.pre[n] = val(n)));
      if (age < 19) return pageIneligible();
      assignCondition().then(pageIntro);
    };
  }
  function pageIneligible() {
    render(`<h1>참여해 주셔서 감사합니다</h1><div class="card"><p>이 연구는 만 19세 이상만 참여할 수 있어 여기서 마칩니다. 응답은 저장되지 않았습니다.</p></div>`);
  }

  // ---------- 무작위 배정 ----------
  async function assignCondition() {
    const forced = url.searchParams.get("c");
    if (CONDS.includes(forced)) { S.cond = forced; S.assign_method = "url"; return; }
    if (C.ENDPOINT) {
      try {
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 3500);
        const r = await fetch(C.ENDPOINT + "?action=counts", { signal: ctl.signal });
        clearTimeout(to);
        const cnt = await r.json();
        const min = Math.min(...CONDS.map((c) => cnt[c] || 0));
        const cands = CONDS.filter((c) => (cnt[c] || 0) === min);
        S.cond = cands[Math.floor(rnd() * cands.length)]; S.assign_method = "balanced"; return;
      } catch (e) { /* 실패 시 단순 무작위 */ }
    }
    S.cond = CONDS[Math.floor(rnd() * 3)]; S.assign_method = "random";
  }

  // ---------- 자극 구성 ----------
  function buildTrials() {
    const reg = shuffle(window.HISTORIES.filter((h) => h.grp === "regular")).slice(0, 8);
    const irr = shuffle(window.HISTORIES.filter((h) => h.grp === "irregular")).slice(0, 8);
    const cells = [];
    [["fresh", ["straw", "straw", "milk", "milk"]], ["stable", ["water", "water", "rice", "rice"]]].forEach(([perish, prods]) => {
      [["high", reg], ["mid", irr]].forEach(([pred, pool]) => {
        shuffle(prods).forEach((pk) => {
          const h = pool.shift();
          const p = pred === "high" ? C.P_NEED_REGULAR : C.P_NEED_IRREGULAR;
          cells.push({ product: pk, perish, pred, hid: h.hid, n: h.n, gaps: h.gaps, recency: h.recency, p_need: p, need: rnd() < p ? 1 : 0 });
        });
      });
    });
    return shuffle(cells);
  }

  // ---------- 구매 이력 그림 ----------
  function timelineSVG(gaps, recency) {
    const pts = [-recency]; for (let i = gaps.length - 1; i >= 0; i--) pts.unshift(pts[0] - gaps[i]);
    const minD = pts[0], W = 340, H = 64, L = 14, R = 26;
    const x = (d) => L + ((d - minD) / (0 - minD)) * (W - L - R);
    let s = `<svg class="timeline" viewBox="0 0 ${W} ${H}" role="img" aria-label="구매 시점">`;
    s += `<line x1="${L}" y1="30" x2="${W - R}" y2="30" stroke="#cfccc4" stroke-width="2"/>`;
    for (let i = 1; i < pts.length; i++) {
      const xm = (x(pts[i - 1]) + x(pts[i])) / 2, w = x(pts[i]) - x(pts[i - 1]);
      if (w >= 18) s += `<text x="${xm}" y="20" text-anchor="middle" font-size="${w >= 26 ? 11 : 9.5}" fill="#5d5d5a">${pts[i] - pts[i - 1]}일</text>`;
    }
    pts.forEach((d) => (s += `<circle cx="${x(d)}" cy="30" r="4.5" fill="#1b1b1b"/>`));
    const xl = x(pts[pts.length - 1]), xt = x(0);
    s += `<line x1="${xl}" y1="30" x2="${xt}" y2="30" stroke="#2f6fd6" stroke-width="2" stroke-dasharray="4 4"/>`;
    s += `<text x="${(xl + xt) / 2}" y="20" text-anchor="middle" font-size="11" fill="#2f6fd6" font-weight="700">${recency}일</text>`;
    s += `<line x1="${xt}" y1="21" x2="${xt}" y2="39" stroke="#2f6fd6" stroke-width="2.5"/>`;
    s += `<text x="${xt}" y="55" text-anchor="middle" font-size="11" fill="#2f6fd6" font-weight="700">오늘</text>`;
    s += `<text x="${x(pts[0])}" y="55" text-anchor="middle" font-size="10" fill="#5d5d5a">과거</text>`;
    return s + `</svg>`;
  }
  function historyBlock(t) {
    return `<div class="hist">
      <div class="q-title" style="margin:0">이 상품의 구매 기록</div>
      <div class="hist-stats"><span class="chip">지금까지 ${t.n}번 구매</span><span class="chip">마지막 구매 ${t.recency}일 전</span></div>
      ${timelineSVG(t.gaps, t.recency)}
      <div class="gaps">최근 구매 간격 <b>${t.gaps.map((g) => g + "일").join(" → ")}</b></div>
      <div class="muted small">점은 최근 여섯 번의 구매 시점이고, 파란 점선은 마지막 구매 후 지난 기간입니다.</div></div>`;
  }
  function productHead(pk) {
    const p = PRODUCTS[pk];
    // 사진(photos/키.jpg)이 있으면 사진을, 없으면 상품명 글자를 보여 준다. 색으로 신선/저장 구분을 드러내지 않는다.
    return `<div class="product"><div class="thumb"><span>${esc(p.name)}</span><img src="photos/${p.key}.jpg" alt="${esc(p.name)}" onerror="this.remove()"></div>
      <div><div class="pname">${esc(p.name)}</div><div class="pmeta">${esc(p.unit)} · ${esc(C.PRICE)}</div></div></div>`;
  }
  function agentMsg(cond, pk) {
    const p = PRODUCTS[pk];
    if (cond === "recommend") return `${p.name}${p.eul} 다시 구매하실 때가 된 것 같아요.`;
    if (cond === "confirm") return `평소 구매하시던 ${p.name}${p.eul} 장바구니에 담아 두었어요. 이번 주에 필요하신가요?`;
    return `평소 구매하시던 ${p.name}${p.eul} 이번 주 배송으로 주문했어요.`;
  }

  // ---------- 3. 안내 ----------
  function pageIntro() {
    progress("intro");
    const ex = { product: "milk", n: 12, gaps: [7, 8, 7, 6, 8], recency: 7 };
    const how = {
      recommend: `<p>AI 비서는 상품을 <b>추천</b>만 합니다. 구매하려면 직접 <b>[장바구니에 담기]</b>를 눌러야 하며, 담지 않으면 구매되지 않습니다.</p>`,
      confirm: `<p>AI 비서는 상품을 장바구니에 담아 두고 <b>구매 여부를 물어봅니다</b>. <b>[네, 필요해요]</b>라고 답해야 구매되며, <b>[아니요, 빼 주세요]</b>라고 답하면 구매되지 않습니다. 질문에 답할 때마다 0.5점이 차감됩니다.</p>`,
      auto: `<p>AI 비서는 상품을 <b>자동으로 주문</b>합니다. 아무것도 하지 않으면 그대로 구매됩니다. 필요 없다면 <b>[주문 내역 보기]</b>를 눌러 주문을 취소할 수 있습니다.</p>`
    }[S.cond];
    render(`
      <h1>쇼핑 방법 안내</h1>
      <div class="card">
        <p>지금부터 가상 온라인 쇼핑을 <b>16번</b> 진행합니다. 매번 AI 쇼핑 비서가 상품 하나를 제안하며, 화면에는 그 상품을 과거에 언제 구매했는지가 함께 표시됩니다.</p>
        ${how}
        <div class="box"><b>점수 규칙</b> · ${C.START_POINTS}점으로 시작합니다.
          <ul class="tight">
            <li>이번 주에 <b>필요 없는 상품을 구매하면</b> −${C.PENALTY_WRONG}점</li>
            <li>이번 주에 <b>필요한 상품을 구매하지 않으면</b> −${C.PENALTY_WRONG}점</li>
            <li><b>[집 재고 확인하기]</b>를 누르면 이번 주에 필요한지 정확히 알 수 있으나, 누를 때마다 −${fmt(C.PENALTY_CHECK)}점</li>
            ${S.cond === "confirm" ? `<li>AI 비서의 질문에 답할 때마다 −${fmt(C.PENALTY_CHECK)}점</li>` : ""}
          </ul>
          ${esc(C.REWARD_TEXT)}
        </div>
        <p class="muted">쇼핑 화면 예시</p>
        <div class="example">
          ${productHead(ex.product)}
          ${historyBlock(ex)}
          <div class="agent" style="margin-top:12px"><div class="agent-av">AI</div><div class="bubble">${esc(agentMsg(S.cond, ex.product))}</div></div>
        </div>
        <p>구매 간격이 일정하면 이번 주에도 필요할 가능성이 높지만, 항상 그렇지는 않습니다. 매번 결정 후에 결과를 알려 드립니다.</p>
        <div class="nav"><button class="btn" id="next">이해했어요</button></div>
      </div>`);
    $("#next").onclick = pageQuiz;
  }

  // ---------- 4. 이해 확인 ----------
  function pageQuiz() {
    progress("quiz");
    const q3 = {
      recommend: ["AI 비서가 추천한 상품을 장바구니에 담지 않으면?", [["no", "구매되지 않는다"], ["yes", "구매된다"]], "no"],
      confirm: ["AI 비서의 질문에 '네'라고 답하지 않으면?", [["no", "구매되지 않는다"], ["yes", "구매된다"]], "no"],
      auto: ["AI 비서가 주문한 상품에 대해 아무것도 하지 않으면?", [["no", "구매되지 않는다"], ["yes", "구매된다"]], "yes"]
    }[S.cond];
    render(`
      <h1>잠깐, 규칙을 확인할게요</h1>
      <div class="card">
        <div class="q"><div class="q-title">1. 이번 주에 필요 없는 상품을 구매하면 몇 점이 차감되나요?</div>${radios("q1", [["0", "0점"], ["0.5", "0.5점"], ["5", "5점"]])}</div>
        <div class="q"><div class="q-title">2. 이번 주에 필요한 상품을 구매하지 않으면 몇 점이 차감되나요?</div>${radios("q2", [["0", "0점"], ["0.5", "0.5점"], ["5", "5점"]])}</div>
        <div class="q"><div class="q-title">3. ${q3[0]}</div>${radios("q3", q3[1])}</div>
        <div class="err" id="err"></div>
        <div class="nav"><button class="btn" id="next">확인</button></div>
      </div>`);
    $("#next").onclick = () => {
      if (requireAll(["q1", "q2", "q3"]).length) { $("#err").textContent = "모든 문항에 답해 주세요."; return; }
      S.comp_attempts++;
      if (val("q1") === "5" && val("q2") === "5" && val("q3") === q3[2]) return startTrials();
      $("#err").textContent = "틀린 답이 있어요. 안내를 다시 보고 답해 주세요.";
      if (S.comp_attempts >= 2) { $("#err").innerHTML += ` <a href="#" id="back">안내 다시 보기</a>`; $("#back").onclick = (e) => { e.preventDefault(); pageIntro(); }; }
    };
  }

  // ---------- 5. 쇼핑 16회 ----------
  let TR = [];
  function startTrials() {
    TR = buildTrials(); S.t_trials_start = now();
    window.addEventListener("beforeunload", warnLeave);
    trial(0);
  }
  function warnLeave(e) { if (!S.submitted) { e.preventDefault(); e.returnValue = ""; } }

  function trial(i) {
    if (i >= TR.length) { S.t_trials_end = now(); return pagePost(); }
    progress("trials", i);
    const t = TR[i], cond = S.cond, p = PRODUCTS[t.product];
    const rec = { idx: i + 1, product: t.product, perish: t.perish, pred: t.pred, hid: t.hid, n: t.n, gaps: t.gaps.join("-"), recency: t.recency,
      p_need: t.p_need, need: t.need, checked: 0, answered: 0, order_opened: 0, canceled: 0, added: 0, purchased: null, kept_default: null,
      clicks: 0, t_shown: now(), rt_ms: null, t_check_ms: null, delta: 0 };
    let decided = false;

    let actions = "";
    if (cond === "recommend") actions = `<div class="row"><button class="btn" data-a="add">장바구니에 담기</button><button class="btn ghost" data-a="skip">담지 않기</button></div>`;
    if (cond === "confirm") actions = `<div class="row"><button class="btn" data-a="yes">네, 필요해요</button><button class="btn ghost" data-a="no">아니요, 빼 주세요</button></div>`;
    if (cond === "auto") actions = `<div class="status on" id="ostat">주문 완료 · 이번 주 배송 예정</div>
      <div class="row" style="margin-top:10px"><button class="btn ghost" data-a="open">주문 내역 보기</button><button class="btn" data-a="next">다음으로</button></div>
      <div id="opanel"></div>`;

    render(`
      <div class="trial-head"><span class="muted">쇼핑 ${i + 1} / ${TR.length}</span><span class="score-pill">현재 ${fmt(S.score)}점</span></div>
      <div class="card">
        ${productHead(t.product)}
        ${historyBlock(t)}
      </div>
      <div class="card">
        <div class="agent"><div class="agent-av">AI</div><div class="bubble">${esc(agentMsg(cond, t.product))}</div></div>
        <div style="margin-top:14px">${actions}</div>
        <div style="margin-top:12px"><button class="btn ghost block" data-a="check">집 재고 확인하기 (−${fmt(C.PENALTY_CHECK)}점)</button></div>
        <div id="checkres"></div>
      </div>
      <div id="fb"></div>`);

    app.addEventListener("click", onClick);
    function onClick(e) {
      const b = e.target.closest("[data-a]"); if (!b || decided) return;
      rec.clicks++;
      const a = b.dataset.a;
      if (a === "check") {
        if (rec.checked) return;
        rec.checked = 1; rec.t_check_ms = now() - rec.t_shown; b.disabled = true;
        $("#checkres").innerHTML = t.need
          ? `<div class="check-result need">${esc(p.name)}${p.ga} 거의 다 떨어졌어요. <b>이번 주에 필요해요.</b></div>`
          : `<div class="check-result noneed">${esc(p.name)}${p.ga} 아직 충분히 남아 있어요. <b>이번 주에는 필요 없어요.</b></div>`;
        return;
      }
      if (a === "open") {
        rec.order_opened = 1; b.disabled = true;
        $("#opanel").innerHTML = `<div class="order-panel"><div class="small muted">주문 내역</div><div style="margin:4px 0 10px">${esc(p.name)} ${esc(p.unit)} · ${esc(C.PRICE)}</div><button class="btn danger" data-a="cancel">이 상품 주문 취소</button></div>`;
        return;
      }
      if (a === "cancel") {
        rec.canceled = 1; b.disabled = true; b.textContent = "취소됨";
        $("#ostat").className = "status off"; $("#ostat").textContent = "주문 취소 · 이번 주 배송에서 제외";
        return;
      }
      if (cond === "recommend" && (a === "add" || a === "skip")) { rec.added = a === "add" ? 1 : 0; rec.purchased = rec.added; rec.kept_default = rec.added; }
      else if (cond === "confirm" && (a === "yes" || a === "no")) { rec.answered = 1; rec.purchased = a === "yes" ? 1 : 0; rec.kept_default = rec.purchased; }
      else if (cond === "auto" && a === "next") { rec.purchased = rec.canceled ? 0 : 1; rec.kept_default = rec.purchased; }
      else return;
      decided = true; rec.rt_ms = now() - rec.t_shown;
      $$("[data-a]").forEach((x) => (x.disabled = true));
      finish();
    }
    function finish() {
      let d = 0; const lines = [];
      if (rec.checked) { d -= C.PENALTY_CHECK; lines.push(`재고 확인 −${fmt(C.PENALTY_CHECK)}점`); }
      if (rec.answered) { d -= C.PENALTY_CHECK; lines.push(`질문 응답 −${fmt(C.PENALTY_CHECK)}점`); }
      let title, cls;
      if (rec.purchased && t.need) { title = "필요한 상품을 구매했어요."; cls = "good"; }
      else if (rec.purchased && !t.need) { title = "필요 없는 상품을 구매했어요."; cls = "bad"; d -= C.PENALTY_WRONG; lines.unshift(`필요 없는 구매 −${C.PENALTY_WRONG}점`); }
      else if (!rec.purchased && t.need) { title = "필요한 상품을 구매하지 않았어요."; cls = "bad"; d -= C.PENALTY_WRONG; lines.unshift(`필요한 상품 미구매 −${C.PENALTY_WRONG}점`); }
      else { title = "필요 없는 상품을 구매하지 않았어요."; cls = "good"; }
      rec.delta = d; S.score += d; rec.score_after = S.score;
      delete rec.t_shown; S.trials.push(rec);
      app.removeEventListener("click", onClick);
      $("#fb").innerHTML = `<div class="card"><div class="fb ${cls}"><div class="fb-title">${title}</div>
        <div class="small">이번 주에 실제로 ${t.need ? "필요했어요" : "필요 없었어요"}. ${lines.length ? lines.join(" · ") : "감점 없음"}</div>
        <div class="small" style="margin-top:4px">현재 점수 <b>${fmt(S.score)}점</b></div></div>
        <div class="nav"><button class="btn" id="nx">${i + 1 < TR.length ? "다음 쇼핑" : "쇼핑 마치기"}</button></div></div>`;
      $("#fb").scrollIntoView({ behavior: "smooth", block: "start" });
      $("#nx").onclick = () => trial(i + 1);
    }
  }

  // ---------- 6. 사후 평가 (상품별) ----------
  const POST_ITEMS = [
    ["waste", "이 상품이 필요 없을 때 배송되면 결국 버리게 될 것 같다."],
    ["control", "이번 쇼핑에서 이 상품의 구매 여부는 내가 결정한다고 느꼈다."],
    ["trust", "이 상품에 대해서는 AI 비서의 판단을 믿을 수 있다."],
    ["intrusive", "AI 비서가 이 상품의 구매에 개입하는 것이 불편했다."],
    ["intent", "앞으로 이 상품의 구매를 AI 비서에게 맡길 의향이 있다."]
  ];
  function pagePost() {
    progress("post");
    const order = shuffle(PKEYS); S.post_order = order.join("-");
    let blocks = order.map((pk, bi) => {
      const items = shuffle(POST_ITEMS);
      let h = `<div class="card"><div style="margin-bottom:12px">${productHead(pk)}</div>`;
      items.forEach(([k, text], ii) => {
        h += `<div class="q"><div class="q-title">${esc(text)}</div>${likert(`post_${pk}_${k}`, "전혀 그렇지 않다", "매우 그렇다")}</div>`;
        if (bi === 1 && ii === 2) h += `<div class="q"><div class="q-title">응답 확인을 위한 문항입니다. 이 문항에는 2를 선택해 주세요.</div>${likert("att1", "전혀 그렇지 않다", "매우 그렇다")}</div>`;
      });
      return h + `</div>`;
    }).join("");
    render(`<h1>방금 하신 쇼핑에 대해 여쭤볼게요</h1><p class="muted">각 문장에 얼마나 동의하는지 1(전혀 그렇지 않다)부터 7(매우 그렇다) 사이에서 골라 주세요.</p>${blocks}
      <div class="err" id="err"></div><div class="nav"><button class="btn" id="next">다음</button></div>`);
    $("#next").onclick = () => {
      const names = []; PKEYS.forEach((pk) => POST_ITEMS.forEach(([k]) => names.push(`post_${pk}_${k}`))); names.push("att1");
      if (requireAll(names).length) { $("#err").textContent = "응답하지 않은 문항이 있어요."; return; }
      names.forEach((n) => (n === "att1" ? (S.att1 = +val(n)) : (S.post[n] = +val(n))));
      pageChoice();
    };
  }

  // ---------- 7. 위임 선택 ----------
  function pageChoice() {
    progress("choice");
    const opts = [["recommend", "추천만 해 주세요 (구매는 내가 결정)"], ["confirm", "장바구니에 담아 두고 먼저 물어봐 주세요"], ["auto", "자동으로 주문해 주세요 (필요 없으면 내가 취소)"]];
    const blocks = shuffle(PKEYS).map((pk) => `<div class="card"><div style="margin-bottom:10px">${productHead(pk)}</div>${radios(`choice_${pk}`, opts)}</div>`).join("");
    render(`<h1>이 서비스를 실제로 이용한다면</h1><p>상품마다 AI 비서가 어떤 방식으로 도와주기를 원하시나요? 방금 쇼핑에서 이용한 방식과 달라도 괜찮습니다.</p>${blocks}
      <div class="err" id="err"></div><div class="nav"><button class="btn" id="next">다음</button></div>`);
    $("#next").onclick = () => {
      const names = PKEYS.map((pk) => `choice_${pk}`);
      if (requireAll(names).length) { $("#err").textContent = "네 상품 모두 골라 주세요."; return; }
      names.forEach((n) => (S.choice[n] = val(n)));
      pageManip();
    };
  }

  // ---------- 8. 조작 점검 ----------
  function pageManip() {
    progress("manip");
    const ra = { gaps: [7, 8, 7, 6, 8], recency: 7 }, rb = { gaps: [7, 12, 24, 7, 44], recency: 20 };
    const two = shuffle([["A", ra, "reg"], ["B", rb, "irr"]]);
    S.manip_hist_order = two.map((x) => x[2]).join("-");
    let h = `<h1>마지막 질문입니다</h1><div class="card"><div class="q-title" style="margin-bottom:8px">각 상품은 구매 후 얼마나 오래 보관하며 먹을 수 있다고 생각하시나요?</div>`;
    shuffle(PKEYS).forEach((pk) => { h += `<div class="q"><div class="q-title">${esc(PRODUCTS[pk].name)} (${esc(PRODUCTS[pk].unit)})</div>${likert(`shelf_${pk}`, "매우 짧다", "매우 길다")}</div>`; });
    h += `</div><div class="card"><div class="q-title" style="margin-bottom:8px">아래 두 구매 기록은 구매 간격이 얼마나 일정한가요?</div>`;
    two.forEach(([lab, hh, code]) => { h += `<div class="q"><div class="q-title">기록 ${lab}</div>${timelineSVG(hh.gaps, hh.recency)}${likert(`regular_${code}`, "매우 불규칙하다", "매우 규칙적이다")}</div>`; });
    h += `<div class="q"><div class="q-title">응답 확인을 위한 문항입니다. 이 문항에는 7을 선택해 주세요.</div>${likert("att2", "매우 불규칙하다", "매우 규칙적이다")}</div></div>
      <div class="card"><div class="q-title">쇼핑하면서 어떤 기준으로 결정하셨는지 자유롭게 적어 주세요. (선택)</div><input type="text" name="comment" maxlength="400"></div>
      <div class="err" id="err"></div><div class="nav"><button class="btn" id="next">제출하기</button></div>`;
    render(h);
    $("#next").onclick = () => {
      const names = PKEYS.map((pk) => `shelf_${pk}`).concat(["regular_reg", "regular_irr", "att2"]);
      if (requireAll(names).length) { $("#err").textContent = "응답하지 않은 문항이 있어요."; return; }
      names.forEach((n) => (n === "att2" ? (S.att2 = +val(n)) : (S.manip[n] = +val(n))));
      S.manip.comment = val("comment");
      submitMain();
    };
  }

  // ---------- 제출 ----------
  function payload() {
    const t_end = now();
    const flat = {
      type: "response", study: C.STUDY_ID, version: C.VERSION, pid: S.pid, panel_id: S.panel_id, test: S.test ? 1 : 0,
      cond: S.cond, assign_method: S.assign_method,
      started_at: new Date(S.t_start).toISOString(), finished_at: new Date(t_end).toISOString(),
      duration_sec: Math.round((t_end - S.t_start) / 1000), trials_sec: Math.round((S.t_trials_end - S.t_trials_start) / 1000),
      comp_attempts: S.comp_attempts, att1: S.att1, att2: S.att2, att_pass: S.att1 === 2 && S.att2 === 7 ? 1 : 0,
      final_score: S.score, post_order: S.post_order, manip_hist_order: S.manip_hist_order,
      user_agent: navigator.userAgent.slice(0, 180), screen_w: window.innerWidth
    };
    Object.entries(S.pre).forEach(([k, v]) => (flat["pre_" + k] = v));
    Object.assign(flat, S.post, S.choice, S.manip);
    ["fresh", "stable"].forEach((pe) => ["high", "mid"].forEach((pr) => {
      const xs = S.trials.filter((r) => r.perish === pe && r.pred === pr);
      flat[`buy_${pe}_${pr}`] = xs.reduce((a, r) => a + r.purchased, 0);
      flat[`fp_${pe}_${pr}`] = xs.filter((r) => r.purchased && !r.need).length;
      flat[`fn_${pe}_${pr}`] = xs.filter((r) => !r.purchased && r.need).length;
      flat[`check_${pe}_${pr}`] = xs.reduce((a, r) => a + r.checked, 0);
    }));
    flat.trials = S.trials;
    return flat;
  }
  async function post(data) {
    if (!C.ENDPOINT) return false;
    try {
      await fetch(C.ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
      return true;
    } catch (e) { return false; }
  }
  async function submitMain() {
    render(`<div class="card center"><p>응답을 저장하고 있어요…</p></div>`);
    const data = payload();
    let ok = await post(data); if (!ok && C.ENDPOINT) ok = await post(data);
    S.submitted = true; window.removeEventListener("beforeunload", warnLeave);
    pageDone(ok, data);
  }

  // ---------- 9. 완료 + 연락처 ----------
  function pageDone(ok, data) {
    progress("done");
    const dl = !ok ? `<div class="box">${C.ENDPOINT ? "응답 저장에 실패했어요. 아래 버튼으로 파일을 저장해 연구자 이메일로 보내 주세요." : "테스트 모드: 저장 주소가 설정되지 않아 응답이 저장되지 않았습니다."}
      <div style="margin-top:8px"><button class="btn ghost" id="dl">응답 파일 저장</button></div></div>` : "";
    render(`
      <h1>참여해 주셔서 감사합니다</h1>
      <div class="card center"><div class="muted">최종 점수</div><div class="big">${fmt(S.score)}점</div><div class="muted small">참여 번호 ${esc(S.pid)}</div></div>
      ${dl}
      <div class="card">
        <div class="q-title">기프티콘 받으실 연락처</div>
        <p class="muted small">${esc(C.REWARD_TEXT)} 연락처는 응답 자료와 따로 저장되며, 기프티콘 발송 후 파기합니다.</p>
        <input type="tel" name="phone" placeholder="010-0000-0000" inputmode="tel" maxlength="20">
        <label class="opt" style="margin-top:10px"><input type="checkbox" id="pc"><span>기프티콘 발송을 위한 휴대전화 번호 수집·이용에 동의합니다.</span></label>
        <div class="err" id="err"></div>
        <div class="row" style="margin-top:12px"><button class="btn" id="send">연락처 제출</button><button class="btn ghost" id="skip">보상 없이 마치기</button></div>
      </div>
      <div class="card"><div class="q-title">연구 안내</div><p class="small muted">이 연구는 AI 쇼핑 비서가 상품을 추천만 할 때, 장바구니에 담아 두고 물어볼 때, 자동으로 주문할 때 소비자의 판단과 결과가 어떻게 달라지는지 알아보기 위한 것입니다. 쇼핑 중 제시된 상품의 필요 여부는 미리 정해 둔 확률에 따라 무작위로 정해졌습니다.</p></div>`);
    if ($("#dl")) $("#dl").onclick = () => {
      const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${S.pid}.json`; a.click();
    };
    $("#skip").onclick = () => render(`<h1>감사합니다</h1><div class="card"><p>모든 응답이 끝났습니다. 창을 닫으셔도 됩니다.</p></div>`);
    $("#send").onclick = async () => {
      const ph = val("phone").replace(/[^0-9]/g, "");
      if (!/^01[0-9]{8,9}$/.test(ph)) { $("#err").textContent = "휴대전화 번호를 확인해 주세요."; return; }
      if (!$("#pc").checked) { $("#err").textContent = "연락처 수집에 동의해 주세요."; return; }
      $("#send").disabled = true;
      await post({ type: "contact", study: C.STUDY_ID, pid: S.pid, phone: ph, final_score: S.score, test: S.test ? 1 : 0, at: new Date().toISOString() });
      render(`<h1>감사합니다</h1><div class="card"><p>연락처가 접수되었습니다. 응답 확인 후 기프티콘을 보내 드리겠습니다. 창을 닫으셔도 됩니다.</p></div>`);
    };
  }

  pageConsent();
})();

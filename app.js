/* 연구 2: AI 쇼핑 비서 시나리오 실험
   설계: 2(인터페이스: 확인 후 구매 / 자동구매, 피험자 간) × 2(상품: 신선식품 / 저장식품, 피험자 내)
   - 신선식품은 딸기·우유 중 하나, 저장식품은 생수·즉석밥 중 하나를 무작위로 제시(자극 표집)
   - 두 시나리오의 순서는 무작위
   - 구매 이력(예측가능성)은 모든 시나리오에서 "일정한 간격으로 꾸준히 구매"로 고정 */
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
  const PRODUCTS = {
    straw: { key: "straw", name: "딸기",   unit: "500g 1팩",     perish: "fresh",  eul: "를" },
    milk:  { key: "milk",  name: "우유",   unit: "900mL × 2팩",  perish: "fresh",  eul: "를" },
    water: { key: "water", name: "생수",   unit: "500mL × 20병", perish: "stable", eul: "를" },
    rice:  { key: "rice",  name: "즉석밥", unit: "210g × 5개",   perish: "stable", eul: "을" }
  };

  // 시나리오별 문항 (7점 척도)
  const ITEMS = [
    ["accept1", "이 상품을 AI 비서가 이렇게 처리하는 방식이 마음에 든다."],
    ["accept2", "앞으로도 이 상품은 이 방식으로 AI 비서에게 맡기고 싶다."],
    ["waste1", "이 상품이 필요 없을 때 배송되면 결국 버리게 될 것 같다."],
    ["waste2", "이 상품은 남으면 오래 보관하기 어렵다."]
  ];

  const S = {
    pid: "P" + now().toString(36).toUpperCase() + Math.floor(rnd() * 1e6).toString(36).toUpperCase(),
    panel_id: url.searchParams.get("pid") || "",
    test: url.searchParams.get("test") === "1",
    cond: null, assign_method: "", order: [], t_start: now(),
    pre: {}, scen: [], choice: {}, manip: {}, att: null, submitted: false
  };

  // ---------- 공통 ----------
  const STEPS = ["consent", "pre", "intro", "s1", "s2", "after", "done"];
  function progress(step) {
    const i = STEPS.indexOf(step);
    document.getElementById("progress").style.width = Math.round((i / (STEPS.length - 1)) * 100) + "%";
  }
  function render(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function radios(name, opts) {
    return opts.map((o, i) => `<label class="opt"><input type="radio" name="${name}" value="${esc(o[0])}" id="${name}_${i}"><span>${o[1]}</span></label>`).join("");
  }
  function likert(name, left, right) {
    let h = `<div class="likert" role="radiogroup">`;
    for (let v = 1; v <= 7; v++) h += `<label><input type="radio" name="${name}" value="${v}">${v}</label>`;
    return h + `</div><div class="likert-ends"><span>${left}</span><span>${right}</span></div>`;
  }
  const val = (name) => { const el = $(`input[name="${name}"]:checked`) || $(`[name="${name}"]`); if (!el) return ""; if (el.type === "radio") return el.checked ? el.value : ""; return el.value.trim(); };
  const missing = (names) => names.filter((n) => val(n) === "");
  function productCard(pk) {
    const p = PRODUCTS[pk];
    return `<div class="product"><div class="thumb"><span>${esc(p.name)}</span><img src="${p.key}.jpg" alt="${esc(p.name)}" onerror="this.remove()"></div>
      <div><div class="pname">${esc(p.name)}</div><div class="pmeta">${esc(p.unit)} · ${esc(C.PRICE)}</div></div></div>`;
  }
  function agentScreen(cond, pk) {
    const p = PRODUCTS[pk];
    if (cond === "confirm") return `<div class="phone"><div class="notif-head">AI 쇼핑 비서</div>
      <div class="bubble">평소 구매하시던 ${esc(p.name)}${p.eul} 장바구니에 담아 두었어요. 이번 주에 필요하신가요?</div>
      <div class="row mock"><span class="mbtn primary">네, 필요해요</span><span class="mbtn">아니요, 빼 주세요</span></div>
      <div class="small muted">‘네’라고 답해야 구매됩니다.</div></div>`;
    return `<div class="phone"><div class="notif-head">AI 쇼핑 비서</div>
      <div class="bubble">평소 구매하시던 ${esc(p.name)}${p.eul} 이번 주 배송으로 주문했어요.</div>
      <div class="row mock"><span class="mbtn">주문 취소</span></div>
      <div class="small muted">취소하지 않으면 그대로 배송됩니다.</div></div>`;
  }

  // ---------- 1. 동의 ----------
  function pageConsent() {
    progress("consent");
    render(`
      <h1>AI 쇼핑 비서에 관한 설문</h1>
      <div class="card">
        <p>안녕하세요. 이 설문은 AI 쇼핑 비서가 온라인 식료품 구매를 도와줄 때 소비자가 어떻게 느끼는지 알아보기 위한 연구입니다.</p>
        <ul class="tight">
          <li>소요 시간: 약 4~5분</li>
          <li>내용: 간단한 배경 질문, 쇼핑 상황 두 가지에 대한 평가</li>
          <li>보상: ${esc(C.REWARD_TEXT)}</li>
          <li>참여 여부는 자유롭게 결정하실 수 있으며, 언제든 창을 닫아 중단할 수 있습니다. 중단하면 응답은 저장되지 않습니다.</li>
          <li>응답은 연구 목적으로만 사용되며, 분석 자료에는 이름이나 연락처가 포함되지 않습니다. 기프티콘 발송을 위한 연락처는 마지막에 따로 받고 발송 후 파기합니다.</li>
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
        <div class="q"><div class="q-title">4. 최근 한 달 동안 온라인으로 식료품을 구매한 횟수</div>${radios("online", [["0", "없음"], ["1-2", "1~2회"], ["3-4", "3~4회"], ["5+", "5회 이상"]])}</div>
        <div class="q"><div class="q-title">5. AI 쇼핑 비서(쇼핑 앱의 AI 추천·상담, ChatGPT 등으로 상품 찾기)를 이용해 본 경험</div>${radios("ai", [["none", "이용해 본 적 없다"], ["some", "몇 번 이용해 봤다"], ["often", "자주 이용한다"]])}</div>
        <div class="err" id="err"></div>
        <div class="nav"><button class="btn" id="next">다음</button></div>
      </div>`);
    $("#next").onclick = () => {
      const names = ["age", "gender", "hh", "online", "ai"];
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
    S.order = shuffle([pick(["straw", "milk"]), pick(["water", "rice"])]);
  }

  // ---------- 3. 안내 ----------
  function pageIntro() {
    progress("intro");
    render(`
      <h1>상황 안내</h1>
      <div class="card">
        <p>지금부터 온라인으로 식료품을 구매하는 상황 <b>두 가지</b>를 보여 드립니다.</p>
        <p>두 상황 모두 당신은 그 상품을 지난 몇 달 동안 <b>일정한 간격으로 꾸준히 구매</b>해 왔고, 이제 평소 다시 구매하던 시점이 되었습니다. 이번 주에 그 상품이 꼭 필요한지는 아직 확인하지 않았습니다.</p>
        <p>이때 AI 쇼핑 비서가 보내는 알림을 보고, 실제 상황이라고 생각하며 질문에 답해 주세요. 정답은 없습니다.</p>
        <div class="nav"><button class="btn" id="next">첫 번째 상황 보기</button></div>
      </div>`);
    $("#next").onclick = () => pageScenario(0);
  }

  // ---------- 4. 시나리오 2개 ----------
  function pageScenario(k) {
    progress(k === 0 ? "s1" : "s2");
    const pk = S.order[k], p = PRODUCTS[pk], t0 = now();
    const items = shuffle(ITEMS);
    let qs = items.map(([id, text]) => `<div class="q"><div class="q-title">${esc(text)}</div>${likert(`s${k}_${id}`, "전혀 그렇지 않다", "매우 그렇다")}</div>`);
    if (k === 1) qs.splice(2, 0, `<div class="q"><div class="q-title">응답 확인을 위한 문항입니다. 이 문항에는 3을 선택해 주세요.</div>${likert("att", "전혀 그렇지 않다", "매우 그렇다")}</div>`);
    render(`
      <div class="muted">상황 ${k + 1} / 2</div>
      <h1>${esc(p.name)}${p.eul} 다시 구매할 때가 되었습니다</h1>
      <div class="card">
        ${productCard(pk)}
        <div class="hist-line">지난 몇 달 동안 일정한 간격으로 꾸준히 구매해 온 상품입니다.</div>
        ${agentScreen(S.cond, pk)}
      </div>
      <div class="card"><p class="muted" style="margin-bottom:14px">위 상황에 대해 각 문장에 얼마나 동의하시나요?</p>${qs.join("")}</div>
      <div class="err" id="err"></div><div class="nav"><button class="btn" id="next">${k === 0 ? "두 번째 상황 보기" : "다음"}</button></div>`);
    $("#next").onclick = () => {
      const names = ITEMS.map(([id]) => `s${k}_${id}`).concat(k === 1 ? ["att"] : []);
      if (missing(names).length) { $("#err").textContent = "응답하지 않은 문항이 있어요."; return; }
      const r = { pos: k + 1, product: pk, perish: p.perish, sec: Math.round((now() - t0) / 1000), item_order: items.map((x) => x[0]).join("-") };
      ITEMS.forEach(([id]) => (r[id] = +val(`s${k}_${id}`)));
      r.accept = (r.accept1 + r.accept2) / 2; r.waste = (r.waste1 + r.waste2) / 2;
      if (k === 1) S.att = +val("att");
      S.scen.push(r);
      k === 0 ? pageScenario(1) : pageAfter();
    };
  }

  // ---------- 5. 위임 선택과 조작 점검 ----------
  function pageAfter() {
    progress("after");
    const opts = [["recommend", "추천만 해 주세요 (구매는 내가 결정)"], ["confirm", "장바구니에 담아 두고 먼저 물어봐 주세요"], ["auto", "자동으로 주문해 주세요 (필요 없으면 내가 취소)"]];
    const pks = S.order;
    render(`
      <h1>마지막 질문입니다</h1>
      <div class="card"><div class="q-title" style="margin-bottom:8px">1. 이 서비스를 실제로 이용한다면, 각 상품을 AI 비서가 어떻게 처리해 주기를 원하시나요?</div>
        ${pks.map((pk) => `<div class="q"><div style="margin:6px 0">${productCard(pk)}</div>${radios(`choice_${pk}`, opts)}</div>`).join("")}</div>
      <div class="card"><div class="q-title" style="margin-bottom:8px">2. 방금 본 두 상황에서 AI 쇼핑 비서는 상품을 어떻게 처리했나요?</div>
        ${radios("mc_interface", [["confirm", "장바구니에 담아 두고 구매할지 물어봤다"], ["auto", "묻지 않고 바로 주문했다"], ["dk", "잘 모르겠다"]])}</div>
      <div class="card"><div class="q-title" style="margin-bottom:8px">3. 각 상품은 구매 후 얼마나 오래 보관하며 먹을 수 있다고 생각하시나요?</div>
        ${shuffle(pks).map((pk) => `<div class="q"><div class="q-title">${esc(PRODUCTS[pk].name)}</div>${likert(`shelf_${pk}`, "매우 짧다", "매우 길다")}</div>`).join("")}</div>
      <div class="err" id="err"></div><div class="nav"><button class="btn" id="next">제출하기</button></div>`);
    $("#next").onclick = () => {
      const names = pks.map((pk) => `choice_${pk}`).concat(["mc_interface"], pks.map((pk) => `shelf_${pk}`));
      if (missing(names).length) { $("#err").textContent = "응답하지 않은 문항이 있어요."; return; }
      pks.forEach((pk) => { S.choice[pk] = val(`choice_${pk}`); S.manip["shelf_" + pk] = +val(`shelf_${pk}`); });
      S.manip.mc_interface = val("mc_interface");
      submit();
    };
  }

  // ---------- 제출 ----------
  function payload() {
    const t = now();
    const d = {
      type: "response", study: C.STUDY_ID, version: C.VERSION, pid: S.pid, panel_id: S.panel_id, test: S.test ? 1 : 0,
      cond: S.cond, assign_method: S.assign_method, order: S.order.join("-"),
      started_at: new Date(S.t_start).toISOString(), finished_at: new Date(t).toISOString(), duration_sec: Math.round((t - S.t_start) / 1000),
      att: S.att, att_pass: S.att === 3 ? 1 : 0, mc_interface: S.manip.mc_interface, mc_pass: S.manip.mc_interface === S.cond ? 1 : 0,
      user_agent: navigator.userAgent.slice(0, 180), screen_w: window.innerWidth
    };
    Object.entries(S.pre).forEach(([k, v]) => (d["pre_" + k] = v));
    S.scen.forEach((r) => {
      const tag = r.perish;
      d[`${tag}_product`] = r.product; d[`${tag}_pos`] = r.pos; d[`${tag}_accept`] = r.accept; d[`${tag}_waste`] = r.waste;
      ITEMS.forEach(([id]) => (d[`${tag}_${id}`] = r[id]));
      d[`${tag}_choice`] = S.choice[r.product]; d[`${tag}_shelf`] = S.manip["shelf_" + r.product];
    });
    d.trials = S.scen.map((r) => Object.assign({}, r, { choice: S.choice[r.product], shelf: S.manip["shelf_" + r.product] }));
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
    S.submitted = true;
    pageDone(ok, data);
  }

  // ---------- 6. 완료 ----------
  function pageDone(ok, data) {
    progress("done");
    const dl = !ok ? `<div class="box">${C.ENDPOINT ? "응답 저장에 실패했어요. 아래 버튼으로 파일을 저장해 연구자 이메일로 보내 주세요." : "테스트 모드: 저장 주소가 설정되지 않아 응답이 저장되지 않았습니다."}
      <div style="margin-top:8px"><button class="btn ghost" id="dl">응답 파일 저장</button></div></div>` : "";
    render(`
      <h1>참여해 주셔서 감사합니다</h1>
      ${dl}
      <div class="card">
        <div class="q-title">기프티콘 받으실 연락처</div>
        <p class="muted small">${esc(C.REWARD_TEXT)} 연락처는 응답 자료와 따로 저장되며, 기프티콘 발송 후 파기합니다.</p>
        <input type="tel" name="phone" placeholder="010-0000-0000" inputmode="tel" maxlength="20">
        <label class="opt" style="margin-top:10px"><input type="checkbox" id="pc"><span>기프티콘 발송을 위한 휴대전화 번호 수집·이용에 동의합니다.</span></label>
        <div class="err" id="err"></div>
        <div class="row" style="margin-top:12px"><button class="btn" id="send">연락처 제출</button><button class="btn ghost" id="skip">보상 없이 마치기</button></div>
      </div>
      <div class="card"><div class="q-title">연구 안내</div><p class="small muted">이 연구는 AI 쇼핑 비서가 상품을 장바구니에 담아 두고 물어볼 때와 자동으로 주문할 때, 상품의 종류에 따라 소비자의 평가가 어떻게 달라지는지 알아보기 위한 것입니다. 참가자마다 두 방식 중 하나를 무작위로 보여 드렸습니다.</p></div>`);
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
      render(`<h1>감사합니다</h1><div class="card"><p>연락처가 접수되었습니다. 응답 확인 후 기프티콘을 보내 드리겠습니다. 창을 닫으셔도 됩니다.</p></div>`);
    };
  }

  pageConsent();
})();

export const chatPage = String.raw`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#18211d">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="icon" href="./icon.svg" type="image/svg+xml">
  <title>Sales Bot</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #18211d;
      --muted: #68736d;
      --line: #dce2de;
      --paper: #f6f7f4;
      --surface: #ffffff;
      --teal: #087f6b;
      --teal-dark: #056253;
      --teal-soft: #e1f2ed;
      --coral: #d96845;
      --coral-soft: #fae9e3;
      --shadow: 0 12px 28px rgba(24, 33, 29, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-width: 320px;
      min-height: 100vh;
      overflow: hidden;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    button, input, select, textarea { font: inherit; letter-spacing: 0; }

    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
      outline: 3px solid rgba(8, 127, 107, 0.24);
      outline-offset: 2px;
    }

    .app {
      display: grid;
      grid-template-rows: 64px minmax(0, 1fr);
      height: 100vh;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 0 24px;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }

    .brand, .service-status, .topbar-actions, .stage-row, .score-row, .product-head {
      display: flex;
      align-items: center;
    }

    .brand { gap: 11px; min-width: 0; }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      flex: 0 0 auto;
      border-radius: 6px;
      background: var(--ink);
      color: white;
      font-weight: 800;
      font-size: 14px;
    }

    .brand-name { font-weight: 750; line-height: 1.1; }
    .brand-subtitle { color: var(--muted); font-size: 12px; margin-top: 3px; }
    .topbar-actions { gap: 16px; }
    .service-status { gap: 7px; color: var(--muted); font-size: 13px; }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #29a36a;
      box-shadow: 0 0 0 3px #e1f4e8;
    }

    .button {
      min-height: 38px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 0 14px;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      font-weight: 650;
    }

    .button:hover { border-color: #aeb9b3; background: #fafbf9; }

    .workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 330px;
      min-height: 0;
    }

    .chat {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      min-width: 0;
      min-height: 0;
      background: var(--surface);
    }

    .messages {
      overflow-y: auto;
      padding: 30px max(24px, calc((100% - 760px) / 2));
      scroll-behavior: smooth;
    }

    .message {
      display: flex;
      gap: 10px;
      margin: 0 0 22px;
      animation: enter 180ms ease-out;
    }

    @keyframes enter {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.customer { justify-content: flex-end; }

    .avatar {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      border-radius: 50%;
      background: var(--teal-soft);
      color: var(--teal-dark);
      font-size: 11px;
      font-weight: 800;
    }

    .bubble {
      max-width: min(620px, 82%);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 12px 14px;
      background: var(--surface);
      line-height: 1.55;
      font-size: 15px;
      white-space: pre-wrap;
    }

    .customer .bubble {
      border-color: var(--teal);
      background: var(--teal);
      color: white;
    }

    .typing .bubble { color: var(--muted); font-style: italic; }

    .composer-wrap {
      border-top: 1px solid var(--line);
      padding: 16px max(24px, calc((100% - 760px) / 2)) 20px;
      background: #fbfcfa;
    }

    .composer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 44px;
      gap: 10px;
      align-items: end;
      max-width: 760px;
      margin: auto;
    }

    .composer textarea {
      width: 100%;
      min-height: 48px;
      max-height: 140px;
      resize: none;
      border: 1px solid #cbd3ce;
      border-radius: 6px;
      padding: 13px 14px;
      background: var(--surface);
      color: var(--ink);
      line-height: 1.4;
    }

    .send {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: 6px;
      background: var(--teal);
      color: white;
      cursor: pointer;
      font-size: 21px;
      line-height: 1;
    }

    .send:hover { background: var(--teal-dark); }
    .send:disabled { cursor: not-allowed; opacity: 0.5; }

    .composer-meta {
      display: flex;
      justify-content: space-between;
      max-width: 760px;
      margin: 7px auto 0;
      color: var(--muted);
      font-size: 11px;
    }

    .side {
      min-height: 0;
      overflow-y: auto;
      border-left: 1px solid var(--line);
      background: var(--paper);
      padding: 22px;
    }

    .side-section {
      padding: 0 0 22px;
      margin: 0 0 22px;
      border-bottom: 1px solid var(--line);
    }

    .side-section:last-child { border-bottom: 0; margin-bottom: 0; }
    .side h2 { margin: 0 0 16px; font-size: 14px; }
    .stage-row, .score-row { justify-content: space-between; gap: 12px; }

    .stage-badge {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border-radius: 999px;
      padding: 0 10px;
      background: var(--teal-soft);
      color: var(--teal-dark);
      font-size: 12px;
      font-weight: 750;
    }

    .score-number { font-size: 24px; font-weight: 780; }
    .score-number span { color: var(--muted); font-size: 12px; font-weight: 500; }

    .score-track {
      height: 6px;
      margin-top: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: #dce2de;
    }

    .score-fill {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: var(--coral);
      transition: width 260ms ease;
    }

    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { min-width: 0; }
    .field.full { grid-column: 1 / -1; }

    .field label {
      display: block;
      margin: 0 0 5px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .field input, .field select {
      width: 100%;
      height: 38px;
      border: 1px solid #cbd3ce;
      border-radius: 5px;
      padding: 0 10px;
      background: var(--surface);
      color: var(--ink);
      font-size: 13px;
    }

    .consent {
      display: flex;
      align-items: center;
      gap: 8px;
      grid-column: 1 / -1;
      color: var(--ink);
      font-size: 13px;
    }

    .consent input { width: 16px; height: 16px; accent-color: var(--teal); }

    .products { display: grid; gap: 9px; }
    .empty { color: var(--muted); font-size: 13px; line-height: 1.5; }

    .product {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 11px;
      background: var(--surface);
    }

    .product-head { justify-content: space-between; gap: 10px; }
    .product-name { font-size: 13px; font-weight: 750; }
    .product-price { color: var(--teal-dark); font-size: 12px; font-weight: 750; white-space: nowrap; }
    .product p { margin: 7px 0 0; color: var(--muted); font-size: 12px; line-height: 1.45; }

    .product-action {
      width: 100%;
      min-height: 32px;
      margin-top: 10px;
      border: 1px solid var(--teal);
      border-radius: 5px;
      background: transparent;
      color: var(--teal-dark);
      cursor: pointer;
      font-size: 12px;
      font-weight: 750;
    }

    .product-action:hover { background: var(--teal-soft); }

    .handoff {
      display: none;
      margin-top: 12px;
      border-left: 3px solid var(--coral);
      padding: 9px 10px;
      background: var(--coral-soft);
      color: #7d3825;
      font-size: 12px;
      line-height: 1.45;
    }

    .handoff.visible { display: block; }

    .mobile-nav { display: none; }

    @media (max-width: 820px) {
      body { overflow: hidden; }
      .app { height: 100vh; grid-template-rows: 64px minmax(0, 1fr) 58px; }
      .workspace { display: block; min-height: 0; }
      .chat, .side { height: 100%; min-height: 0; }
      .side { border-left: 0; border-top: 0; padding-bottom: 30px; }
      .messages { min-height: 0; max-height: none; padding: 22px 16px; }
      .composer-wrap { padding: 14px 16px 18px; }
      .service-status { display: none; }
      .mobile-nav {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-top: 1px solid var(--line);
        background: var(--surface);
        padding-bottom: env(safe-area-inset-bottom);
      }
      .mobile-nav button {
        border: 0;
        border-top: 3px solid transparent;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
      }
      .mobile-nav button[aria-selected="true"] { border-top-color: var(--teal); color: var(--teal-dark); }
      body[data-mobile-view="chat"] .side { display: none; }
      body[data-mobile-view="lead"] .chat,
      body[data-mobile-view="menu"] .chat { display: none; }
      body[data-mobile-view="lead"] .menu-group { display: none; }
      body[data-mobile-view="menu"] .lead-group { display: none; }
    }

    @media (max-width: 460px) {
      .topbar { padding: 0 14px; }
      .brand-subtitle { display: none; }
      .button { padding: 0 10px; font-size: 12px; }
      .side { padding: 18px 16px; }
      .bubble { max-width: 88%; }
    }
  </style>
</head>
<body data-mobile-view="chat">
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">SB</div>
        <div>
          <div class="brand-name">Sales Bot</div>
          <div class="brand-subtitle">Atendimento comercial</div>
        </div>
      </div>
      <div class="topbar-actions">
        <div class="service-status"><span class="status-dot"></span><span id="runtime-status">API online</span></div>
        <button class="button" id="new-conversation" type="button">Nova conversa</button>
      </div>
    </header>

    <main class="workspace">
      <section class="chat" aria-label="Conversa comercial">
        <div class="messages" id="messages" aria-live="polite">
          <div class="message bot">
            <div class="avatar" aria-hidden="true">SB</div>
            <div class="bubble">Ol&aacute;! Qual desafio de vendas voc&ecirc; quer resolver primeiro?</div>
          </div>
        </div>

        <div class="composer-wrap">
          <form class="composer" id="composer">
            <textarea id="message-input" name="message" maxlength="4000" rows="1" placeholder="Digite a mensagem do lead..." aria-label="Mensagem do lead" required></textarea>
            <button class="send" id="send-button" type="submit" title="Enviar mensagem" aria-label="Enviar mensagem">&#10140;</button>
          </form>
          <div class="composer-meta"><span id="channel-label">Canal: Web</span><span>Enter para enviar</span></div>
        </div>
      </section>

      <aside class="side" aria-label="Contexto do lead">
        <div class="side-group lead-group">
        <section class="side-section">
          <div class="stage-row">
            <h2>Qualifica&ccedil;&atilde;o</h2>
            <span class="stage-badge" id="stage">Novo</span>
          </div>
          <div class="score-row">
            <span class="empty">Score comercial</span>
            <div class="score-number"><span id="score">0</span><span>/100</span></div>
          </div>
          <div class="score-track" aria-hidden="true"><div class="score-fill" id="score-fill"></div></div>
          <div class="handoff" id="handoff">Lead pronto para encaminhamento ao time comercial.</div>
        </section>

        <section class="side-section">
          <h2>Contexto do lead</h2>
          <div class="field-grid">
            <div class="field full">
              <label for="name">Nome</label>
              <input id="name" autocomplete="name" placeholder="Nome do contato">
            </div>
            <div class="field full">
              <label for="email">E-mail</label>
              <input id="email" type="email" autocomplete="email" placeholder="contato@empresa.com">
            </div>
            <div class="field">
              <label for="budget">Or&ccedil;amento</label>
              <input id="budget" type="number" min="1" step="1" placeholder="5000">
            </div>
            <div class="field">
              <label for="timeline">Prazo</label>
              <select id="timeline">
                <option value="">N&atilde;o informado</option>
                <option value="now">Agora</option>
                <option value="this_month">Este m&ecirc;s</option>
                <option value="this_quarter">Este trimestre</option>
                <option value="later">Mais adiante</option>
              </select>
            </div>
            <label class="consent"><input id="consent" type="checkbox"> Autoriza contato comercial</label>
          </div>
        </section>
        </div>

        <div class="side-group menu-group">
        <section class="side-section">
          <h2>Recomenda&ccedil;&otilde;es</h2>
          <div class="products" id="products"><div class="empty">As op&ccedil;&otilde;es aparecem conforme a conversa avan&ccedil;a.</div></div>
        </section>

        <section class="side-section">
          <h2>Card&aacute;pio</h2>
          <div class="products" id="catalog"><div class="empty">Carregando produtos...</div></div>
        </section>
        </div>
      </aside>
    </main>

    <nav class="mobile-nav" aria-label="Navegacao principal">
      <button type="button" data-mobile-view="chat" aria-selected="true">Chat</button>
      <button type="button" data-mobile-view="lead" aria-selected="false">Lead</button>
      <button type="button" data-mobile-view="menu" aria-selected="false">Card&aacute;pio</button>
    </nav>
  </div>

  <script>
    (function () {
      var sessionId = newSessionId();
      var isSending = false;
      var form = document.getElementById("composer");
      var input = document.getElementById("message-input");
      var messages = document.getElementById("messages");
      var sendButton = document.getElementById("send-button");
      var stage = document.getElementById("stage");
      var score = document.getElementById("score");
      var scoreFill = document.getElementById("score-fill");
      var handoff = document.getElementById("handoff");
      var products = document.getElementById("products");
      var catalog = document.getElementById("catalog");
      var isStaticDemo = location.hostname.endsWith(".github.io") || location.protocol === "file:" || new URLSearchParams(location.search).has("demo");
      var demoProfiles = {};
      var demoProducts = [
        { id: "starter", name: "Sales Starter", description: "Pacote para validar atendimento comercial, capturar leads e responder duvidas frequentes.", priceCents: 99000, tags: ["leads", "atendimento", "starter"] },
        { id: "growth", name: "Sales Growth", description: "Automacao de qualificacao, handoff para CRM e relatorios para times em crescimento.", priceCents: 249000, tags: ["crm", "automacao", "vendas"] },
        { id: "enterprise", name: "Sales Enterprise", description: "Arquitetura customizada com integracoes, governanca, observabilidade e suporte dedicado.", priceCents: 799000, tags: ["enterprise", "integracao", "escala"] }
      ];
      if (isStaticDemo) document.getElementById("runtime-status").textContent = "Demo PWA";

      function newSessionId() {
        if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
        return "web-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      }

      function getCustomer() {
        var customer = {};
        var name = document.getElementById("name").value.trim();
        var email = document.getElementById("email").value.trim();
        var budget = Number(document.getElementById("budget").value);
        var timeline = document.getElementById("timeline").value;
        var consent = document.getElementById("consent").checked;
        if (name) customer.name = name;
        if (email) customer.email = email;
        if (budget > 0) customer.budget = budget;
        if (timeline) customer.timeline = timeline;
        if (consent) customer.consentToContact = true;
        return customer;
      }

      async function requestJson(path, options) {
        if (isStaticDemo) {
          if (path.indexOf("products") >= 0) return { products: demoProducts };
          return createDemoReply(JSON.parse(options.body));
        }

        var response = await fetch(path, options);
        var payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Falha na solicitacao");
        return payload;
      }

      function createDemoReply(data) {
        var previous = demoProfiles[data.sessionId] || {};
        var text = data.text;
        var extracted = {};
        var emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        var budgetMatch = text.match(/(?:r\$|orcamento|verba|ate)\s*([\d.,]+)/i);
        var nameMatch = text.match(/\b(?:meu nome (?:e|\u00e9)|me chamo|sou)\s+([\p{L}][\p{L}' -]{1,40})/iu);
        if (emailMatch) extracted.email = emailMatch[0];
        if (budgetMatch) extracted.budget = Number(budgetMatch[1].replace(/\./g, "").replace(",", "."));
        if (nameMatch) extracted.name = nameMatch[1].trim();
        if (/\b(preciso|quero|busco|problema|dificuldade|vendas|leads|atendimento|interesse)\b/i.test(text)) extracted.pain = text;
        if (/\b(agora|hoje|urgente|imediato)\b/i.test(text)) extracted.timeline = "now";
        else if (/\b(este mes|esse mes|30 dias)\b/i.test(normalizeDemo(text))) extracted.timeline = "this_month";
        else if (/\b(trimestre|90 dias)\b/i.test(normalizeDemo(text))) extracted.timeline = "this_quarter";
        else if (/\b(sem pressa|futuro|mais pra frente)\b/i.test(normalizeDemo(text))) extracted.timeline = "later";
        if (/\b(autorizo|pode me chamar|pode entrar em contato|aceito contato)\b/i.test(text)) extracted.consentToContact = true;

        var profile = Object.assign({}, previous, data.customer || {}, extracted);
        demoProfiles[data.sessionId] = profile;
        var leadScore = 0;
        if (profile.name) leadScore += 10;
        if (profile.email) leadScore += 20;
        if (profile.pain) leadScore += 20;
        if (profile.budget > 0) leadScore += 15;
        if (profile.timeline === "now") leadScore += 15;
        if (profile.timeline === "this_month") leadScore += 12;
        if (profile.timeline === "this_quarter") leadScore += 8;
        if (profile.consentToContact) leadScore += 10;
        leadScore = Math.min(leadScore, 100);

        var query = normalizeDemo(text);
        var recommended = demoProducts.slice().sort(function (left, right) {
          return Number(query.indexOf(normalizeDemo(right.name)) >= 0) - Number(query.indexOf(normalizeDemo(left.name)) >= 0);
        });
        var leadStage = leadScore >= 80 && profile.email && profile.consentToContact
          ? "handoff"
          : leadScore >= 70 ? "proposal" : leadScore >= 60 ? "qualified" : leadScore > 0 ? "qualifying" : "new";
        var replyText;
        if (leadStage === "handoff") replyText = "Perfeito. Ja tenho o contexto principal e vou encaminhar para um consultor.";
        else if (!profile.pain) replyText = "Me conta rapidinho: qual problema de vendas voce quer resolver primeiro?";
        else if (!profile.email) replyText = "Boa. Qual email posso usar para enviar a recomendacao e manter o historico da conversa?";
        else if (!profile.budget) replyText = "Entendi. Qual faixa de orcamento voce imaginou para resolver isso?";
        else if (!profile.timeline) replyText = "Qual e o prazo ideal: agora, este mes, este trimestre ou mais pra frente?";
        else replyText = "Tenho informacoes suficientes para recomendar uma opcao. Quer que eu avance para uma proposta inicial?";

        return { sessionId: data.sessionId, text: replyText, stage: leadStage, score: leadScore, recommendedProducts: recommended, handoff: leadStage === "handoff" };
      }

      function normalizeDemo(value) {
        return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      }

      function addMessage(role, text, temporary) {
        var row = document.createElement("div");
        row.className = "message " + role + (temporary ? " typing" : "");
        if (temporary) row.id = "typing";
        if (role === "bot") {
          var avatar = document.createElement("div");
          avatar.className = "avatar";
          avatar.setAttribute("aria-hidden", "true");
          avatar.textContent = "SB";
          row.appendChild(avatar);
        }
        var bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.textContent = text;
        row.appendChild(bubble);
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
      }

      function setBusy(value) {
        isSending = value;
        input.disabled = value;
        sendButton.disabled = value;
      }

      function stageLabel(value) {
        return ({ new: "Novo", qualifying: "Qualificando", qualified: "Qualificado", proposal: "Proposta", handoff: "Handoff" })[value] || value;
      }

      function renderProducts(items) {
        products.replaceChildren();
        if (!items.length) {
          var empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "Nenhuma recomenda\u00e7\u00e3o para este contexto.";
          products.appendChild(empty);
          return;
        }
        items.forEach(function (item) {
          var card = document.createElement("article");
          card.className = "product";
          var head = document.createElement("div");
          head.className = "product-head";
          var name = document.createElement("span");
          name.className = "product-name";
          name.textContent = item.name;
          var price = document.createElement("span");
          price.className = "product-price";
          price.textContent = (item.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          var description = document.createElement("p");
          description.textContent = item.description;
          head.append(name, price);
          card.append(head, description);
          products.appendChild(card);
        });
      }

      function renderCatalog(items) {
        catalog.replaceChildren();
        items.forEach(function (item) {
          var card = document.createElement("article");
          card.className = "product";
          var head = document.createElement("div");
          head.className = "product-head";
          var name = document.createElement("span");
          name.className = "product-name";
          name.textContent = item.name;
          var price = document.createElement("span");
          price.className = "product-price";
          price.textContent = (item.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          var description = document.createElement("p");
          description.textContent = item.description;
          var action = document.createElement("button");
          action.className = "product-action";
          action.type = "button";
          action.textContent = "Selecionar";
          action.setAttribute("aria-label", "Selecionar " + item.name);
          action.addEventListener("click", function () {
            if (isSending) return;
            sendMessage("Quero o " + item.name + " para melhorar minhas vendas. Pode me contar mais?");
          });
          head.append(name, price);
          card.append(head, description, action);
          catalog.appendChild(card);
        });
      }

      async function loadCatalog() {
        try {
          var payload = await requestJson("./products");
          renderCatalog(payload.products || []);
        } catch (error) {
          catalog.innerHTML = '<div class="empty">N\u00e3o foi poss\u00edvel carregar o card\u00e1pio.</div>';
        }
      }

      async function loadAiStatus() {
        if (isStaticDemo) return;
        try {
          var payload = await requestJson("./ai/status");
          var status = document.getElementById("runtime-status");
          status.textContent = payload.provider.indexOf("ollama:") === 0 ? "Ollama ativo" : "API online";
          status.title = "Gerador: " + payload.provider;
        } catch (error) {
          document.getElementById("runtime-status").textContent = "API online";
        }
      }

      function updateQualification(reply) {
        stage.textContent = stageLabel(reply.stage);
        score.textContent = String(reply.score);
        scoreFill.style.width = reply.score + "%";
        handoff.classList.toggle("visible", reply.handoff);
        renderProducts(reply.recommendedProducts || []);
      }

      async function sendMessage(text) {
        setBusy(true);
        addMessage("customer", text, false);
        addMessage("bot", "Analisando contexto...", true);
        try {
          var payload = await requestJson("./messages", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId: sessionId, channel: "web", text: text, customer: getCustomer() })
          });
          document.getElementById("typing").remove();
          addMessage("bot", payload.text, false);
          updateQualification(payload);
        } catch (error) {
          var typing = document.getElementById("typing");
          if (typing) typing.remove();
          addMessage("bot", "N\u00e3o consegui processar agora. Tente novamente em instantes.", false);
        } finally {
          setBusy(false);
          input.focus();
        }
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var text = input.value.trim();
        if (!text || isSending) return;
        input.value = "";
        input.style.height = "auto";
        sendMessage(text);
      });

      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          form.requestSubmit();
        }
      });

      input.addEventListener("input", function () {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 140) + "px";
      });

      document.getElementById("new-conversation").addEventListener("click", function () {
        sessionId = newSessionId();
        messages.innerHTML = '<div class="message bot"><div class="avatar" aria-hidden="true">SB</div><div class="bubble">Ol\u00e1! Qual desafio de vendas voc\u00ea quer resolver primeiro?</div></div>';
        stage.textContent = "Novo";
        score.textContent = "0";
        scoreFill.style.width = "0%";
        handoff.classList.remove("visible");
        products.innerHTML = '<div class="empty">As op\u00e7\u00f5es aparecem conforme a conversa avan\u00e7a.</div>';
        input.focus();
      });

      document.querySelectorAll("[data-mobile-view]").forEach(function (button) {
        button.addEventListener("click", function () {
          var view = button.getAttribute("data-mobile-view");
          document.body.setAttribute("data-mobile-view", view);
          document.querySelectorAll("[data-mobile-view]").forEach(function (item) {
            item.setAttribute("aria-selected", String(item === button));
          });
          if (view === "chat") input.focus();
        });
      });

      loadCatalog();
      loadAiStatus();
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("./sw.js").catch(function () { return undefined; });
        });
      }
    })();
  </script>
</body>
</html>`;

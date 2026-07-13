export const setupPage = String.raw`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#18211d">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="icon" href="./icon.svg" type="image/svg+xml">
  <title>Configurar Sales Bot</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #18211d;
      --muted: #66716b;
      --line: #d9e0dc;
      --paper: #f3f5f2;
      --surface: #ffffff;
      --accent: #087f6b;
      --accent-dark: #056253;
      --accent-soft: #e3f2ed;
      --coral: #c95635;
      --warning: #8c6510;
    }

    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    html { min-width: 320px; background: var(--paper); }
    body {
      margin: 0;
      min-width: 320px;
      min-height: 100vh;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    button, input, textarea, select { font: inherit; letter-spacing: 0; }
    button, a { -webkit-tap-highlight-color: transparent; }
    button:focus-visible, input:focus-visible, textarea:focus-visible, a:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--accent) 26%, transparent);
      outline-offset: 2px;
    }

    .topbar {
      position: sticky;
      z-index: 20;
      top: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 64px;
      padding: 0 24px;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.96);
    }

    .brand, .top-actions, .save-state, .product-title, .preview-head, .done-status {
      display: flex;
      align-items: center;
    }

    .brand { gap: 11px; min-width: 0; }
    .brand img { width: 34px; height: 34px; border-radius: 6px; }
    .brand strong { display: block; font-size: 15px; }
    .brand span { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; }
    .top-actions { gap: 16px; }
    .save-state { gap: 7px; color: var(--muted); font-size: 12px; white-space: nowrap; }
    .save-dot { width: 7px; height: 7px; border-radius: 50%; background: #2d9a66; }

    .button, .link-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 0 15px;
      background: var(--surface);
      color: var(--ink);
      text-decoration: none;
      font-weight: 700;
      cursor: pointer;
    }

    .button:hover, .link-button:hover { border-color: #aeb9b3; background: #fafbf9; }
    .button.primary, .link-button.primary { border-color: var(--accent); background: var(--accent); color: white; }
    .button.primary:hover, .link-button.primary:hover { border-color: var(--accent-dark); background: var(--accent-dark); }
    .button.danger { border-color: #e1b7aa; color: #9b3f27; }
    .button:disabled { cursor: not-allowed; opacity: 0.55; }

    .layout {
      display: grid;
      grid-template-columns: 230px minmax(0, 1fr) 320px;
      min-height: calc(100vh - 64px);
      max-width: 1480px;
      margin: 0 auto;
    }

    .steps {
      border-right: 1px solid var(--line);
      padding: 34px 22px;
      background: #edf1ed;
    }

    .steps h2 { margin: 0 0 6px; font-size: 14px; }
    .steps > p { margin: 0 0 28px; color: var(--muted); font-size: 12px; line-height: 1.5; }
    .step-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .step-tab {
      display: grid;
      grid-template-columns: 30px minmax(0, 1fr);
      gap: 10px;
      width: 100%;
      min-height: 52px;
      border: 0;
      border-left: 3px solid transparent;
      border-radius: 0;
      padding: 8px 8px 8px 10px;
      background: transparent;
      color: var(--muted);
      text-align: left;
      cursor: pointer;
    }

    .step-tab:hover { background: rgba(255, 255, 255, 0.6); }
    .step-tab[aria-current="step"] { border-left-color: var(--accent); background: var(--surface); color: var(--ink); }
    .step-number {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 1px solid #bfc9c3;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 800;
    }

    .step-tab[aria-current="step"] .step-number,
    .step-tab[data-complete="true"] .step-number { border-color: var(--accent); background: var(--accent); color: white; }
    .step-name { display: block; font-size: 13px; font-weight: 750; }
    .step-detail { display: block; margin-top: 3px; font-size: 11px; }

    .form-area { min-width: 0; padding: 42px clamp(26px, 5vw, 72px) 32px; background: var(--surface); }
    .step-panel { display: none; max-width: 720px; margin: 0 auto; }
    .step-panel.active { display: block; animation: panel-in 180ms ease-out; }
    @keyframes panel-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .step-kicker { margin: 0 0 9px; color: var(--accent-dark); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    h1 { margin: 0; font-size: 28px; line-height: 1.2; }
    .step-intro { max-width: 620px; margin: 12px 0 30px; color: var(--muted); line-height: 1.6; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .field { min-width: 0; }
    .field.full { grid-column: 1 / -1; }
    .field label, .group-label { display: block; margin: 0 0 7px; font-size: 13px; font-weight: 750; }
    .field small { display: block; margin-top: 6px; color: var(--muted); font-size: 11px; line-height: 1.45; }
    .field input, .field textarea {
      width: 100%;
      border: 1px solid #c8d1cc;
      border-radius: 6px;
      background: white;
      color: var(--ink);
    }
    .field input { height: 44px; padding: 0 12px; }
    .field textarea { min-height: 96px; resize: vertical; padding: 11px 12px; line-height: 1.5; }
    .field input[aria-invalid="true"], .field textarea[aria-invalid="true"] { border-color: var(--coral); }

    .swatches { display: flex; flex-wrap: wrap; gap: 10px; }
    .swatch {
      width: 36px;
      height: 36px;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 1px #bcc7c1;
      cursor: pointer;
    }
    .swatch[aria-pressed="true"] { box-shadow: 0 0 0 3px var(--ink); }

    .product-list { display: grid; gap: 14px; }
    .product-editor { border: 1px solid var(--line); border-radius: 6px; padding: 18px; background: #fbfcfa; }
    .product-title { justify-content: space-between; gap: 16px; margin-bottom: 17px; }
    .product-title strong { font-size: 14px; }
    .remove-product { width: 34px; min-height: 34px; padding: 0; font-size: 20px; line-height: 1; }
    .add-product { margin-top: 14px; }

    .tone-control { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .tone-option { position: relative; }
    .tone-option input { position: absolute; opacity: 0; pointer-events: none; }
    .tone-option span {
      display: grid;
      place-items: center;
      min-height: 44px;
      border: 1px solid #c8d1cc;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }
    .tone-option input:checked + span { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-dark); }

    .qualification-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      grid-column: 1 / -1;
    }
    .qualification-item { border: 1px solid var(--line); padding: 10px; background: #f8faf8; text-align: center; font-size: 12px; font-weight: 700; }

    .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
    .review-block { border-top: 2px solid var(--ink); padding-top: 13px; }
    .review-block h2 { margin: 0 0 13px; font-size: 14px; }
    .review-row { margin-bottom: 10px; }
    .review-row span { display: block; color: var(--muted); font-size: 11px; }
    .review-row strong { display: block; margin-top: 2px; font-size: 13px; line-height: 1.45; }
    .review-products { grid-column: 1 / -1; }
    .review-product-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .review-product { border: 1px solid var(--line); border-radius: 6px; padding: 12px; }
    .review-product strong { display: block; font-size: 13px; }
    .review-product span { display: block; margin-top: 5px; color: var(--accent-dark); font-size: 12px; font-weight: 750; }

    .error-banner { display: none; margin: 0 0 20px; border-left: 3px solid var(--coral); padding: 11px 13px; background: #faebe6; color: #81351f; font-size: 13px; }
    .error-banner.visible { display: block; }

    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      max-width: 720px;
      margin: 34px auto 0;
      border-top: 1px solid var(--line);
      padding-top: 20px;
    }
    .actions-right { display: flex; gap: 10px; margin-left: auto; }

    .preview-area { border-left: 1px solid var(--line); padding: 34px 22px; background: var(--paper); }
    .preview-area > h2 { margin: 0 0 5px; font-size: 14px; }
    .preview-area > p { margin: 0 0 18px; color: var(--muted); font-size: 12px; }
    .bot-preview { overflow: hidden; border: 1px solid #ccd5d0; border-radius: 6px; background: white; }
    .preview-head { gap: 10px; min-height: 54px; border-bottom: 1px solid var(--line); padding: 10px 12px; }
    .preview-avatar {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: var(--accent);
      color: white;
      font-size: 11px;
      font-weight: 800;
    }
    .preview-head strong { display: block; font-size: 12px; }
    .preview-head span { display: block; margin-top: 2px; color: var(--muted); font-size: 10px; }
    .preview-body { min-height: 238px; padding: 16px 12px; background: #f8faf8; }
    .preview-bubble { max-width: 90%; border: 1px solid var(--line); border-radius: 6px; padding: 10px; background: white; font-size: 12px; line-height: 1.45; }
    .preview-product { margin-top: 14px; border: 1px solid var(--line); border-radius: 6px; background: white; overflow: hidden; }
    .preview-product img { display: none; width: 100%; height: 120px; object-fit: cover; }
    .preview-product img.visible { display: block; }
    .preview-product-copy { padding: 10px; }
    .preview-product-copy strong { display: block; font-size: 12px; }
    .preview-product-copy span { display: block; margin-top: 4px; color: var(--accent-dark); font-size: 12px; font-weight: 800; }
    .preview-composer { min-height: 44px; border-top: 1px solid var(--line); padding: 10px 12px; color: #88918c; font-size: 11px; }

    .done { padding-top: 30px; text-align: center; }
    .done-mark {
      display: grid;
      place-items: center;
      width: 58px;
      height: 58px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      font-size: 28px;
      font-weight: 800;
    }
    .done h1 { font-size: 30px; }
    .done > p { max-width: 520px; margin: 12px auto 25px; color: var(--muted); line-height: 1.6; }
    .done-status { justify-content: center; gap: 7px; margin-bottom: 24px; color: var(--accent-dark); font-size: 13px; font-weight: 750; }
    .done-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }

    @media (max-width: 1120px) {
      .layout { grid-template-columns: 210px minmax(0, 1fr); }
      .preview-area { display: none; }
    }

    @media (max-width: 760px) {
      .topbar { padding: 0 14px; }
      .save-state { display: none; }
      .layout { display: block; min-height: calc(100vh - 64px); }
      .steps { position: sticky; z-index: 10; top: 64px; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--line); padding: 8px 12px; }
      .steps h2, .steps > p, .step-detail { display: none; }
      .step-list { display: grid; grid-template-columns: repeat(4, minmax(115px, 1fr)); gap: 4px; min-width: 500px; }
      .step-tab { grid-template-columns: 26px minmax(0, 1fr); min-height: 44px; border-left: 0; border-bottom: 3px solid transparent; padding: 6px; }
      .step-tab[aria-current="step"] { border-left-color: transparent; border-bottom-color: var(--accent); }
      .step-number { width: 24px; height: 24px; }
      .form-area { padding: 28px 18px 110px; }
      h1 { font-size: 24px; }
      .step-intro { margin-bottom: 24px; }
      .form-grid, .review-grid { grid-template-columns: 1fr; }
      .field.full, .review-products { grid-column: auto; }
      .qualification-strip { grid-column: auto; grid-template-columns: 1fr 1fr; }
      .review-product-list { grid-template-columns: 1fr; }
      .form-actions {
        position: fixed;
        z-index: 18;
        right: 0;
        bottom: 0;
        left: 0;
        margin: 0;
        border-top: 1px solid var(--line);
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
        background: rgba(255, 255, 255, 0.97);
      }
    }

    @media (max-width: 460px) {
      .brand span { display: none; }
      .top-actions .link-button { min-height: 36px; padding: 0 10px; font-size: 12px; }
      .tone-control { grid-template-columns: 1fr; }
      .button, .link-button { padding: 0 12px; }
      .product-editor { padding: 14px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <img src="./icon.svg" alt="">
      <div><strong>Sales Bot</strong><span>Configura&ccedil;&atilde;o comercial</span></div>
    </div>
    <div class="top-actions">
      <div class="save-state"><span class="save-dot"></span><span id="save-label">Rascunho salvo</span></div>
      <a class="link-button" id="chat-link" href="./chat">Ver bot</a>
    </div>
  </header>

  <div class="layout">
    <aside class="steps" aria-label="Etapas da configura&ccedil;&atilde;o">
      <h2>Configura&ccedil;&atilde;o</h2>
      <p>Complete os dados que orientam a venda.</p>
      <ol class="step-list">
        <li><button class="step-tab" type="button" data-step-tab="0" aria-current="step"><span class="step-number">1</span><span><span class="step-name">Neg&oacute;cio</span><span class="step-detail">Marca e p&uacute;blico</span></span></button></li>
        <li><button class="step-tab" type="button" data-step-tab="1"><span class="step-number">2</span><span><span class="step-name">Produtos</span><span class="step-detail">Oferta e pre&ccedil;o</span></span></button></li>
        <li><button class="step-tab" type="button" data-step-tab="2"><span class="step-number">3</span><span><span class="step-name">Atendimento</span><span class="step-detail">Tom e destino</span></span></button></li>
        <li><button class="step-tab" type="button" data-step-tab="3"><span class="step-number">4</span><span><span class="step-name">Ativar</span><span class="step-detail">Revis&atilde;o final</span></span></button></li>
      </ol>
    </aside>

    <main class="form-area">
      <form id="setup-form" novalidate>
        <div class="error-banner" id="error-banner" role="alert"></div>

        <section class="step-panel active" data-step="0">
          <p class="step-kicker">Etapa 1 de 4</p>
          <h1>Defina o seu neg&oacute;cio</h1>
          <p class="step-intro">Esses dados posicionam a conversa e mant&ecirc;m o bot alinhado ao seu p&uacute;blico.</p>
          <div class="form-grid">
            <div class="field">
              <label for="business-name">Nome da empresa</label>
              <input id="business-name" name="businessName" maxlength="100" autocomplete="organization" placeholder="Ex.: Vitta Cl&iacute;nica" required>
            </div>
            <div class="field">
              <label for="segment">Segmento</label>
              <input id="segment" name="segment" maxlength="100" placeholder="Ex.: Sa&uacute;de e bem-estar" required>
            </div>
            <div class="field full">
              <label for="target-audience">P&uacute;blico ideal</label>
              <textarea id="target-audience" name="targetAudience" maxlength="500" placeholder="Quem compra, qual contexto possui e o que valoriza" required></textarea>
            </div>
            <div class="field full">
              <label for="value-proposition">Proposta de valor</label>
              <textarea id="value-proposition" name="valueProposition" maxlength="500" placeholder="Resultado principal que seus produtos entregam" required></textarea>
            </div>
            <div class="field full">
              <span class="group-label">Cor da marca</span>
              <div class="swatches" id="color-swatches" aria-label="Cor da marca">
                <button class="swatch" type="button" data-color="#087f6b" style="background:#087f6b" title="Verde" aria-label="Verde"></button>
                <button class="swatch" type="button" data-color="#1769aa" style="background:#1769aa" title="Azul" aria-label="Azul"></button>
                <button class="swatch" type="button" data-color="#9b4d68" style="background:#9b4d68" title="Rosa" aria-label="Rosa"></button>
                <button class="swatch" type="button" data-color="#8a5a18" style="background:#8a5a18" title="Dourado" aria-label="Dourado"></button>
                <button class="swatch" type="button" data-color="#313a46" style="background:#313a46" title="Grafite" aria-label="Grafite"></button>
              </div>
            </div>
          </div>
        </section>

        <section class="step-panel" data-step="1">
          <p class="step-kicker">Etapa 2 de 4</p>
          <h1>Cadastre o que ser&aacute; vendido</h1>
          <p class="step-intro">O bot usa somente estes nomes, descri&ccedil;&otilde;es e pre&ccedil;os ao recomendar uma oferta.</p>
          <div class="product-list" id="product-list"></div>
          <button class="button add-product" id="add-product" type="button">+ Adicionar produto</button>
        </section>

        <section class="step-panel" data-step="2">
          <p class="step-kicker">Etapa 3 de 4</p>
          <h1>Ajuste o atendimento</h1>
          <p class="step-intro">Defina a voz da marca e para onde os leads qualificados devem ser encaminhados.</p>
          <div class="form-grid">
            <div class="field full">
              <span class="group-label">Tom de voz</span>
              <div class="tone-control">
                <label class="tone-option"><input type="radio" name="tone" value="consultative" checked><span>Consultivo</span></label>
                <label class="tone-option"><input type="radio" name="tone" value="direct"><span>Direto</span></label>
                <label class="tone-option"><input type="radio" name="tone" value="friendly"><span>Pr&oacute;ximo</span></label>
              </div>
            </div>
            <div class="field full">
              <label for="greeting">Mensagem de abertura</label>
              <textarea id="greeting" name="greeting" maxlength="300" required>Ol&aacute;! Posso entender o que voc&ecirc; procura e indicar a melhor op&ccedil;&atilde;o?</textarea>
            </div>
            <div class="field full">
              <label for="handoff-message">Mensagem de encaminhamento</label>
              <textarea id="handoff-message" name="handoffMessage" maxlength="300" required>Perfeito. J&aacute; tenho o contexto principal e vou encaminhar voc&ecirc; para o nosso time comercial.</textarea>
            </div>
            <div class="field">
              <label for="sales-email">E-mail comercial</label>
              <input id="sales-email" name="salesEmail" type="email" maxlength="160" autocomplete="email" placeholder="vendas@empresa.com">
            </div>
            <div class="field">
              <label for="whatsapp">WhatsApp comercial</label>
              <input id="whatsapp" name="whatsapp" type="tel" maxlength="24" autocomplete="tel" placeholder="+55 11 99999-9999">
            </div>
            <div class="qualification-strip" aria-label="Dados coletados na qualifica&ccedil;&atilde;o">
              <div class="qualification-item">Necessidade</div>
              <div class="qualification-item">E-mail</div>
              <div class="qualification-item">Or&ccedil;amento</div>
              <div class="qualification-item">Prazo</div>
            </div>
          </div>
        </section>

        <section class="step-panel" data-step="3">
          <p class="step-kicker">Etapa 4 de 4</p>
          <h1>Revise e ative</h1>
          <p class="step-intro">A ativa&ccedil;&atilde;o substitui o cat&aacute;logo atual e aplica esta configura&ccedil;&atilde;o ao atendimento.</p>
          <div class="review-grid" id="review"></div>
        </section>

        <section class="step-panel done" data-step="4">
          <div class="done-mark" aria-hidden="true">&#10003;</div>
          <h1 id="done-title">Bot de vendas ativo</h1>
          <p>O cat&aacute;logo, a marca e o atendimento foram configurados. O bot j&aacute; pode receber visitantes e recomendar seus produtos.</p>
          <div class="done-status"><span class="save-dot"></span><span>Configura&ccedil;&atilde;o publicada</span></div>
          <div class="done-actions">
            <a class="link-button primary" id="open-bot" href="./chat">Abrir bot de vendas</a>
            <button class="button" id="copy-link" type="button">Copiar link</button>
            <button class="button" id="edit-setup" type="button">Editar configura&ccedil;&atilde;o</button>
          </div>
        </section>

        <footer class="form-actions" id="form-actions">
          <button class="button" id="back-button" type="button" disabled>&#8592; Voltar</button>
          <div class="actions-right">
            <button class="button primary" id="next-button" type="button">Continuar &#8594;</button>
            <button class="button primary" id="activate-button" type="submit" hidden>Ativar bot</button>
          </div>
        </footer>
      </form>
    </main>

    <aside class="preview-area" aria-label="Pr&eacute;via do atendimento">
      <h2>Pr&eacute;via do atendimento</h2>
      <p>Atualizada com a configura&ccedil;&atilde;o atual.</p>
      <div class="bot-preview">
        <div class="preview-head">
          <div class="preview-avatar" id="preview-avatar">SB</div>
          <div><strong id="preview-business">Sua empresa</strong><span>Atendimento online</span></div>
        </div>
        <div class="preview-body">
          <div class="preview-bubble" id="preview-greeting">Ol&aacute;! Posso entender o que voc&ecirc; procura e indicar a melhor op&ccedil;&atilde;o?</div>
          <div class="preview-product">
            <img id="preview-image" alt="">
            <div class="preview-product-copy"><strong id="preview-product-name">Seu primeiro produto</strong><span id="preview-price">R$ 0,00</span></div>
          </div>
        </div>
        <div class="preview-composer">Digite sua mensagem...</div>
      </div>
    </aside>
  </div>

  <script>
    (function () {
      var STORAGE_KEY = "sales-bot-workspace";
      var DRAFT_KEY = "sales-bot-workspace-draft";
      var explicitDemo = new URLSearchParams(location.search).has("demo");
      var isStaticDemo = location.hostname.endsWith(".github.io") || location.protocol === "file:" || explicitDemo;
      var chatHref = isStaticDemo ? "./chat.html" + (explicitDemo ? "?demo=1" : "") : "./chat";
      var currentStep = 0;
      var highestStep = 0;
      var existingWorkspace = null;
      var state = {
        businessName: "",
        segment: "",
        targetAudience: "",
        valueProposition: "",
        brandColor: "#087f6b",
        salesEmail: "",
        whatsapp: "",
        tone: "consultative",
        greeting: "Ol\u00e1! Posso entender o que voc\u00ea procura e indicar a melhor op\u00e7\u00e3o?",
        handoffMessage: "Perfeito. J\u00e1 tenho o contexto principal e vou encaminhar voc\u00ea para o nosso time comercial.",
        products: [{ id: "", name: "", description: "", priceCents: 0, tags: [], imageUrl: "" }]
      };

      var form = document.getElementById("setup-form");
      var errorBanner = document.getElementById("error-banner");
      var productList = document.getElementById("product-list");
      var backButton = document.getElementById("back-button");
      var nextButton = document.getElementById("next-button");
      var activateButton = document.getElementById("activate-button");
      var formActions = document.getElementById("form-actions");

      document.getElementById("chat-link").href = chatHref;
      document.getElementById("open-bot").href = chatHref;

      function initials(value) {
        var words = value.trim().split(/\s+/).filter(Boolean);
        if (!words.length) return "SB";
        return (words[0][0] + (words[1] ? words[1][0] : "")).toUpperCase();
      }

      function slug(value, index) {
        var normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
        return normalized || "produto-" + (index + 1);
      }

      function currency(cents) {
        return (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }

      function saveDraft() {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
        document.getElementById("save-label").textContent = "Rascunho salvo";
      }

      function updatePreview() {
        document.documentElement.style.setProperty("--accent", state.brandColor);
        document.getElementById("preview-avatar").style.background = state.brandColor;
        document.getElementById("preview-avatar").textContent = initials(state.businessName);
        document.getElementById("preview-business").textContent = state.businessName || "Sua empresa";
        document.getElementById("preview-greeting").textContent = state.greeting || "Mensagem de abertura";
        var product = state.products[0] || {};
        document.getElementById("preview-product-name").textContent = product.name || "Seu primeiro produto";
        document.getElementById("preview-price").textContent = currency(product.priceCents);
        var image = document.getElementById("preview-image");
        image.classList.toggle("visible", Boolean(product.imageUrl));
        if (product.imageUrl) image.src = product.imageUrl;
        else image.removeAttribute("src");
        document.querySelectorAll("[data-color]").forEach(function (swatch) {
          swatch.setAttribute("aria-pressed", String(swatch.getAttribute("data-color") === state.brandColor));
        });
      }

      function field(labelText, type, value, placeholder, onInput) {
        var wrap = document.createElement("div");
        wrap.className = "field";
        var label = document.createElement("label");
        label.textContent = labelText;
        var input = document.createElement("input");
        input.type = type;
        input.value = value || "";
        input.placeholder = placeholder;
        if (type === "url") input.maxLength = 500;
        input.addEventListener("input", function () { onInput(input.value); saveDraft(); updatePreview(); });
        label.appendChild(input);
        wrap.appendChild(label);
        return wrap;
      }

      function renderProducts() {
        productList.replaceChildren();
        state.products.forEach(function (product, index) {
          var editor = document.createElement("article");
          editor.className = "product-editor";
          var title = document.createElement("div");
          title.className = "product-title";
          var heading = document.createElement("strong");
          heading.textContent = "Produto " + (index + 1);
          var remove = document.createElement("button");
          remove.type = "button";
          remove.className = "button danger remove-product";
          remove.innerHTML = "&times;";
          remove.title = "Remover produto";
          remove.setAttribute("aria-label", "Remover produto " + (index + 1));
          remove.disabled = state.products.length === 1;
          remove.addEventListener("click", function () {
            state.products.splice(index, 1);
            renderProducts();
            saveDraft();
            updatePreview();
          });
          title.append(heading, remove);

          var grid = document.createElement("div");
          grid.className = "form-grid";
          var nameField = field("Nome", "text", product.name, "Ex.: Plano Essencial", function (value) { product.name = value; });
          var priceField = field("Pre\u00e7o", "number", product.priceCents ? String(product.priceCents / 100) : "", "990,00", function (value) { product.priceCents = Math.round(Number(value || 0) * 100); });
          priceField.querySelector("input").min = "0.01";
          priceField.querySelector("input").step = "0.01";
          var description = document.createElement("div");
          description.className = "field full";
          var descriptionLabel = document.createElement("label");
          descriptionLabel.textContent = "Descri\u00e7\u00e3o comercial";
          var descriptionInput = document.createElement("textarea");
          descriptionInput.maxLength = 700;
          descriptionInput.placeholder = "Benef\u00edcio, escopo e resultado esperado";
          descriptionInput.value = product.description || "";
          descriptionInput.addEventListener("input", function () { product.description = descriptionInput.value; saveDraft(); });
          descriptionLabel.appendChild(descriptionInput);
          description.appendChild(descriptionLabel);
          var tagsField = field("Palavras-chave", "text", (product.tags || []).join(", "), "Ex.: premium, entrega, suporte", function (value) {
            product.tags = value.split(",").map(function (tag) { return tag.trim(); }).filter(Boolean).slice(0, 12);
          });
          var imageField = field("Imagem (URL)", "url", product.imageUrl, "https://...", function (value) { product.imageUrl = value.trim(); });
          grid.append(nameField, priceField, description, tagsField, imageField);
          editor.append(title, grid);
          productList.appendChild(editor);
        });
      }

      function syncStateFromFields() {
        ["businessName", "segment", "targetAudience", "valueProposition", "salesEmail", "whatsapp", "greeting", "handoffMessage"].forEach(function (name) {
          var input = form.elements[name];
          if (input) state[name] = input.value.trim();
        });
        state.tone = form.elements.tone.value;
      }

      function populateFields() {
        ["businessName", "segment", "targetAudience", "valueProposition", "salesEmail", "whatsapp", "greeting", "handoffMessage"].forEach(function (name) {
          var input = form.elements[name];
          if (input) input.value = state[name] || "";
        });
        var tone = form.querySelector('input[name="tone"][value="' + state.tone + '"]');
        if (tone) tone.checked = true;
        renderProducts();
        updatePreview();
      }

      function showError(message) {
        errorBanner.textContent = message;
        errorBanner.classList.add("visible");
        errorBanner.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      function clearError() {
        errorBanner.textContent = "";
        errorBanner.classList.remove("visible");
      }

      function validEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }

      function validateStep(step) {
        syncStateFromFields();
        clearError();
        if (step === 0) {
          if (state.businessName.length < 2) return showError("Informe o nome da empresa."), false;
          if (state.segment.length < 2) return showError("Informe o segmento da empresa."), false;
          if (state.targetAudience.length < 10) return showError("Descreva o p\u00fablico ideal com um pouco mais de detalhe."), false;
          if (state.valueProposition.length < 10) return showError("Descreva a proposta de valor principal."), false;
        }
        if (step === 1) {
          if (!state.products.length) return showError("Cadastre pelo menos um produto."), false;
          for (var index = 0; index < state.products.length; index += 1) {
            var product = state.products[index];
            if (product.name.trim().length < 2) return showError("Informe o nome do produto " + (index + 1) + "."), false;
            if (product.description.trim().length < 10) return showError("Detalhe a descri\u00e7\u00e3o do produto " + (index + 1) + "."), false;
            if (!(product.priceCents > 0)) return showError("Informe um pre\u00e7o v\u00e1lido para o produto " + (index + 1) + "."), false;
            if (!product.tags.length) return showError("Adicione ao menos uma palavra-chave ao produto " + (index + 1) + "."), false;
            if (product.imageUrl) {
              try { new URL(product.imageUrl); } catch (error) { return showError("Revise a URL da imagem do produto " + (index + 1) + "."), false; }
            }
          }
        }
        if (step === 2) {
          if (state.greeting.length < 10) return showError("Escreva uma mensagem de abertura mais completa."), false;
          if (state.handoffMessage.length < 10) return showError("Escreva a mensagem de encaminhamento."), false;
          if (!state.salesEmail && !state.whatsapp) return showError("Informe um e-mail comercial ou WhatsApp para receber os leads."), false;
          if (state.salesEmail && !validEmail(state.salesEmail)) return showError("Revise o e-mail comercial."), false;
          if (state.whatsapp && state.whatsapp.replace(/\D/g, "").length < 8) return showError("Revise o WhatsApp comercial."), false;
        }
        saveDraft();
        return true;
      }

      function reviewRow(label, value) {
        var row = document.createElement("div");
        row.className = "review-row";
        var caption = document.createElement("span");
        caption.textContent = label;
        var content = document.createElement("strong");
        content.textContent = value || "N\u00e3o informado";
        row.append(caption, content);
        return row;
      }

      function renderReview() {
        syncStateFromFields();
        var review = document.getElementById("review");
        review.replaceChildren();
        var business = document.createElement("section");
        business.className = "review-block";
        business.innerHTML = "<h2>Neg\u00f3cio</h2>";
        business.append(reviewRow("Empresa", state.businessName), reviewRow("Segmento", state.segment), reviewRow("P\u00fablico", state.targetAudience), reviewRow("Proposta de valor", state.valueProposition));
        var service = document.createElement("section");
        service.className = "review-block";
        service.innerHTML = "<h2>Atendimento</h2>";
        var toneLabels = { consultative: "Consultivo", direct: "Direto", friendly: "Pr\u00f3ximo" };
        service.append(reviewRow("Tom", toneLabels[state.tone]), reviewRow("Destino", state.salesEmail || state.whatsapp), reviewRow("Abertura", state.greeting));
        var products = document.createElement("section");
        products.className = "review-block review-products";
        products.innerHTML = "<h2>Produtos</h2>";
        var list = document.createElement("div");
        list.className = "review-product-list";
        state.products.forEach(function (product) {
          var item = document.createElement("article");
          item.className = "review-product";
          var name = document.createElement("strong");
          name.textContent = product.name;
          var price = document.createElement("span");
          price.textContent = currency(product.priceCents);
          item.append(name, price);
          list.appendChild(item);
        });
        products.appendChild(list);
        review.append(business, service, products);
      }

      function showStep(step) {
        currentStep = step;
        clearError();
        document.querySelectorAll("[data-step]").forEach(function (panel) {
          panel.classList.toggle("active", Number(panel.getAttribute("data-step")) === step);
        });
        document.querySelectorAll("[data-step-tab]").forEach(function (tab) {
          var tabStep = Number(tab.getAttribute("data-step-tab"));
          if (tabStep === step) tab.setAttribute("aria-current", "step");
          else tab.removeAttribute("aria-current");
          tab.setAttribute("data-complete", String(tabStep < highestStep));
        });
        if (step === 3) renderReview();
        var isDone = step === 4;
        formActions.hidden = isDone;
        backButton.disabled = step === 0;
        nextButton.hidden = step >= 3;
        activateButton.hidden = step !== 3;
        if (!isDone) window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function buildPayload() {
        syncStateFromFields();
        var payload = {
          businessName: state.businessName,
          segment: state.segment,
          targetAudience: state.targetAudience,
          valueProposition: state.valueProposition,
          brandColor: state.brandColor,
          tone: state.tone,
          greeting: state.greeting,
          handoffMessage: state.handoffMessage,
          products: state.products.map(function (product, index) {
            var item = {
              id: product.id || slug(product.name, index),
              name: product.name.trim(),
              description: product.description.trim(),
              priceCents: product.priceCents,
              tags: product.tags
            };
            if (product.imageUrl) item.imageUrl = product.imageUrl;
            return item;
          })
        };
        if (state.salesEmail) payload.salesEmail = state.salesEmail;
        if (state.whatsapp) payload.whatsapp = state.whatsapp;
        return payload;
      }

      async function activate() {
        if (!validateStep(2)) { showStep(2); return; }
        activateButton.disabled = true;
        activateButton.textContent = "Ativando...";
        try {
          var payload = buildPayload();
          var workspace;
          if (isStaticDemo) {
            var now = new Date().toISOString();
            workspace = Object.assign({}, payload, {
              id: existingWorkspace && existingWorkspace.id || "demo-workspace",
              status: "active",
              createdAt: existingWorkspace && existingWorkspace.createdAt || now,
              updatedAt: now
            });
          } else {
            var response = await fetch("./workspace", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload)
            });
            var body = await response.json();
            if (!response.ok) throw new Error(body.message || "N\u00e3o foi poss\u00edvel ativar a configura\u00e7\u00e3o.");
            workspace = body.workspace;
          }
          existingWorkspace = workspace;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
          localStorage.removeItem(DRAFT_KEY);
          document.getElementById("save-label").textContent = "Configura\u00e7\u00e3o ativa";
          document.getElementById("done-title").textContent = workspace.businessName + " est\u00e1 pronta para vender";
          highestStep = 4;
          showStep(4);
        } catch (error) {
          showError(error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel ativar agora.");
        } finally {
          activateButton.disabled = false;
          activateButton.textContent = existingWorkspace ? "Atualizar bot" : "Ativar bot";
        }
      }

      async function loadWorkspace() {
        var draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          try { state = Object.assign({}, state, JSON.parse(draft)); } catch (error) { localStorage.removeItem(DRAFT_KEY); }
        }
        try {
          if (isStaticDemo) {
            var local = localStorage.getItem(STORAGE_KEY);
            existingWorkspace = local ? JSON.parse(local) : null;
          } else {
            var response = await fetch("./workspace");
            var body = await response.json();
            existingWorkspace = body.workspace;
          }
          if (existingWorkspace && !draft) state = Object.assign({}, state, existingWorkspace);
          if (existingWorkspace) {
            document.getElementById("save-label").textContent = "Configura\u00e7\u00e3o ativa";
            activateButton.textContent = "Atualizar bot";
          }
        } catch (error) {
          document.getElementById("save-label").textContent = "Rascunho local";
        }
        populateFields();
      }

      form.addEventListener("input", function () { syncStateFromFields(); saveDraft(); updatePreview(); });
      document.getElementById("add-product").addEventListener("click", function () {
        if (state.products.length >= 20) return showError("O cat\u00e1logo aceita at\u00e9 20 produtos nesta vers\u00e3o.");
        state.products.push({ id: "", name: "", description: "", priceCents: 0, tags: [], imageUrl: "" });
        renderProducts();
        saveDraft();
      });
      document.querySelectorAll("[data-color]").forEach(function (swatch) {
        swatch.addEventListener("click", function () {
          state.brandColor = swatch.getAttribute("data-color");
          saveDraft();
          updatePreview();
        });
      });
      nextButton.addEventListener("click", function () {
        if (!validateStep(currentStep)) return;
        highestStep = Math.max(highestStep, currentStep + 1);
        showStep(currentStep + 1);
      });
      backButton.addEventListener("click", function () { if (currentStep > 0) showStep(currentStep - 1); });
      document.querySelectorAll("[data-step-tab]").forEach(function (tab) {
        tab.addEventListener("click", function () {
          var target = Number(tab.getAttribute("data-step-tab"));
          if (target <= highestStep) showStep(target);
        });
      });
      form.addEventListener("submit", function (event) { event.preventDefault(); activate(); });
      document.getElementById("edit-setup").addEventListener("click", function () { highestStep = 3; showStep(0); });
      document.getElementById("copy-link").addEventListener("click", async function (event) {
        var target = new URL(chatHref, location.href).href;
        try {
          await navigator.clipboard.writeText(target);
          event.currentTarget.textContent = "Link copiado";
        } catch (error) {
          window.prompt("Link do bot", target);
        }
      });

      loadWorkspace();
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () { navigator.serviceWorker.register("./sw.js").catch(function () { return undefined; }); });
      }
    })();
  </script>
</body>
</html>`;

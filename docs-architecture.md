# Arquitetura do Bot de Vendas

## Objetivo

Qualificar leads, recomendar produtos e encaminhar oportunidades quentes para um CRM sem acoplar a regra comercial a HTTP, persistencia, fila ou gerador de texto.

## Visao geral

```mermaid
flowchart LR
  subgraph Channels[Canais]
    Web[Web PWA]
    WA[WhatsApp]
    IG[Instagram]
    Ops[Operacao]
  end

  subgraph Entry[Entrada]
    API[Fastify HTTP API]
    Gateway[Webhook Gateway]
    Dedupe[Idempotency Store]
  end

  subgraph Application[Aplicacao]
    Bot[SalesBot]
    Setup[Workspace Onboarding]
    Rules[Lead Scoring]
    Queue[EventBus Queue]
    Worker[Handoff Worker]
  end

  subgraph Data[Dados]
    Conversations[(Conversation Store)]
    Leads[(Lead Store)]
    Catalog[(Product Catalog)]
    Workspace[(Sales Workspace)]
  end

  subgraph Adapters[Adaptadores externos]
    InputGuard[Sales Topic Guard]
    Copy[Ollama / Template / HTTP Copy]
    CRM[Local / HTTP CRM]
  end

  subgraph Signals[Observabilidade]
    Logs[Pino JSON Logs]
    Metrics[Prometheus Metrics]
    Traces[OpenTelemetry Traces]
  end

  Web --> API
  Ops --> API
  WA --> Gateway
  IG --> Gateway
  Gateway --> Dedupe
  Gateway --> API
  API --> Setup
  Setup --> Workspace
  Workspace --> Catalog
  API --> Bot
  Bot --> Rules
  Bot --> Conversations
  Bot --> Leads
  Bot --> Catalog
  Bot --> InputGuard
  InputGuard --> Copy
  Bot -. lead.handoff.requested .-> Queue
  Queue -. consumes .-> Worker
  Worker --> Leads
  Worker --> CRM
  API --> Logs
  Queue --> Metrics
  Worker --> Metrics
  Bot --> Traces
```

## Fluxo de mensagem

1. A API recebe uma mensagem web ou um evento normalizado de WhatsApp/Instagram.
2. O gateway rejeita credenciais invalidas e deduplica `channel + messageId`.
3. `SalesBot` agrega o perfil, calcula score, seleciona produtos e persiste conversa e lead.
4. `SalesTopicGuardGenerator` bloqueia prompt injection e entradas claramente externas antes da inferencia.
5. `OllamaSalesCopyGenerator` usa o modelo local com prompt restritivo e JSON Schema; saidas invalidas voltam ao template.
6. Na primeira transicao para `handoff`, o bot publica `lead.handoff.requested`.
7. `HandoffWorker` consome o evento, sincroniza o CRM com chave idempotente e atualiza o lead.
8. Falhas de CRM recebem retry exponencial; o estado final fica `completed` ou `failed`.

## Fluxo de aquisicao

1. O proprietario configura negocio, publico, oferta, produtos e atendimento em `/setup`.
2. A API valida o payload completo e persiste um `SalesWorkspace` ativo.
3. `WorkspaceProductCatalog` passa a servir e ranquear os produtos configurados.
4. O chat carrega marca, saudacao, imagens e catalogo sem acoplamento ao formulario.
5. O modelo recebe somente os dados comerciais persistidos e os produtos recomendados.
6. No Pages, a mesma fronteira e simulada em `localStorage` e o chat fica em `chat.html`.

## Fronteira do modelo

O modelo nao decide nenhuma transicao de negocio. Ele recebe somente o objetivo calculado pela aplicacao, estagio, score, perfil, produtos recomendados e as ultimas mensagens marcadas como dados nao confiaveis.

A saida estruturada aceita somente classificacao `sales`, texto e IDs de produtos. Entradas externas sao desviadas antes da inferencia; qualquer outra classificacao, falha HTTP, timeout, JSON invalido, produto desconhecido, preco inventado ou vazamento de prompt aciona o template local.

## Persistencia

- Producao local: `JsonFileStore` compartilhado por conversas e leads, configurado por `DATA_FILE`.
- Testes: repositorios em memoria, sem rede ou disco.
- Evolucao: as portas permitem Postgres/DynamoDB sem alterar `SalesBot` ou `HandoffWorker`.

## Observabilidade

- Logs correlacionados por `requestId`, `sessionId`, `leadId` e `eventId`.
- `http_request_duration_seconds`: latencia HTTP por rota/status.
- `bot_messages_total`: volume por canal, estagio e handoff.
- `lead_events_total`: eventos publicados.
- `event_queue_depth`: backlog da fila local.
- `lead_handoffs_total`: resultados do worker por status/provedor.
- `model_requests_total`: inferencias por modelo e resultado.
- `model_request_duration_seconds`: latencia da inferencia local.
- `model_guardrail_blocks_total`: entradas bloqueadas antes do modelo.
- `workspace_activations_total`: ativacoes concluidas por tom de atendimento.
- Trace `sales_bot.handle_message` com atributos comerciais sem conteudo da mensagem.

## Limites atuais

- A fila e a deduplicacao sao locais ao processo. Para multiplas replicas, usar Redis, SQS, RabbitMQ ou Kafka.
- O armazenamento JSON e adequado para uma unica instancia. Para concorrencia horizontal, usar banco transacional.
- O arquivo local contem dados do lead. Em producao, usar banco com criptografia, controle de acesso e politica de retencao.
- Os webhooks recebem um contrato normalizado; adaptadores de payload especificos da Meta devem ficar antes desse gateway.

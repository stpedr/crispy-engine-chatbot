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
    Rules[Lead Scoring]
    Queue[EventBus Queue]
    Worker[Handoff Worker]
  end

  subgraph Data[Dados]
    Conversations[(Conversation Store)]
    Leads[(Lead Store)]
    Catalog[(Product Catalog)]
  end

  subgraph Adapters[Adaptadores externos]
    Copy[Template / HTTP Copy]
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
  API --> Bot
  Bot --> Rules
  Bot --> Conversations
  Bot --> Leads
  Bot --> Catalog
  Bot --> Copy
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
4. `SalesCopyGenerator` produz a resposta. O adaptador HTTP e opcional e sempre possui fallback por template.
5. Na primeira transicao para `handoff`, o bot publica `lead.handoff.requested`.
6. `HandoffWorker` consome o evento, sincroniza o CRM com chave idempotente e atualiza o lead.
7. Falhas de CRM recebem retry exponencial; o estado final fica `completed` ou `failed`.

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
- Trace `sales_bot.handle_message` com atributos comerciais sem conteudo da mensagem.

## Limites atuais

- A fila e a deduplicacao sao locais ao processo. Para multiplas replicas, usar Redis, SQS, RabbitMQ ou Kafka.
- O armazenamento JSON e adequado para uma unica instancia. Para concorrencia horizontal, usar banco transacional.
- O arquivo local contem dados do lead. Em producao, usar banco com criptografia, controle de acesso e politica de retencao.
- Os webhooks recebem um contrato normalizado; adaptadores de payload especificos da Meta devem ficar antes desse gateway.

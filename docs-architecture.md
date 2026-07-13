# Arquitetura do Bot de Vendas

## Objetivo

Criar um bot de vendas que qualifica leads, recomenda produtos e indica quando passar para um vendedor humano, sem prender a regra de negocio em HTTP, banco, CRM ou provedor de IA.

## Camadas

1. **Dominio**
   - Tipos de lead, conversa, produto e estagio.
   - Score de lead e decisao de estagio.

2. **Aplicacao**
   - `SalesBot` orquestra mensagem, extracao simples de perfil, busca no catalogo, resposta e persistencia.

3. **Infraestrutura**
   - HTTP com Fastify.
   - Logs com Pino.
   - Metricas com Prometheus.
   - Tracing com OpenTelemetry.
   - Persistencia e catalogo em memoria para desenvolvimento/teste.

## Por que essa arquitetura

- Testes unitarios nao dependem de servidor, banco ou internet.
- A API pode ser trocada por webhook de WhatsApp sem mexer no bot.
- Um LLM pode entrar como adaptador futuro, com contrato claro e mockavel.
- Logs e metricas observam comportamento real sem misturar telemetria nas regras.

## Politica de qualificacao inicial

- `new`: sem informacao suficiente.
- `qualifying`: existe interesse, mas faltam dados.
- `qualified`: lead com score bom.
- `proposal`: lead qualificado com produto recomendado.
- `handoff`: lead quente com email e consentimento de contato.

## Sinais observaveis

- Latencia por rota: `http_request_duration_seconds`.
- Volume por canal/estagio: `bot_messages_total`.
- Logs correlacionados por `requestId` e `sessionId`.
- Trace `sales_bot.handle_message` quando OTLP estiver configurado.

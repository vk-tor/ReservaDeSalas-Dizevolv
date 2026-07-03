# Dizevolv Rooms (Reserva de Salas)

Desafio técnico full-stack para a vaga de desenvolvedor na **Dizevolv**.

## Stack Escolhida
- **TypeScript** em todo o projeto.
- **Next.js (App Router)** para React (Frontend) e Route Handlers (Backend API).
- **Tailwind CSS v4** para estilização alinhada com o design system da marca.
- **Prisma ORM** e **PostgreSQL** (via Supabase) com o adapter `@prisma/adapter-pg`.
- **Zod** para validação robusta de entradas.
- **React Query** para gerenciamento de estado assíncrono e cache no frontend.

## Setup e Execução (Rode do zero)

1. Clone o repositório:
   ```bash
   git clone https://github.com/vk-tor/ReservaDeSalas-Dizevolv.git
   cd reserva-salas
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz do projeto contendo as strings de conexão do Supabase:
   ```env
   DATABASE_URL="postgresql://postgres.xxx:senha@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.xxx:senha@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
   ```
4. Aplique as migrations no banco:
   ```bash
   npx prisma migrate dev
   ```
5. Rode o servidor local:
   ```bash
   npm run dev
   ```
6. Acesse [http://localhost:3000](http://localhost:3000).

## Premissas e Decisões de Produto

Durante o desenvolvimento, algumas decisões de UX e regras de negócio foram tomadas:

- **Conflito que "encosta":** Reservas onde o término de uma é exatamente o início de outra (ex: termina às 14h, começa às 14h) **não são consideradas conflito**.
- **UX Baseado em Sessões:** O fluxo foi inspirado em sites de Cinema (como a Ingresso.com). O usuário não digita datas e horas manualmente. Ele seleciona a Sala (Filme), seleciona a Data, e interage com botões visuais que representam os blocos de **1 hora** (08:00 às 20:00).
- **Capacidade da Sala (Hard Block):** Foi implementado um bloqueio rígido, impedindo que o usuário insira um número de participantes maior que a capacidade da sala, com um indicador visual (barra de progresso) e validação tanto no frontend quanto no backend.
- **Design System:** As cores, tipografias e formas arredondadas (pills) foram inspiradas no site principal da [Dizevolv](https://dizevolv.com.br/).

## Pergunta de Raciocínio (Recorrência)

**Pergunta:** *Como você evoluiria este sistema para suportar reservas recorrentes? O que mudaria no modelo de dados e na checagem de conflito?*

**Resposta e Implementação:** 
Como um **diferencial**, a recorrência foi efetivamente codificada no projeto.
- **Modelo de Dados:** O campo `seriesId` foi adicionado à entidade `Reservation`. Em vez de salvar uma string complexa de cron no banco, o sistema expande os eventos e salva entidades atômicas (uma para cada data). 
- **Checagem de Conflito:** A API mapeia todas as sessões baseadas na frequência e no número de ocorrências, busca os blocos adjacentes no banco e realiza a validação de forma iterativa antes do salvamento.
- **Atomicidade:** A gravação das instâncias recorrentes é feita via `prisma.$transaction`. Se apenas 1 das 12 ocorrências semanais tiver conflito, a reserva da série inteira é abortada, garantindo a integridade dos dados e evitando reservas parciais inesperadas.

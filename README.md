# Dizevolv Rooms (Reserva de Salas)

Desafio técnico full-stack para a vaga de desenvolvedor na **Dizevolv**.

## Stack Escolhida
- **TypeScript** em todo o projeto.
- **Next.js (App Router)** para React (Frontend) e Route Handlers (Backend API).
- **Tailwind CSS v4** para estilização alinhada com o design system da marca.
- **Prisma ORM** e **PostgreSQL** (via Supabase) com o adapter `@prisma/adapter-pg`.
- **Zod** para validação robusta de entradas.
- **React Query** para gerenciamento de estado assíncrono e cache no frontend.
- **Vitest** para testes automatizados da regra de conflito.

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
3. Crie um arquivo `.env` na raiz do projeto contendo as strings de conexão do Supabase (fornecidas separadamente ou crie um projeto novo no Supabase):
   ```env
   DATABASE_URL="postgresql://postgres.xxx:senha@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.xxx:senha@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
   ```
4. Aplique as migrations no banco e faça o deploy do schema:
   ```bash
   npx prisma db push
   ```
5. Rode o servidor local:
   ```bash
   npm run dev
   ```
6. Acesse [http://localhost:3000](http://localhost:3000).

*(Opcional) Para popular o banco com dados de teste iniciais, o projeto possuía um script de seed que foi limpo para manter o repositório organizado, mas a estrutura das salas já pode ser criada pela interface.*

## Premissas e Decisões de Produto

Durante o desenvolvimento, as seguintes regras de negócio e de UX foram assumidas para responder às perguntas do case:

- **Reservas que encostam (ex: 14h às 15h e 15h às 16h) são conflito?**
  **Não.** O sistema permite que as reservas "encostem". A lógica de conflito no backend (e testada via Vitest) utiliza `<` e `>` estritos, garantindo que o término de uma reunião possa ser no mesmo exato instante do início da próxima.
  
- **Existe horário de funcionamento? Pode reservar de madrugada? Fim de semana?**
  **Sim.** No UX implementado (inspirado em seleção de horários de cinema), o usuário escolhe a data e clica em blocos pré-definidos de sessões. O horário de funcionamento assumido foi das **08:00 às 20:00**, e o calendário do sistema desabilita visualmente a reserva de finais de semana (sábados e domingos), bem como horários no passado.

- **O que acontece ao editar uma reserva para um horário que agora conflita?**
  Ao editar uma reserva, a checagem de conflito do servidor exclui a própria reserva (via seu `id`) para evitar um falso-positivo, mas checa contra todas as outras. Se o novo horário colidir com outra reunião existente, **a ação é bloqueada** com erro 409 (Conflict). O mesmo vale para editar a capacidade máxima de uma sala: se for menor do que os participantes de reservas já existentes, é bloqueado.

- **Como o front comunica um conflito de forma que o usuário entenda o que fazer?**
  O front-end utiliza uma **combinação de prevenção e feedback reativo**:
  1. *Prevenção:* Na interface gráfica, horários que já estão ocupados para aquela sala/dia aparecem visualmente desabilitados (cinzas, com opacidade baixa) e não podem ser selecionados, guiando o usuário apenas para horários livres.
  2. *Feedback:* Se um conflito acontecer de forma simultânea por concorrência de usuários (ou via requisição direta de API), o sistema exibe um **Toast** (alerta animado) no estilo do design system, com a mensagem: `"Este horário já está reservado para a sala selecionada"`, instruindo claramente que aquele horário não está mais disponível.

## Pergunta de Raciocínio (Recorrência)

**Pergunta:** *Como você evoluiria este sistema para suportar reservas recorrentes (ex.: "toda terça às 14h, pelos próximos 3 meses")? O que mudaria no modelo de dados e na checagem de conflito?*

**Resposta e Implementação:** 
Como um **diferencial**, a recorrência foi efetivamente codificada e entregue no projeto!
- **Modelo de Dados:** Um novo campo `seriesId` (String, nullable) foi adicionado à entidade `Reservation`. O banco continua salvando cada ocorrência da reserva como uma entrada independente. Isso facilita consultas por intervalo de data, alterações individuais (editar apenas 1 dos dias sem afetar os outros) e mantém a performance de leitura.
- **Checagem de Conflito:** A API (`POST /api/reservations`) recebe o payload com a regra de recorrência, mapeia todas as sessões futuras em memória com base na regra de fim (`recurrenceEndDate`), e faz um _loop_ de validação verificando conflitos individuais para cada sessão futura contra o banco de dados.
- **Atomicidade:** A gravação de todas as instâncias recorrentes (ex: as 12 terças-feiras) é executada envelopada num `prisma.$transaction()`. Se houver conflito em *qualquer um* dos dias previstos, **toda a operação de recorrência é abortada** e revertida (rollback), e o erro é retornado ao usuário, evitando a criação de reservas "pela metade".

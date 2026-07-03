# 🏢 Reserva de Salas - Dizevolv

Um sistema moderno, rápido e intuitivo para gerenciamento e reserva de salas de reunião. Desenvolvido como desafio técnico para a vaga de desenvolvedor full-stack na **Dizevolv**.

🔗 **Acesse o sistema em produção:** [reserva-salas-ten.vercel.app](https://reserva-salas-ten.vercel.app)

---

## 🌟 O Projeto

O objetivo deste projeto é fornecer uma interface agradável e um backend robusto para garantir que colaboradores possam reservar espaços de trabalho sem dores de cabeça com conflitos de agenda, lotação ou indisponibilidade.

### ✨ Diferenciais e Destaques Implementados
- **Reservas Recorrentes (O Desafio Bônus!):** Implementação de ponta a ponta de reservas que se repetem (ex: toda semana pelos próximos meses). Utiliza atomicidade no banco de dados (`prisma.$transaction`) garantindo que todas as sessões sejam marcadas ou, em caso de um único conflito futuro, ocorra o rollback completo da operação informando o erro.
- **Checagem de Conflitos Inteligente:** O backend possui uma validação minuciosa que permite reuniões sequenciais perfeitas (uma encerra às 15h e a próxima inicia às 15h sem gerar alertas falsos de choque de horário).
- **UX Focada na Prevenção de Erros:** Calendário interativo que já desabilita visualmente horários ocupados ou no passado. Caso haja concorrência extrema de usuários, a interface reage com _Toasts_ amigáveis explicando o ocorrido (ao invés de erros genéricos).
- **Validação de Lotação (Safe Edit):** Se o administrador tenta reduzir a capacidade máxima de uma sala, o sistema verifica as reservas já existentes no banco. Se uma reunião já agendada ultrapassa a nova lotação, a edição da sala é inteligentemente bloqueada.
- **Deploy & Infraestrutura:** Deploy automático de produção via Vercel com banco de dados PostgreSQL escalável no Supabase.

## 🚀 Stack Tecnológica
- **Next.js (App Router):** Utilizado tanto para a interface (React) quanto para as APIs (Route Handlers).
- **TypeScript:** Tipagem estática e segurança de ponta a ponta.
- **Tailwind CSS v4:** Estilização responsiva, fluida e alinhada às melhores práticas de design.
- **Prisma ORM & PostgreSQL:** Modelagem de dados moderna conectada ao Supabase.
- **Zod:** Validação estrita de dados e payloads.
- **Vitest:** Para testes automatizados e garantia do funcionamento da lógica de regras de negócio.

---

## 🛠️ Como rodar o projeto localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/vk-tor/ReservaDeSalas-Dizevolv.git
   cd reserva-salas
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configuração de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto com as credenciais de conexão do Supabase (fornecidas no e-mail de entrega):
   ```env
   # .env
   DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://[USER]:[PASSWORD]@[HOST]:5432/postgres"
   ```

4. **Sincronize o Banco de Dados:**
   ```bash
   npx prisma db push
   ```

5. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse: [http://localhost:3000](http://localhost:3000)

---

## 📌 Premissas e Regras de Negócio Assumidas
- O horário comercial para marcação considerado na UI é das **08:00 às 20:00**.
- Finais de semana e dias/horários no passado não são elegíveis para criação de novas reuniões.
- O sistema considera o conceito de *Edição Segura*: Ao alterar os dados de uma reunião, a validação de conflito ignora sua própria existência no banco, permitindo alterar confortavelmente participantes e detalhes mantendo o slot original.

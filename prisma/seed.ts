import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Limpando banco de dados...");
  await prisma.reservation.deleteMany();
  await prisma.room.deleteMany();

  console.log("Criando salas...");
  const rooms = await Promise.all([
    prisma.room.create({ data: { name: "Auditório Dizevolv", capacity: 150 } }),
    prisma.room.create({ data: { name: "Sala de Ideação", capacity: 8 } }),
    prisma.room.create({ data: { name: "Meeting Room Alpha", capacity: 12 } }),
    prisma.room.create({ data: { name: "Estúdio de Gravação", capacity: 4 } }),
    prisma.room.create({ data: { name: "Sala de Foco 1", capacity: 2 } }),
    prisma.room.create({ data: { name: "Boardroom", capacity: 20 } }),
  ]);

  console.log("Salas criadas. Criando reservas...");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const formatHour = (date: Date, hour: number) => {
    const d = new Date(date);
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  };

  // Reserva simples no Auditório
  await prisma.reservation.create({
    data: {
      roomId: rooms[0].id,
      title: "All Hands Dizevolv",
      host: "Eduard",
      participants: 120,
      startTime: formatHour(today, 14),
      endTime: formatHour(today, 16),
    }
  });

  // Reserva recorrente (Daily) na Sala de Ideação
  const seriesId = randomUUID();
  for (let i = 0; i < 10; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + i);
    // Ignorar sábados e domingos
    const day = targetDate.getDay();
    if (day === 0 || day === 6) continue;
    
    await prisma.reservation.create({
      data: {
        roomId: rooms[1].id,
        title: "Daily Sync",
        host: "Victor",
        participants: 6,
        startTime: formatHour(targetDate, 9),
        endTime: formatHour(targetDate, 10),
        seriesId: seriesId
      }
    });
  }

  // Mais algumas reservas avulsas
  await prisma.reservation.create({
    data: {
      roomId: rooms[2].id,
      title: "Reunião de Diretoria",
      host: "Carlos",
      participants: 10,
      startTime: formatHour(today, 10),
      endTime: formatHour(today, 12),
    }
  });

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.reservation.create({
    data: {
      roomId: rooms[3].id,
      title: "Gravação Podcast",
      host: "Ana",
      participants: 3,
      startTime: formatHour(tomorrow, 15),
      endTime: formatHour(tomorrow, 18),
    }
  });

  console.log("Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

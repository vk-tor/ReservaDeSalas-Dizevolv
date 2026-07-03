import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createReservationSchema } from "@/lib/validations";
import { findConflict } from "@/lib/conflict";

// GET /api/reservations — Lista reservas com filtros opcionais
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const date = searchParams.get("date"); // formato: YYYY-MM-DD

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (roomId) {
      where.roomId = roomId;
    }

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      where.startTime = { gte: dayStart };
      where.endTime = { lte: dayEnd };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        room: {
          select: { name: true, capacity: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Erro ao buscar reservas:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar reservas." },
      { status: 500 }
    );
  }
}

// POST /api/reservations — Cria uma ou mais reservas com validação de conflito no servidor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { roomId, title, participants, sessions, recurrence } = parsed.data;

    // Verificar se a sala existe e obter capacidade
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 }
      );
    }

    // Validação de capacidade (bloqueante)
    if (participants > room.capacity) {
      return NextResponse.json(
        { error: `A sala comporta no máximo ${room.capacity} pessoas.` },
        { status: 400 }
      );
    }

    // Gerar todas as sessões baseadas na recorrência
    const generatedSessions: { startTime: Date; endTime: Date }[] = [];
    const occurrences = recurrence?.occurrences ?? 1;
    const type = recurrence?.type ?? "none";
    
    for (let i = 0; i < occurrences; i++) {
      for (const session of sessions) {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        
        if (type === "daily") {
          start.setDate(start.getDate() + i);
          end.setDate(end.getDate() + i);
        } else if (type === "weekly") {
          start.setDate(start.getDate() + (i * 7));
          end.setDate(end.getDate() + (i * 7));
        }
        
        generatedSessions.push({ startTime: start, endTime: end });
      }
    }

    // Calcular bounding box de tempo para otimizar busca no DB
    const minStart = new Date(Math.min(...generatedSessions.map(s => s.startTime.getTime())));
    const maxEnd = new Date(Math.max(...generatedSessions.map(s => s.endTime.getTime())));

    // Buscar reservas existentes da mesma sala que possam conflitar
    const existingReservations = await prisma.reservation.findMany({
      where: {
        roomId,
        startTime: { lt: maxEnd },
        endTime: { gt: minStart },
      },
    });

    // Validar conflitos para cada sessão gerada
    for (const session of generatedSessions) {
      const conflict = findConflict(existingReservations, session);
      if (conflict) {
        return NextResponse.json(
          {
            error: `Conflito de horário: já existe uma reserva nesta sala em ${session.startTime.toLocaleDateString("pt-BR")} entre ${conflict.startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} e ${conflict.endTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
          },
          { status: 409 }
        );
      }
    }

    // Criar todas as reservas no banco em uma transação
    // const seriesId = generatedSessions.length > 1 ? randomUUID() : null; // crypto needed
    // Workaround since crypto is not imported, let's use a timestamp+random string
    const seriesId = generatedSessions.length > 1 ? `series_${Date.now()}_${Math.floor(Math.random() * 1000)}` : null;
    
    const created = await prisma.$transaction(
      generatedSessions.map((session) => 
        prisma.reservation.create({
          data: {
            roomId,
            title,
            participants,
            startTime: session.startTime,
            endTime: session.endTime,
            seriesId
          },
          include: { room: { select: { name: true, capacity: true } } }
        })
      )
    );

    return NextResponse.json(
      {
        reservations: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar reserva:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar reserva." },
      { status: 500 }
    );
  }
}

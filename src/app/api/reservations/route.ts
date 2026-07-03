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

// POST /api/reservations — Cria uma nova reserva com validação de conflito no servidor
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

    const { roomId, title, participants, startTime, endTime } = parsed.data;

    // Verificar se a sala existe e obter capacidade
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 }
      );
    }

    // Aviso de capacidade (não-bloqueante)
    const capacityWarning =
      participants > room.capacity
        ? `Atenção: a sala "${room.name}" comporta ${room.capacity} pessoas, mas foram indicados ${participants} participantes.`
        : null;

    // Buscar reservas existentes da mesma sala que possam conflitar
    const existingReservations = await prisma.reservation.findMany({
      where: {
        roomId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    // Verificar conflito usando a função pura
    const conflict = findConflict(existingReservations, {
      startTime,
      endTime,
    });

    if (conflict) {
      return NextResponse.json(
        {
          error: `Conflito de horário: já existe uma reserva nesta sala entre ${conflict.startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} e ${conflict.endTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
        },
        { status: 409 }
      );
    }

    // Criar a reserva
    const reservation = await prisma.reservation.create({
      data: { roomId, title, participants, startTime, endTime },
      include: {
        room: { select: { name: true, capacity: true } },
      },
    });

    return NextResponse.json(
      {
        ...reservation,
        warning: capacityWarning,
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

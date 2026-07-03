import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateReservationSchema } from "@/lib/validations";
import { findConflict } from "@/lib/conflict";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/reservations/[id] — Atualiza uma reserva com revalidação de conflito
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Buscar a reserva existente
    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Reserva não encontrada." },
        { status: 404 }
      );
    }

    // Mesclar dados existentes com os novos
    const updatedData = {
      roomId: parsed.data.roomId ?? existing.roomId,
      title: parsed.data.title ?? existing.title,
      host: parsed.data.host ?? existing.host,
      participants: parsed.data.participants ?? existing.participants,
      startTime: parsed.data.startTime ?? existing.startTime,
      endTime: parsed.data.endTime ?? existing.endTime,
    };

    // Verificar a sala
    const room = await prisma.room.findUnique({
      where: { id: updatedData.roomId },
    });
    if (!room) {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 }
      );
    }

    if (updatedData.participants > room.capacity) {
      return NextResponse.json(
        { error: `A sala comporta no máximo ${room.capacity} pessoas.` },
        { status: 400 }
      );
    }

    // Verificar conflito excluindo a própria reserva
    const existingReservations = await prisma.reservation.findMany({
      where: {
        roomId: updatedData.roomId,
        startTime: { lt: updatedData.endTime },
        endTime: { gt: updatedData.startTime },
        id: { not: id },
      },
    });

    const conflict = findConflict(
      existingReservations,
      { startTime: updatedData.startTime, endTime: updatedData.endTime },
      id
    );

    if (conflict) {
      return NextResponse.json(
        {
          error: `Conflito de horário: já existe uma reserva nesta sala entre ${conflict.startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} e ${conflict.endTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
        },
        { status: 409 }
      );
    }

    let reservation;
    if (parsed.data.applyToSeries && existing.seriesId) {
      // Atualizar todas as instâncias dessa série
      await prisma.reservation.updateMany({
        where: { seriesId: existing.seriesId },
        data: {
          title: updatedData.title,
          host: updatedData.host,
          participants: updatedData.participants,
        },
      });
      // Retornar a própria reserva editada
      reservation = await prisma.reservation.findUnique({
        where: { id },
        include: { room: { select: { name: true, capacity: true } } },
      });
    } else {
      reservation = await prisma.reservation.update({
        where: { id },
        data: updatedData,
        include: {
          room: { select: { name: true, capacity: true } },
        },
      });
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Erro ao atualizar reserva:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar reserva." },
      { status: 500 }
    );
  }
}

// DELETE /api/reservations/[id] — Remove uma reserva
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.reservation.delete({ where: { id } });

    return NextResponse.json({ message: "Reserva removida com sucesso." });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Reserva não encontrada." },
        { status: 404 }
      );
    }
    console.error("Erro ao remover reserva:", error);
    return NextResponse.json(
      { error: "Erro interno ao remover reserva." },
      { status: 500 }
    );
  }
}

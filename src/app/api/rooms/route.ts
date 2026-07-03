import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRoomSchema } from "@/lib/validations";

// GET /api/rooms — Lista todas as salas
export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        _count: {
          select: { reservations: true },
        },
        reservations: {
          where: { startTime: { gte: new Date() } },
          orderBy: { startTime: 'asc' },
          take: 3,
          select: { id: true, title: true, startTime: true, endTime: true, participants: true }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Erro ao buscar salas:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar salas." },
      { status: 500 }
    );
  }
}

// POST /api/rooms — Cria uma nova sala
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: parsed.data,
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar sala:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar sala." },
      { status: 500 }
    );
  }
}

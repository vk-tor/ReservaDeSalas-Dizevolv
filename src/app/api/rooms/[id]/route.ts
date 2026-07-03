import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateRoomSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/rooms/[id] — Atualiza uma sala
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const room = await prisma.room.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(room);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 }
      );
    }
    console.error("Erro ao atualizar sala:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar sala." },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id] — Remove uma sala e suas reservas (cascade)
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.room.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Sala removida com sucesso." });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 }
      );
    }
    console.error("Erro ao remover sala:", error);
    return NextResponse.json(
      { error: "Erro interno ao remover sala." },
      { status: 500 }
    );
  }
}

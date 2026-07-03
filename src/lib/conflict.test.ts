import { describe, it, expect } from "vitest";
import { findConflict, validateTimeRange } from "./conflict";
import type { TimeSlot } from "./conflict";

describe("findConflict", () => {
  const existing: TimeSlot[] = [
    {
      id: "res-1",
      startTime: new Date("2025-01-15T10:00:00Z"),
      endTime: new Date("2025-01-15T12:00:00Z"),
    },
    {
      id: "res-2",
      startTime: new Date("2025-01-15T14:00:00Z"),
      endTime: new Date("2025-01-15T16:00:00Z"),
    },
  ];

  it("deve detectar conflito quando nova reserva sobrepõe uma existente", () => {
    const newReservation: TimeSlot = {
      startTime: new Date("2025-01-15T11:00:00Z"),
      endTime: new Date("2025-01-15T13:00:00Z"),
    };

    const conflict = findConflict(existing, newReservation);
    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe("res-1");
  });

  it("deve permitir reservas que 'encostam' (fim = início da próxima)", () => {
    const newReservation: TimeSlot = {
      startTime: new Date("2025-01-15T12:00:00Z"),
      endTime: new Date("2025-01-15T14:00:00Z"),
    };

    const conflict = findConflict(existing, newReservation);
    expect(conflict).toBeNull();
  });

  it("deve permitir reserva em horário totalmente livre", () => {
    const newReservation: TimeSlot = {
      startTime: new Date("2025-01-15T17:00:00Z"),
      endTime: new Date("2025-01-15T18:00:00Z"),
    };

    const conflict = findConflict(existing, newReservation);
    expect(conflict).toBeNull();
  });

  it("deve detectar conflito quando nova reserva está contida dentro de uma existente", () => {
    const newReservation: TimeSlot = {
      startTime: new Date("2025-01-15T10:30:00Z"),
      endTime: new Date("2025-01-15T11:30:00Z"),
    };

    const conflict = findConflict(existing, newReservation);
    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe("res-1");
  });

  it("deve detectar conflito quando nova reserva engloba uma existente", () => {
    const newReservation: TimeSlot = {
      startTime: new Date("2025-01-15T09:00:00Z"),
      endTime: new Date("2025-01-15T13:00:00Z"),
    };

    const conflict = findConflict(existing, newReservation);
    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe("res-1");
  });

  it("deve ignorar a própria reserva ao editar (excludeId)", () => {
    const editedReservation: TimeSlot = {
      startTime: new Date("2025-01-15T10:00:00Z"),
      endTime: new Date("2025-01-15T12:00:00Z"),
    };

    // Editando res-1 — não deve conflitar consigo mesma
    const conflict = findConflict(existing, editedReservation, "res-1");
    expect(conflict).toBeNull();
  });

  it("deve detectar conflito com outra reserva mesmo ao editar", () => {
    const editedReservation: TimeSlot = {
      startTime: new Date("2025-01-15T15:00:00Z"),
      endTime: new Date("2025-01-15T17:00:00Z"),
    };

    // Editando res-1, mas conflita com res-2
    const conflict = findConflict(existing, editedReservation, "res-1");
    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe("res-2");
  });

  it("deve retornar null para lista vazia de reservas existentes", () => {
    const newReservation: TimeSlot = {
      startTime: new Date("2025-01-15T10:00:00Z"),
      endTime: new Date("2025-01-15T12:00:00Z"),
    };

    const conflict = findConflict([], newReservation);
    expect(conflict).toBeNull();
  });
});

describe("validateTimeRange", () => {
  it("deve rejeitar quando endTime é igual a startTime", () => {
    const time = new Date("2030-01-15T10:00:00Z");
    const result = validateTimeRange(time, time);
    expect(result).not.toBeNull();
  });

  it("deve rejeitar quando endTime é anterior a startTime", () => {
    const result = validateTimeRange(
      new Date("2030-01-15T12:00:00Z"),
      new Date("2030-01-15T10:00:00Z")
    );
    expect(result).not.toBeNull();
  });

  it("deve aceitar range válido no futuro", () => {
    const result = validateTimeRange(
      new Date("2030-01-15T10:00:00Z"),
      new Date("2030-01-15T12:00:00Z")
    );
    expect(result).toBeNull();
  });

  it("deve rejeitar reserva no passado", () => {
    const result = validateTimeRange(
      new Date("2020-01-15T10:00:00Z"),
      new Date("2020-01-15T12:00:00Z")
    );
    expect(result).not.toBeNull();
  });
});

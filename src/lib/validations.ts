import { z } from "zod";

// ─── Room Schemas ────────────────────────────────────────────────────────────

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, "O nome da sala é obrigatório.")
    .max(100, "O nome da sala deve ter no máximo 100 caracteres."),
  capacity: z
    .number()
    .int("A capacidade deve ser um número inteiro.")
    .min(1, "A capacidade deve ser de pelo menos 1 pessoa."),
});

export const updateRoomSchema = createRoomSchema.partial();

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

// ─── Reservation Schemas ─────────────────────────────────────────────────────

const timeSlotSchema = z
  .object({
    startTime: z.coerce.date({ error: "O horário de início é obrigatório." }),
    endTime: z.coerce.date({ error: "O horário de término é obrigatório." }),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "O horário de término deve ser posterior ao horário de início.",
    path: ["endTime"],
  });

export const createReservationSchema = z
  .object({
    roomId: z.string().min(1, "A sala é obrigatória."),
    title: z
      .string()
      .min(1, "O título da reserva é obrigatório.")
      .max(200, "O título deve ter no máximo 200 caracteres."),
    host: z.string().min(1, "O responsável é obrigatório."),
    participants: z
      .number()
      .int("O número de participantes deve ser inteiro.")
      .min(1, "Deve haver ao menos 1 participante."),
    sessions: z.array(timeSlotSchema).min(1, "Selecione ao menos um horário."),
    recurrence: z
      .object({
        type: z.enum(["none", "daily", "weekly"]),
        endDate: z.coerce.date().optional(),
        daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
      })
      .optional(),
  });

export const updateReservationSchema = z
  .object({
    roomId: z.string().min(1, "A sala é obrigatória.").optional(),
    title: z
      .string()
      .min(1, "O título da reserva é obrigatório.")
      .max(200, "O título deve ter no máximo 200 caracteres.")
      .optional(),
    host: z.string().min(1, "O responsável é obrigatório.").optional(),
    participants: z
      .number()
      .int("O número de participantes deve ser inteiro.")
      .min(1, "Deve haver ao menos 1 participante.")
      .optional(),
    startTime: z.coerce
      .date({ error: "O horário de início é obrigatório." })
      .optional(),
    endTime: z.coerce
      .date({ error: "O horário de término é obrigatório." })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: "O horário de término deve ser posterior ao horário de início.",
      path: ["endTime"],
    }
  );

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;

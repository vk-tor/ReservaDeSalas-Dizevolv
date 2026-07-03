/**
 * Pure function for checking reservation time conflicts.
 * Isolated from the database for easy unit testing.
 *
 * Rule: Two reservations conflict if they overlap in time for the same room.
 * "Touching" reservations (one ends at 14:00, another starts at 14:00) do NOT conflict.
 */

export interface TimeSlot {
  id?: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Checks if a new reservation conflicts with any existing reservations.
 *
 * Two time slots overlap when:
 *   newStart < existingEnd AND newEnd > existingStart
 *
 * This allows "touching" reservations (one ends exactly when another starts).
 *
 * @param existingReservations - Array of existing reservations for the same room
 * @param newReservation - The new reservation to check
 * @param excludeId - Optional ID to exclude (used when editing a reservation)
 * @returns The first conflicting reservation, or null if no conflict
 */
export function findConflict(
  existingReservations: TimeSlot[],
  newReservation: TimeSlot,
  excludeId?: string
): TimeSlot | null {
  for (const existing of existingReservations) {
    // Skip the reservation being edited
    if (excludeId && existing.id === excludeId) {
      continue;
    }

    const overlaps =
      newReservation.startTime < existing.endTime &&
      newReservation.endTime > existing.startTime;

    if (overlaps) {
      return existing;
    }
  }

  return null;
}

/**
 * Validates that a reservation's time range is logically valid.
 *
 * @param startTime - Start of the reservation
 * @param endTime - End of the reservation
 * @returns An error message string, or null if valid
 */
export function validateTimeRange(
  startTime: Date,
  endTime: Date
): string | null {
  if (endTime <= startTime) {
    return "O horário de término deve ser posterior ao horário de início.";
  }

  const now = new Date();
  if (startTime < now) {
    return "Não é possível criar reservas no passado.";
  }

  return null;
}

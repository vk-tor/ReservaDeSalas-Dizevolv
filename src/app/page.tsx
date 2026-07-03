"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, Fragment } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  name: string;
  capacity: number;
  _count?: { reservations: number };
}

interface Reservation {
  id: string;
  roomId: string;
  title: string;
  participants: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  room?: { name: string; capacity: number };
  warning?: string | null;
}

type ModalType =
  | null
  | "createRoom"
  | "editRoom"
  | "createReservation"
  | "editReservation";

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function fetchRooms(): Promise<Room[]> {
  const res = await fetch("/api/rooms");
  if (!res.ok) throw new Error("Erro ao buscar salas");
  return res.json();
}

async function fetchReservations(
  roomId?: string,
  date?: string
): Promise<Reservation[]> {
  const params = new URLSearchParams();
  if (roomId) params.set("roomId", roomId);
  if (date) params.set("date", date);
  const res = await fetch(`/api/reservations?${params.toString()}`);
  if (!res.ok) throw new Error("Erro ao buscar reservas");
  return res.json();
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function getStatus(
  startTime: string,
  endTime: string
): { label: string; color: string } {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now >= start && now <= end)
    return {
      label: "Em andamento",
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    };
  if (now < start)
    return {
      label: "Próxima",
      color: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    };
  return {
    label: "Encerrada",
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDatetimeInput(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "warning";
  onClose: () => void;
}) {
  const colors = {
    success: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
    error: "bg-red-500/10 border-red-500/40 text-red-300",
    warning: "bg-amber-500/10 border-amber-500/40 text-amber-300",
  };
  return (
    <div
      className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl animate-slide-in flex items-center gap-3 ${colors[type]}`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-800/60 ${className}`}
    />
  );
}

function ReservationSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-gray-900/50 border border-gray-800/50 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-xs">{description}</p>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-lg mx-4 bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl animate-modal-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const queryClient = useQueryClient();

  // State
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [filterRoomId, setFilterRoomId] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  // Form state
  const [roomForm, setRoomForm] = useState({ name: "", capacity: "" });
  const [resForm, setResForm] = useState({
    roomId: "",
    title: "",
    participants: "",
    startTime: "",
    endTime: "",
  });

  // Queries
  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
  });

  const reservationsQuery = useQuery({
    queryKey: ["reservations", filterRoomId, filterDate],
    queryFn: () => fetchReservations(filterRoomId || undefined, filterDate || undefined),
  });

  // Show toast helper
  const showToast = (
    message: string,
    type: "success" | "error" | "warning"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Mutations ───────────────────────────────────────────────────────────

  const createRoom = useMutation({
    mutationFn: async (data: { name: string; capacity: number }) => {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar sala");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setActiveModal(null);
      setRoomForm({ name: "", capacity: "" });
      showToast("Sala criada com sucesso!", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const updateRoom = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; capacity?: number };
    }) => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao atualizar sala");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setActiveModal(null);
      setSelectedRoom(null);
      showToast("Sala atualizada!", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao remover sala");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      showToast("Sala removida!", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const createReservation = useMutation({
    mutationFn: async (data: {
      roomId: string;
      title: string;
      participants: number;
      startTime: string;
      endTime: string;
    }) => {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar reserva");
      return json as Reservation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setActiveModal(null);
      setResForm({
        roomId: "",
        title: "",
        participants: "",
        startTime: "",
        endTime: "",
      });
      if (data.warning) {
        showToast(data.warning, "warning");
      } else {
        showToast("Reserva criada com sucesso!", "success");
      }
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const updateReservation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao atualizar reserva");
      return json as Reservation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setActiveModal(null);
      setSelectedReservation(null);
      if (data.warning) {
        showToast(data.warning, "warning");
      } else {
        showToast("Reserva atualizada!", "success");
      }
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao remover reserva");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      showToast("Reserva removida!", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  // ─── Modal Handlers ─────────────────────────────────────────────────────

  const openCreateRoom = () => {
    setRoomForm({ name: "", capacity: "" });
    setActiveModal("createRoom");
  };

  const openEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setRoomForm({ name: room.name, capacity: String(room.capacity) });
    setActiveModal("editRoom");
  };

  const openCreateReservation = () => {
    setResForm({
      roomId: filterRoomId || "",
      title: "",
      participants: "",
      startTime: "",
      endTime: "",
    });
    setActiveModal("createReservation");
  };

  const openEditReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setResForm({
      roomId: reservation.roomId,
      title: reservation.title,
      participants: String(reservation.participants),
      startTime: toLocalDatetimeInput(reservation.startTime),
      endTime: toLocalDatetimeInput(reservation.endTime),
    });
    setActiveModal("editReservation");
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const inputClasses =
    "w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm";

  const buttonPrimary =
    "px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

  const buttonSecondary =
    "px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm border border-gray-700/50 transition-all";

  const buttonDanger =
    "px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/20 transition-all";

  return (
    <Fragment>
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-white text-lg">📅</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Reserva de Salas
              </h1>
              <p className="text-xs text-gray-500">
                Sistema de agendamento de reuniões
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={openCreateRoom} className={buttonSecondary}>
              + Nova Sala
            </button>
            <button onClick={openCreateReservation} className={buttonPrimary}>
              + Nova Reserva
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Sidebar: Salas ── */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Salas
              </h2>
              {roomsQuery.data && (
                <span className="text-xs text-gray-600">
                  {roomsQuery.data.length} sala
                  {roomsQuery.data.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {roomsQuery.isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            )}

            {roomsQuery.data?.length === 0 && (
              <EmptyState
                icon="🏢"
                title="Nenhuma sala"
                description="Cadastre a primeira sala para começar."
              />
            )}

            {roomsQuery.data?.map((room) => (
              <div
                key={room.id}
                className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                  filterRoomId === room.id
                    ? "bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/5"
                    : "bg-gray-900/40 border-gray-800/50 hover:bg-gray-900/70 hover:border-gray-700/50"
                }`}
                onClick={() =>
                  setFilterRoomId(filterRoomId === room.id ? "" : room.id)
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-200 text-sm">
                      {room.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {room.capacity} pessoa{room.capacity !== 1 ? "s" : ""} ·{" "}
                      {room._count?.reservations ?? 0} reserva
                      {(room._count?.reservations ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditRoom(room);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-500 text-xs"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Remover a sala "${room.name}"? Todas as reservas dela serão excluídas.`
                          )
                        )
                          deleteRoom.mutate(room.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 text-xs"
                      title="Remover"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </aside>

          {/* ── Main: Reservas ── */}
          <section className="lg:col-span-9 space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Filtrar por sala
                </label>
                <select
                  value={filterRoomId}
                  onChange={(e) => setFilterRoomId(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Todas as salas</option>
                  {roomsQuery.data?.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Filtrar por data
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className={inputClasses}
                />
              </div>
              {(filterRoomId || filterDate) && (
                <button
                  onClick={() => {
                    setFilterRoomId("");
                    setFilterDate("");
                  }}
                  className="self-end px-3 py-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Reservation List */}
            {reservationsQuery.isLoading && (
              <div className="space-y-4">
                <ReservationSkeleton />
                <ReservationSkeleton />
                <ReservationSkeleton />
              </div>
            )}

            {reservationsQuery.data?.length === 0 && !reservationsQuery.isLoading && (
              <EmptyState
                icon="📋"
                title="Nenhuma reserva encontrada"
                description={
                  filterRoomId || filterDate
                    ? "Tente alterar os filtros para ver mais resultados."
                    : "Crie a primeira reserva clicando no botão acima."
                }
              />
            )}

            <div className="space-y-4">
              {reservationsQuery.data?.map((reservation) => {
                const status = getStatus(
                  reservation.startTime,
                  reservation.endTime
                );
                return (
                  <div
                    key={reservation.id}
                    className="group p-5 rounded-2xl bg-gray-900/40 border border-gray-800/50 hover:bg-gray-900/70 hover:border-gray-700/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-200">
                            {reservation.title}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                          <span>
                            🏢 {reservation.room?.name ?? "—"}
                          </span>
                          <span>
                            👥 {reservation.participants} participante
                            {reservation.participants !== 1 ? "s" : ""}
                            {reservation.room &&
                              reservation.participants >
                                reservation.room.capacity && (
                                <span className="text-amber-400 ml-1">
                                  (excede capacidade de{" "}
                                  {reservation.room.capacity})
                                </span>
                              )}
                          </span>
                          <span>
                            🕐 {formatTime(reservation.startTime)} –{" "}
                            {formatTime(reservation.endTime)}
                          </span>
                          <span>
                            📅{" "}
                            {formatDateTime(reservation.startTime).split(",")[0]}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                        <button
                          onClick={() => openEditReservation(reservation)}
                          className={buttonSecondary + " !px-3 !py-1.5 !text-xs"}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Remover a reserva "${reservation.title}"?`
                              )
                            )
                              deleteReservation.mutate(reservation.id);
                          }}
                          className={buttonDanger}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* ── Modals ── */}

      {/* Create / Edit Room */}
      {(activeModal === "createRoom" || activeModal === "editRoom") && (
        <Modal
          title={
            activeModal === "createRoom" ? "Nova Sala" : "Editar Sala"
          }
          onClose={() => {
            setActiveModal(null);
            setSelectedRoom(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = {
                name: roomForm.name,
                capacity: Number(roomForm.capacity),
              };
              if (activeModal === "createRoom") {
                createRoom.mutate(data);
              } else if (selectedRoom) {
                updateRoom.mutate({ id: selectedRoom.id, data });
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Nome da Sala
              </label>
              <input
                type="text"
                value={roomForm.name}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, name: e.target.value })
                }
                placeholder="Ex: Sala de Reuniões A"
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Capacidade (pessoas)
              </label>
              <input
                type="number"
                value={roomForm.capacity}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, capacity: e.target.value })
                }
                placeholder="Ex: 10"
                min={1}
                className={inputClasses}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedRoom(null);
                }}
                className={buttonSecondary}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createRoom.isPending || updateRoom.isPending}
                className={buttonPrimary}
              >
                {createRoom.isPending || updateRoom.isPending
                  ? "Salvando..."
                  : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create / Edit Reservation */}
      {(activeModal === "createReservation" ||
        activeModal === "editReservation") && (
        <Modal
          title={
            activeModal === "createReservation"
              ? "Nova Reserva"
              : "Editar Reserva"
          }
          onClose={() => {
            setActiveModal(null);
            setSelectedReservation(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = {
                roomId: resForm.roomId,
                title: resForm.title,
                participants: Number(resForm.participants),
                startTime: new Date(resForm.startTime).toISOString(),
                endTime: new Date(resForm.endTime).toISOString(),
              };
              if (activeModal === "createReservation") {
                createReservation.mutate(data);
              } else if (selectedReservation) {
                updateReservation.mutate({
                  id: selectedReservation.id,
                  data,
                });
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Sala
              </label>
              <select
                value={resForm.roomId}
                onChange={(e) =>
                  setResForm({ ...resForm, roomId: e.target.value })
                }
                className={inputClasses}
                required
              >
                <option value="">Selecione uma sala</option>
                {roomsQuery.data?.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} (até {room.capacity} pessoas)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Título da Reunião
              </label>
              <input
                type="text"
                value={resForm.title}
                onChange={(e) =>
                  setResForm({ ...resForm, title: e.target.value })
                }
                placeholder="Ex: Daily Standup"
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Número de Participantes
              </label>
              <input
                type="number"
                value={resForm.participants}
                onChange={(e) =>
                  setResForm({ ...resForm, participants: e.target.value })
                }
                placeholder="Ex: 5"
                min={1}
                className={inputClasses}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Início
                </label>
                <input
                  type="datetime-local"
                  value={resForm.startTime}
                  onChange={(e) =>
                    setResForm({ ...resForm, startTime: e.target.value })
                  }
                  className={inputClasses}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Término
                </label>
                <input
                  type="datetime-local"
                  value={resForm.endTime}
                  onChange={(e) =>
                    setResForm({ ...resForm, endTime: e.target.value })
                  }
                  className={inputClasses}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedReservation(null);
                }}
                className={buttonSecondary}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  createReservation.isPending || updateReservation.isPending
                }
                className={buttonPrimary}
              >
                {createReservation.isPending || updateReservation.isPending
                  ? "Salvando..."
                  : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Fragment>
  );
}

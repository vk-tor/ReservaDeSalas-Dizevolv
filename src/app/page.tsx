"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, Fragment, useMemo, useEffect } from "react";

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
  seriesId?: string | null;
  room?: { name: string; capacity: number };
  warning?: string | null;
}

type ModalType =
  | null
  | "createRoom"
  | "createReservation"
  | "viewReservations";

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

function generateNextDays(count: number = 14): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

const formatDayName = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
const formatDayNumber = (d: Date) => d.getDate().toString().padStart(2, "0");
const formatMonthName = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ─── Components ──────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: any) {
  const colors = {
    success: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
    error: "bg-red-500/10 border-red-500/40 text-red-300",
    warning: "bg-amber-500/10 border-amber-500/40 text-amber-300",
  };
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl border backdrop-blur-md shadow-2xl animate-slide-in flex items-center gap-3 ${colors[type]}`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg mx-4 bg-[#09090b] border border-gray-800 rounded-3xl shadow-2xl animate-modal-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60 bg-gray-900/20">
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none transition-colors">×</button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const queryClient = useQueryClient();

  // State
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(toYMD(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]); 
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  // Forms
  const [roomForm, setRoomForm] = useState({ name: "", capacity: "" });
  const [resForm, setResForm] = useState({ title: "", participants: "", recurrenceType: "none", recurrenceOccurrences: "1" });

  const nextDays = useMemo(() => generateNextDays(14), []);
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

  // Queries
  const roomsQuery = useQuery({ queryKey: ["rooms"], queryFn: fetchRooms });
  
  useEffect(() => {
    if (roomsQuery.data && roomsQuery.data.length > 0 && !selectedRoomId) {
      setSelectedRoomId(roomsQuery.data[0].id);
    }
  }, [roomsQuery.data, selectedRoomId]);

  const reservationsQuery = useQuery({
    queryKey: ["reservations", selectedRoomId, selectedDate],
    queryFn: () => fetchReservations(selectedRoomId, selectedDate),
    enabled: !!selectedRoomId,
  });

  const showToast = (message: string, type: "success" | "error" | "warning") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Mutations
  const createRoom = useMutation({
    mutationFn: async (data: { name: string; capacity: number }) => {
      const res = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar sala");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setActiveModal(null);
      showToast("Sala criada com sucesso!", "success");
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
      setSelectedRoomId("");
      showToast("Sala removida!", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const createReservation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar reserva");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setActiveModal(null);
      setSelectedSlots([]);
      setResForm({ title: "", participants: "", recurrenceType: "none", recurrenceOccurrences: "1" });
      if (data.warning) showToast(data.warning, "warning");
      else showToast("Reserva concluída!", "success");
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
      showToast("Reserva cancelada!", "success");
    },
  });

  // Slot Logic
  const getSlotStatus = (hour: number) => {
    if (!reservationsQuery.data) return "free";
    
    // Convert slot local hour to UTC equivalent for database comparison
    // Assuming backend also stored it as local time but parsed as UTC
    const slotStartStr = `${selectedDate}T${String(hour).padStart(2, "0")}:00:00.000Z`;
    const slotEndStr = `${selectedDate}T${String(hour + 1).padStart(2, "0")}:00:00.000Z`;

    for (const res of reservationsQuery.data) {
      if (slotStartStr < res.endTime && slotEndStr > res.startTime) {
        return "booked";
      }
    }
    
    if (selectedSlots.includes(hour)) return "selected";
    return "free";
  };

  const toggleSlot = (hour: number) => {
    if (getSlotStatus(hour) === "booked") return;
    setSelectedSlots(prev => 
      prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour]
    );
  };

  const handleBook = () => {
    if (selectedSlots.length === 0) return;
    setActiveModal("createReservation");
  };

  const submitReservation = (e: React.FormEvent) => {
    e.preventDefault();
    
    const sorted = [...selectedSlots].sort((a, b) => a - b);
    const sessions = [];
    
    let currentStart = sorted[0];
    let currentEnd = sorted[0] + 1;
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === currentEnd) {
        currentEnd = sorted[i] + 1;
      } else {
        const st = new Date(`${selectedDate}T${String(currentStart).padStart(2, "0")}:00:00.000Z`);
        const en = new Date(`${selectedDate}T${String(currentEnd).padStart(2, "0")}:00:00.000Z`);
        sessions.push({ startTime: st.toISOString(), endTime: en.toISOString() });
        currentStart = sorted[i];
        currentEnd = sorted[i] + 1;
      }
    }
    
    const st = new Date(`${selectedDate}T${String(currentStart).padStart(2, "0")}:00:00.000Z`);
    const en = new Date(`${selectedDate}T${String(currentEnd).padStart(2, "0")}:00:00.000Z`);
    sessions.push({ startTime: st.toISOString(), endTime: en.toISOString() });

    createReservation.mutate({
      roomId: selectedRoomId,
      title: resForm.title,
      participants: Number(resForm.participants),
      sessions,
      recurrence: {
        type: resForm.recurrenceType,
        occurrences: Number(resForm.recurrenceOccurrences)
      }
    });
  };

  // Styles
  const inputClasses = "w-full px-4 py-3 rounded-2xl bg-[#09090b] border border-gray-800 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm";
  const btnPill = "px-6 py-2.5 rounded-full font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const btnPrimary = `${btnPill} bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-lg shadow-emerald-500/20`;
  const btnSecondary = `${btnPill} bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800`;

  return (
    <Fragment>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="border-b border-gray-800/60 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-gray-950 font-bold text-xl">D</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-100">Dizevolv Rooms</h1>
            </div>
          </div>
          <button onClick={() => { setRoomForm({name:"", capacity:""}); setActiveModal("createRoom"); }} className={btnSecondary}>
            + Nova Sala
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <aside className="lg:col-span-3 space-y-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Escolha a Sala</h2>
            
            {roomsQuery.isLoading && <div className="space-y-3"><div className="animate-pulse h-16 bg-gray-900 rounded-2xl" /></div>}
            
            <div className="space-y-3">
              {roomsQuery.data?.map(room => (
                <div 
                  key={room.id}
                  onClick={() => { setSelectedRoomId(room.id); setSelectedSlots([]); }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    selectedRoomId === room.id 
                      ? "bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5" 
                      : "bg-gray-900/30 border-gray-800 hover:bg-gray-900 hover:border-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-semibold text-sm ${selectedRoomId === room.id ? "text-emerald-400" : "text-gray-200"}`}>{room.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">Capacidade: {room.capacity} pessoas</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm(`Remover sala ${room.name}?`)) deleteRoom.mutate(room.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-400 transition-all rounded-full hover:bg-red-500/10 text-xs">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="lg:col-span-9">
            {!selectedRoomId ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-800 rounded-3xl">
                <span className="text-4xl mb-4 opacity-50">🍿</span>
                <p className="text-gray-400">Selecione uma sala ao lado para ver as sessões.</p>
              </div>
            ) : (
              <div className="space-y-8 animate-slide-in">
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-100">Sessões</h2>
                    <button onClick={() => setActiveModal("viewReservations")} className="text-sm text-emerald-500 hover:text-emerald-400 font-medium">Ver reservas deste dia</button>
                  </div>
                  
                  <div className="flex gap-3 overflow-x-auto pb-4 base-ui-disable-scrollbar">
                    {nextDays.map(d => {
                      const ymd = toYMD(d);
                      const isSelected = selectedDate === ymd;
                      return (
                        <button
                          key={ymd}
                          onClick={() => { setSelectedDate(ymd); setSelectedSlots([]); }}
                          className={`shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-3xl border transition-all ${
                            isSelected 
                              ? "bg-emerald-500 text-gray-950 border-emerald-400 shadow-xl shadow-emerald-500/20" 
                              : "bg-gray-900/50 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-gray-200"
                          }`}
                        >
                          <span className={`text-xs uppercase font-medium tracking-widest ${isSelected ? "text-gray-900/70" : "text-gray-500"}`}>
                            {formatDayName(d)}
                          </span>
                          <span className="text-2xl font-bold mt-1 mb-0.5">{formatDayNumber(d)}</span>
                          <span className={`text-xs font-medium ${isSelected ? "text-gray-900/70" : "text-gray-600"}`}>
                            {formatMonthName(d)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-900/30 border border-gray-800/60 rounded-3xl p-8">
                  {reservationsQuery.isLoading ? (
                     <div className="animate-pulse h-32 bg-gray-800/30 rounded-2xl w-full"></div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                      {HOURS.map(hour => {
                        const status = getSlotStatus(hour);
                        let btnClass = "py-4 rounded-2xl border text-sm font-medium transition-all flex flex-col items-center justify-center ";
                        
                        if (status === "booked") {
                          btnClass += "bg-gray-950 border-gray-900 text-gray-700 cursor-not-allowed";
                        } else if (status === "selected") {
                          btnClass += "bg-emerald-500 border-emerald-400 text-gray-950 shadow-lg shadow-emerald-500/30 scale-105 z-10";
                        } else {
                          btnClass += "bg-gray-900/50 border-gray-700 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 cursor-pointer";
                        }

                        return (
                          <button key={hour} disabled={status === "booked"} onClick={() => toggleSlot(hour)} className={btnClass}>
                            <span>{String(hour).padStart(2, '0')}:00</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedSlots.length > 0 && (
                    <div className="mt-8 flex items-center justify-between p-5 bg-[#09090b] border border-gray-800 rounded-3xl animate-slide-in">
                      <div>
                        <p className="text-gray-400 text-sm">Você selecionou</p>
                        <p className="text-emerald-400 font-bold text-lg">{selectedSlots.length} {selectedSlots.length === 1 ? "sessão" : "sessões"}</p>
                      </div>
                      <button onClick={handleBook} className={btnPrimary}>
                        Avançar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modals */}
      {activeModal === "createRoom" && (
        <Modal title="Nova Sala" onClose={() => setActiveModal(null)}>
          <form onSubmit={e => { e.preventDefault(); createRoom.mutate({ name: roomForm.name, capacity: Number(roomForm.capacity) }); }} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 pl-1">Nome da Sala</label>
              <input type="text" value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} className={inputClasses} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 pl-1">Capacidade</label>
              <input type="number" value={roomForm.capacity} onChange={e => setRoomForm({...roomForm, capacity: e.target.value})} className={inputClasses} required />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setActiveModal(null)} className={btnSecondary}>Cancelar</button>
              <button type="submit" disabled={createRoom.isPending} className={btnPrimary}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === "createReservation" && (
        <Modal title="Detalhes da Reserva" onClose={() => setActiveModal(null)}>
          <form onSubmit={submitReservation} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 pl-1">Título da Reunião</label>
              <input type="text" value={resForm.title} onChange={e => setResForm({...resForm, title: e.target.value})} placeholder="Ex: Sync Semanal" className={inputClasses} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 pl-1">Número de Participantes</label>
              <input type="number" min="1" value={resForm.participants} onChange={e => setResForm({...resForm, participants: e.target.value})} className={inputClasses} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 pl-1">Recorrência</label>
              <select value={resForm.recurrenceType} onChange={e => setResForm({...resForm, recurrenceType: e.target.value})} className={inputClasses}>
                <option value="none">Não repetir</option>
                <option value="daily">Repetir diariamente</option>
                <option value="weekly">Repetir semanalmente</option>
              </select>
            </div>
            {resForm.recurrenceType !== "none" && (
              <div className="animate-slide-in">
                <label className="block text-xs font-medium text-gray-400 mb-2 pl-1">Por quantas vezes?</label>
                <input type="number" min="2" max="52" value={resForm.recurrenceOccurrences} onChange={e => setResForm({...resForm, recurrenceOccurrences: e.target.value})} className={inputClasses} required />
              </div>
            )}
            
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mt-6">
              <p className="text-emerald-400 text-sm font-medium">Sessões: {selectedSlots.length} ({selectedSlots.length} horas)</p>
              <p className="text-gray-400 text-xs mt-1">Data base: {selectedDate.split("-").reverse().join("/")}</p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setActiveModal(null)} className={btnSecondary}>Voltar</button>
              <button type="submit" disabled={createReservation.isPending} className={btnPrimary}>
                {createReservation.isPending ? "Reservando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === "viewReservations" && (
        <Modal title={`Reservas do dia`} onClose={() => setActiveModal(null)}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 base-ui-disable-scrollbar">
            {!reservationsQuery.data?.length ? (
              <p className="text-gray-500 text-sm text-center py-6">Nenhuma reserva confirmada para este dia.</p>
            ) : (
              reservationsQuery.data.map(res => {
                const h1 = new Date(res.startTime).getUTCHours();
                const h2 = new Date(res.endTime).getUTCHours();
                return (
                  <div key={res.id} className="p-4 bg-gray-900 border border-gray-800 rounded-2xl flex justify-between items-center group">
                    <div>
                      <h4 className="font-semibold text-gray-200">{res.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {String(h1).padStart(2, '0')}:00 - {String(h2).padStart(2, '0')}:00 • {res.participants} pessoas
                        {res.seriesId && <span className="ml-2 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Recorrente</span>}
                      </p>
                    </div>
                    <button onClick={() => { if(confirm("Cancelar esta reserva?")) deleteReservation.mutate(res.id); }} className="text-gray-500 group-hover:text-red-400 p-2 rounded-xl text-xs transition-all">✕</button>
                  </div>
                )
              })
            )}
          </div>
        </Modal>
      )}
    </Fragment>
  );
}

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
  host: string;
  participants: number;
  startTime: string;
  endTime: string;
  seriesId?: string | null;
  room?: { name: string; capacity: number };
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

function Toast({ message, type, onClose }: { message: string, type: "success" | "error" | "warning", onClose: () => void }) {
  const colors = {
    success: "bg-green-50 dark:bg-brand-orange/10 border-green-200 dark:border-brand-orange/40 text-green-700 dark:text-brand-orange",
    error: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300",
    warning: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-300",
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
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg mx-4 bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl animate-modal-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50 dark:bg-gray-900/20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-heading">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xl leading-none transition-colors">×</button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function RoomCard({ room, onClick, onDelete }: any) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div 
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative p-[1px] rounded-[24px] cursor-pointer group h-56 transition-transform duration-300 hover:scale-[1.02] shadow-sm shadow-gray-200/50 dark:shadow-none"
    >
      {/* Borda base */}
      <div 
        className="absolute inset-0 rounded-[24px] bg-gray-200 dark:bg-gray-800 transition-opacity duration-300 z-0"
      />
      
      {/* Borda Iluminada que segue o mouse */}
      <div 
        className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,107,43,0.8), transparent 40%)`
        }}
      />

      {/* Cartão Interno */}
      <div className="relative z-10 h-full w-full bg-white dark:bg-[#09090b] rounded-[23px] p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
        
        {/* Brilho interno suave */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"
          style={{
            background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(255,107,43,0.06), transparent 50%)`
          }}
        />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-heading group-hover:text-brand-orange transition-colors">{room.name}</h3>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-all rounded-full hover:bg-red-100 dark:hover:bg-red-500/10 text-xs">✕</button>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-sm font-medium border border-gray-100 dark:border-transparent shadow-sm dark:shadow-none">
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            Lotação: {room.capacity}
          </div>
        </div>
        <div className="flex justify-end relative z-10">
          <span className="text-sm font-bold text-brand-orange opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Ver sessões <span className="text-xl leading-none">→</span></span>
        </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  }, [theme]);

  // Forms
  const [roomForm, setRoomForm] = useState({ name: "", capacity: "" });
  const [resForm, setResForm] = useState({ id: "", title: "", host: "", participants: "", recurrenceType: "none", recurrenceEndDate: "", recurrenceDays: [] as number[], seriesId: "", applyToSeries: false });

  const nextDays = useMemo(() => generateNextDays(14), []);
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

  // Queries
  const roomsQuery = useQuery({ queryKey: ["rooms"], queryFn: fetchRooms });
  const filteredRooms = roomsQuery.data?.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

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
      setResForm({ id: "", title: "", host: "", participants: "", recurrenceType: "none", recurrenceEndDate: "", recurrenceDays: [], seriesId: "", applyToSeries: false });
      showToast("Reserva concluída!", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const editReservation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/reservations/${data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao editar reserva");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setActiveModal(null);
      showToast("Reserva atualizada!", "success");
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
    setResForm({ id: "", title: "", host: "", participants: "", recurrenceType: "none", recurrenceEndDate: "", recurrenceDays: [], seriesId: "", applyToSeries: false });
    setActiveModal("createReservation");
  };

  const submitReservation = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resForm.id) {
      editReservation.mutate({
        id: resForm.id,
        title: resForm.title,
        host: resForm.host,
        participants: Number(resForm.participants),
        applyToSeries: resForm.applyToSeries,
      });
      return;
    }

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
      host: resForm.host,
      participants: Number(resForm.participants),
      sessions,
      recurrence: {
        type: resForm.recurrenceType,
        endDate: resForm.recurrenceType !== "none" ? resForm.recurrenceEndDate : undefined,
        daysOfWeek: resForm.recurrenceType === "weekly" ? resForm.recurrenceDays : undefined
      }
    });
  };

  // Styles
  const inputClasses = "w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange/50 transition-all text-sm";
  const btnPill = "px-6 py-2.5 rounded-full font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const btnPrimary = `${btnPill} bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg shadow-brand-orange/20`;
  const btnSecondary = `${btnPill} bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;

  return (
    <Fragment>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="border-b border-gray-200 dark:border-gray-800/60 bg-white/80 dark:bg-[#0F1014]/80 backdrop-blur-xl sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.avif" alt="Dizevolv Logo" className="h-7 w-auto object-contain dark:invert-0 dark:brightness-100 contrast-125 brightness-0" />
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 font-heading">
              <span className="text-brand-orange font-normal">Rooms</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={() => { setRoomForm({name:"", capacity:""}); setActiveModal("createRoom"); }} className={btnSecondary}>
              + Nova Sala
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col">
        {!selectedRoomId ? (
          <div className="w-full max-w-7xl mx-auto px-6 py-12 animate-slide-in">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 font-heading tracking-tight mb-4">Escolha o ambiente ideal</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">Selecione uma de nossas salas disponíveis para ver os horários ou agendar a sua próxima reunião.</p>
              
              <div className="mt-10 max-w-md mx-auto relative group">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar sala pelo nome..." 
                  className="w-full pl-12 pr-4 py-4 rounded-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 shadow-xl dark:shadow-2xl transition-all"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-brand-orange transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            {roomsQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-56 bg-gray-100 dark:bg-gray-900/50 rounded-3xl" />)}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                <p className="text-gray-500 dark:text-gray-500">Nenhuma sala encontrada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRooms.map(room => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    onClick={() => { setSelectedRoomId(room.id); setSelectedSlots([]); }} 
                    onDelete={() => { if(confirm(`Remover sala ${room.name}?`)) deleteRoom.mutate(room.id); }} 
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto w-full px-6 py-8 animate-slide-in">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedRoomId("")} className="text-sm font-medium text-gray-500 hover:text-brand-orange dark:text-gray-400 dark:hover:text-brand-orange flex items-center gap-2 transition-colors">
                  <span>←</span> Voltar
                </button>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700"></div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`text-sm font-medium flex items-center gap-2 transition-colors ${isSidebarOpen ? 'text-brand-orange' : 'text-gray-500 dark:text-gray-400 hover:text-brand-orange'}`}>
                  ☰ {isSidebarOpen ? "Ocultar Salas" : "Menu de Salas"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {isSidebarOpen && (
                <aside className="lg:col-span-3 space-y-4 animate-slide-in">
                  <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Escolha a Sala</h2>
                  
                  {roomsQuery.isLoading && <div className="space-y-3"><div className="animate-pulse h-16 bg-gray-100 dark:bg-gray-900 rounded-2xl" /></div>}
                  
                  <div className="space-y-3">
                    {roomsQuery.data?.map(room => (
                      <div 
                        key={room.id}
                        onClick={() => { setSelectedRoomId(room.id); setSelectedSlots([]); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                          selectedRoomId === room.id 
                            ? "bg-brand-orange/5 border-brand-orange/30 shadow-lg shadow-brand-orange/5" 
                            : "bg-white dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-brand-orange/30 dark:hover:border-gray-700"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className={`font-semibold text-sm font-heading ${selectedRoomId === room.id ? "text-brand-orange" : "text-gray-800 dark:text-gray-200"}`}>{room.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">Capacidade: {room.capacity} pessoas</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              )}

              <section className={isSidebarOpen ? "lg:col-span-9" : "lg:col-span-12"}>
                <div className="space-y-8">
                  <div className="flex items-center justify-between mb-2">
                     <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-heading">
                       {roomsQuery.data?.find(r => r.id === selectedRoomId)?.name}
                     </h2>
                     <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800">
                        Lotação máx: {roomsQuery.data?.find(r => r.id === selectedRoomId)?.capacity}
                     </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-4 mt-8">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-heading">Sessões</h2>
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
                                ? "bg-brand-orange text-white border-brand-orange shadow-xl shadow-brand-orange/20" 
                                : "bg-white dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                            }`}
                          >
                            <span className={`text-xs uppercase font-medium tracking-widest ${isSelected ? "text-white/90" : "text-gray-400 dark:text-gray-500"}`}>
                              {formatDayName(d)}
                            </span>
                            <span className="text-2xl font-bold mt-1 mb-0.5">{formatDayNumber(d)}</span>
                            <span className={`text-xs font-medium ${isSelected ? "text-white/90" : "text-gray-500 dark:text-gray-600"}`}>
                              {formatMonthName(d)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-none">
                    {reservationsQuery.isLoading ? (
                       <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800/30 rounded-2xl w-full"></div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                        {HOURS.map(hour => {
                          const status = getSlotStatus(hour);
                          let btnClass = "py-4 rounded-2xl border text-sm font-medium transition-all flex flex-col items-center justify-center ";
                          
                          if (status === "booked") {
                            btnClass += "bg-gray-50 dark:bg-[#09090b] border-gray-200 dark:border-gray-800/50 text-gray-400 dark:text-gray-700 cursor-not-allowed opacity-50";
                          } else if (status === "selected") {
                            btnClass += "bg-brand-orange/10 border-brand-orange text-brand-orange shadow-lg shadow-brand-orange/10 scale-105 z-10";
                          } else {
                            btnClass += "bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-brand-orange/70 hover:bg-brand-orange/5 hover:border-brand-orange/40 hover:text-brand-orange cursor-pointer";
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
                      <div className="mt-8 flex items-center justify-between p-5 bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-lg animate-slide-in">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">Você selecionou</p>
                          <p className="text-brand-orange font-bold text-lg">{selectedSlots.length} {selectedSlots.length === 1 ? "sessão" : "sessões"}</p>
                        </div>
                        <button onClick={handleBook} className={btnPrimary}>
                          Avançar
                        </button>
                      </div>
                    )}

                    {/* Reservas do dia inline */}
                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800/60">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-heading mb-6">Reservas de Hoje</h3>
                      {!reservationsQuery.data?.length ? (
                        <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                           <p className="text-gray-500 text-sm">Nenhuma reserva confirmada para este dia.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reservationsQuery.data.map(res => {
                            const h1 = new Date(res.startTime);
                            const h2 = new Date(res.endTime);
                            const now = new Date();
                            let stateBadge = null;
                            if (now > h2) {
                              stateBadge = <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">Encerrada</span>;
                            } else if (now >= h1 && now <= h2) {
                              stateBadge = <span className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></span>Em andamento</span>;
                            } else {
                              stateBadge = <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">Próxima</span>;
                            }

                            return (
                              <div key={res.id} className="p-5 bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center group hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-sm dark:shadow-none">
                                <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-200 font-heading text-lg">{res.title}</h4>
                                    {stateBadge}
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center flex-wrap gap-2 mt-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">{String(h1.getUTCHours()).padStart(2, '0')}:00 - {String(h2.getUTCHours()).padStart(2, '0')}:00</span>
                                    <span className="opacity-30">•</span>
                                    <span>{res.participants} pessoas</span>
                                    <span className="opacity-30">•</span>
                                    <span>Resp: <span className="text-brand-orange/90 font-medium">{res.host}</span></span>
                                  </p>
                                  {res.seriesId && <p className="text-xs text-brand-orange mt-3 bg-brand-orange/10 inline-block px-2 py-0.5 rounded-md border border-brand-orange/20">Série Recorrente</p>}
                                </div>
                                <div className="flex gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                                  <button onClick={() => {
                                    setResForm({
                                      id: res.id,
                                      title: res.title,
                                      host: res.host || "",
                                      participants: String(res.participants),
                                      recurrenceType: "none",
                                      recurrenceEndDate: "",
                                      recurrenceDays: [],
                                      seriesId: res.seriesId || "",
                                      applyToSeries: false
                                    });
                                    setActiveModal("createReservation");
                                  }} className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all">Editar</button>
                                  <button onClick={() => { if(confirm("Cancelar esta reserva?")) deleteReservation.mutate(res.id); }} className="flex-1 sm:flex-none px-4 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-all">Cancelar</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {activeModal === "createRoom" && (
        <Modal title="Nova Sala" onClose={() => setActiveModal(null)}>
          <form onSubmit={e => { e.preventDefault(); createRoom.mutate({ name: roomForm.name, capacity: Number(roomForm.capacity) }); }} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 pl-1">Nome da Sala</label>
              <input type="text" value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} className={inputClasses} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 pl-1">Capacidade</label>
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
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 pl-1">Título da Reunião</label>
              <input type="text" value={resForm.title} onChange={e => setResForm({...resForm, title: e.target.value})} placeholder="Ex: Sync Semanal" className={inputClasses} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 pl-1">Responsável pela Reserva</label>
              <input type="text" value={resForm.host} onChange={e => setResForm({...resForm, host: e.target.value})} placeholder="Ex: João Silva" className={inputClasses} required />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2 pl-1 pr-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Número de Participantes</label>
                {(() => {
                  const room = roomsQuery.data?.find(r => r.id === selectedRoomId);
                  const cap = room?.capacity || 1;
                  const current = Number(resForm.participants) || 0;
                  const pct = Math.min((current / cap) * 100, 100);
                  const over = current > cap;
                  return (
                    <span className={`text-xs font-medium ${over ? "text-red-500 dark:text-red-400" : "text-gray-500"}`}>
                      {current} / {cap} max
                    </span>
                  );
                })()}
              </div>
              <input type="number" min="1" max={roomsQuery.data?.find(r => r.id === selectedRoomId)?.capacity} value={resForm.participants} onChange={e => setResForm({...resForm, participants: e.target.value})} className={inputClasses} required />
              
              {(() => {
                const room = roomsQuery.data?.find(r => r.id === selectedRoomId);
                const cap = room?.capacity || 1;
                const current = Number(resForm.participants) || 0;
                const pct = Math.min((current / cap) * 100, 100);
                const over = current > cap;
                return (
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${over ? "bg-red-500" : "bg-brand-orange"}`} 
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                );
              })()}
            </div>
            
            {resForm.id && resForm.seriesId && (
              <div className="flex items-center gap-3 mt-4 bg-brand-orange/5 p-4 rounded-2xl border border-brand-orange/20">
                <input type="checkbox" id="applyToSeries" checked={resForm.applyToSeries} onChange={e => setResForm({...resForm, applyToSeries: e.target.checked})} className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-brand-orange focus:ring-brand-orange/50 cursor-pointer" />
                <label htmlFor="applyToSeries" className="text-sm font-medium text-brand-orange cursor-pointer">Aplicar alterações a todas as sessões desta série?</label>
              </div>
            )}
            
            {!resForm.id && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 pl-1">Recorrência</label>
                  <select value={resForm.recurrenceType} onChange={e => setResForm({...resForm, recurrenceType: e.target.value})} className={inputClasses}>
                    <option value="none">Não repetir</option>
                    <option value="daily">Repetir diariamente</option>
                    <option value="weekly">Repetir semanalmente</option>
                  </select>
                </div>
                {resForm.recurrenceType !== "none" && (
                  <div className="animate-slide-in">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 pl-1">Até qual data?</label>
                    <input type="date" min={toYMD(new Date())} value={resForm.recurrenceEndDate} onChange={e => setResForm({...resForm, recurrenceEndDate: e.target.value})} className={inputClasses} required />
                  </div>
                )}
                {resForm.recurrenceType === "weekly" && (
                  <div className="animate-slide-in">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 pl-1">Dias da semana</label>
                    <div className="flex gap-2 mt-2">
                      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, idx) => (
                        <button type="button" key={day} onClick={() => {
                          setResForm(prev => ({
                            ...prev, 
                            recurrenceDays: prev.recurrenceDays.includes(idx) ? prev.recurrenceDays.filter(d => d !== idx) : [...prev.recurrenceDays, idx]
                          }))
                        }} className={`w-10 h-10 rounded-full text-xs font-medium transition-all ${resForm.recurrenceDays.includes(idx) ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-brand-orange/5 border border-brand-orange/20 rounded-2xl mt-6">
                  <p className="text-brand-orange text-sm font-medium">Sessões: {selectedSlots.length} ({selectedSlots.length} horas)</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Data base: {selectedDate.split("-").reverse().join("/")}</p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setActiveModal(null)} className={btnSecondary}>Voltar</button>
              <button type="submit" disabled={createReservation.isPending || editReservation.isPending} className={btnPrimary}>
                {resForm.id ? (editReservation.isPending ? "Salvando..." : "Salvar Edição") : (createReservation.isPending ? "Reservando..." : "Confirmar")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Fragment>
  );
}

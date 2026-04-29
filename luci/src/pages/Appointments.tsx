import React, { useState, useEffect } from "react";
import { Search, Calendar as CalendarIcon, Clock, Map, Loader2 } from "lucide-react";
import Modal from "../components/Modal";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Appointments() {
  const [search, setSearch] = useState("");
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "appointments"),
          where("status", "==", "concluido")
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const appsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as any[];
          
          appsData.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.startTime.localeCompare(a.startTime);
          });
          
          setAppointments(appsData);
          setLoading(false);
        });
      } else {
        setAppointments([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const handleOpenMapping = (app: any) => {
    setSelectedAppointment(app);
    setIsMappingModalOpen(true);
  };

  const handleSaveMapping = (e: React.FormEvent) => {
    e.preventDefault();
    setIsMappingModalOpen(false);
    alert("Lash Mapping salvo com sucesso!");
  };

  const filteredAppointments = appointments.filter((app) =>
    app.clientName.toLowerCase().includes(search.toLowerCase()) ||
    app.serviceName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
          Histórico de Agendamentos
        </h1>
        <p className="text-gray-500 mt-1">
          Visualize todos os agendamentos e fichas de procedimento.
        </p>
      </div>

      <div className="glass-panel p-6">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou serviço..."
            className="w-full pl-12 pr-4 py-3.5 bg-[var(--glass)] border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-10 text-sub">
              Nenhum agendamento concluído encontrado.
            </div>
          ) : (
            filteredAppointments.map((app) => (
              <div
                key={app.id}
                className="glass-panel-darker p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/70 transition-colors"
              >
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {app.clientName}
                  </h3>
                  <p className="text-pink-600 font-medium">{app.serviceName}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" /> {app.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {app.startTime} - {app.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`pill-tag ${
                      app.status === "concluido"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {app.status === "concluido" ? "Concluído" : "Agendado"}
                  </span>
                  <button
                    onClick={() => handleOpenMapping(app)}
                    className="bg-[var(--glass-darker)] text-[var(--accent)] px-4 py-2 rounded-[16px] hover:bg-white/70 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Map className="w-4 h-4" />
                    Lash Mapping
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        title="Lash Mapping"
      >
        <form onSubmit={handleSaveMapping} className="space-y-5">
          <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-100 mb-4">
            <p className="text-sm text-gray-600">
              Cliente:{" "}
              <strong className="text-gray-800">
                {selectedAppointment?.clientName}
              </strong>
            </p>
            <p className="text-sm text-gray-600">
              Serviço:{" "}
              <strong className="text-gray-800">
                {selectedAppointment?.serviceName}
              </strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desenho do Mapping (Anotações)
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none resize-none"
              placeholder="Ex: Boneca (7,8,9,10,11,10,9), gatinho..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fio Utilizado
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                placeholder="Ex: 0.07 D"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca do Fio
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                placeholder="Ex: Nagaraku"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adesivo (Cola)
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
              placeholder="Ex: Elite HS10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto Antes (URL)
              </label>
              <input
                type="url"
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto Depois (URL)
              </label>
              <input
                type="url"
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-action w-full flex justify-center items-center mt-4"
          >
            Salvar Ficha
          </button>
        </form>
      </Modal>
    </div>
  );
}

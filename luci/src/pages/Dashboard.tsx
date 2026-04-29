import React, { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Clock, User, Scissors, Calendar as CalendarIcon, CheckCircle } from "lucide-react";
import Modal from "../components/Modal";
import "react-day-picker/dist/style.css";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [savedAppointment, setSavedAppointment] = useState<any>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [serviceName, setServiceName] = useState("Volume Clássico");
  const [price, setPrice] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("14:00");

  const servicesList = [
    "Volume Clássico",
    "Volume Brasileiro",
    "Volume Egípcio",
    "Volume Russo",
    "Efeito Fox",
  ];

  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "appointments")
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const apps = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as any[];
          
          apps.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
          });
          
          setAppointments(apps);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "appointments");
        });
      } else {
        setAppointments([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const newApp = {
      userId: auth.currentUser.uid,
      clientName,
      serviceName,
      price: parseFloat(price),
      date: dateStr,
      startTime,
      endTime,
      status: "agendado",
      createdAt: new Date().toISOString(),
    };

    // Close modal and reset form immediately (Optimistic Update)
    setIsModalOpen(false);
    setClientName("");
    setPrice("");
    setStartTime("12:00");
    setEndTime("14:00");

    try {
      await addDoc(collection(db, "appointments"), newApp);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "appointments");
    }
  };

  const currentAppForCalendar = {
    date: format(selectedDate, "yyyy-MM-dd"),
    startTime,
    endTime,
    clientName: clientName || "Cliente",
    serviceName
  };

  const handleMarkAsConcluded = async (appId: string) => {
    try {
      const appRef = doc(db, "appointments", appId);
      await updateDoc(appRef, {
        status: "concluido"
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${appId}`);
    }
  };

  const getGoogleCalendarUrl = (app: any) => {
    const start = `${app.date.replace(/-/g, "")}T${app.startTime.replace(":", "")}00`;
    const end = `${app.date.replace(/-/g, "")}T${app.endTime.replace(":", "")}00`;
    const title = encodeURIComponent(`Cílios: ${app.clientName} - ${app.serviceName}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}`;
  };

  const getOutlookCalendarUrl = (app: any) => {
    const start = `${app.date}T${app.startTime}:00`;
    const end = `${app.date}T${app.endTime}:00`;
    const title = encodeURIComponent(`Cílios: ${app.clientName} - ${app.serviceName}`);
    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${start}&enddt=${end}`;
  };

  const downloadAppleCalendar = (app: any) => {
    const start = `${app.date.replace(/-/g, "")}T${app.startTime.replace(":", "")}00`;
    const end = `${app.date.replace(/-/g, "")}T${app.endTime.replace(":", "")}00`;
    const title = `Cílios: ${app.clientName} - ${app.serviceName}`;
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${title}\nDTSTART:${start}\nDTEND:${end}\nEND:VEVENT\nEND:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'agendamento.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const todaysAppointments = appointments.filter(
    (app) => app.date === format(selectedDate, "yyyy-MM-dd")
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Agenda
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie seus horários e clientes.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-action flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Card */}
        <div className="lg:col-span-1 glass-panel p-6 flex justify-center">
          <style>{`
            .rdp {
              --rdp-cell-size: 40px;
              --rdp-accent-color: var(--accent);
              --rdp-background-color: var(--accent-soft);
              margin: 0;
            }
            .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
              background-color: var(--rdp-accent-color);
              color: white;
            }
          `}</style>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={ptBR}
            className="font-sans"
          />
        </div>

        {/* Appointments List */}
        <div className="lg:col-span-2 glass-panel p-6">
          <h2 className="text-xl font-semibold text-main mb-6">
            Agendamentos para{" "}
            {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h2>

          <div className="space-y-4">
            {todaysAppointments.length === 0 ? (
              <div className="text-center py-12 bg-white/30 rounded-2xl border border-white/50 border-dashed">
                <Clock className="w-12 h-12 text-pink-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  Nenhum agendamento para este dia.
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Clique em "Novo Agendamento" para adicionar.
                </p>
              </div>
            ) : (
              todaysAppointments.map((app) => (
                <div
                  key={app.id}
                  className="glass-panel-darker p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-[var(--glass)] text-[var(--accent)] font-bold px-3 py-2 rounded-xl text-center min-w-[70px]">
                      {app.startTime}
                    </div>
                    <div>
                      <h4 className="font-semibold text-main">{app.clientName}</h4>
                      <p className="text-sm text-sub">{app.serviceName}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-medium text-main">R$ {app.price.toFixed(2)}</p>
                    {app.status === "agendado" ? (
                      <button
                        onClick={() => handleMarkAsConcluded(app.id)}
                        className="flex items-center gap-1 text-xs bg-white/50 hover:bg-green-100 text-green-600 px-2 py-1 rounded-lg transition-colors border border-green-200"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Concluir
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Concluído
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

        <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Agendamento"
      >
        <form onSubmit={handleSaveAppointment} className="space-y-5">
          <div className="bg-[var(--glass-darker)] p-3 rounded-xl mb-4 text-center text-sm font-medium text-main">
            Data selecionada: {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                placeholder="Nome da cliente (ou busque)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serviço
            </label>
            <div className="relative">
              <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none appearance-none"
              >
                {servicesList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor (R$)
            </label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
              placeholder="Ex: 150.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Início
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Término
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Adicionar ao Calendário (Opcional)</p>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={getGoogleCalendarUrl(currentAppForCalendar)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex flex-col items-center justify-center gap-1 bg-white/50 border border-white/60 rounded-xl p-2 hover:bg-white/80 transition-colors"
                title="Google Calendar"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" className="w-5 h-5" />
                Google
              </a>
              <button
                type="button"
                onClick={() => downloadAppleCalendar(currentAppForCalendar)}
                className="text-xs flex flex-col items-center justify-center gap-1 bg-white/50 border border-white/60 rounded-xl p-2 hover:bg-white/80 transition-colors"
                title="Apple Calendar"
              >
                <img src="https://i.postimg.cc/bNJSCWBm/01469f8fdc249a006e5c1ae1baccb775fc125cae-400x400.png" alt="Apple" className="w-5 h-5 object-contain rounded" />
                Apple
              </button>
              <a
                href={getOutlookCalendarUrl(currentAppForCalendar)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex flex-col items-center justify-center gap-1 bg-white/50 border border-white/60 rounded-xl p-2 hover:bg-white/80 transition-colors"
                title="Outlook"
              >
                <img src="https://i.postimg.cc/0NqQsBcZ/apps-61731-9007199266367162-925c6823-23fc-4133-a26b-f82214d5e866-e9c88943-c4a6-44f8-b3a9-90c2d47bc61.png" alt="Outlook" className="w-5 h-5 object-contain" />
                Outlook
              </a>
            </div>
          </div>

          <button
            type="submit"
            className="btn-action w-full flex justify-center items-center mt-4"
          >
            Salvar Agendamento
          </button>
        </form>
      </Modal>
    </div>
  );
}

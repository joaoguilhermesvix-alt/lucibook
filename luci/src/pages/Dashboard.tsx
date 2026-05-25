import React, { useState, useEffect, useRef } from "react";
import { DayPicker } from "react-day-picker";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Clock, User, Scissors, Calendar as CalendarIcon, CheckCircle, Search } from "lucide-react";
import Modal from "../components/Modal";
import "react-day-picker/dist/style.css";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [savedAppointment, setSavedAppointment] = useState<any>(null);
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<any>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [serviceName, setServiceName] = useState("Volume Clássico");
  const [price, setPrice] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("14:00");

  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let unsubscribeApp: () => void;
    let unsubscribeClients: () => void;
    let unsubscribeServices: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribeApp = onSnapshot(query(collection(db, "appointments")), (snapshot) => {
          const apps = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as any[];
          
          apps.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
          });
          setAppointments(apps);
        }, (error) => handleFirestoreError(error, OperationType.LIST, "appointments"));

        unsubscribeClients = onSnapshot(query(collection(db, "clients")), (snapshot) => {
          setClientsList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => handleFirestoreError(error, OperationType.LIST, "clients"));

        unsubscribeServices = onSnapshot(query(collection(db, "services")), (snapshot) => {
          const svcs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
          setServicesList(svcs);
          if (svcs.length > 0 && !serviceName) {
            setServiceName(svcs[0].name);
            setPrice(svcs[0].price?.toString() || "");
          }
        }, (error) => handleFirestoreError(error, OperationType.LIST, "services"));

      } else {
        setAppointments([]);
        setClientsList([]);
        setServicesList([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeApp) unsubscribeApp();
      if (unsubscribeClients) unsubscribeClients();
      if (unsubscribeServices) unsubscribeServices();
    };
  }, []);

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setServiceName(val);
    const svc = servicesList.find((s: any) => s.name === val);
    if (svc) {
      setPrice(svc.price?.toString() || "");
    }
  };

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

  const handleCreateOrUpdateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    // Use selectedDate for new, or the specific date string for editing. If editing across days, use selectedDate. 
    // To allow rescheduling across days, we'll bind a date picker state if editing... 
    // Actually, simply using `selectedDate` state should work. When we "Open Edit", we set selectedDate.
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const appData = {
      clientName,
      serviceName,
      price: parseFloat(price),
      date: dateStr,
      startTime,
      endTime,
    };

    try {
      if (editingApp) {
         await updateDoc(doc(db, "appointments", editingApp.id), appData);
      } else {
         await addDoc(collection(db, "appointments"), {
             userId: auth.currentUser.uid,
             ...appData,
             status: "agendado",
             createdAt: new Date().toISOString(),
         });
      }
      
      setIsModalOpen(false);
      setEditingApp(null);
      setClientName("");
      setPrice("");
      setStartTime("12:00");
      setEndTime("14:00");
    } catch (error) {
      handleFirestoreError(error, editingApp ? OperationType.UPDATE : OperationType.WRITE, "appointments");
    }
  };

  const openEditApp = (app: any) => {
      setEditingApp(app);
      setClientName(app.clientName);
      setServiceName(app.serviceName);
      setPrice(app.price.toString());
      setStartTime(app.startTime);
      setEndTime(app.endTime);
      
      // Parse the app date
      const [year, month, day] = app.date.split('-');
      setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
      setIsModalOpen(true);
  };

  const cancelAppointment = async () => {
     if (!deletingAppId) return;
     try {
        await deleteDoc(doc(db, "appointments", deletingAppId));
        setDeletingAppId(null);
     } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `appointments/${deletingAppId}`);
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
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LuciApp//PT',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
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
          onClick={() => {
            setEditingApp(null);
            setClientName("");
            setIsModalOpen(true);
          }}
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
                  className="glass-panel-darker p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="bg-[var(--glass)] text-[var(--accent)] font-bold px-3 py-2 rounded-xl text-center shrink-0 min-w-[70px]">
                      {app.startTime}
                    </div>
                    <div className="min-w-0 pr-2 flex-1">
                      <h4 className="font-semibold text-main truncate">{app.clientName}</h4>
                      <p className="text-sm text-sub truncate">{app.serviceName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-200/50">
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <p className="font-medium text-main shrink-0">R$ {app.price.toFixed(2)}</p>
                      
                      {app.status === "agendado" && (
                         <div className="flex items-center gap-2 border-l border-gray-200 pl-3 shrink-0">
                           <button 
                             onClick={() => openEditApp(app)}
                             className="text-xs font-semibold text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                           >
                             Editar
                           </button>
                           <button 
                             onClick={() => setDeletingAppId(app.id)}
                             className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                           >
                             Cancelar
                           </button>
                         </div>
                      )}
                    </div>
                    {app.status === "agendado" ? (
                      <button
                        onClick={() => handleMarkAsConcluded(app.id)}
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/50 hover:bg-green-100 text-green-600 px-3 py-1.5 rounded-lg transition-colors border border-green-200 w-full sm:w-auto"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Concluir
                      </button>
                    ) : (
                      <span className="text-xs font-medium bg-green-50 text-green-700 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 w-full sm:w-auto border border-green-100">
                        <CheckCircle className="w-4 h-4" />
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
        onClose={() => { setIsModalOpen(false); setEditingApp(null); }}
        title={editingApp ? "Editar Agendamento" : "Novo Agendamento"}
      >
        <form onSubmit={handleCreateOrUpdateApp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="date"
                required
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => {
                  const parts = e.target.value.split('-');
                  if (parts.length === 3) {
                    setSelectedDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                  }
                }}
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
              />
            </div>
          </div>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <div className="relative" ref={dropdownRef}>
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                className="w-full pl-10 pr-10 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                placeholder="Nome da cliente (ou busque)"
              />
              <div 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-black/5 rounded-full cursor-pointer text-pink-500"
                onClick={() => setShowClientDropdown(!showClientDropdown)}
              >
                <Search className="w-5 h-5" />
              </div>
              
              {showClientDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg z-50 p-2">
                  {clientsList.length > 0 ? (
                    clientsList
                      .filter((c: any) => c.name.toLowerCase().includes(clientName.toLowerCase()))
                      .map((c: any) => (
                        <div 
                           key={c.id} 
                           className="px-4 py-3 hover:bg-pink-50 rounded-xl cursor-pointer text-gray-700 text-sm font-medium transition-colors"
                           onClick={() => { setClientName(c.name); setShowClientDropdown(false); }}
                           >
                          {c.name}
                        </div>
                      ))
                  ) : (
                    <div className="p-3 text-sm text-gray-500 text-center">Nenhum cliente salvo.</div>
                  )}
                  {clientsList.filter((c: any) => c.name.toLowerCase().includes(clientName.toLowerCase())).length === 0 && clientsList.length > 0 && (
                    <div className="p-3 text-sm text-gray-500 text-center">Nenhum cliente encontrado com esse nome.</div>
                  )}
                </div>
              )}
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
                onChange={handleServiceChange}
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none appearance-none"
              >
                {servicesList.length === 0 && <option value="">Nenhum serviço salvo</option>}
                {servicesList.map((s: any) => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
                {/* Fallback mock if nothing is in db */}
                {servicesList.length === 0 && ["Volume Clássico", "Volume Brasileiro", "Efeito Fox"].map(s => (
                  <option key={s} value={s}>{s}</option>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {editingApp ? "Salvar Alterações" : "Salvar Agendamento"}
          </button>
        </form>
      </Modal>

      <Modal isOpen={!!deletingAppId} onClose={() => setDeletingAppId(null)} title="Cancelar Agendamento">
        <div className="space-y-4">
          <p className="text-gray-700">Tem certeza que deseja cancelar e excluir este agendamento?</p>
          <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">Essa ação não pode ser desfeita.</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setDeletingAppId(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
              Voltar
            </button>
            <button onClick={cancelAppointment} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors">
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

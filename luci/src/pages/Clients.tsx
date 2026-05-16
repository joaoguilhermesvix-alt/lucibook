import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, User, Phone, FileText, Loader2, Edit3, Image as ImageIcon, Camera, MessageCircle } from "lucide-react";
import Modal from "../components/Modal";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Clients() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  
  // Ficha state
  const [curvature, setCurvature] = useState("");
  const [thickness, setThickness] = useState("");
  const [style, setStyle] = useState("");
  const [mapping, setMapping] = useState("");
  const [allergies, setAllergies] = useState("");
  const [history, setHistory] = useState("");
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "clients"));

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const clientsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as any[];
          
          clientsData.sort((a, b) => a.name.localeCompare(b.name));
          setClients(clientsData);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "clients");
        });
      } else {
        setClients([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const resetForm = () => {
    setName("");
    setPhone("");
    setNotes("");
    setCurvature("");
    setThickness("");
    setStyle("");
    setMapping("");
    setAllergies("");
    setHistory("");
    setBeforePhoto(null);
    setAfterPhoto(null);
    setSelectedClient(null);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsModalOpen(false);

    try {
      await addDoc(collection(db, "clients"), {
        userId: auth.currentUser.uid,
        name,
        phone,
        notes,
        createdAt: new Date().toISOString(),
      });
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "clients");
    }
  };

  const openClientDetail = (client: any) => {
    setSelectedClient(client);
    setName(client.name || "");
    setPhone(client.phone || "");
    setNotes(client.notes || "");
    setCurvature(client.curvature || "");
    setThickness(client.thickness || "");
    setStyle(client.style || "");
    setMapping(client.mapping || "");
    setAllergies(client.allergies || "");
    setHistory(client.history || "");
    setBeforePhoto(client.beforePhoto || null);
    setAfterPhoto(client.afterPhoto || null);
    setIsDetailModalOpen(true);
  };

  const handleUpdateClientDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    try {
      await updateDoc(doc(db, "clients", selectedClient.id), {
        name,
        phone,
        notes,
        curvature,
        thickness,
        style,
        mapping,
        allergies,
        history,
        beforePhoto,
        afterPhoto,
      });
      setIsDetailModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${selectedClient.id}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      // Create an image to resize it
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        if (type === 'before') setBeforePhoto(compressedBase64);
        else setAfterPhoto(compressedBase64);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Clientes
          </h1>
          <p className="text-gray-500 mt-1">
            Caderno digital com histórico de atendimentos e fichas.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="btn-action flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nova Cliente
        </button>
      </div>

      <div className="glass-panel p-6">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-12 pr-4 py-3.5 bg-[var(--glass)] border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="col-span-full text-center py-10 text-sub">
              Nenhum cliente encontrado.
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => openClientDetail(client)}
                className="glass-panel-darker p-5 hover:bg-white/70 transition-colors cursor-pointer relative group"
              >
                <div className="absolute top-4 right-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Edit3 className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-pink-600 font-bold text-lg">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{client.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {client.phone}
                      </p>
                      {client.phone && (
                        <a
                           href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 hover:bg-green-200 transition-colors"
                           onClick={(e) => e.stopPropagation()}
                           title="Abrir WhatsApp"
                        >
                           <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {client.style && <span className="pill-tag bg-pink-100 text-pink-700 text-xs">Estilo: {client.style}</span>}
                  {client.mapping && <span className="pill-tag bg-purple-100 text-purple-700 text-xs">Map: {client.mapping}</span>}
                  {(!client.style && !client.mapping) && <span className="text-sm text-gray-400 italic">Nenhum histórico registrado</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Basic Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Cliente"
      >
        <form onSubmit={handleSaveClient} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none" placeholder="Ex: Maria Joaquina" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none" placeholder="(00) 00000-0000" />
            </div>
          </div>
          <button type="submit" className="btn-action w-full flex justify-center items-center mt-4">
            Cadastrar Cliente
          </button>
        </form>
      </Modal>

      {/* Full Detail / Ficha Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Ficha Profissional da Cliente"
      >
        <form onSubmit={handleUpdateClientDetail} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="md:col-span-2 bg-white/40 p-4 rounded-2xl border border-white/50">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Dados Básicos</h4>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-white/50 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none border border-white" />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                    <div className="flex gap-2">
                      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 px-3 py-2 bg-white/50 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none border border-white" />
                      {phone && (
                        <a
                           href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="px-3 bg-green-100 hover:bg-green-200 text-green-600 rounded-xl flex items-center justify-center transition-colors"
                           title="Abrir WhatsApp"
                        >
                           <MessageCircle className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                 </div>
              </div>
            </div>

            {/* Technical Sheet */}
            <div className="md:col-span-2 bg-white/40 p-4 rounded-2xl border border-white/50">
               <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                 <FileText className="w-4 h-4 text-pink-500" /> Detalhes Técnicos
               </h4>
               <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Curvatura Usada (C, D, L...)</label>
                    <input type="text" value={curvature} onChange={(e) => setCurvature(e.target.value)} className="w-full px-3 py-2 bg-white/50 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none border border-white" placeholder="Ex: D" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Espessura</label>
                    <input type="text" value={thickness} onChange={(e) => setThickness(e.target.value)} className="w-full px-3 py-2 bg-white/50 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none border border-white" placeholder="Ex: 0.05" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Estilo (Fox, Doll...)</label>
                    <input type="text" value={style} onChange={(e) => setStyle(e.target.value)} className="w-full px-3 py-2 bg-white/50 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none border border-white" placeholder="Ex: Fox Eye" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mapping (Tamanhos)</label>
                    <input type="text" value={mapping} onChange={(e) => setMapping(e.target.value)} className="w-full px-3 py-2 bg-white/50 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none border border-white" placeholder="Ex: 8-9-10-11-12" />
                  </div>
               </div>
            </div>

            {/* Health & History */}
            <div className="md:col-span-2 bg-white/40 p-4 rounded-2xl border border-white/50 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">Alergias / Sensibilidade</label>
                <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} className="w-full px-3 py-2 bg-white/50 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none border border-white placeholder:text-red-200" placeholder="Ex: Sensível a fita micropore..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Histórico de Manutenções (Anotações)</label>
                <textarea rows={3} value={history} onChange={(e) => setHistory(e.target.value)} className="w-full px-3 py-2 bg-white/50 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none border border-white resize-none" placeholder="10/10 - Retenção estava boa, usamos cola Y..." />
              </div>
            </div>

            {/* Photos */}
            <div className="md:col-span-2 bg-white/40 p-4 rounded-2xl border border-white/50">
               <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                 <Camera className="w-4 h-4 text-pink-500" /> Registro Fotográfico
               </h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                     <span className="text-xs text-center font-medium text-sub">Antes</span>
                     <div 
                        onClick={() => beforeInputRef.current?.click()} 
                        className="aspect-[3/4] bg-white/60 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-pink-300 transition-colors"
                     >
                       {beforePhoto ? (
                         <img src={beforePhoto} alt="Antes" className="w-full h-full object-cover" />
                       ) : (
                         <div className="flex flex-col items-center opacity-50 group-hover:text-pink-500 transition-colors">
                            <ImageIcon className="w-8 h-8 mb-2" />
                            <span className="text-[10px]">Adicionar Foto</span>
                         </div>
                       )}
                       <input type="file" accept="image/*" className="hidden" ref={beforeInputRef} onChange={(e) => handleImageUpload(e, 'before')} />
                     </div>
                  </div>

                  <div className="flex flex-col gap-2">
                     <span className="text-xs text-center font-medium text-sub">Depois</span>
                     <div 
                        onClick={() => afterInputRef.current?.click()} 
                        className="aspect-[3/4] bg-white/60 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-pink-300 transition-colors"
                     >
                       {afterPhoto ? (
                         <img src={afterPhoto} alt="Depois" className="w-full h-full object-cover" />
                       ) : (
                         <div className="flex flex-col items-center opacity-50 group-hover:text-pink-500 transition-colors">
                            <ImageIcon className="w-8 h-8 mb-2" />
                            <span className="text-[10px]">Adicionar Foto</span>
                         </div>
                       )}
                       <input type="file" accept="image/*" className="hidden" ref={afterInputRef} onChange={(e) => handleImageUpload(e, 'after')} />
                     </div>
                  </div>
               </div>
            </div>

          </div>

          <button type="submit" className="btn-action w-full flex justify-center items-center sticky bottom-0 z-10 shadow-xl shadow-pink-200">
            Atualizar Ficha
          </button>
        </form>
      </Modal>
    </div>
  );
}

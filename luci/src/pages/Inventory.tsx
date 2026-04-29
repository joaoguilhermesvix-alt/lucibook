import React, { useState, useEffect } from "react";
import { Package, Plus, AlertTriangle, ChevronDown, CheckCircle, Loader2 } from "lucide-react";
import Modal from "../components/Modal";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Cílios");
  const [quantity, setQuantity] = useState(1);
  const [minQuantity, setMinQuantity] = useState(1);
  const [details, setDetails] = useState(""); // Curvature/Thickness for lashes

  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "inventory")
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const itemsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as any[];
          
          itemsData.sort((a, b) => a.name.localeCompare(b.name));
          setItems(itemsData);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "inventory");
        });
      } else {
        setItems([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsModalOpen(false);

    try {
      await addDoc(collection(db, "inventory"), {
        userId: auth.currentUser.uid,
        name,
        category,
        quantity,
        minQuantity,
        details,
        createdAt: new Date().toISOString(),
      });
      // Reset form
      setName("");
      setQuantity(1);
      setMinQuantity(1);
      setDetails("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "inventory");
    }
  };

  const adjustQuantity = async (id: string, current: number, delta: number) => {
    if (current + delta < 0) return;
    try {
      await updateDoc(doc(db, "inventory", id), {
        quantity: current + delta
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Controle de Estoque
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie seus cílios, colas e receba alertas de materiais acabando.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-action flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Material
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => {
            const isLow = item.quantity <= item.minQuantity;
            return (
              <div key={item.id} className={`glass-panel p-5 relative overflow-hidden transition-all ${isLow ? 'border-red-200 ring-2 ring-red-100 shadow-md shadow-red-100/50' : 'border-transparent'}`}>
                {isLow && (
                  <div className="absolute top-4 right-4 text-red-500 flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Acabando!
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLow ? 'bg-red-100 text-red-600' : 'bg-[var(--glass-dark)] text-gray-700'}`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.category} {item.details ? `• ${item.details}` : ''}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-black/5 pt-4 mt-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Quantidade</span>
                    <span className={`text-2xl font-bold ${isLow ? 'text-red-500' : 'text-gray-800'}`}>
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => adjustQuantity(item.id, item.quantity, -1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => adjustQuantity(item.id, item.quantity, 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {items.length === 0 && (
            <div className="col-span-full text-center py-10 bg-white/40 rounded-3xl border border-white/60 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              Nenhum material cadastrado no estoque.
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Material"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Material
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                placeholder="Ex: Cola Elite Premium"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none appearance-none"
                >
                  <option value="Cílios">Cílios (Caixas, Fios)</option>
                  <option value="Cola">Colas / Adesivos</option>
                  <option value="Removedor">Removedores</option>
                  <option value="Descartáveis">Descartáveis (Pads, Escovinhas)</option>
                  <option value="Outros">Outros</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Detalhes Adicionais (Curvatura, Espessura etc.)
              </label>
              <input
                type="text"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                placeholder="Ex: Curvatura C, Espessura 0.15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Qtd Atual
              </label>
              <input
                type="number"
                required
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alerta de Baixa (Min)
              </label>
              <input
                type="number"
                required
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
              />
            </div>

          </div>

          <button
            type="submit"
            className="btn-action w-full flex justify-center items-center mt-6"
          >
            Salvar Material
          </button>
        </form>
      </Modal>
    </div>
  );
}

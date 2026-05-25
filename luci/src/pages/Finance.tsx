import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, CreditCard, Wallet, Loader2, TrendingDown, Plus, Tag } from "lucide-react";
import Modal from "../components/Modal";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Finance() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Expense Form
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseValue, setExpenseValue] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit/Delete State
  const [editingTx, setEditingTx] = useState<any>(null);
  const [editType, setEditType] = useState<"expense" | "income" | null>(null);
  
  const [deletingTx, setDeletingTx] = useState<any>(null);

  const handleDelete = async () => {
    if (!deletingTx) return;
    try {
      if (deletingTx.type === "expense") {
        await deleteDoc(doc(db, "expenses", deletingTx.id));
      } else {
        await deleteDoc(doc(db, "appointments", deletingTx.id));
      }
      setDeletingTx(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${deletingTx.type}s/${deletingTx.id}`);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    try {
      if (editType === "expense") {
        await updateDoc(doc(db, "expenses", editingTx.id), {
          description: expenseDescription,
          value: parseFloat(expenseValue),
          date: expenseDate,
        });
      } else if (editType === "income") {
        await updateDoc(doc(db, "appointments", editingTx.id), {
           price: parseFloat(expenseValue),
           status: expenseDescription // Reusing this for status
        });
      }
      setEditingTx(null);
      setEditType(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${editType}s/${editingTx.id}`);
    }
  };

  const openEdit = (tx: any) => {
    setEditingTx(tx);
    setEditType(tx.type);
    if (tx.type === "expense") {
       setExpenseDescription(tx.description);
       setExpenseValue(tx.value.toString());
       setExpenseDate(tx.date || tx.createdAt?.split('T')[0]);
    } else {
       setExpenseDescription(tx.status); // mapping status to description input
       setExpenseValue((tx.price || 0).toString());
    }
  };

  useEffect(() => {
    let unsubscribeApps: () => void;
    let unsubscribeExpenses: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch Appointments (Income)
        unsubscribeApps = onSnapshot(collection(db, "appointments"), (snapshot) => {
          const appsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            type: "income",
            ...doc.data(),
          })) as any[];
          setAppointments(appsData);
        }, (error) => handleFirestoreError(error, OperationType.LIST, "appointments"));

        // Fetch Expenses
        unsubscribeExpenses = onSnapshot(collection(db, "expenses"), (snapshot) => {
          const expData = snapshot.docs.map((doc) => ({
             id: doc.id,
             type: "expense",
             ...doc.data(),
          })) as any[];
          setExpenses(expData);
          setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.LIST, "expenses"));

      } else {
        setAppointments([]);
        setExpenses([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeApps) unsubscribeApps();
      if (unsubscribeExpenses) unsubscribeExpenses();
    };
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, "expenses"), {
        userId: auth.currentUser.uid,
        description: expenseDescription,
        value: parseFloat(expenseValue),
        date: expenseDate,
        createdAt: new Date().toISOString(),
      });
      setIsExpenseModalOpen(false);
      setExpenseDescription("");
      setExpenseValue("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "expenses");
    }
  };

  // Combine and sort ALL transactions
  const allTransactions = [...appointments, ...expenses].filter((tx) => {
      const dateStr = tx.date || tx.createdAt?.split('T')[0] || "";
      if (!selectedMonth) return true; // Show all if no month selected
      return dateStr.startsWith(selectedMonth);
  }).sort((a, b) => {
      const dateA = a.date || a.createdAt?.split('T')[0] || "";
      const dateB = b.date || b.createdAt?.split('T')[0] || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeB.localeCompare(timeA);
  });

  // Calculate stats based on filtered transactions
  const received = allTransactions
    .filter(tx => tx.type === "income" && tx.status === "concluido")
    .reduce((sum, tx) => sum + (tx.price || 0), 0);
    
  const toReceive = allTransactions
    .filter(tx => tx.type === "income" && tx.status === "agendado")
    .reduce((sum, tx) => sum + (tx.price || 0), 0);

  const totalExpenses = allTransactions
    .filter(tx => tx.type === "expense")
    .reduce((sum, tx) => sum + (tx.value || 0), 0);
    
  const total = received + toReceive - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Financeiro
          </h1>
          <p className="text-gray-500 mt-1">
            Ganhos e gastos com materiais.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-3">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-xl bg-white/70 text-gray-700 font-medium outline-none focus:ring-2 focus:ring-pink-300"
          />
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="btn-action bg-red-50 text-red-600 border-red-200 hover:bg-red-100 flex items-center gap-2 justify-center"
          >
            <TrendingDown className="w-5 h-5" />
            Registrar Gasto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-green-600">
            <TrendingUp className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <p className="text-sub font-medium mb-1 text-sm uppercase tracking-wide cursor-help" title="Pagamentos concluídos via agendamentos">Recebido</p>
            <h2 className="text-2xl font-bold text-[#2e7d32]">
              R$ {received.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="glass-panel-darker p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-gray-600">
            <DollarSign className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <p className="text-sub font-medium mb-1 text-sm uppercase tracking-wide cursor-help" title="Agendamentos ainda não marcados como pagos">A Receber</p>
            <h2 className="text-2xl font-bold text-blue-600">
              R$ {toReceive.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="glass-panel p-6 relative overflow-hidden border-2 border-red-50">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500">
            <Tag className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <p className="text-sub font-medium mb-1 text-sm uppercase tracking-wide">Despesas (Materiais)</p>
            <h2 className="text-2xl font-bold text-red-500">
              R$ {totalExpenses.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="glass-panel p-6 relative overflow-hidden ring-2 ring-pink-100">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Wallet className="w-20 h-20 text-pink-600" />
          </div>
          <div className="relative z-10">
            <p className="text-pink-600 font-bold mb-1 text-sm uppercase tracking-wide">Saldo Final Previsto</p>
            <h2 className="text-3xl font-black text-pink-500">
              R$ {total.toFixed(2)}
            </h2>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold text-main mb-6">Últimos Lançamentos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                   <th className="pb-3 font-medium">Lançamento</th>
                   <th className="pb-3 font-medium">Data</th>
                   <th className="pb-3 font-medium">Status / Tipo</th>
                   <th className="pb-3 font-medium text-right">Valor</th>
                   <th className="pb-3 font-medium text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="text-sm">
                {loading ? (
                   <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" /></td></tr>
                ) : allTransactions.length === 0 ? (
                   <tr><td colSpan={5} className="py-10 text-center text-sub">Nenhum lançamento encontrado.</td></tr>
                ) : (
                   allTransactions.map(tx => (
                      <tr key={tx.id} className="border-b border-gray-100 last:border-0 hover:bg-white/40 transition-colors">
                         <td className="py-4">
                           {tx.type === "income" ? (
                             <>
                               <p className="font-semibold text-gray-800">{tx.clientName}</p>
                               <p className="text-gray-500 text-xs">Atendimento: {tx.serviceName}</p>
                             </>
                           ) : (
                             <>
                               <p className="font-semibold text-gray-800">{tx.description}</p>
                               <p className="text-gray-500 text-xs text-red-500">Gasto Material</p>
                             </>
                           )}
                         </td>
                         <td className="py-4 text-gray-600">{tx.date || tx.createdAt?.split('T')[0]}</td>
                         <td className="py-4">
                            {tx.type === "income" ? (
                               <span className={`pill-tag ${tx.status === "concluido" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                 {tx.status === "concluido" ? "Recebido" : "Pendente"}
                               </span>
                            ) : (
                               <span className="pill-tag bg-red-100 text-red-700">Despesa Paga</span>
                            )}
                         </td>
                         <td className={`py-4 text-right font-bold ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>
                            {tx.type === "income" ? "+" : "-"} R$ {(tx.price || tx.value || 0).toFixed(2)}
                         </td>
                         <td className="py-4 text-right">
                           <div className="flex justify-end gap-2">
                             <button onClick={() => openEdit(tx)} className="text-blue-500 hover:text-blue-700 text-xs font-semibold px-2 py-1 bg-blue-50 rounded-lg">Editar</button>
                             <button onClick={() => setDeletingTx(tx)} className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-50 rounded-lg">Excluir</button>
                           </div>
                         </td>
                      </tr>
                   ))
                )}
             </tbody>
          </table>
        </div>
      </div>

      {/* Excluir Modal */}
      <Modal isOpen={!!deletingTx} onClose={() => setDeletingTx(null)} title="Excluir Lançamento">
        <div className="space-y-4">
          <p className="text-gray-700">Tem certeza que deseja excluir este lançamento?</p>
          <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">Essa ação não pode ser desfeita e refletirá para todos.</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setDeletingTx(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
              Cancelar
            </button>
            <button onClick={handleDelete} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors">
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Registrar Gasto de Material">
         <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
               <input type="text" required value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-red-300" placeholder="Ex: Caixas de Cílios Volume Brasileiro" />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
               <input type="number" step="0.01" required value={expenseValue} onChange={(e) => setExpenseValue(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-red-300" placeholder="150.00" />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
               <input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <button type="submit" className="btn-action w-full bg-red-500 hover:bg-red-600 text-white border-0 mt-4 h-12 rounded-xl font-bold">
               Adicionar Despesa
            </button>
         </form>
      </Modal>
      <Modal isOpen={!!editingTx} onClose={() => { setEditingTx(null); setEditType(null); }} title="Editar Lançamento">
         <form onSubmit={handleEditSubmit} className="space-y-4">
            {editType === "expense" ? (
              <>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input type="text" required value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-blue-300" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={expenseValue} onChange={(e) => setExpenseValue(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-blue-300" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-blue-300" />
                 </div>
              </>
            ) : (
              <>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status do Pagamento</label>
                    <select required value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="agendado">Pendente</option>
                      <option value="concluido">Recebido</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={expenseValue} onChange={(e) => setExpenseValue(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-blue-300" />
                 </div>
              </>
            )}
            <button type="submit" className="btn-action w-full bg-blue-500 hover:bg-blue-600 text-white border-0 mt-4 h-12 rounded-xl font-bold">
               Salvar Alterações
            </button>
         </form>
      </Modal>
    </div>
  );
}

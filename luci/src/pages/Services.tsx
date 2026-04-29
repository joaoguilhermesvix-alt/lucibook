import React, { useState } from "react";
import { Plus, Scissors, Clock, DollarSign } from "lucide-react";
import Modal from "../components/Modal";

export default function Services() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data
  const services = [
    { id: 1, name: "Volume Clássico", price: 120.0, duration: "2h" },
    { id: 2, name: "Volume Brasileiro", price: 140.0, duration: "2h 30m" },
    { id: 3, name: "Volume Egípcio", price: 150.0, duration: "2h 30m" },
    { id: 4, name: "Volume Russo", price: 180.0, duration: "3h" },
    { id: 5, name: "Efeito Fox", price: 160.0, duration: "2h 30m" },
  ];

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
    alert("Serviço salvo com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Serviços
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie os procedimentos que você oferece.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-action flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Serviço
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="glass-panel p-6 hover:bg-white/70 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600">
                <Scissors className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-800 text-lg">
                {service.name}
              </h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> Valor
                </span>
                <span className="font-medium text-gray-800">
                  R$ {service.price.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Duração
                </span>
                <span className="font-medium text-gray-800">
                  {service.duration}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Serviço"
      >
        <form onSubmit={handleSaveService} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Serviço
            </label>
            <div className="relative">
              <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                placeholder="Ex: Manutenção Volume Russo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duração (min)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none"
                  placeholder="Ex: 120"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-action w-full flex justify-center items-center mt-4"
          >
            Cadastrar Serviço
          </button>
        </form>
      </Modal>
    </div>
  );
}

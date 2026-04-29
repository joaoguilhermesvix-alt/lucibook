-- Execute este script no SQL Editor do seu painel Supabase

-- 1. Tabela de Clientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Serviços
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration_mins INTEGER DEFAULT 120,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir serviços padrão para novos usuários (opcional, ou gerenciar via app)
-- O app permite cadastrar novos serviços.

-- 3. Tabela de Agendamentos
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT DEFAULT 'agendado', -- agendado, concluido, cancelado
  payment_method TEXT, -- pix, cartao, dinheiro
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Lash Mappings (Ficha de Procedimento)
CREATE TABLE lash_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  mapping_notes TEXT,
  lash_type TEXT,
  lash_brand TEXT,
  adhesive TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS (Row Level Security) para garantir que cada usuário veja apenas seus dados
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lash_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Policies)
CREATE POLICY "Users can manage their own clients" ON clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own services" ON services FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own appointments" ON appointments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own lash mappings" ON lash_mappings FOR ALL USING (auth.uid() = user_id);

export type Role = "admin" | "rh" | "chefe" | "gerente";

export interface Municipio {
  id: string;
  nome: string;
  slug: string;
  created_at: string;
}

export interface Unidade {
  id: string;
  nome: string;
  municipio_id: string;
  created_at: string;
}

export interface Categoria {
  id: string;
  nome: string;
  municipio_id: string;
  created_at: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  nivel: Role;
  municipio_id: string;
  categoria_id: string | null;
  unidade_id: string | null;
  created_at: string;
}

export interface Convite {
  id: string;
  token: string;
  nivel: Role;
  municipio_id: string;
  categoria_id: string | null;
  unidade_id: string | null;
  usado: boolean;
  criado_por: string | null;
  created_at: string;
}

export interface Funcionario {
  id: string;
  nome: string;
  municipio_id: string;
  categoria_id: string;
  unidade_id: string;
  created_at: string;
}

export interface Escala {
  id: string;
  funcionario_id: string;
  municipio_id: string;
  data: string;
  tipo: "normal" | "extra";
  unidade_id: string;
  criado_por: string | null;
  created_at: string;
}

export interface FolgaLancamento {
  id: string;
  funcionario_id: string;
  municipio_id: string;
  quantidade: number;
  origem: string;
  referencia_id: string | null;
  created_at: string;
}

export interface PedidoFolga {
  id: string;
  funcionario_id: string;
  municipio_id: string;
  solicitado_por: string;
  status: "pendente" | "aprovado" | "negado";
  analisado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface HistoricoTransferencia {
  id: string;
  funcionario_id: string;
  municipio_id: string;
  unidade_origem: string;
  unidade_destino: string;
  data_transferencia: string;
  criado_por: string | null;
  created_at: string;
}

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  rh: "RH",
  chefe: "Chefe de Categoria",
  gerente: "Gerente de Unidade",
};

export const LEXBASE_TIPOS = ["Ley", "Código", "Reglamento", "Política", "Resolución", "Decreto", "Circular", "Otro"] as const;
export type LexbaseTipo = (typeof LEXBASE_TIPOS)[number];

export const LEXBASE_TIPO_COLORS: Record<LexbaseTipo, string> = {
  "Ley":         "bg-blue-50 text-blue-700 border-blue-200",
  "Código":      "bg-purple-50 text-purple-700 border-purple-200",
  "Reglamento":  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Política":    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Resolución":  "bg-amber-50 text-amber-700 border-amber-200",
  "Decreto":     "bg-orange-50 text-orange-700 border-orange-200",
  "Circular":    "bg-slate-50 text-slate-700 border-slate-200",
  "Otro":        "bg-gray-50 text-gray-700 border-gray-200",
};

export interface TocEntry {
  num: string;
  titulo: string;
  nivel: number; // 1=chapter, 2=article, 3=paragraph
  offset?: number; // character offset in text for navigation
}

export interface LexbaseCategoria {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  created_at: string;
}

export interface LexbaseDocumento {
  id: string;
  tenant_id: string;
  titulo: string;
  tipo: LexbaseTipo;
  categoria_id?: string;
  categoria?: LexbaseCategoria;
  descripcion?: string;
  pais: string;
  numero_oficial?: string;
  organo_emisor?: string;
  fecha_publicacion?: string;
  fecha_vigencia?: string;
  storage_path?: string;
  tipo_mime?: string;
  tiene_reformas: boolean;
  reformas_descripcion?: string;
  tags: string[];
  toc?: TocEntry[];
  estado: "activo" | "archivado";
  indexed_at?: string;
  total_chunks: number;
  created_by_nombre?: string;
  created_at: string;
  updated_at: string;
}

export interface LexbaseFilters {
  search: string;
  tipo: LexbaseTipo | "";
  categoria_id: string;
  pais: string;
  tiene_reformas: boolean | null;
  tag: string;
}

export interface LexbaseStats {
  total: number;
  por_tipo: Record<string, number>;
  indexados: number;
  categorias: number;
}

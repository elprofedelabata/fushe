export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface OrigenFushe {
  aplicacion: string;
  version?: string;
  archivo?: string;
}
export interface MetadatosFushe {
  titulo?: string;
  creado?: string;
  generador?: {
    nombre: string;
    version?: string;
  };
  origen?: OrigenFushe;
}

export interface DefinicionTramo {
  dias?: DiaSemana[];
  inicio: string;
  fin: string;
}

export interface TramoFushe {
  id: string;
  tipo?: string;
  referencia: string;
  definiciones: DefinicionTramo[];
}

export interface PerfilFushe {
  id: string;
  nombre: string;
  tramos: TramoFushe[];
}

export interface EntidadNombradaFushe {
  id: string;
  nombre: string;
}

export type ProfesorFushe = EntidadNombradaFushe;
export type GrupoFushe = EntidadNombradaFushe;
export type EspacioFushe = EntidadNombradaFushe;

export interface ActividadFushe {
  id: string;
  tipo: string;
  referencia?: string;
  nombre: string;
  profesores?: string[];
  grupos?: string[];
}

export interface SesionFushe {
  id: string;
  dia: DiaSemana;
  perfil: string;
  tramo: string;
  actividad: string;
  profesores?: string[];
  grupos?: string[];
  espacios?: string[];
}

export interface ExtensionFushe {
  sistema: string;
  clave: string;
  valor: string;
}

export interface DocumentoFushe {
  version: string;
  metadatos?: MetadatosFushe;
  estructura: {
    dias: DiaSemana[];
  };
  perfiles: PerfilFushe[];
  profesores?: ProfesorFushe[];
  grupos?: GrupoFushe[];
  espacios?: EspacioFushe[];
  actividades: ActividadFushe[];
  sesiones: SesionFushe[];
  extensiones?: ExtensionFushe[];
}

export interface ProblemaValidacion {
  severidad: "error" | "advertencia";
  codigo: string;
  ruta: string;
  mensaje: string;
}

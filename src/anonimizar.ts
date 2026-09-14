import { DocumentoFushe } from "./modelo";

export function anonimizarFushe(documento: DocumentoFushe): DocumentoFushe {
  return {
    ...documento,
    metadatos: {
      ...documento.metadatos,
      titulo: "Horario anonimizado convertido desde Peñalara",
      origen: documento.metadatos?.origen
        ? { ...documento.metadatos.origen, archivo: undefined }
        : undefined,
    },
    profesores: documento.profesores?.map((profesor, indice) => ({
      ...profesor,
      nombre: `Profesor ${String(indice + 1).padStart(3, "0")}`,
    })),
  };
}

import { basename } from "node:path";
import {
  ActividadFushe,
  DiaSemana,
  DocumentoFushe,
  EntidadNombradaFushe,
  PerfilFushe,
  SesionFushe,
} from "../modelo";

export type CodificacionCsvHorw = "utf-8" | "windows-1252" | "cadena";

export interface FilaCsvHorw {
  registro: number;
  grupo?: string;
  profesor: string;
  actividad: string;
  espacio?: string;
  dia: DiaSemana;
  tramo: number;
}

export interface AnalisisCsvHorw {
  codificacion: CodificacionCsvHorw;
  filas: FilaCsvHorw[];
  dias: DiaSemana[];
  tramos: number[];
  profesores: string[];
  grupos: string[];
  actividades: string[];
  espacios: string[];
}

export interface DefinicionTramoHorw {
  inicio: string;
  fin: string;
  referencia?: string;
  tipo?: string;
}

export interface OpcionesConversionHorw {
  nombreArchivo?: string;
  titulo?: string;
  dias?: DiaSemana[];
  tramos?: Readonly<Record<string, DefinicionTramoHorw>>;
  tipoPredeterminado?: string;
  tiposPorActividad?: Readonly<Record<string, string>>;
  nombresProfesores?: Readonly<Record<string, string>>;
  nombresGrupos?: Readonly<Record<string, string>>;
  nombresActividades?: Readonly<Record<string, string>>;
  nombresEspacios?: Readonly<Record<string, string>>;
  gruposOmitidos?: readonly string[];
}

interface TextoCsvHorw {
  texto: string;
  codificacion: CodificacionCsvHorw;
}

interface CatalogoFushe {
  entidades: EntidadNombradaFushe[];
  porCodigo: Map<string, string>;
}

const ENCABEZADOS = [
  new Set(["id", "numero", "n", "registro"]),
  new Set(["grupo"]),
  new Set(["profesor", "docente"]),
  new Set(["actividad", "materia", "asignatura"]),
  new Set(["aula", "espacio"]),
  new Set(["dia"]),
  new Set(["tramo", "hora", "periodo"]),
];

function idSecuencial(prefijo: string, numero: number, ancho = 3): string {
  return `${prefijo}${String(numero).padStart(ancho, "0")}`;
}

function normalizarEtiqueta(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function sinDuplicados<T>(valores: Iterable<T>): T[] {
  return [...new Set(valores)];
}

function obtenerTexto(contenido: string | Buffer): TextoCsvHorw {
  if (typeof contenido === "string") {
    return {
      texto: contenido.charCodeAt(0) === 0xfeff ? contenido.slice(1) : contenido,
      codificacion: "cadena",
    };
  }

  if (
    (contenido[0] === 0xff && contenido[1] === 0xfe) ||
    (contenido[0] === 0xfe && contenido[1] === 0xff)
  ) {
    throw new Error("El CSV de HorW está en UTF-16; expórtelo como ANSI/Windows-1252 o UTF-8");
  }

  try {
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(contenido);
    return {
      texto: texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto,
      codificacion: "utf-8",
    };
  } catch {
    return {
      texto: new TextDecoder("windows-1252").decode(contenido),
      codificacion: "windows-1252",
    };
  }
}

function analizarFilasCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;
  let comillasCerradas = false;

  const cerrarFila = (): void => {
    fila.push(campo);
    if (fila.some((valor) => valor.length > 0)) filas.push(fila);
    fila = [];
    campo = "";
    comillasCerradas = false;
  };

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caracter = texto[indice];
    if (entreComillas) {
      if (caracter === '"') {
        if (texto[indice + 1] === '"') {
          campo += '"';
          indice += 1;
        } else {
          entreComillas = false;
          comillasCerradas = true;
        }
      } else {
        campo += caracter;
      }
      continue;
    }

    if (caracter === '"') {
      if (campo.length || comillasCerradas) {
        throw new Error(`Comillas inesperadas en el CSV de HorW, posición ${indice + 1}`);
      }
      entreComillas = true;
    } else if (caracter === ";") {
      fila.push(campo);
      campo = "";
      comillasCerradas = false;
    } else if (caracter === "\r" || caracter === "\n") {
      cerrarFila();
      if (caracter === "\r" && texto[indice + 1] === "\n") indice += 1;
    } else {
      if (comillasCerradas) {
        throw new Error(`Contenido inesperado tras unas comillas en el CSV, posición ${indice + 1}`);
      }
      campo += caracter;
    }
  }

  if (entreComillas) throw new Error("El CSV de HorW termina dentro de un campo entrecomillado");
  if (fila.length || campo.length) cerrarFila();
  return filas;
}

function esEncabezado(fila: string[]): boolean {
  return (
    fila.length === ENCABEZADOS.length &&
    fila.every((valor, indice) => ENCABEZADOS[indice].has(normalizarEtiqueta(valor)))
  );
}

function enteroPositivo(valor: string, campo: string, numeroFila: number): number {
  if (!/^\d+$/.test(valor.trim())) {
    throw new Error(`Valor no válido en ${campo}, fila ${numeroFila}: ${valor || "(vacío)"}`);
  }
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < 1) {
    throw new Error(`Se esperaba un entero positivo en ${campo}, fila ${numeroFila}: ${valor}`);
  }
  return numero;
}

function textoRequerido(valor: string, campo: string, numeroFila: number): string {
  const texto = valor.trim();
  if (!texto) throw new Error(`Falta ${campo} en la fila ${numeroFila}`);
  return texto;
}

function leerFilas(texto: string): FilaCsvHorw[] {
  const filasCrudas = analizarFilasCsv(texto);
  if (!filasCrudas.length) throw new Error("El CSV de HorW está vacío");
  const desplazamiento = esEncabezado(filasCrudas[0]) ? 1 : 0;
  const resultado: FilaCsvHorw[] = [];
  const registros = new Set<number>();
  const colocaciones = new Map<string, number>();

  for (let indice = desplazamiento; indice < filasCrudas.length; indice += 1) {
    const numeroFila = indice + 1;
    const columnas = filasCrudas[indice];
    if (columnas.length !== 7) {
      throw new Error(
        `La fila ${numeroFila} tiene ${columnas.length} columnas; se esperaban 7 separadas por punto y coma`,
      );
    }

    const registro = enteroPositivo(columnas[0], "registro", numeroFila);
    if (registros.has(registro)) {
      throw new Error(`Identificador de registro repetido en el CSV de HorW: ${registro}`);
    }
    registros.add(registro);

    const diaNumero = enteroPositivo(columnas[5], "día", numeroFila);
    if (diaNumero > 7) {
      throw new Error(`Día fuera del intervalo 1-7 en la fila ${numeroFila}: ${diaNumero}`);
    }
    const fila: FilaCsvHorw = {
      registro,
      grupo: columnas[1].trim() || undefined,
      profesor: textoRequerido(columnas[2], "profesor", numeroFila),
      actividad: textoRequerido(columnas[3], "actividad", numeroFila),
      espacio: columnas[4].trim() || undefined,
      dia: diaNumero as DiaSemana,
      tramo: enteroPositivo(columnas[6], "tramo", numeroFila),
    };
    const firma = JSON.stringify([
      fila.grupo,
      fila.profesor,
      fila.actividad,
      fila.espacio,
      fila.dia,
      fila.tramo,
    ]);
    const anterior = colocaciones.get(firma);
    if (anterior !== undefined) {
      throw new Error(
        `Colocación duplicada en las filas ${anterior} y ${numeroFila} del CSV de HorW`,
      );
    }
    colocaciones.set(firma, numeroFila);
    resultado.push(fila);
  }

  if (!resultado.length) throw new Error("El CSV de HorW no contiene colocaciones");
  return resultado;
}

export function analizarCsvHorw(contenido: string | Buffer): AnalisisCsvHorw {
  const { texto, codificacion } = obtenerTexto(contenido);
  const filas = leerFilas(texto);
  return {
    codificacion,
    filas,
    dias: sinDuplicados(filas.map((fila) => fila.dia)).sort((a, b) => a - b),
    tramos: sinDuplicados(filas.map((fila) => fila.tramo)).sort((a, b) => a - b),
    profesores: sinDuplicados(filas.map((fila) => fila.profesor)),
    grupos: sinDuplicados(
      filas.map((fila) => fila.grupo).filter((valor): valor is string => valor !== undefined),
    ),
    actividades: sinDuplicados(filas.map((fila) => fila.actividad)),
    espacios: sinDuplicados(
      filas.map((fila) => fila.espacio).filter((valor): valor is string => valor !== undefined),
    ),
  };
}

function valorDeMapa(
  mapa: Readonly<Record<string, string>> | undefined,
  codigo: string,
): string | undefined {
  return mapa && Object.prototype.hasOwnProperty.call(mapa, codigo) ? mapa[codigo] : undefined;
}

function crearCatalogo(
  codigos: string[],
  nombres: Readonly<Record<string, string>> | undefined,
  prefijo: string,
): CatalogoFushe {
  const entidades: EntidadNombradaFushe[] = [];
  const porCodigo = new Map<string, string>();
  for (const codigo of sinDuplicados(codigos)) {
    const id = idSecuencial(prefijo, entidades.length + 1);
    entidades.push({ id, nombre: valorDeMapa(nombres, codigo)?.trim() || codigo });
    porCodigo.set(codigo, id);
  }
  return { entidades, porCodigo };
}

function normalizarHora(valor: string, contexto: string): string {
  const coincidencia = valor.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!coincidencia) throw new Error(`Hora no válida en ${contexto}: ${valor}`);
  return `${coincidencia[1]}:${coincidencia[2]}:${coincidencia[3] ?? "00"}`;
}

function crearEstructura(
  analisis: AnalisisCsvHorw,
  opciones: OpcionesConversionHorw,
): { dias: DiaSemana[]; perfil: PerfilFushe; tramosPorNumero: Map<number, string> } {
  const dias = opciones.dias ? sinDuplicados(opciones.dias) : analisis.dias;
  for (const dia of dias) {
    if (!Number.isInteger(dia) || dia < 1 || dia > 7) {
      throw new Error(`Día no válido en opciones.dias: ${dia}`);
    }
  }
  for (const dia of analisis.dias) {
    if (!dias.includes(dia)) {
      throw new Error(`El CSV usa el día ${dia}, pero no está declarado en opciones.dias`);
    }
  }

  const numerosConfigurados = Object.keys(opciones.tramos ?? {}).map((clave) => {
    const numero = Number(clave);
    if (!Number.isSafeInteger(numero) || numero < 1) {
      throw new Error(`Identificador de tramo no válido en opciones.tramos: ${clave}`);
    }
    return numero;
  });
  const numerosTramo = sinDuplicados([...analisis.tramos, ...numerosConfigurados]).sort(
    (a, b) => a - b,
  );
  const tramosPorNumero = new Map<number, string>();
  const tramos = numerosTramo.map((numero, indice) => {
    const configuracion = opciones.tramos?.[String(numero)];
    if (!configuracion) {
      throw new Error(
        `Faltan las horas del tramo ${numero}. Indíquelas mediante opciones.tramos["${numero}"].`,
      );
    }
    const inicio = normalizarHora(configuracion.inicio, `inicio del tramo ${numero}`);
    const fin = normalizarHora(configuracion.fin, `fin del tramo ${numero}`);
    if (inicio >= fin) {
      throw new Error(`La hora inicial debe ser anterior a la final en el tramo ${numero}`);
    }
    const id = idSecuencial("T", indice + 1, 2);
    tramosPorNumero.set(numero, id);
    return {
      id,
      tipo: configuracion.tipo?.trim() || undefined,
      referencia: configuracion.referencia?.trim() || `Tramo ${numero}`,
      definiciones: [{ inicio, fin }],
    };
  });

  return {
    dias,
    perfil: { id: "PH01", nombre: "Horario general", tramos },
    tramosPorNumero,
  };
}

function tipoActividad(codigo: string, opciones: OpcionesConversionHorw): string {
  return (
    valorDeMapa(opciones.tiposPorActividad, codigo)?.trim() ||
    opciones.tipoPredeterminado?.trim() ||
    "docencia"
  );
}

export function convertirCsvHorwAFushe(
  contenido: string | Buffer,
  opciones: OpcionesConversionHorw = {},
): DocumentoFushe {
  const analisis = analizarCsvHorw(contenido);
  const estructura = crearEstructura(analisis, opciones);
  const gruposOmitidos = new Set((opciones.gruposOmitidos ?? []).map((grupo) => grupo.trim()));
  const codigosGrupos = analisis.grupos.filter((grupo) => !gruposOmitidos.has(grupo));

  const profesores = crearCatalogo(analisis.profesores, opciones.nombresProfesores, "P");
  const grupos = crearCatalogo(codigosGrupos, opciones.nombresGrupos, "G");
  const espacios = crearCatalogo(analisis.espacios, opciones.nombresEspacios, "E");

  const actividades: ActividadFushe[] = analisis.actividades.map((codigo, indice) => ({
    id: idSecuencial("A", indice + 1),
    tipo: tipoActividad(codigo, opciones),
    referencia: codigo,
    nombre: valorDeMapa(opciones.nombresActividades, codigo)?.trim() || codigo,
  }));
  const actividadPorCodigo = new Map(
    analisis.actividades.map((codigo, indice) => [codigo, actividades[indice].id]),
  );

  const gruposSesion = new Map<string, FilaCsvHorw[]>();
  for (const fila of analisis.filas) {
    const firma = JSON.stringify([
      fila.profesor,
      fila.actividad,
      fila.espacio,
      fila.dia,
      fila.tramo,
    ]);
    const existentes = gruposSesion.get(firma);
    if (existentes) existentes.push(fila);
    else gruposSesion.set(firma, [fila]);
  }

  const sesiones: SesionFushe[] = [];
  for (const filas of gruposSesion.values()) {
    const primera = filas[0];
    const gruposDeSesion = sinDuplicados(
      filas
        .map((fila) => fila.grupo)
        .filter(
          (grupo): grupo is string => grupo !== undefined && !gruposOmitidos.has(grupo),
        ),
    ).map((grupo) => grupos.porCodigo.get(grupo)!);
    const idEspacio = primera.espacio ? espacios.porCodigo.get(primera.espacio) : undefined;
    const sesion: SesionFushe = {
      id: idSecuencial("S", sesiones.length + 1),
      dia: primera.dia,
      perfil: estructura.perfil.id,
      tramo: estructura.tramosPorNumero.get(primera.tramo)!,
      actividad: actividadPorCodigo.get(primera.actividad)!,
      profesores: [profesores.porCodigo.get(primera.profesor)!],
      grupos: gruposDeSesion.length ? gruposDeSesion : undefined,
      espacios: idEspacio ? [idEspacio] : undefined,
    };
    sesiones.push(sesion);
  }

  return {
    version: "1.0",
    metadatos: {
      titulo: opciones.titulo?.trim() || "Horario convertido desde HorW",
      generador: { nombre: "FUSHE", version: "0.1.0" },
      origen: {
        aplicacion: "HorW",
        archivo: opciones.nombreArchivo ? basename(opciones.nombreArchivo) : undefined,
      },
    },
    estructura: { dias: estructura.dias },
    perfiles: [estructura.perfil],
    profesores: profesores.entidades,
    grupos: grupos.entidades.length ? grupos.entidades : undefined,
    espacios: espacios.entidades.length ? espacios.entidades : undefined,
    actividades,
    sesiones,
  };
}

import { basename } from "node:path";
import { XMLParser } from "fast-xml-parser";
import {
  ActividadFushe,
  DiaSemana,
  DocumentoFushe,
  EntidadNombradaFushe,
  PerfilFushe,
  SesionFushe,
} from "../modelo";
import { comprobarXmlSeguro } from "../xml-seguro";

type NodoFet = Record<string, unknown>;

export interface DefinicionHoraFet {
  inicio: string;
  fin: string;
  tipo?: string;
}

export interface OpcionesConversionFet {
  nombreArchivo?: string;
  horas?: Readonly<Record<string, DefinicionHoraFet>>;
  tipoPredeterminado?: string;
  tiposPorMateria?: Readonly<Record<string, string>>;
  tiposPorEtiqueta?: Readonly<Record<string, string>>;
}

interface ActividadFet {
  id: string;
  grupo: string;
  materia: string;
  profesores: string[];
  estudiantes: string[];
  etiquetas: string[];
  duracion: number;
}

interface NombreFet {
  nombre: string;
  referencia?: string;
}

interface ColocacionFet {
  dia: string;
  hora: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
});

const TIPOS_FUSHE = new Set([
  "docencia",
  "guardia",
  "reunion",
  "tutoria",
  "coordinacion",
  "complementaria",
  "otra",
]);

function comoLista<T>(valor: T | T[] | undefined): T[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

function comoNodo(valor: unknown, ruta: string): NodoFet {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    throw new Error(`Se esperaba un elemento XML en ${ruta}`);
  }
  return valor as NodoFet;
}

function contenedor(
  raiz: NodoFet,
  nombre: string,
  ruta: string,
  obligatorio = true,
): NodoFet | undefined {
  const valor = raiz[nombre];
  if (valor === undefined || valor === "") {
    if (obligatorio) throw new Error(`Falta el elemento ${ruta}/${nombre}`);
    return undefined;
  }
  return comoNodo(valor, `${ruta}/${nombre}`);
}

function valorTexto(valor: unknown): string | undefined {
  if (typeof valor !== "string" && typeof valor !== "number") return undefined;
  const resultado = String(valor).trim();
  return resultado || undefined;
}

function textoRequerido(valor: unknown, ruta: string): string {
  const texto = valorTexto(valor);
  if (texto === undefined) throw new Error(`Falta un valor de texto en ${ruta}`);
  return texto;
}

function textos(valor: unknown): string[] {
  return comoLista(valor)
    .map(valorTexto)
    .filter((item): item is string => item !== undefined);
}

function booleano(valor: unknown, ruta: string, defecto: boolean): boolean {
  const texto = valorTexto(valor);
  if (texto === undefined) return defecto;
  if (texto.toLowerCase() === "true") return true;
  if (texto.toLowerCase() === "false") return false;
  throw new Error(`Valor booleano no válido en ${ruta}: ${texto}`);
}

function enteroPositivo(valor: unknown, ruta: string): number {
  const texto = textoRequerido(valor, ruta);
  const numero = Number(texto);
  if (!Number.isInteger(numero) || numero < 1) {
    throw new Error(`Se esperaba un entero positivo en ${ruta}: ${texto}`);
  }
  return numero;
}

function idSecuencial(prefijo: string, numero: number, ancho = 3): string {
  return `${prefijo}${String(numero).padStart(ancho, "0")}`;
}

function sinDuplicados(valores: string[]): string[] {
  return [...new Set(valores)];
}

function normalizarTipo(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function valorDeMapa(
  mapa: Readonly<Record<string, string>> | undefined,
  clave: string,
): string | undefined {
  return mapa && Object.prototype.hasOwnProperty.call(mapa, clave) ? mapa[clave] : undefined;
}

function restriccionCompleta(nodo: NodoFet, ruta: string): boolean {
  if (!booleano(nodo.Active, `${ruta}/Active`, true)) return false;
  const pesoTexto = valorTexto(nodo.Weight_Percentage) ?? "100";
  const peso = Number(pesoTexto);
  if (!Number.isFinite(peso)) {
    throw new Error(`Porcentaje no válido en ${ruta}/Weight_Percentage: ${pesoTexto}`);
  }
  return peso === 100;
}

function horaNormalizada(hora: string, minuto: string, segundo?: string): string {
  return `${hora.padStart(2, "0")}:${minuto}:${segundo ?? "00"}`;
}

function extraerIntervalo(texto: string | undefined): DefinicionHoraFet | undefined {
  if (!texto) return undefined;
  const coincidencia = texto.match(
    /(?:^|[^0-9])([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(?:-|–|—|a)\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?:$|[^0-9])/i,
  );
  if (!coincidencia) return undefined;
  return {
    inicio: horaNormalizada(coincidencia[1], coincidencia[2], coincidencia[3]),
    fin: horaNormalizada(coincidencia[4], coincidencia[5], coincidencia[6]),
  };
}

function registrarNombre(
  catalogo: Map<string, NombreFet>,
  clave: string,
  datos: NombreFet,
  ruta: string,
): void {
  const existente = catalogo.get(clave);
  if (existente &&
      (existente.nombre !== datos.nombre || existente.referencia !== datos.referencia)) {
    throw new Error(`El nombre ${clave} tiene definiciones incompatibles en ${ruta}`);
  }
  catalogo.set(clave, datos);
}

function leerCatalogoSimple(
  contenedorOrigen: NodoFet | undefined,
  nombreElemento: string,
  ruta: string,
  incluirCodigo = false,
): Map<string, NombreFet> {
  const resultado = new Map<string, NombreFet>();
  for (const [indice, item] of comoLista(contenedorOrigen?.[nombreElemento]).entries()) {
    const nodo = comoNodo(item, `${ruta}/${nombreElemento}[${indice + 1}]`);
    const clave = textoRequerido(nodo.Name, `${ruta}/${nombreElemento}[${indice + 1}]/Name`);
    registrarNombre(
      resultado,
      clave,
      {
        nombre: valorTexto(nodo.Long_Name) ?? clave,
        referencia: incluirCodigo ? valorTexto(nodo.Code) ?? clave : undefined,
      },
      `${ruta}/${nombreElemento}[${indice + 1}]`,
    );
  }
  return resultado;
}

function leerCatalogoEstudiantes(raiz: NodoFet): Map<string, NombreFet> {
  const resultado = new Map<string, NombreFet>();
  const estudiantes = contenedor(raiz, "Students_List", "/fet", false);

  const recorrer = (item: unknown, ruta: string): void => {
    const nodo = comoNodo(item, ruta);
    const clave = textoRequerido(nodo.Name, `${ruta}/Name`);
    registrarNombre(resultado, clave, { nombre: valorTexto(nodo.Long_Name) ?? clave }, ruta);
    for (const nombreHijo of ["Group", "Subgroup"]) {
      for (const [indice, hijo] of comoLista(nodo[nombreHijo]).entries()) {
        recorrer(hijo, `${ruta}/${nombreHijo}[${indice + 1}]`);
      }
    }
  };

  for (const [indice, item] of comoLista(estudiantes?.Year).entries()) {
    recorrer(item, `/fet/Students_List/Year[${indice + 1}]`);
  }
  return resultado;
}

function crearEntidades(
  claves: string[],
  definiciones: Map<string, NombreFet>,
  prefijo: string,
): { entidades: EntidadNombradaFushe[]; porClave: Map<string, string> } {
  const entidades: EntidadNombradaFushe[] = [];
  const porClave = new Map<string, string>();
  for (const clave of sinDuplicados(claves)) {
    const id = idSecuencial(prefijo, entidades.length + 1);
    entidades.push({ id, nombre: definiciones.get(clave)?.nombre ?? clave });
    porClave.set(clave, id);
  }
  return { entidades, porClave };
}

function leerActividades(raiz: NodoFet): {
  activas: ActividadFet[];
  idsTodas: Set<string>;
} {
  const actividadesNodo = contenedor(raiz, "Activities_List", "/fet")!;
  const activas: ActividadFet[] = [];
  const idsTodas = new Set<string>();

  for (const [indice, item] of comoLista(actividadesNodo.Activity).entries()) {
    const ruta = `/fet/Activities_List/Activity[${indice + 1}]`;
    const nodo = comoNodo(item, ruta);
    const id = textoRequerido(nodo.Id, `${ruta}/Id`);
    if (idsTodas.has(id)) throw new Error(`Identificador de actividad FET repetido: ${id}`);
    idsTodas.add(id);
    if (!booleano(nodo.Active, `${ruta}/Active`, true)) continue;

    const grupoOrigen = valorTexto(nodo.Activity_Group_Id) ?? "0";
    activas.push({
      id,
      grupo: grupoOrigen === "0" ? `actividad:${id}` : `grupo:${grupoOrigen}`,
      materia: textoRequerido(nodo.Subject, `${ruta}/Subject`),
      profesores: sinDuplicados(textos(nodo.Teacher)),
      estudiantes: sinDuplicados(textos(nodo.Students)),
      etiquetas: sinDuplicados(textos(nodo.Activity_Tag)),
      duracion: enteroPositivo(nodo.Duration, `${ruta}/Duration`),
    });
  }

  if (!activas.length) throw new Error("El archivo FET no contiene actividades activas");
  return { activas, idsTodas };
}

function firmaActividad(actividad: ActividadFet): string {
  return JSON.stringify({
    materia: actividad.materia,
    profesores: [...actividad.profesores].sort(),
    estudiantes: [...actividad.estudiantes].sort(),
    etiquetas: [...actividad.etiquetas].sort(),
  });
}

function tipoActividad(
  actividad: ActividadFet,
  opciones: OpcionesConversionFet,
): string {
  const porMateria = valorDeMapa(opciones.tiposPorMateria, actividad.materia);
  if (porMateria !== undefined) return normalizarTipo(porMateria) || "otra";

  const tiposEtiquetas = actividad.etiquetas
    .map((etiqueta) => valorDeMapa(opciones.tiposPorEtiqueta, etiqueta))
    .filter((tipo): tipo is string => tipo !== undefined)
    .map(normalizarTipo);
  const tiposConocidos = actividad.etiquetas
    .map(normalizarTipo)
    .filter((tipo) => TIPOS_FUSHE.has(tipo));
  const candidatos = sinDuplicados([...tiposEtiquetas, ...tiposConocidos].filter(Boolean));
  if (candidatos.length > 1) {
    throw new Error(
      `Las etiquetas de la actividad FET ${actividad.id} producen tipos incompatibles: ${candidatos.join(", ")}`,
    );
  }
  return candidatos[0] ?? (normalizarTipo(opciones.tipoPredeterminado ?? "docencia") || "otra");
}

function agregarValorUnico<T>(
  mapa: Map<string, T>,
  clave: string,
  valor: T,
  describir: (valor: T) => string,
  concepto: string,
): void {
  const existente = mapa.get(clave);
  if (existente !== undefined && describir(existente) !== describir(valor)) {
    throw new Error(
      `La actividad FET ${clave} tiene más de una ${concepto}: ${describir(existente)} y ${describir(valor)}`,
    );
  }
  mapa.set(clave, valor);
}

function leerColocaciones(
  raiz: NodoFet,
  idsActivas: Set<string>,
  idsTodas: Set<string>,
): Map<string, ColocacionFet> {
  const restricciones = contenedor(raiz, "Time_Constraints_List", "/fet")!;
  const resultado = new Map<string, ColocacionFet>();
  for (const [indice, item] of comoLista(
    restricciones.ConstraintActivityPreferredStartingTime,
  ).entries()) {
    const ruta = `/fet/Time_Constraints_List/ConstraintActivityPreferredStartingTime[${indice + 1}]`;
    const nodo = comoNodo(item, ruta);
    if (!restriccionCompleta(nodo, ruta)) continue;
    const id = textoRequerido(nodo.Activity_Id, `${ruta}/Activity_Id`);
    if (!idsTodas.has(id)) throw new Error(`La solución FET referencia la actividad inexistente ${id}`);
    if (!idsActivas.has(id)) continue;
    const colocacion = {
      dia: textoRequerido(nodo.Day, `${ruta}/Day`),
      hora: textoRequerido(nodo.Hour, `${ruta}/Hour`),
    };
    agregarValorUnico(resultado, id, colocacion, (v) => `${v.dia}/${v.hora}`, "colocación");
  }
  return resultado;
}

function leerEspaciosAsignados(
  raiz: NodoFet,
  idsActivas: Set<string>,
  idsTodas: Set<string>,
): Map<string, string> {
  const restricciones = contenedor(raiz, "Space_Constraints_List", "/fet", false);
  const resultado = new Map<string, string>();
  for (const [indice, item] of comoLista(
    restricciones?.ConstraintActivityPreferredRoom,
  ).entries()) {
    const ruta = `/fet/Space_Constraints_List/ConstraintActivityPreferredRoom[${indice + 1}]`;
    const nodo = comoNodo(item, ruta);
    if (!restriccionCompleta(nodo, ruta)) continue;
    const id = textoRequerido(nodo.Activity_Id, `${ruta}/Activity_Id`);
    if (!idsTodas.has(id)) throw new Error(`La asignación de aula referencia la actividad inexistente ${id}`);
    if (!idsActivas.has(id)) continue;
    const espacio = textoRequerido(nodo.Room, `${ruta}/Room`);
    agregarValorUnico(resultado, id, espacio, String, "asignación de aula");
  }
  return resultado;
}

function horasDeRecreo(raiz: NodoFet, dias: string[]): Set<string> {
  const restricciones = contenedor(raiz, "Time_Constraints_List", "/fet")!;
  const pares = new Set<string>();
  for (const [indice, item] of comoLista(restricciones.ConstraintBreakTimes).entries()) {
    const ruta = `/fet/Time_Constraints_List/ConstraintBreakTimes[${indice + 1}]`;
    const nodo = comoNodo(item, ruta);
    if (!restriccionCompleta(nodo, ruta)) continue;
    for (const [indicePausa, itemPausa] of comoLista(nodo.Break_Time).entries()) {
      const pausa = comoNodo(itemPausa, `${ruta}/Break_Time[${indicePausa + 1}]`);
      const dia = textoRequerido(pausa.Day, `${ruta}/Break_Time[${indicePausa + 1}]/Day`);
      const hora = textoRequerido(pausa.Hour, `${ruta}/Break_Time[${indicePausa + 1}]/Hour`);
      pares.add(`${dia}\u0000${hora}`);
    }
  }

  const resultado = new Set<string>();
  const horas = new Set([...pares].map((par) => par.split("\u0000")[1]));
  for (const hora of horas) {
    if (dias.every((dia) => pares.has(`${dia}\u0000${hora}`))) resultado.add(hora);
  }
  return resultado;
}

function crearEstructura(raiz: NodoFet, opciones: OpcionesConversionFet): {
  dias: DiaSemana[];
  nombresDias: string[];
  perfil: PerfilFushe;
  tramosPorHora: Map<string, string>;
  posicionesPorHora: Map<string, number>;
} {
  const diasNodo = contenedor(raiz, "Days_List", "/fet")!;
  const diasOrigen = comoLista(diasNodo.Day).map((item, indice) => {
    const nodo = comoNodo(item, `/fet/Days_List/Day[${indice + 1}]`);
    return textoRequerido(nodo.Name, `/fet/Days_List/Day[${indice + 1}]/Name`);
  });
  if (!diasOrigen.length || diasOrigen.length > 7) {
    throw new Error(`FUSHE admite entre 1 y 7 días; FET declara ${diasOrigen.length}`);
  }
  if (new Set(diasOrigen).size !== diasOrigen.length) {
    throw new Error("FET contiene nombres de día repetidos");
  }
  const numeroDeclarado = valorTexto(diasNodo.Number_of_Days);
  if (numeroDeclarado !== undefined && Number(numeroDeclarado) !== diasOrigen.length) {
    throw new Error("Number_of_Days no coincide con el número de días declarados en FET");
  }

  const horasNodo = contenedor(raiz, "Hours_List", "/fet")!;
  const horasOrigen = comoLista(horasNodo.Hour).map((item, indice) => {
    const ruta = `/fet/Hours_List/Hour[${indice + 1}]`;
    const nodo = comoNodo(item, ruta);
    return {
      nombre: textoRequerido(nodo.Name, `${ruta}/Name`),
      nombreLargo: valorTexto(nodo.Long_Name),
    };
  });
  if (!horasOrigen.length) throw new Error("FET no declara ningún tramo horario");
  if (new Set(horasOrigen.map((hora) => hora.nombre)).size !== horasOrigen.length) {
    throw new Error("FET contiene nombres de tramo repetidos");
  }
  const numeroHoras = valorTexto(horasNodo.Number_of_Hours);
  if (numeroHoras !== undefined && Number(numeroHoras) !== horasOrigen.length) {
    throw new Error("Number_of_Hours no coincide con el número de tramos declarados en FET");
  }

  const recreos = horasDeRecreo(raiz, diasOrigen);
  const tramosPorHora = new Map<string, string>();
  const posicionesPorHora = new Map<string, number>();
  const tramos = horasOrigen.map((hora, indice) => {
    const configurada = opciones.horas?.[hora.nombre];
    const intervalo = configurada ?? extraerIntervalo(hora.nombreLargo) ?? extraerIntervalo(hora.nombre);
    if (!intervalo) {
      throw new Error(
        `No se pudo deducir el intervalo del tramo FET "${hora.nombre}". ` +
          `Indíquelo mediante opciones.horas["${hora.nombre}"].`,
      );
    }
    const id = idSecuencial("T", indice + 1, 2);
    tramosPorHora.set(hora.nombre, id);
    posicionesPorHora.set(hora.nombre, indice);
    return {
      id,
      tipo: configurada?.tipo ?? (recreos.has(hora.nombre) ? "recreo" : undefined),
      referencia: hora.nombre,
      definiciones: [{ inicio: intervalo.inicio, fin: intervalo.fin }],
    };
  });

  return {
    dias: diasOrigen.map((_, indice) => indice + 1) as DiaSemana[],
    nombresDias: diasOrigen,
    perfil: { id: "PH01", nombre: "Horario general", tramos },
    tramosPorHora,
    posicionesPorHora,
  };
}

export function convertirFetAFushe(
  contenido: string | Buffer,
  opciones: OpcionesConversionFet = {},
): DocumentoFushe {
  const xml = Buffer.isBuffer(contenido) ? contenido.toString("utf8") : contenido;
  comprobarXmlSeguro(xml);
  const analizado = parser.parse(xml) as NodoFet;
  const raiz = comoNodo(analizado.fet, "/fet");

  const { activas, idsTodas } = leerActividades(raiz);
  const idsActivas = new Set(activas.map((actividad) => actividad.id));
  const colocaciones = leerColocaciones(raiz, idsActivas, idsTodas);
  const espaciosAsignados = leerEspaciosAsignados(raiz, idsActivas, idsTodas);
  const estructura = crearEstructura(raiz, opciones);

  for (const actividad of activas) {
    if (!colocaciones.has(actividad.id)) {
      throw new Error(
        `La actividad FET ${actividad.id} no tiene una colocación final. ` +
          "Use el archivo *_data_and_timetable.fet generado junto al horario.",
      );
    }
  }

  const profesoresUsados = activas.flatMap((actividad) => actividad.profesores);
  const estudiantesUsados = activas.flatMap((actividad) => actividad.estudiantes);
  const espaciosUsados = activas
    .map((actividad) => espaciosAsignados.get(actividad.id))
    .filter((espacio): espacio is string => espacio !== undefined);

  const profesoresOrigen = leerCatalogoSimple(
    contenedor(raiz, "Teachers_List", "/fet", false),
    "Teacher",
    "/fet/Teachers_List",
  );
  const materiasOrigen = leerCatalogoSimple(
    contenedor(raiz, "Subjects_List", "/fet", false),
    "Subject",
    "/fet/Subjects_List",
    true,
  );
  const espaciosOrigen = leerCatalogoSimple(
    contenedor(raiz, "Rooms_List", "/fet", false),
    "Room",
    "/fet/Rooms_List",
  );
  const estudiantesOrigen = leerCatalogoEstudiantes(raiz);

  const profesores = crearEntidades(profesoresUsados, profesoresOrigen, "P");
  const grupos = crearEntidades(estudiantesUsados, estudiantesOrigen, "G");
  const espacios = crearEntidades(espaciosUsados, espaciosOrigen, "E");

  const actividades: ActividadFushe[] = [];
  const actividadPorGrupo = new Map<string, ActividadFushe>();
  const firmaPorGrupo = new Map<string, string>();
  for (const actividadOrigen of activas) {
    const firma = firmaActividad(actividadOrigen);
    const firmaExistente = firmaPorGrupo.get(actividadOrigen.grupo);
    if (firmaExistente !== undefined && firmaExistente !== firma) {
      throw new Error(
        `El grupo de actividad FET ${actividadOrigen.grupo.replace(/^[^:]+:/, "")} ` +
          "contiene participantes, materia o etiquetas incompatibles",
      );
    }
    if (actividadPorGrupo.has(actividadOrigen.grupo)) continue;

    const materia = materiasOrigen.get(actividadOrigen.materia) ?? {
      nombre: actividadOrigen.materia,
      referencia: actividadOrigen.materia,
    };
    const actividad: ActividadFushe = {
      id: idSecuencial("A", actividades.length + 1),
      tipo: tipoActividad(actividadOrigen, opciones),
      referencia: materia.referencia ?? actividadOrigen.materia,
      nombre: materia.nombre,
      profesores: actividadOrigen.profesores.length
        ? actividadOrigen.profesores.map((clave) => profesores.porClave.get(clave)!)
        : undefined,
      grupos: actividadOrigen.estudiantes.length
        ? actividadOrigen.estudiantes.map((clave) => grupos.porClave.get(clave)!)
        : undefined,
    };
    actividades.push(actividad);
    actividadPorGrupo.set(actividadOrigen.grupo, actividad);
    firmaPorGrupo.set(actividadOrigen.grupo, firma);
  }

  const diasPorNombre = new Map(
    estructura.nombresDias.map((nombre, indice) => [nombre, (indice + 1) as DiaSemana]),
  );
  const sesiones: SesionFushe[] = [];
  for (const actividadOrigen of activas) {
    const colocacion = colocaciones.get(actividadOrigen.id)!;
    const dia = diasPorNombre.get(colocacion.dia);
    if (!dia) throw new Error(`La actividad FET ${actividadOrigen.id} usa el día desconocido ${colocacion.dia}`);
    const posicionInicial = estructura.posicionesPorHora.get(colocacion.hora);
    if (posicionInicial === undefined) {
      throw new Error(`La actividad FET ${actividadOrigen.id} usa el tramo desconocido ${colocacion.hora}`);
    }
    if (posicionInicial + actividadOrigen.duracion > estructura.perfil.tramos.length) {
      throw new Error(`La duración de la actividad FET ${actividadOrigen.id} excede los tramos disponibles`);
    }

    const idEspacioOrigen = espaciosAsignados.get(actividadOrigen.id);
    const idEspacio = idEspacioOrigen ? espacios.porClave.get(idEspacioOrigen) : undefined;
    for (let desplazamiento = 0; desplazamiento < actividadOrigen.duracion; desplazamiento += 1) {
      const tramo = estructura.perfil.tramos[posicionInicial + desplazamiento];
      const sesion: SesionFushe = {
        id: idSecuencial("S", sesiones.length + 1),
        dia,
        perfil: estructura.perfil.id,
        tramo: tramo.id,
        actividad: actividadPorGrupo.get(actividadOrigen.grupo)!.id,
        espacios: idEspacio ? [idEspacio] : undefined,
      };
      sesiones.push(sesion);
    }
  }

  const institucion = valorTexto(raiz.Institution_Name);
  return {
    version: "1.0",
    metadatos: {
      titulo: institucion ? `Horario de ${institucion}` : "Horario convertido desde FET",
      generador: { nombre: "FUSHE", version: "0.1.0" },
      origen: {
        aplicacion: "FET",
        version: valorTexto(raiz["@_version"]),
        archivo: opciones.nombreArchivo ? basename(opciones.nombreArchivo) : undefined,
      },
    },
    estructura: { dias: estructura.dias },
    perfiles: [estructura.perfil],
    profesores: profesores.entidades.length ? profesores.entidades : undefined,
    grupos: grupos.entidades.length ? grupos.entidades : undefined,
    espacios: espacios.entidades.length ? espacios.entidades : undefined,
    actividades,
    sesiones,
  };
}

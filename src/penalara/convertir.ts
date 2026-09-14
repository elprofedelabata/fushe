import { basename } from "node:path";
import {
  ActividadFushe,
  DiaSemana,
  DocumentoFushe,
  EntidadNombradaFushe,
  PerfilFushe,
  SesionFushe,
  TramoFushe,
} from "../modelo";
import {
  atributoRequerido,
  comoLista,
  comoNodo,
  leerXrho,
  NodoPenalara,
  textoRequerido,
  valorTexto,
} from "./xrho";

interface OpcionesConversionPenalara {
  nombreArchivo?: string;
}

interface CatalogoMutable {
  entidades: EntidadNombradaFushe[];
  porNombre: Map<string, string>;
  prefijo: string;
}

interface ContextoConversion {
  profesores: CatalogoMutable;
  grupos: CatalogoMutable;
  espacios: CatalogoMutable;
  perfilesPorMarco: Map<string, string>;
  tramosPorPosicion: Map<string, string>;
  actividades: ActividadFushe[];
  lectivasPorId: Map<string, ActividadFushe>;
  reunionesPorClave: Map<string, ActividadFushe>;
  guardiasPorClave: Map<string, ActividadFushe>;
  complementariasPorClave: Map<string, ActividadFushe>;
}

function idSecuencial(prefijo: string, numero: number, ancho = 3): string {
  return `${prefijo}${String(numero).padStart(ancho, "0")}`;
}

function contenedor(raiz: NodoPenalara, nombre: string): NodoPenalara | undefined {
  const valor = raiz[nombre];
  if (valor === undefined || valor === "") return undefined;
  return comoNodo(valor, `/datosGHC/${nombre}`);
}

function clavePosicion(marco: string, indice: number, dia: number): string {
  return `${marco}\u0000${indice}\u0000${dia}`;
}

function claveDefinicion(marco: string, nombre: string): string {
  return `${marco}\u0000${nombre}`;
}

function normalizarTipo(valor: string | undefined, alternativo: string): string {
  const texto = (valor ?? alternativo)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return texto || alternativo;
}

function agregarEntidad(catalogo: CatalogoMutable, clave: string, nombre: string): string {
  const existente = catalogo.porNombre.get(clave);
  if (existente) return existente;
  const id = idSecuencial(catalogo.prefijo, catalogo.entidades.length + 1);
  catalogo.entidades.push({ id, nombre });
  catalogo.porNombre.set(clave, id);
  return id;
}

function agregarSinDuplicados(valores: (string | undefined)[]): string[] | undefined {
  const resultado = [...new Set(valores.filter((valor): valor is string => Boolean(valor)))];
  return resultado.length ? resultado : undefined;
}

function obtenerDias(raiz: NodoPenalara): DiaSemana[] {
  const dias = new Set<number>();
  const marcos = contenedor(raiz, "marcosDeHorario");
  for (const item of comoLista(marcos?.marcoHorario)) {
    const marco = comoNodo(item, "/datosGHC/marcosDeHorario/marcoHorario");
    for (const itemTramo of comoLista(marco.tramo)) {
      const tramo = comoNodo(itemTramo, "marcoHorario/tramo");
      const dia = Number(textoRequerido(tramo.dia, "marcoHorario/tramo/dia")) + 1;
      dias.add(dia);
    }
  }
  const horario = contenedor(raiz, "horario");
  for (const item of comoLista(horario?.tramo)) {
    const tramo = comoNodo(item, "/datosGHC/horario/tramo");
    dias.add(Number(atributoRequerido(tramo, "dia", "horario/tramo")) + 1);
  }
  return [...dias].sort((a, b) => a - b) as DiaSemana[];
}

function crearCatalogosBasicos(raiz: NodoPenalara): {
  profesores: CatalogoMutable;
  grupos: CatalogoMutable;
} {
  const profesores: CatalogoMutable = { entidades: [], porNombre: new Map(), prefijo: "P" };
  const grupos: CatalogoMutable = { entidades: [], porNombre: new Map(), prefijo: "G" };

  const profesoresOrigen = contenedor(raiz, "profesores");
  for (const item of comoLista(profesoresOrigen?.profesor)) {
    const profesor = comoNodo(item, "/datosGHC/profesores/profesor");
    const nombreCorto = textoRequerido(profesor.nombre, "profesor/nombre");
    const nombreVisible = valorTexto(profesor.nombreCompleto) ?? nombreCorto;
    agregarEntidad(profesores, nombreCorto, nombreVisible);
  }

  const gruposOrigen = contenedor(raiz, "grupos");
  for (const item of comoLista(gruposOrigen?.grupo)) {
    const grupo = comoNodo(item, "/datosGHC/grupos/grupo");
    const nombre = textoRequerido(grupo.nombre, "grupo/nombre");
    agregarEntidad(grupos, nombre, nombre);
  }

  return { profesores, grupos };
}

function crearEspacios(raiz: NodoPenalara): CatalogoMutable {
  const espacios: CatalogoMutable = { entidades: [], porNombre: new Map(), prefijo: "E" };
  const usados: string[] = [];
  const horario = contenedor(raiz, "horario");
  for (const itemTramo of comoLista(horario?.tramo)) {
    const tramo = comoNodo(itemTramo, "/datosGHC/horario/tramo");
    for (const itemAula of comoLista(tramo.aula)) {
      const aula = comoNodo(itemAula, "horario/tramo/aula");
      const nombre = atributoRequerido(aula, "id", "horario/tramo/aula");
      if (!usados.includes(nombre)) usados.push(nombre);
    }
  }

  const declarados: string[] = [];
  const aulas = contenedor(raiz, "aulas");
  for (const item of comoLista(aulas?.aula)) {
    const aula = comoNodo(item, "/datosGHC/aulas/aula");
    const nombre = textoRequerido(aula.nombre, "aula/nombre");
    declarados.push(nombre);
    if (usados.includes(nombre)) agregarEntidad(espacios, nombre, nombre);
  }
  for (const nombre of usados) {
    if (!declarados.includes(nombre)) agregarEntidad(espacios, nombre, nombre);
  }
  return espacios;
}

function crearPerfiles(
  raiz: NodoPenalara,
  diasEstructura: DiaSemana[],
): {
  perfiles: PerfilFushe[];
  perfilesPorMarco: Map<string, string>;
  tramosPorPosicion: Map<string, string>;
} {
  const perfiles: PerfilFushe[] = [];
  const perfilesPorMarco = new Map<string, string>();
  const tramosPorPosicion = new Map<string, string>();
  const marcos = contenedor(raiz, "marcosDeHorario");

  for (const [indiceMarco, item] of comoLista(marcos?.marcoHorario).entries()) {
    const marco = comoNodo(item, "/datosGHC/marcosDeHorario/marcoHorario");
    const claveMarco = atributoRequerido(marco, "id", "marcoHorario");
    const idPerfil = idSecuencial("PH", indiceMarco + 1, 2);
    perfilesPorMarco.set(claveMarco, idPerfil);

    const porIndice = new Map<number, NodoPenalara[]>();
    for (const itemTramo of comoLista(marco.tramo)) {
      const tramo = comoNodo(itemTramo, "marcoHorario/tramo");
      const indice = Number(textoRequerido(tramo.indice, "marcoHorario/tramo/indice"));
      const existentes = porIndice.get(indice) ?? [];
      existentes.push(tramo);
      porIndice.set(indice, existentes);
    }

    const tramos: TramoFushe[] = [];
    for (const [indiceOrigen, tramosOrigen] of [...porIndice.entries()].sort(([a], [b]) => a - b)) {
      const porSemantica = new Map<string, NodoPenalara[]>();
      for (const tramo of tramosOrigen) {
        const tipo = valorTexto(tramo.Tipo) ?? "otro";
        const referencia = valorTexto(tramo.clavX) ?? String(indiceOrigen + 1);
        const clave = `${tipo}\u0000${referencia}`;
        const existentes = porSemantica.get(clave) ?? [];
        existentes.push(tramo);
        porSemantica.set(clave, existentes);
      }

      for (const tramosSemanticos of porSemantica.values()) {
        const primero = tramosSemanticos[0];
        const tipo = normalizarTipo(valorTexto(primero.Tipo), "otro");
        const referencia = valorTexto(primero.clavX) ?? String(indiceOrigen + 1);
        const idTramo = idSecuencial("T", tramos.length + 1, 2);
        const porHoras = new Map<string, { inicio: string; fin: string; dias: DiaSemana[] }>();

        for (const tramo of tramosSemanticos) {
          const inicio = textoRequerido(tramo.horaEntrada, "tramo/horaEntrada");
          const fin = textoRequerido(tramo.horaSalida, "tramo/horaSalida");
          const diaOrigen = Number(textoRequerido(tramo.dia, "tramo/dia"));
          const dia = (diaOrigen + 1) as DiaSemana;
          const claveHoras = `${inicio}\u0000${fin}`;
          const grupo = porHoras.get(claveHoras) ?? { inicio, fin, dias: [] };
          grupo.dias.push(dia);
          porHoras.set(claveHoras, grupo);
          tramosPorPosicion.set(clavePosicion(claveMarco, indiceOrigen, diaOrigen), idTramo);
        }

        const gruposHoras = [...porHoras.values()];
        const cubreTodosLosDias =
          gruposHoras.length === 1 &&
          gruposHoras[0].dias.length === diasEstructura.length &&
          gruposHoras[0].dias.every((dia) => diasEstructura.includes(dia));

        tramos.push({
          id: idTramo,
          tipo,
          referencia,
          definiciones: gruposHoras.map((grupo) => ({
            dias: cubreTodosLosDias ? undefined : grupo.dias.sort((a, b) => a - b),
            inicio: grupo.inicio,
            fin: grupo.fin,
          })),
        });
      }
    }

    perfiles.push({
      id: idPerfil,
      nombre: valorTexto(marco["@_nombre"]) ?? `Perfil ${indiceMarco + 1}`,
      tramos,
    });
  }

  return { perfiles, perfilesPorMarco, tramosPorPosicion };
}

function crearActividades(
  raiz: NodoPenalara,
  profesores: CatalogoMutable,
  grupos: CatalogoMutable,
): Pick<
  ContextoConversion,
  | "actividades"
  | "lectivasPorId"
  | "reunionesPorClave"
  | "guardiasPorClave"
  | "complementariasPorClave"
> {
  const actividades: ActividadFushe[] = [];
  const lectivasPorId = new Map<string, ActividadFushe>();
  const reunionesPorClave = new Map<string, ActividadFushe>();
  const guardiasPorClave = new Map<string, ActividadFushe>();
  const complementariasPorClave = new Map<string, ActividadFushe>();

  const materiasPorNombre = new Map<string, { referencia: string; nombre: string }>();
  const materias = contenedor(raiz, "materias");
  for (const item of comoLista(materias?.materia)) {
    const materia = comoNodo(item, "/datosGHC/materias/materia");
    const clave = textoRequerido(materia.nombre, "materia/nombre");
    materiasPorNombre.set(clave, {
      referencia: valorTexto(materia.abreviatura) ?? clave,
      nombre: valorTexto(materia.nombreCompleto) ?? clave,
    });
  }

  const tareasPorNombre = new Map<string, string>();
  const tareas = contenedor(raiz, "tareas");
  for (const item of comoLista(tareas?.tarea)) {
    const tarea = comoNodo(item, "/datosGHC/tareas/tarea");
    const clave = textoRequerido(tarea.nombre, "tarea/nombre");
    tareasPorNombre.set(clave, valorTexto(tarea.nombreCompleto) ?? clave);
  }

  const nuevaActividad = (datos: Omit<ActividadFushe, "id">): ActividadFushe => {
    const actividad = { id: idSecuencial("A", actividades.length + 1), ...datos };
    actividades.push(actividad);
    return actividad;
  };

  const sesionesLectivas = contenedor(raiz, "sesionesLectivas");
  for (const item of comoLista(sesionesLectivas?.sesion)) {
    const sesion = comoNodo(item, "/datosGHC/sesionesLectivas/sesion");
    const idOrigen = atributoRequerido(sesion, "id", "sesionesLectivas/sesion");
    const materiaOrigen = textoRequerido(sesion.materia, "sesion/materia");
    const materia = materiasPorNombre.get(materiaOrigen) ?? {
      referencia: materiaOrigen,
      nombre: materiaOrigen,
    };
    const profesorOrigen = valorTexto(sesion.profesor);
    const profesor = profesorOrigen
      ? agregarEntidad(profesores, profesorOrigen, profesorOrigen)
      : undefined;
    const gruposOrigen = [valorTexto(sesion.grupo)];
    if (sesion.otrosGrupos !== undefined && sesion.otrosGrupos !== "") {
      const otros = comoNodo(sesion.otrosGrupos, "sesion/otrosGrupos");
      for (const otro of comoLista(otros.grupo)) gruposOrigen.push(valorTexto(otro));
    }
    const idsGrupos = agregarSinDuplicados(
      gruposOrigen.map((nombre) =>
        nombre ? agregarEntidad(grupos, nombre, nombre) : undefined,
      ),
    );

    const actividad = nuevaActividad({
      tipo: "docencia",
      referencia: materia.referencia,
      nombre: materia.nombre,
      profesores: profesor ? [profesor] : undefined,
      grupos: idsGrupos,
    });
    lectivasPorId.set(idOrigen, actividad);
  }

  const reuniones = contenedor(raiz, "reuniones");
  for (const item of comoLista(reuniones?.reunion)) {
    const reunion = comoNodo(item, "/datosGHC/reuniones/reunion");
    const marco = atributoRequerido(reunion, "subMarco", "reunion");
    const nombre = textoRequerido(reunion.nombre, "reunion/nombre");
    const integrantes: string[] = [];
    if (reunion.integrantes !== undefined && reunion.integrantes !== "") {
      const contenedorIntegrantes = comoNodo(reunion.integrantes, "reunion/integrantes");
      for (const itemIntegrante of comoLista(contenedorIntegrantes.integrante)) {
        const nombreProfesor = textoRequerido(itemIntegrante, "reunion/integrantes/integrante");
        integrantes.push(agregarEntidad(profesores, nombreProfesor, nombreProfesor));
      }
    }
    const actividad = nuevaActividad({
      tipo: "reunion",
      referencia: valorTexto(reunion.tipoDeTarea),
      nombre,
      profesores: agregarSinDuplicados(integrantes),
    });
    reunionesPorClave.set(claveDefinicion(marco, nombre), actividad);
  }

  const guardias = contenedor(raiz, "guardias");
  for (const item of comoLista(guardias?.guardia)) {
    const guardia = comoNodo(item, "/datosGHC/guardias/guardia");
    const marco = atributoRequerido(guardia, "subMarco", "guardia");
    const nombre = textoRequerido(guardia.nombre, "guardia/nombre");
    const actividad = nuevaActividad({
      tipo: "guardia",
      referencia: valorTexto(guardia.tipoDeTarea),
      nombre,
    });
    guardiasPorClave.set(claveDefinicion(marco, nombre), actividad);
  }

  const complementarias = contenedor(raiz, "complementarias");
  for (const item of comoLista(complementarias?.complementaria)) {
    const complementaria = comoNodo(item, "/datosGHC/complementarias/complementaria");
    const marco = atributoRequerido(complementaria, "subMarco", "complementaria");
    const identificador = textoRequerido(complementaria.identificador, "complementaria/identificador");
    const tarea = textoRequerido(complementaria.tarea, "complementaria/tarea");
    const profesorOrigen = valorTexto(complementaria.profesor);
    const profesor = profesorOrigen
      ? agregarEntidad(profesores, profesorOrigen, profesorOrigen)
      : undefined;
    const actividad = nuevaActividad({
      tipo: "complementaria",
      referencia: tarea,
      nombre: tareasPorNombre.get(tarea) ?? tarea,
      profesores: profesor ? [profesor] : undefined,
    });
    complementariasPorClave.set(claveDefinicion(marco, identificador), actividad);
  }

  return {
    actividades,
    lectivasPorId,
    reunionesPorClave,
    guardiasPorClave,
    complementariasPorClave,
  };
}

function buscarActividad<T>(mapa: Map<string, T>, clave: string, descripcion: string): T {
  const valor = mapa.get(clave);
  if (!valor) throw new Error(`No se encontró la actividad de ${descripcion}`);
  return valor;
}

function crearSesiones(raiz: NodoPenalara, contexto: ContextoConversion): SesionFushe[] {
  const sesiones: SesionFushe[] = [];
  const horario = contenedor(raiz, "horario");

  const nuevaSesion = (
    base: Omit<SesionFushe, "id" | "dia" | "perfil" | "tramo">,
    marco: string,
    indice: number,
    diaOrigen: number,
  ): void => {
    const perfil = contexto.perfilesPorMarco.get(marco);
    if (!perfil) throw new Error(`No existe el marco ${marco} usado por el horario`);
    const tramo = contexto.tramosPorPosicion.get(clavePosicion(marco, indice, diaOrigen));
    if (!tramo) throw new Error(`No existe el tramo ${marco}/${diaOrigen}/${indice} usado por el horario`);
    sesiones.push({
      id: idSecuencial("S", sesiones.length + 1),
      dia: (diaOrigen + 1) as DiaSemana,
      perfil,
      tramo,
      ...base,
    });
  };

  for (const itemTramo of comoLista(horario?.tramo)) {
    const tramoHorario = comoNodo(itemTramo, "/datosGHC/horario/tramo");
    const tiposConocidos = new Set(["aula", "reunion", "guardia", "complementaria", "#text"]);
    const tipoDesconocido = Object.keys(tramoHorario).find(
      (clave) => !clave.startsWith("@_") && !tiposConocidos.has(clave),
    );
    if (tipoDesconocido) {
      throw new Error(`Tipo de colocación no soportado en horario/tramo: ${tipoDesconocido}`);
    }
    const marco = atributoRequerido(tramoHorario, "marco", "horario/tramo");
    const diaOrigen = Number(atributoRequerido(tramoHorario, "dia", "horario/tramo"));
    const indice = Number(atributoRequerido(tramoHorario, "indice", "horario/tramo"));

    for (const itemAula of comoLista(tramoHorario.aula)) {
      const aula = comoNodo(itemAula, "horario/tramo/aula");
      const idLectiva = textoRequerido(aula.sesion, "horario/tramo/aula/sesion");
      const actividad = buscarActividad(contexto.lectivasPorId, idLectiva, `sesión lectiva ${idLectiva}`);
      const nombreProfesor = valorTexto(aula.profesor);
      const idProfesor = nombreProfesor
        ? agregarEntidad(contexto.profesores, nombreProfesor, nombreProfesor)
        : undefined;
      const nombreEspacio = atributoRequerido(aula, "id", "horario/tramo/aula");
      const idEspacio = agregarEntidad(contexto.espacios, nombreEspacio, nombreEspacio);
      const coincideProfesor =
        idProfesor !== undefined &&
        actividad.profesores?.length === 1 &&
        actividad.profesores[0] === idProfesor;
      nuevaSesion(
        {
          actividad: actividad.id,
          profesores: idProfesor && !coincideProfesor ? [idProfesor] : undefined,
          espacios: [idEspacio],
        },
        marco,
        indice,
        diaOrigen,
      );
    }

    for (const itemReunion of comoLista(tramoHorario.reunion)) {
      const nombre = textoRequerido(itemReunion, "horario/tramo/reunion");
      const actividad = buscarActividad(
        contexto.reunionesPorClave,
        claveDefinicion(marco, nombre),
        `reunión ${nombre} del marco ${marco}`,
      );
      nuevaSesion({ actividad: actividad.id }, marco, indice, diaOrigen);
    }

    for (const itemGuardia of comoLista(tramoHorario.guardia)) {
      const guardia = comoNodo(itemGuardia, "horario/tramo/guardia");
      const nombre = textoRequerido(guardia.nombre, "horario/tramo/guardia/nombre");
      const actividad = buscarActividad(
        contexto.guardiasPorClave,
        claveDefinicion(marco, nombre),
        `guardia ${nombre} del marco ${marco}`,
      );
      const profesorOrigen = textoRequerido(guardia.profesor, "horario/tramo/guardia/profesor");
      const profesor = agregarEntidad(contexto.profesores, profesorOrigen, profesorOrigen);
      nuevaSesion(
        { actividad: actividad.id, profesores: [profesor] },
        marco,
        indice,
        diaOrigen,
      );
    }

    for (const itemComplementaria of comoLista(tramoHorario.complementaria)) {
      const identificador = textoRequerido(itemComplementaria, "horario/tramo/complementaria");
      const actividad = buscarActividad(
        contexto.complementariasPorClave,
        claveDefinicion(marco, identificador),
        `complementaria ${identificador} del marco ${marco}`,
      );
      nuevaSesion({ actividad: actividad.id }, marco, indice, diaOrigen);
    }
  }

  return sesiones;
}

export function convertirXrhoAFushe(
  contenido: Buffer,
  opciones: OpcionesConversionPenalara = {},
): DocumentoFushe {
  const xrho = leerXrho(contenido);
  const raiz = xrho.raiz;
  const dias = obtenerDias(raiz);
  const catalogos = crearCatalogosBasicos(raiz);
  const espacios = crearEspacios(raiz);
  const perfiles = crearPerfiles(raiz, dias);
  const actividades = crearActividades(raiz, catalogos.profesores, catalogos.grupos);
  const contexto: ContextoConversion = {
    profesores: catalogos.profesores,
    grupos: catalogos.grupos,
    espacios,
    perfilesPorMarco: perfiles.perfilesPorMarco,
    tramosPorPosicion: perfiles.tramosPorPosicion,
    ...actividades,
  };
  const sesiones = crearSesiones(raiz, contexto);

  return {
    version: "1.0",
    metadatos: {
      titulo: "Horario convertido desde Peñalara",
      generador: { nombre: "FUSHE", version: "0.1.0" },
      origen: {
        aplicacion: "Peñalara GHC",
        version: xrho.version,
        archivo: opciones.nombreArchivo ? basename(opciones.nombreArchivo) : undefined,
      },
    },
    estructura: { dias },
    perfiles: perfiles.perfiles,
    profesores: contexto.profesores.entidades,
    grupos: contexto.grupos.entidades,
    espacios: contexto.espacios.entidades,
    actividades: contexto.actividades,
    sesiones,
  };
}

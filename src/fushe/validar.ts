import {
  DiaSemana,
  DocumentoFushe,
  EntidadNombradaFushe,
  ProblemaValidacion,
} from "../modelo";

const PATRON_ID = /^[A-Za-z][A-Za-z0-9._-]*$/;
const PATRON_HORA = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

function problema(
  problemas: ProblemaValidacion[],
  codigo: string,
  ruta: string,
  mensaje: string,
): void {
  problemas.push({ severidad: "error", codigo, ruta, mensaje });
}

function validarIds(
  problemas: ProblemaValidacion[],
  entidades: { id: string }[],
  ruta: string,
): Set<string> {
  const ids = new Set<string>();
  entidades.forEach((entidad, indice) => {
    const rutaEntidad = `${ruta}[${indice + 1}]`;
    if (!PATRON_ID.test(entidad.id)) {
      problema(problemas, "ID_INVALIDO", `${rutaEntidad}/@id`, `Identificador no válido: ${entidad.id}`);
    }
    if (ids.has(entidad.id)) {
      problema(problemas, "ID_DUPLICADO", `${rutaEntidad}/@id`, `Identificador repetido: ${entidad.id}`);
    }
    ids.add(entidad.id);
  });
  return ids;
}

function validarEntidadesNombradas(
  problemas: ProblemaValidacion[],
  entidades: EntidadNombradaFushe[] | undefined,
  ruta: string,
): Set<string> {
  const lista = entidades ?? [];
  lista.forEach((entidad, indice) => {
    if (!entidad.nombre.trim()) {
      problema(problemas, "NOMBRE_VACIO", `${ruta}[${indice + 1}]/nombre`, "El nombre no puede estar vacío");
    }
  });
  return validarIds(problemas, lista, ruta);
}

function validarReferencias(
  problemas: ProblemaValidacion[],
  referencias: string[] | undefined,
  existentes: Set<string>,
  ruta: string,
): void {
  const vistas = new Set<string>();
  (referencias ?? []).forEach((referencia, indice) => {
    if (!existentes.has(referencia)) {
      problema(problemas, "REFERENCIA_INEXISTENTE", `${ruta}[${indice + 1}]/@ref`, `No existe ${referencia}`);
    }
    if (vistas.has(referencia)) {
      problema(problemas, "REFERENCIA_DUPLICADA", `${ruta}[${indice + 1}]/@ref`, `Referencia repetida: ${referencia}`);
    }
    vistas.add(referencia);
  });
}

function diasDeDefinicion(dias: DiaSemana[] | undefined, diasEstructura: DiaSemana[]): DiaSemana[] {
  return dias ?? diasEstructura;
}

export function validarFushe(documento: DocumentoFushe): ProblemaValidacion[] {
  const problemas: ProblemaValidacion[] = [];

  if (documento.version !== "1.0") {
    problema(problemas, "VERSION_DESCONOCIDA", "/fushe/@version", `Versión no reconocida: ${documento.version}`);
  }

  const dias = new Set<number>();
  if (!documento.estructura.dias.length) {
    problema(problemas, "SIN_DIAS", "/fushe/estructura/dias", "Debe declararse al menos un día");
  }
  documento.estructura.dias.forEach((dia, indice) => {
    if (!Number.isInteger(dia) || dia < 1 || dia > 7) {
      problema(problemas, "DIA_INVALIDO", `/fushe/estructura/dias/dia[${indice + 1}]`, `Día no válido: ${dia}`);
    }
    if (dias.has(dia)) {
      problema(problemas, "DIA_DUPLICADO", `/fushe/estructura/dias/dia[${indice + 1}]`, `Día repetido: ${dia}`);
    }
    dias.add(dia);
  });

  if (!documento.perfiles.length) {
    problema(problemas, "SIN_PERFILES", "/fushe/perfiles", "Debe declararse al menos un perfil");
  }
  const perfiles = validarIds(problemas, documento.perfiles, "/fushe/perfiles/perfil");
  const tramosPorPerfil = new Map<string, Map<string, Set<number>>>();

  documento.perfiles.forEach((perfil, indicePerfil) => {
    const rutaPerfil = `/fushe/perfiles/perfil[${indicePerfil + 1}]`;
    if (!perfil.nombre.trim()) problema(problemas, "NOMBRE_VACIO", `${rutaPerfil}/nombre`, "El nombre no puede estar vacío");
    if (!perfil.tramos.length) problema(problemas, "SIN_TRAMOS", `${rutaPerfil}/tramos`, "El perfil necesita al menos un tramo");
    validarIds(problemas, perfil.tramos, `${rutaPerfil}/tramos/tramo`);
    const diasPorTramo = new Map<string, Set<number>>();

    perfil.tramos.forEach((tramo, indiceTramo) => {
      const rutaTramo = `${rutaPerfil}/tramos/tramo[${indiceTramo + 1}]`;
      if (!tramo.referencia.trim()) problema(problemas, "REFERENCIA_VACIA", `${rutaTramo}/referencia`, "La referencia no puede estar vacía");
      if (!tramo.definiciones.length) problema(problemas, "SIN_DEFINICIONES", rutaTramo, "El tramo necesita al menos una definición");

      const diasDefinidos = new Set<number>();
      tramo.definiciones.forEach((definicion, indiceDefinicion) => {
        const rutaDefinicion = `${rutaTramo}/definicion[${indiceDefinicion + 1}]`;
        if (tramo.definiciones.length > 1 && definicion.dias === undefined) {
          problema(problemas, "DIAS_AMBIGUOS", rutaDefinicion, "Una definición sin días debe ser la única del tramo");
        }
        for (const dia of diasDeDefinicion(definicion.dias, documento.estructura.dias)) {
          if (!dias.has(dia)) problema(problemas, "DIA_NO_DECLARADO", `${rutaDefinicion}/@dias`, `El día ${dia} no está en estructura`);
          if (diasDefinidos.has(dia)) problema(problemas, "DIA_SOLAPADO", `${rutaDefinicion}/@dias`, `El día ${dia} aparece en más de una definición`);
          diasDefinidos.add(dia);
        }
        if (!PATRON_HORA.test(definicion.inicio)) problema(problemas, "HORA_INVALIDA", `${rutaDefinicion}/inicio`, `Hora no válida: ${definicion.inicio}`);
        if (!PATRON_HORA.test(definicion.fin)) problema(problemas, "HORA_INVALIDA", `${rutaDefinicion}/fin`, `Hora no válida: ${definicion.fin}`);
        if (PATRON_HORA.test(definicion.inicio) && PATRON_HORA.test(definicion.fin) && definicion.inicio >= definicion.fin) {
          problema(problemas, "INTERVALO_INVALIDO", rutaDefinicion, "La hora inicial debe ser anterior a la final");
        }
      });
      diasPorTramo.set(tramo.id, diasDefinidos);
    });
    tramosPorPerfil.set(perfil.id, diasPorTramo);
  });

  const profesores = validarEntidadesNombradas(problemas, documento.profesores, "/fushe/profesores/profesor");
  const grupos = validarEntidadesNombradas(problemas, documento.grupos, "/fushe/grupos/grupo");
  const espacios = validarEntidadesNombradas(problemas, documento.espacios, "/fushe/espacios/espacio");
  const actividades = validarIds(problemas, documento.actividades, "/fushe/actividades/actividad");

  documento.actividades.forEach((actividad, indice) => {
    const ruta = `/fushe/actividades/actividad[${indice + 1}]`;
    if (!actividad.tipo.trim()) problema(problemas, "TIPO_VACIO", `${ruta}/@tipo`, "El tipo no puede estar vacío");
    if (!actividad.nombre.trim()) problema(problemas, "NOMBRE_VACIO", `${ruta}/nombre`, "El nombre no puede estar vacío");
    validarReferencias(problemas, actividad.profesores, profesores, `${ruta}/profesores/profesor`);
    validarReferencias(problemas, actividad.grupos, grupos, `${ruta}/grupos/grupo`);
  });

  validarIds(problemas, documento.sesiones, "/fushe/sesiones/sesion");
  documento.sesiones.forEach((sesion, indice) => {
    const ruta = `/fushe/sesiones/sesion[${indice + 1}]`;
    if (!dias.has(sesion.dia)) problema(problemas, "DIA_NO_DECLARADO", `${ruta}/@dia`, `El día ${sesion.dia} no está en estructura`);
    if (!perfiles.has(sesion.perfil)) {
      problema(problemas, "PERFIL_INEXISTENTE", `${ruta}/@perfil`, `No existe ${sesion.perfil}`);
    } else {
      const tramos = tramosPorPerfil.get(sesion.perfil)!;
      if (!tramos.has(sesion.tramo)) {
        problema(problemas, "TRAMO_INEXISTENTE", `${ruta}/@tramo`, `No existe ${sesion.tramo} en ${sesion.perfil}`);
      } else if (!tramos.get(sesion.tramo)!.has(sesion.dia)) {
        problema(problemas, "TRAMO_NO_DISPONIBLE", `${ruta}/@tramo`, `${sesion.tramo} no existe el día ${sesion.dia}`);
      }
    }
    if (!actividades.has(sesion.actividad)) problema(problemas, "ACTIVIDAD_INEXISTENTE", `${ruta}/@actividad`, `No existe ${sesion.actividad}`);
    validarReferencias(problemas, sesion.profesores, profesores, `${ruta}/profesores/profesor`);
    validarReferencias(problemas, sesion.grupos, grupos, `${ruta}/grupos/grupo`);
    validarReferencias(problemas, sesion.espacios, espacios, `${ruta}/espacios/espacio`);
  });

  return problemas;
}

export function afirmarFusheValido(documento: DocumentoFushe): void {
  const errores = validarFushe(documento).filter((problema) => problema.severidad === "error");
  if (errores.length) {
    const detalle = errores.map((error) => `${error.ruta}: ${error.mensaje}`).join("\n");
    throw new Error(`Documento FUSHE no válido (${errores.length} errores):\n${detalle}`);
  }
}

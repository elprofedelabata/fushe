import { XMLParser } from "fast-xml-parser";
import {
  ActividadFushe,
  DiaSemana,
  DocumentoFushe,
  EntidadNombradaFushe,
  ExtensionFushe,
  PerfilFushe,
  SesionFushe,
} from "../modelo";
import { comprobarXmlSeguro } from "../xml-seguro";

type NodoXml = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
});

function lista<T>(valor: T | T[] | undefined): T[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

function nodo(valor: unknown, ruta: string): NodoXml {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    throw new Error(`Se esperaba un elemento XML en ${ruta}`);
  }
  return valor as NodoXml;
}

function texto(valor: unknown, ruta: string, obligatorio = true): string | undefined {
  if (valor === undefined || valor === null) {
    if (obligatorio) throw new Error(`Falta el valor ${ruta}`);
    return undefined;
  }
  if (typeof valor !== "string" && typeof valor !== "number") {
    throw new Error(`El valor ${ruta} no es texto`);
  }
  const resultado = String(valor).trim();
  if (obligatorio && !resultado) throw new Error(`El valor ${ruta} está vacío`);
  return resultado || undefined;
}

function attr(n: NodoXml, nombre: string, ruta: string, obligatorio = true): string | undefined {
  return texto(n[`@_${nombre}`], `${ruta}/@${nombre}`, obligatorio);
}

function referencias(contenedor: unknown, entidad: string, ruta: string): string[] | undefined {
  if (contenedor === undefined) return undefined;
  const c = nodo(contenedor, ruta);
  const resultado = lista(c[entidad]).map((item, indice) => {
    const n = nodo(item, `${ruta}/${entidad}[${indice + 1}]`);
    return attr(n, "ref", `${ruta}/${entidad}[${indice + 1}]`)!;
  });
  return resultado.length ? resultado : undefined;
}

function entidades(contenedor: unknown, entidad: string, ruta: string): EntidadNombradaFushe[] | undefined {
  if (contenedor === undefined) return undefined;
  const c = nodo(contenedor, ruta);
  const resultado = lista(c[entidad]).map((item, indice) => {
    const n = nodo(item, `${ruta}/${entidad}[${indice + 1}]`);
    return {
      id: attr(n, "id", `${ruta}/${entidad}[${indice + 1}]`)!,
      nombre: texto(n.nombre, `${ruta}/${entidad}[${indice + 1}]/nombre`)!,
    };
  });
  return resultado.length ? resultado : undefined;
}

export function leerFushe(xml: string): DocumentoFushe {
  comprobarXmlSeguro(xml);
  const resultado = parser.parse(xml) as NodoXml;
  const raiz = nodo(resultado.fushe, "/fushe");
  const estructura = nodo(raiz.estructura, "/fushe/estructura");
  const diasNodo = nodo(estructura.dias, "/fushe/estructura/dias");
  const dias = lista(diasNodo.dia).map((item, indice) => {
    const n = nodo(item, `/fushe/estructura/dias/dia[${indice + 1}]`);
    return Number(attr(n, "numero", `/fushe/estructura/dias/dia[${indice + 1}]`)) as DiaSemana;
  });

  const perfilesNodo = nodo(raiz.perfiles, "/fushe/perfiles");
  const perfiles: PerfilFushe[] = lista(perfilesNodo.perfil).map((item, i) => {
    const p = nodo(item, `/fushe/perfiles/perfil[${i + 1}]`);
    const tramosNodo = nodo(p.tramos, `/fushe/perfiles/perfil[${i + 1}]/tramos`);
    return {
      id: attr(p, "id", `/fushe/perfiles/perfil[${i + 1}]`)!,
      nombre: texto(p.nombre, `/fushe/perfiles/perfil[${i + 1}]/nombre`)!,
      tramos: lista(tramosNodo.tramo).map((itemTramo, j) => {
        const t = nodo(itemTramo, `/fushe/perfiles/perfil[${i + 1}]/tramos/tramo[${j + 1}]`);
        return {
          id: attr(t, "id", `/fushe/perfiles/perfil[${i + 1}]/tramos/tramo[${j + 1}]`)!,
          tipo: attr(t, "tipo", `/fushe/perfiles/perfil[${i + 1}]/tramos/tramo[${j + 1}]`, false),
          referencia: texto(t.referencia, `/fushe/perfiles/perfil[${i + 1}]/tramos/tramo[${j + 1}]/referencia`)!,
          definiciones: lista(t.definicion).map((itemDefinicion, k) => {
            const d = nodo(itemDefinicion, `/fushe/perfiles/perfil[${i + 1}]/tramos/tramo[${j + 1}]/definicion[${k + 1}]`);
            const diasTexto = attr(d, "dias", "definicion", false);
            return {
              dias: diasTexto?.split(/\s+/).map(Number) as DiaSemana[] | undefined,
              inicio: texto(d.inicio, "definicion/inicio")!,
              fin: texto(d.fin, "definicion/fin")!,
            };
          }),
        };
      }),
    };
  });

  const actividadesNodo = nodo(raiz.actividades, "/fushe/actividades");
  const actividades: ActividadFushe[] = lista(actividadesNodo.actividad).map((item, i) => {
    const a = nodo(item, `/fushe/actividades/actividad[${i + 1}]`);
    return {
      id: attr(a, "id", `/fushe/actividades/actividad[${i + 1}]`)!,
      tipo: attr(a, "tipo", `/fushe/actividades/actividad[${i + 1}]`)!,
      referencia: texto(a.referencia, `/fushe/actividades/actividad[${i + 1}]/referencia`, false),
      nombre: texto(a.nombre, `/fushe/actividades/actividad[${i + 1}]/nombre`)!,
      profesores: referencias(a.profesores, "profesor", "actividad/profesores"),
      grupos: referencias(a.grupos, "grupo", "actividad/grupos"),
    };
  });

  const sesionesNodo = nodo(raiz.sesiones, "/fushe/sesiones");
  const sesiones: SesionFushe[] = lista(sesionesNodo.sesion).map((item, i) => {
    const s = nodo(item, `/fushe/sesiones/sesion[${i + 1}]`);
    return {
      id: attr(s, "id", `/fushe/sesiones/sesion[${i + 1}]`)!,
      dia: Number(attr(s, "dia", `/fushe/sesiones/sesion[${i + 1}]`)) as DiaSemana,
      perfil: attr(s, "perfil", `/fushe/sesiones/sesion[${i + 1}]`)!,
      tramo: attr(s, "tramo", `/fushe/sesiones/sesion[${i + 1}]`)!,
      actividad: attr(s, "actividad", `/fushe/sesiones/sesion[${i + 1}]`)!,
      profesores: referencias(s.profesores, "profesor", "sesion/profesores"),
      grupos: referencias(s.grupos, "grupo", "sesion/grupos"),
      espacios: referencias(s.espacios, "espacio", "sesion/espacios"),
    };
  });

  const metadatosNodo = raiz.metadatos === undefined ? undefined : nodo(raiz.metadatos, "/fushe/metadatos");
  const generadorNodo = metadatosNodo?.generador === undefined ? undefined : nodo(metadatosNodo.generador, "/fushe/metadatos/generador");
  const origenNodo = metadatosNodo?.origen === undefined ? undefined : nodo(metadatosNodo.origen, "/fushe/metadatos/origen");

  let extensiones: ExtensionFushe[] | undefined;
  if (raiz.extensiones !== undefined) {
    const e = nodo(raiz.extensiones, "/fushe/extensiones");
    extensiones = lista(e.extension).map((item, i) => {
      const extension = nodo(item, `/fushe/extensiones/extension[${i + 1}]`);
      return {
        sistema: attr(extension, "sistema", "extension")!,
        clave: attr(extension, "clave", "extension")!,
        valor: texto(extension["#text"], "extension", false) ?? "",
      };
    });
  }

  return {
    version: attr(raiz, "version", "/fushe")!,
    metadatos: metadatosNodo
      ? {
          titulo: texto(metadatosNodo.titulo, "/fushe/metadatos/titulo", false),
          creado: texto(metadatosNodo.creado, "/fushe/metadatos/creado", false),
          generador: generadorNodo
            ? {
                nombre: attr(generadorNodo, "nombre", "/fushe/metadatos/generador")!,
                version: attr(generadorNodo, "version", "/fushe/metadatos/generador", false),
              }
            : undefined,
          origen: origenNodo
            ? {
                aplicacion: attr(origenNodo, "aplicacion", "/fushe/metadatos/origen")!,
                version: attr(origenNodo, "version", "/fushe/metadatos/origen", false),
                archivo: attr(origenNodo, "archivo", "/fushe/metadatos/origen", false),
              }
            : undefined,
        }
      : undefined,
    estructura: { dias },
    perfiles,
    profesores: entidades(raiz.profesores, "profesor", "/fushe/profesores"),
    grupos: entidades(raiz.grupos, "grupo", "/fushe/grupos"),
    espacios: entidades(raiz.espacios, "espacio", "/fushe/espacios"),
    actividades,
    sesiones,
    extensiones,
  };
}

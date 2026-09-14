import { gunzipSync } from "node:zlib";
import { XMLParser } from "fast-xml-parser";
import { comprobarXmlSeguro } from "../xml-seguro";

const TAMANO_MAXIMO_XRHO = 50 * 1024 * 1024;
const TAMANO_MAXIMO_DESCOMPRIMIDO = 100 * 1024 * 1024;
const APERTURA_RAIZ = Buffer.from("<datosGHC", "latin1");
const CIERRE_RAIZ = Buffer.from("</datosGHC>", "latin1");

export type NodoPenalara = Record<string, unknown>;

export interface XrhoLeido {
  raiz: NodoPenalara;
  version?: string;
  bytesCabecera: number;
  bytesPosteriores: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
});

export function extraerXmlXrho(contenido: Buffer): {
  xml: string;
  bytesCabecera: number;
  bytesPosteriores: number;
} {
  if (contenido.length > TAMANO_MAXIMO_XRHO) {
    throw new Error(`El XRHO supera el límite de ${TAMANO_MAXIMO_XRHO} bytes`);
  }
  if (contenido.length < 2 || contenido[0] !== 0x1f || contenido[1] !== 0x8b) {
    throw new Error("El archivo no es un contenedor XRHO GZIP reconocido");
  }

  let descomprimido: Buffer;
  try {
    descomprimido = gunzipSync(contenido, { maxOutputLength: TAMANO_MAXIMO_DESCOMPRIMIDO });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo descomprimir el XRHO: ${mensaje}`);
  }

  const inicio = descomprimido.indexOf(APERTURA_RAIZ);
  if (inicio < 0) throw new Error("El XRHO no contiene el elemento datosGHC");

  const inicioCierre = descomprimido.indexOf(CIERRE_RAIZ, inicio);
  if (inicioCierre < 0) throw new Error("El elemento datosGHC del XRHO no está cerrado");
  const fin = inicioCierre + CIERRE_RAIZ.length;

  const xml = descomprimido.subarray(inicio, fin).toString("latin1");
  comprobarXmlSeguro(xml);
  return {
    xml,
    bytesCabecera: inicio,
    bytesPosteriores: descomprimido.length - fin,
  };
}

export function leerXrho(contenido: Buffer): XrhoLeido {
  const extraido = extraerXmlXrho(contenido);
  let resultado: NodoPenalara;
  try {
    resultado = parser.parse(extraido.xml) as NodoPenalara;
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    throw new Error(`El XML interno del XRHO no se pudo analizar: ${mensaje}`);
  }

  const raiz = resultado.datosGHC;
  if (typeof raiz !== "object" || raiz === null || Array.isArray(raiz)) {
    throw new Error("El XML interno no tiene una raíz datosGHC válida");
  }

  const version = valorTexto((raiz as NodoPenalara).version);
  return {
    raiz: raiz as NodoPenalara,
    version,
    bytesCabecera: extraido.bytesCabecera,
    bytesPosteriores: extraido.bytesPosteriores,
  };
}

export function comoLista<T>(valor: T | T[] | undefined): T[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

export function comoNodo(valor: unknown, ruta: string): NodoPenalara {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    throw new Error(`Se esperaba un elemento en ${ruta}`);
  }
  return valor as NodoPenalara;
}

export function valorTexto(valor: unknown): string | undefined {
  if (typeof valor !== "string" && typeof valor !== "number") return undefined;
  const texto = String(valor).trim();
  return texto || undefined;
}

export function textoRequerido(valor: unknown, ruta: string): string {
  const texto = valorTexto(valor);
  if (texto === undefined) throw new Error(`Falta un valor de texto en ${ruta}`);
  return texto;
}

export function atributoRequerido(nodo: NodoPenalara, nombre: string, ruta: string): string {
  return textoRequerido(nodo[`@_${nombre}`], `${ruta}/@${nombre}`);
}

import { XMLValidator } from "fast-xml-parser";

const TAMANO_MAXIMO_XML = 20 * 1024 * 1024;

export function comprobarXmlSeguro(xml: string): void {
  if (new TextEncoder().encode(xml).byteLength > TAMANO_MAXIMO_XML) {
    throw new Error(`El XML supera el límite de ${TAMANO_MAXIMO_XML} bytes`);
  }

  if (/<!DOCTYPE/i.test(xml)) {
    throw new Error("Los documentos XML con DTD no están permitidos");
  }

  if (/<!ENTITY/i.test(xml)) {
    throw new Error("Las entidades XML declaradas no están permitidas");
  }

  const validacion = XMLValidator.validate(xml);
  if (validacion !== true) {
    throw new Error(
      `El XML no está bien formado: ${validacion.err.msg} (línea ${validacion.err.line})`,
    );
  }
}

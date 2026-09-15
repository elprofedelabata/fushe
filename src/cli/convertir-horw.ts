import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { anonimizarFushe } from "../anonimizar";
import {
  analizarCsvHorw,
  convertirCsvHorwAFushe,
  OpcionesConversionHorw,
} from "../horw";
import { serializarFushe } from "../fushe/serializar";
import { afirmarFusheValido } from "../fushe/validar";
import { DocumentoFushe } from "../modelo";

function mostrarUso(): never {
  process.stderr.write(
    "Uso: npm run convertir:horw -- <entrada.csv> <salida.fushe> " +
      "[--config <configuracion.json>] [--anonimizar] [--sobrescribir]\n",
  );
  process.exit(2);
}

function resumen(
  documento: DocumentoFushe,
  filasOrigen: number,
  codificacion: string,
): Record<string, unknown> {
  const actividadesPorTipo: Record<string, number> = {};
  const sesionesPorTipo: Record<string, number> = {};
  const tipoPorActividad = new Map(
    documento.actividades.map((actividad) => [actividad.id, actividad.tipo]),
  );

  for (const actividad of documento.actividades) {
    actividadesPorTipo[actividad.tipo] = (actividadesPorTipo[actividad.tipo] ?? 0) + 1;
  }
  for (const sesion of documento.sesiones) {
    const tipo = tipoPorActividad.get(sesion.actividad) ?? "desconocida";
    sesionesPorTipo[tipo] = (sesionesPorTipo[tipo] ?? 0) + 1;
  }

  return {
    codificacion,
    filasOrigen,
    dias: documento.estructura.dias,
    perfiles: documento.perfiles.map((perfil) => ({ id: perfil.id, tramos: perfil.tramos.length })),
    profesores: documento.profesores?.length ?? 0,
    grupos: documento.grupos?.length ?? 0,
    espacios: documento.espacios?.length ?? 0,
    actividades: documento.actividades.length,
    actividadesPorTipo,
    sesiones: documento.sesiones.length,
    sesionesPorTipo,
  };
}

function leerArgumentos(): {
  entrada: string;
  salida: string;
  configuracion?: string;
  anonimizar: boolean;
  sobrescribir: boolean;
} {
  const argumentos = process.argv.slice(2);
  const posicionales: string[] = [];
  let configuracion: string | undefined;
  let anonimizar = false;
  let sobrescribir = false;

  for (let indice = 0; indice < argumentos.length; indice += 1) {
    const argumento = argumentos[indice];
    if (argumento === "--anonimizar") anonimizar = true;
    else if (argumento === "--sobrescribir") sobrescribir = true;
    else if (argumento === "--config") {
      configuracion = argumentos[indice + 1];
      if (!configuracion || configuracion.startsWith("--")) mostrarUso();
      indice += 1;
    } else if (argumento.startsWith("--")) {
      throw new Error(`Opción desconocida: ${argumento}`);
    } else {
      posicionales.push(argumento);
    }
  }

  if (posicionales.length !== 2) mostrarUso();
  return {
    entrada: resolve(posicionales[0]),
    salida: resolve(posicionales[1]),
    configuracion: configuracion ? resolve(configuracion) : undefined,
    anonimizar,
    sobrescribir,
  };
}

function leerConfiguracion(ruta: string | undefined): OpcionesConversionHorw {
  if (!ruta) return {};
  let valor: unknown;
  try {
    valor = JSON.parse(readFileSync(ruta, "utf8"));
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo leer la configuración ${ruta}: ${detalle}`);
  }
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    throw new Error("La configuración de HorW debe ser un objeto JSON");
  }
  return valor as OpcionesConversionHorw;
}

function principal(): void {
  const argumentos = leerArgumentos();
  const contenido = readFileSync(argumentos.entrada);
  const analisis = analizarCsvHorw(contenido);
  const opciones = {
    ...leerConfiguracion(argumentos.configuracion),
    nombreArchivo: argumentos.entrada,
  };
  let documento = convertirCsvHorwAFushe(contenido, opciones);
  if (argumentos.anonimizar) documento = anonimizarFushe(documento);
  afirmarFusheValido(documento);

  if (existsSync(argumentos.salida) && !argumentos.sobrescribir) {
    throw new Error(
      `La salida ya existe: ${argumentos.salida}. Use --sobrescribir para reemplazarla`,
    );
  }
  mkdirSync(dirname(argumentos.salida), { recursive: true });
  writeFileSync(argumentos.salida, serializarFushe(documento), "utf8");
  process.stdout.write(
    `${JSON.stringify(resumen(documento, analisis.filas.length, analisis.codificacion), null, 2)}\n`,
  );
  process.stdout.write(`Creado: ${argumentos.salida}\n`);
}

try {
  principal();
} catch (error) {
  const mensaje = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${mensaje}\n`);
  process.exitCode = 1;
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { anonimizarFushe } from "../anonimizar";
import { convertirFetAFushe } from "../fet";
import { serializarFushe } from "../fushe/serializar";
import { afirmarFusheValido } from "../fushe/validar";
import { DocumentoFushe } from "../modelo";

function mostrarUso(): never {
  process.stderr.write(
    "Uso: npm run convertir:fet -- <entrada_data_and_timetable.fet> <salida.fushe> [--anonimizar] [--sobrescribir]\n",
  );
  process.exit(2);
}

function resumen(documento: DocumentoFushe): Record<string, unknown> {
  const actividadesPorTipo: Record<string, number> = {};
  const sesionesPorTipo: Record<string, number> = {};
  const tipoPorActividad = new Map(documento.actividades.map((actividad) => [actividad.id, actividad.tipo]));

  for (const actividad of documento.actividades) {
    actividadesPorTipo[actividad.tipo] = (actividadesPorTipo[actividad.tipo] ?? 0) + 1;
  }
  for (const sesion of documento.sesiones) {
    const tipo = tipoPorActividad.get(sesion.actividad) ?? "desconocida";
    sesionesPorTipo[tipo] = (sesionesPorTipo[tipo] ?? 0) + 1;
  }

  return {
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

function principal(): void {
  const argumentos = process.argv.slice(2);
  const anonimizar = argumentos.includes("--anonimizar");
  const sobrescribir = argumentos.includes("--sobrescribir");
  const opciones = new Set(["--anonimizar", "--sobrescribir"]);
  const desconocida = argumentos.find(
    (argumento) => argumento.startsWith("--") && !opciones.has(argumento),
  );
  if (desconocida) throw new Error(`Opción desconocida: ${desconocida}`);
  const posicionales = argumentos.filter((argumento) => !opciones.has(argumento));
  if (posicionales.length !== 2) mostrarUso();

  const [entrada, salida] = posicionales.map((ruta) => resolve(ruta));
  let documento = convertirFetAFushe(readFileSync(entrada), { nombreArchivo: entrada });
  if (anonimizar) documento = anonimizarFushe(documento);
  afirmarFusheValido(documento);

  if (existsSync(salida) && !sobrescribir) {
    throw new Error(`La salida ya existe: ${salida}. Use --sobrescribir para reemplazarla`);
  }
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, serializarFushe(documento), "utf8");
  process.stdout.write(`${JSON.stringify(resumen(documento), null, 2)}\n`);
  process.stdout.write(`Creado: ${salida}\n`);
}

try {
  principal();
} catch (error) {
  const mensaje = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${mensaje}\n`);
  process.exitCode = 1;
}

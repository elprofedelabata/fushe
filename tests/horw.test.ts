import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { anonimizarFushe, leerFushe, serializarFushe, validarFushe } from "../src";
import {
  analizarCsvHorw,
  convertirCsvHorwAFushe,
  OpcionesConversionHorw,
} from "../src/horw";

const csvHorw = [
  '1;"1º A";"PR 1 ";"MAT  ";"A1   ";1;1',
  '2;"1º B";"PR 1 ";"MAT  ";"A1   ";1;1',
  '3;"    ";"PR 2 ";"GUARD";"     ";1;2',
  '4;"1º A";"PR 3 ";"MAT  ";"A1   ";1;1',
  '5;"    ";"PR 2 ";"RD   ";"     ";2;1',
].join("\r\n") + "\r\n";

const tramos = {
  "1": { inicio: "08:00", fin: "09:00", referencia: "1.ª hora" },
  "2": { inicio: "09:00:00", fin: "10:00:00", referencia: "2.ª hora" },
  "3": { inicio: "10:00", fin: "10:30", referencia: "Recreo", tipo: "recreo" },
};

test("detecta Windows-1252 y analiza el CSV sin cabecera de HorW", () => {
  const analisis = analizarCsvHorw(Buffer.from(csvHorw, "latin1"));

  assert.equal(analisis.codificacion, "windows-1252");
  assert.equal(analisis.filas.length, 5);
  assert.deepEqual(analisis.dias, [1, 2]);
  assert.deepEqual(analisis.tramos, [1, 2]);
  assert.deepEqual(analisis.profesores, ["PR 1", "PR 2", "PR 3"]);
  assert.deepEqual(analisis.grupos, ["1º A", "1º B"]);
  assert.deepEqual(analisis.actividades, ["MAT", "GUARD", "RD"]);
  assert.deepEqual(analisis.espacios, ["A1"]);
});

test("convierte relaciones HORW y agrupa solo los grupos de una misma sesión docente", () => {
  const documento = convertirCsvHorwAFushe(Buffer.from(csvHorw, "latin1"), {
    nombreArchivo: "centro.csv",
    dias: [1, 2, 3],
    tramos,
    tiposPorActividad: { GUARD: "guardia", RD: "reunion" },
    nombresActividades: {
      MAT: "Matemáticas",
      GUARD: "Servicio de guardia",
      RD: "Reunión de departamento",
    },
  });

  assert.deepEqual(validarFushe(documento), []);
  assert.deepEqual(documento.estructura.dias, [1, 2, 3]);
  assert.equal(documento.metadatos?.origen?.aplicacion, "HorW");
  assert.equal(documento.metadatos?.origen?.archivo, "centro.csv");
  assert.equal(documento.perfiles[0].tramos.length, 3);
  assert.equal(documento.perfiles[0].tramos[0].definiciones[0].inicio, "08:00:00");
  assert.equal(documento.perfiles[0].tramos[2].tipo, "recreo");
  assert.equal(documento.profesores?.length, 3);
  assert.equal(documento.grupos?.length, 2);
  assert.equal(documento.espacios?.length, 1);
  assert.equal(documento.actividades.length, 3);
  assert.deepEqual(
    documento.actividades.map((actividad) => actividad.tipo),
    ["docencia", "guardia", "reunion"],
  );
  assert.equal(documento.sesiones.length, 4);
  assert.equal(documento.sesiones[0].grupos?.length, 2);
  assert.equal(documento.sesiones[0].profesores?.length, 1);
  assert.notEqual(documento.sesiones[0].id, documento.sesiones[2].id);

  const xml = serializarFushe(documento);
  assert.deepEqual(validarFushe(leerFushe(xml)), []);
  assert.equal(serializarFushe(leerFushe(xml)), xml);
});

test("admite una cabecera descriptiva en UTF-8", () => {
  const conCabecera =
    "registro;grupo;profesor;actividad;aula;día;tramo\n" +
    '1;"2.º A";"P1";"FIS";"LAB";1;1\n';
  const analisis = analizarCsvHorw(Buffer.from(conCabecera, "utf8"));

  assert.equal(analisis.codificacion, "utf-8");
  assert.equal(analisis.filas.length, 1);
  assert.equal(analisis.filas[0].grupo, "2.º A");
});

test("exige las horas de todos los tramos utilizados", () => {
  assert.throws(
    () => convertirCsvHorwAFushe(Buffer.from(csvHorw, "latin1"), { tramos: { "1": tramos["1"] } }),
    /Faltan las horas del tramo 2/,
  );
});

test("rechaza columnas incorrectas y colocaciones duplicadas", () => {
  assert.throws(
    () => analizarCsvHorw('1;"G";"P";"A";1;1'),
    /tiene 6 columnas; se esperaban 7/,
  );
  assert.throws(
    () => analizarCsvHorw('1;"G";"P";"A";"";1;1\n2;"G";"P";"A";"";1;1\n'),
    /Colocación duplicada/,
  );
});

const rutaMuestraPublica = "examples/horw/horario-ficticio.csv";
const rutaConfiguracionPublica = "examples/horw/configuracion.json";
const rutaResultadoPublicado = "examples/horw/horario-ficticio.fushe";

test("reproduce exactamente la muestra HORW pública", () => {
  const muestra = readFileSync(rutaMuestraPublica);
  const contenido = new TextDecoder("windows-1252").decode(muestra);
  const configuracion = JSON.parse(
    readFileSync(rutaConfiguracionPublica, "utf8"),
  ) as OpcionesConversionHorw;
  const analisis = analizarCsvHorw(muestra);

  assert.equal(analisis.codificacion, "windows-1252");
  assert.equal(analisis.filas.length, 926);
  assert.deepEqual(analisis.dias, [1, 2, 3, 4, 5]);
  assert.deepEqual(analisis.tramos, [1, 2, 3, 4, 5, 6]);
  assert.equal(analisis.profesores.length, 40);
  assert.equal(analisis.grupos.length, 20);
  assert.equal(analisis.actividades.length, 62);
  assert.equal(analisis.espacios.length, 1);
  assert.match(contenido, /"3ºE A"/);
  assert.doesNotMatch(contenido, /[A-Z]:\\|Users[/\\]|AppData|https?:\/\/|@[a-z0-9]/i);
  assert.doesNotMatch(contenido, /\b[6789]\d{8}\b/);

  const documento = anonimizarFushe(
    convertirCsvHorwAFushe(muestra, {
      ...configuracion,
      nombreArchivo: rutaMuestraPublica,
    }),
  );
  assert.deepEqual(validarFushe(documento), []);
  assert.equal(documento.profesores?.length, 40);
  assert.equal(documento.grupos?.length, 19);
  assert.equal(documento.espacios?.length, 1);
  assert.equal(documento.actividades.length, 62);
  assert.equal(documento.sesiones.length, 741);
  assert.ok(
    documento.profesores?.every((profesor) => /^Profesor \d{3}$/.test(profesor.nombre)),
  );

  const tipoPorActividad = new Map(
    documento.actividades.map((actividad) => [actividad.id, actividad.tipo]),
  );
  const sesionesPorTipo = documento.sesiones.reduce<Record<string, number>>(
    (total, sesion) => {
      const tipo = tipoPorActividad.get(sesion.actividad)!;
      total[tipo] = (total[tipo] ?? 0) + 1;
      return total;
    },
    {},
  );
  assert.deepEqual(sesionesPorTipo, {
    docencia: 617,
    tutoria: 15,
    guardia: 88,
    reunion: 21,
  });
  assert.equal(serializarFushe(documento), readFileSync(rutaResultadoPublicado, "utf8"));
});

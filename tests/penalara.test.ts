import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gunzipSync, gzipSync } from "node:zlib";
import {
  leerFushe,
  serializarFushe,
  validarFushe,
} from "../src";
import { convertirXrhoAFushe, extraerXmlXrho } from "../src/penalara";

const xmlPenalara = `
<datosGHC>
  <version>20230206</version>
  <marcosDeHorario>
    <marcoHorario id="A" nombre="Marco A" claveX="A">
      <tramo><submarco>A</submarco><dia>0</dia><indice>0</indice><horaEntrada>08:00:00</horaEntrada><horaSalida>09:00:00</horaSalida><Tipo>lectivo</Tipo><clavX>1</clavX></tramo>
      <tramo><submarco>A</submarco><dia>1</dia><indice>0</indice><horaEntrada>08:30:00</horaEntrada><horaSalida>09:30:00</horaSalida><Tipo>lectivo</Tipo><clavX>1</clavX></tramo>
    </marcoHorario>
  </marcosDeHorario>
  <aulas><aula><nombre>A-1</nombre></aula></aulas>
  <tareas><tarea><nombre>DIR</nombre><nombreCompleto>Dirección</nombreCompleto></tarea></tareas>
  <profesores>
    <profesor><nombre>Pepe</nombre><nombreCompleto>Pérez, Pepe</nombreCompleto></profesor>
    <profesor><nombre>Maria</nombre><nombreCompleto>García, María</nombreCompleto></profesor>
  </profesores>
  <materias><materia><nombre>FIS</nombre><abreviatura>FIS</abreviatura><nombreCompleto>Física</nombreCompleto></materia></materias>
  <grupos><grupo submarco="A"><nombre>2A</nombre></grupo></grupos>
  <sesionesLectivas>
    <sesion id="0"><materia>FIS</materia><grupo>2A</grupo><profesor>Pepe</profesor><otrosGrupos></otrosGrupos></sesion>
  </sesionesLectivas>
  <reuniones>
    <reunion subMarco="A"><nombre>Departamento</nombre><tipoDeTarea>RDP</tipoDeTarea><integrantes><integrante>Pepe</integrante><integrante>Maria</integrante></integrantes></reunion>
  </reuniones>
  <guardias>
    <guardia subMarco="A"><nombre>Guardia</nombre><tipoDeTarea>G</tipoDeTarea></guardia>
  </guardias>
  <complementarias>
    <complementaria subMarco="A"><identificador>0</identificador><tarea>DIR</tarea><profesor>Maria</profesor></complementaria>
  </complementarias>
  <horario>
    <tramo dia="0" indice="0" marco="A">
      <aula id="A-1"><sesion>0</sesion><profesor>Pepe</profesor></aula>
      <reunion>Departamento</reunion>
      <guardia><nombre>Guardia</nombre><profesor>Maria</profesor></guardia>
      <complementaria>0</complementaria>
    </tramo>
    <tramo dia="1" indice="0" marco="A">
      <aula id="6" anonima="general"><sesion>0</sesion><profesor>Pepe</profesor></aula>
    </tramo>
  </horario>
</datosGHC>`;

function crearXrho(xml = xmlPenalara): Buffer {
  const contenido = Buffer.concat([
    Buffer.from([1, 2, 3, 4, 5, 6, 7]),
    Buffer.from(xml, "latin1"),
    Buffer.from([8, 9, 10]),
  ]);
  return gzipSync(contenido);
}

test("extrae el XML entre los bloques binarios", () => {
  const extraido = extraerXmlXrho(crearXrho());
  assert.equal(extraido.bytesCabecera, 8);
  assert.equal(extraido.bytesPosteriores, 3);
  assert.match(extraido.xml, /^<datosGHC>/);
  assert.match(extraido.xml, /<nombreCompleto>Pérez, Pepe<\/nombreCompleto>/);
});

test("convierte docencia, reunión, guardia y complementaria", () => {
  const documento = convertirXrhoAFushe(crearXrho(), { nombreArchivo: "prueba.xrho" });
  assert.deepEqual(validarFushe(documento), []);
  assert.deepEqual(documento.estructura.dias, [1, 2]);
  assert.equal(documento.perfiles.length, 1);
  assert.equal(documento.perfiles[0].tramos.length, 1);
  assert.equal(documento.perfiles[0].tramos[0].definiciones.length, 2);
  assert.deepEqual(documento.perfiles[0].tramos[0].definiciones[0].dias, [1]);
  assert.equal(documento.profesores?.[0].nombre, "Pérez, Pepe");
  assert.deepEqual(documento.espacios?.map((espacio) => espacio.nombre), ["A-1", "6"]);
  assert.equal(documento.actividades.length, 4);
  assert.equal(documento.sesiones.length, 5);
  assert.deepEqual(
    documento.actividades.map((actividad) => actividad.tipo),
    ["docencia", "reunion", "guardia", "complementaria"],
  );
  const reunion = documento.actividades.find((actividad) => actividad.tipo === "reunion")!;
  assert.equal(reunion.profesores?.length, 2);
  const guardia = documento.sesiones.find(
    (sesion) =>
      documento.actividades.find((actividad) => actividad.id === sesion.actividad)?.tipo ===
      "guardia",
  )!;
  assert.equal(guardia.profesores?.length, 1);
  assert.equal(serializarFushe(documento), serializarFushe(convertirXrhoAFushe(crearXrho(), { nombreArchivo: "prueba.xrho" })));
});

test("rechaza archivos que no son GZIP", () => {
  assert.throws(() => convertirXrhoAFushe(Buffer.from("no es un xrho")), /GZIP reconocido/);
});

test("no ignora tipos de colocación desconocidos", () => {
  const xml = xmlPenalara.replace(
    "<reunion>Departamento</reunion>",
    "<examen>Extra</examen><reunion>Departamento</reunion>",
  );
  assert.throws(() => convertirXrhoAFushe(crearXrho(xml)), /colocación no soportado.*examen/);
});

test("el ejemplo público ficticio es válido", () => {
  const xml = readFileSync("examples/penalara-ficticio.fushe", "utf8");
  const documento = leerFushe(xml);
  assert.deepEqual(validarFushe(documento), []);
  assert.equal(documento.perfiles.length, 2);
  assert.equal(documento.actividades.length, 6);
  assert.equal(documento.sesiones.length, 8);
  assert.ok(documento.profesores?.every((profesor) => /^Docente /.test(profesor.nombre)));
});

const rutaMuestraPublica = "examples/penalara/horario-anonimizado.xrho";
const rutaResultadoPublicado = "examples/penalara/horario-anonimizado.fushe";

test("reproduce la muestra pública anonimizada de Peñalara", () => {
  const muestra = readFileSync(rutaMuestraPublica);
  const extraido = extraerXmlXrho(muestra);
  const contenido = gunzipSync(muestra).toString("latin1");

  assert.equal(extraido.bytesCabecera, 51);
  assert.equal(extraido.bytesPosteriores, 6900);
  assert.match(contenido, /C:\\Users\\userx\\/);
  assert.match(contenido, /EQUIPO-FUSHE001/);
  assert.match(contenido, /Centro FUSHE 1/);
  assert.match(contenido, /Ciudad/);
  assert.doesNotMatch(contenido, /LAPTOP-[A-Z0-9]+/);

  const documento = convertirXrhoAFushe(muestra, {
    nombreArchivo: rutaMuestraPublica,
  });
  assert.deepEqual(validarFushe(documento), []);
  assert.deepEqual(documento.perfiles.map((perfil) => perfil.tramos.length), [8, 9]);
  assert.equal(documento.profesores?.length, 10);
  assert.ok(
    documento.profesores?.every((profesor) => /^Docente \d{3}$/.test(profesor.nombre)),
  );
  assert.equal(documento.grupos?.length, 4);
  assert.equal(documento.espacios?.length, 7);
  assert.equal(documento.actividades.length, 48);
  assert.equal(documento.sesiones.length, 199);

  const tipos = new Map(documento.actividades.map((actividad) => [actividad.id, actividad.tipo]));
  const sesionesPorTipo = documento.sesiones.reduce<Record<string, number>>((total, sesion) => {
    const tipo = tipos.get(sesion.actividad)!;
    total[tipo] = (total[tipo] ?? 0) + 1;
    return total;
  }, {});
  assert.deepEqual(sesionesPorTipo, {
    docencia: 116,
    guardia: 60,
    complementaria: 20,
    reunion: 3,
  });

  const actividadesPorId = new Map(
    documento.actividades.map((actividad) => [actividad.id, actividad]),
  );
  const contarReferenciasEfectivas = (
    campo: "profesores" | "grupos",
  ): Record<string, number> =>
    documento.sesiones.reduce<Record<string, number>>((total, sesion) => {
      const actividad = actividadesPorId.get(sesion.actividad)!;
      for (const referencia of sesion[campo] ?? actividad[campo] ?? []) {
        total[referencia] = (total[referencia] ?? 0) + 1;
      }
      return total;
    }, {});

  assert.deepEqual(contarReferenciasEfectivas("profesores"), {
    P001: 15,
    P002: 22,
    P003: 20,
    P004: 23,
    P005: 21,
    P006: 19,
    P007: 24,
    P008: 21,
    P009: 18,
    P010: 18,
  });
  assert.deepEqual(contarReferenciasEfectivas("grupos"), {
    G003: 36,
    G004: 36,
    G002: 27,
    G001: 27,
  });
  assert.deepEqual(
    documento.sesiones.reduce<Record<string, number>>((total, sesion) => {
      for (const espacio of sesion.espacios ?? []) {
        total[espacio] = (total[espacio] ?? 0) + 1;
      }
      return total;
    }, {}),
    { E001: 29, E002: 25, E003: 16, E004: 20, E005: 4, E006: 4, E007: 18 },
  );

  assert.equal(
    serializarFushe(documento),
    readFileSync(rutaResultadoPublicado, "utf8"),
  );
});

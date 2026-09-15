import assert from "node:assert/strict";
import test from "node:test";
import {
  anonimizarFushe,
  DocumentoFushe,
  leerFushe,
  serializarFushe,
  validarFushe,
} from "../src";

function documentoEjemplo(): DocumentoFushe {
  return {
    version: "1.0",
    metadatos: {
      titulo: "Ejemplo <seguro>",
      origen: { aplicacion: "Prueba", version: "1&2" },
    },
    estructura: { dias: [1, 2, 5] },
    perfiles: [
      {
        id: "PH01",
        nombre: "Perfil general",
        tramos: [
          {
            id: "T01",
            tipo: "lectivo",
            referencia: "1.ª hora",
            definiciones: [
              { dias: [1, 2], inicio: "08:00:00", fin: "09:00:00" },
              { dias: [5], inicio: "08:30:00", fin: "09:30:00" },
            ],
          },
        ],
      },
    ],
    profesores: [
      { id: "P001", nombre: "Pepe" },
      { id: "P002", nombre: "María" },
    ],
    grupos: [{ id: "G001", nombre: "2.º BHA" }],
    espacios: [{ id: "E001", nombre: "Aula 211" }],
    actividades: [
      {
        id: "A001",
        tipo: "docencia",
        referencia: "FIS",
        nombre: "Física",
        profesores: ["P001"],
        grupos: ["G001"],
      },
    ],
    sesiones: [
      {
        id: "S001",
        dia: 1,
        perfil: "PH01",
        tramo: "T01",
        actividad: "A001",
        profesores: ["P001", "P002"],
        espacios: ["E001"],
      },
    ],
  };
}

test("serializa, escapa y vuelve a leer sin cambiar el documento", () => {
  const original = documentoEjemplo();
  const xml = serializarFushe(original);
  assert.match(xml, /Ejemplo &lt;seguro&gt;/);
  assert.match(xml, /version="1&amp;2"/);
  const leido = leerFushe(xml);
  assert.equal(leido.metadatos?.titulo, "Ejemplo <seguro>");
  assert.equal(leido.metadatos?.origen?.version, "1&2");
  assert.equal(serializarFushe(leido), xml);
  assert.deepEqual(validarFushe(leido), []);
});

test("anonimiza docentes sin atribuir el horario a una aplicación concreta", () => {
  const original = documentoEjemplo();
  original.metadatos!.origen!.archivo = "centro-original.fet";

  const anonimizado = anonimizarFushe(original);

  assert.equal(anonimizado.metadatos?.titulo, "Horario anonimizado");
  assert.deepEqual(anonimizado.metadatos?.origen, {
    aplicacion: "Prueba",
    version: "1&2",
    archivo: undefined,
  });
  assert.deepEqual(anonimizado.profesores?.map((profesor) => profesor.nombre), [
    "Profesor 001",
    "Profesor 002",
  ]);
  assert.equal(anonimizado.grupos?.[0].nombre, "2.º BHA");
  assert.equal(anonimizado.espacios?.[0].nombre, "Aula 211");
  assert.equal(original.profesores?.[0].nombre, "Pepe");
});

test("detecta referencias rotas y tramos no disponibles", () => {
  const documento = documentoEjemplo();
  documento.sesiones[0].dia = 2;
  documento.sesiones[0].espacios = ["E999"];
  documento.perfiles[0].tramos[0].definiciones = [
    { dias: [1], inicio: "08:00:00", fin: "09:00:00" },
    { dias: [5], inicio: "08:30:00", fin: "09:30:00" },
  ];
  const codigos = validarFushe(documento).map((problema) => problema.codigo);
  assert.ok(codigos.includes("TRAMO_NO_DISPONIBLE"));
  assert.ok(codigos.includes("REFERENCIA_INEXISTENTE"));
});

test("rechaza DTD y entidades declaradas", () => {
  const xml = '<!DOCTYPE fushe [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><fushe version="1.0"/>';
  assert.throws(() => leerFushe(xml), /DTD no están permitidos/);
});

test("rechaza XML que no está bien formado", () => {
  assert.throws(
    () => leerFushe('<fushe version="1.0"><estructura></fushe>'),
    /XML no está bien formado/,
  );
});

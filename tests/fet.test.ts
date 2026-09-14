import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { leerFushe, serializarFushe, validarFushe } from "../src";
import { convertirFetAFushe } from "../src/fet";

const xmlFet = `<?xml version="1.0" encoding="UTF-8"?>
<fet version="7.10.4">
  <Institution_Name>Centro de prueba</Institution_Name>
  <Days_List>
    <Number_of_Days>2</Number_of_Days>
    <Day><Name>L</Name><Long_Name>Lunes</Long_Name></Day>
    <Day><Name>M</Name><Long_Name>Martes</Long_Name></Day>
  </Days_List>
  <Hours_List>
    <Number_of_Hours>3</Number_of_Hours>
    <Hour><Name>H1</Name><Long_Name>08:00 - 09:00</Long_Name></Hour>
    <Hour><Name>H2</Name><Long_Name>09:00 - 10:00</Long_Name></Hour>
    <Hour><Name>R</Name><Long_Name>10:00 - 10:30</Long_Name></Hour>
  </Hours_List>
  <Subjects_List>
    <Subject><Name>FIS_2BACH</Name><Long_Name>Física de 2.º de Bachillerato</Long_Name><Code>FIS</Code></Subject>
    <Subject><Name>GUARDIA</Name><Long_Name>Servicio de guardia</Long_Name><Code>G</Code></Subject>
  </Subjects_List>
  <Teachers_List>
    <Teacher><Name>P1</Name><Long_Name>Docente Uno</Long_Name></Teacher>
    <Teacher><Name>P2</Name><Long_Name>Docente Dos</Long_Name></Teacher>
  </Teachers_List>
  <Students_List>
    <Year>
      <Name>2BACH</Name><Long_Name>2.º de Bachillerato</Long_Name>
      <Group><Name>2BHA</Name><Long_Name>2.º BHA</Long_Name></Group>
    </Year>
  </Students_List>
  <Rooms_List>
    <Room><Name>LAB</Name><Long_Name>Laboratorio de Física</Long_Name></Room>
  </Rooms_List>
  <Activities_List>
    <Activity>
      <Teacher>P1</Teacher><Subject>FIS_2BACH</Subject><Students>2BHA</Students>
      <Duration>2</Duration><Total_Duration>3</Total_Duration><Id>1</Id>
      <Activity_Group_Id>1</Activity_Group_Id><Active>true</Active>
    </Activity>
    <Activity>
      <Teacher>P1</Teacher><Subject>FIS_2BACH</Subject><Students>2BHA</Students>
      <Duration>1</Duration><Total_Duration>3</Total_Duration><Id>2</Id>
      <Activity_Group_Id>1</Activity_Group_Id><Active>true</Active>
    </Activity>
    <Activity>
      <Teacher>P2</Teacher><Subject>GUARDIA</Subject><Activity_Tag>guardia</Activity_Tag>
      <Duration>1</Duration><Total_Duration>1</Total_Duration><Id>3</Id>
      <Activity_Group_Id>0</Activity_Group_Id><Active>true</Active>
    </Activity>
    <Activity>
      <Teacher>P2</Teacher><Subject>GUARDIA</Subject>
      <Duration>1</Duration><Total_Duration>1</Total_Duration><Id>4</Id>
      <Activity_Group_Id>0</Activity_Group_Id><Active>false</Active>
    </Activity>
  </Activities_List>
  <Time_Constraints_List>
    <ConstraintBreakTimes>
      <Weight_Percentage>100</Weight_Percentage>
      <Break_Time><Day>L</Day><Hour>R</Hour></Break_Time>
      <Break_Time><Day>M</Day><Hour>R</Hour></Break_Time>
      <Active>true</Active>
    </ConstraintBreakTimes>
    <ConstraintActivityPreferredStartingTime>
      <Weight_Percentage>100</Weight_Percentage><Activity_Id>1</Activity_Id>
      <Day>L</Day><Hour>H1</Hour><Permanently_Locked>false</Permanently_Locked><Active>true</Active>
    </ConstraintActivityPreferredStartingTime>
    <ConstraintActivityPreferredStartingTime>
      <Weight_Percentage>100</Weight_Percentage><Activity_Id>2</Activity_Id>
      <Day>M</Day><Hour>H1</Hour><Permanently_Locked>false</Permanently_Locked><Active>true</Active>
    </ConstraintActivityPreferredStartingTime>
    <ConstraintActivityPreferredStartingTime>
      <Weight_Percentage>100</Weight_Percentage><Activity_Id>3</Activity_Id>
      <Day>M</Day><Hour>H2</Hour><Permanently_Locked>false</Permanently_Locked><Active>true</Active>
    </ConstraintActivityPreferredStartingTime>
  </Time_Constraints_List>
  <Space_Constraints_List>
    <ConstraintActivityPreferredRoom>
      <Weight_Percentage>100</Weight_Percentage><Activity_Id>1</Activity_Id><Room>LAB</Room>
      <Permanently_Locked>false</Permanently_Locked><Active>true</Active>
    </ConstraintActivityPreferredRoom>
    <ConstraintActivityPreferredRoom>
      <Weight_Percentage>100</Weight_Percentage><Activity_Id>2</Activity_Id><Room>LAB</Room>
      <Permanently_Locked>false</Permanently_Locked><Active>true</Active>
    </ConstraintActivityPreferredRoom>
  </Space_Constraints_List>
</fet>`;

test("convierte la solución FET, agrupa actividades y expande su duración", () => {
  const documento = convertirFetAFushe(xmlFet, { nombreArchivo: "centro_data_and_timetable.fet" });

  assert.deepEqual(validarFushe(documento), []);
  assert.deepEqual(documento.estructura.dias, [1, 2]);
  assert.equal(documento.metadatos?.origen?.version, "7.10.4");
  assert.equal(documento.metadatos?.origen?.archivo, "centro_data_and_timetable.fet");
  assert.equal(documento.perfiles.length, 1);
  assert.equal(documento.perfiles[0].tramos.length, 3);
  assert.equal(documento.perfiles[0].tramos[2].tipo, "recreo");
  assert.deepEqual(documento.profesores?.map((profesor) => profesor.nombre), [
    "Docente Uno",
    "Docente Dos",
  ]);
  assert.deepEqual(documento.grupos?.map((grupo) => grupo.nombre), ["2.º BHA"]);
  assert.deepEqual(documento.espacios?.map((espacio) => espacio.nombre), [
    "Laboratorio de Física",
  ]);
  assert.equal(documento.actividades.length, 2);
  assert.deepEqual(documento.actividades.map((actividad) => actividad.tipo), [
    "docencia",
    "guardia",
  ]);
  assert.equal(documento.actividades[0].nombre, "Física de 2.º de Bachillerato");
  assert.equal(documento.actividades[0].referencia, "FIS");
  assert.equal(documento.sesiones.length, 4);
  assert.deepEqual(
    documento.sesiones.slice(0, 3).map((sesion) => [sesion.dia, sesion.tramo]),
    [
      [1, "T01"],
      [1, "T02"],
      [2, "T01"],
    ],
  );
  assert.equal(documento.sesiones[3].espacios, undefined);

  const xml = serializarFushe(documento);
  assert.deepEqual(validarFushe(leerFushe(xml)), []);
  assert.equal(serializarFushe(leerFushe(xml)), xml);
});

test("permite proporcionar las horas cuando FET solo usa etiquetas", () => {
  const sinIntervalo = xmlFet.replace(
    "<Long_Name>08:00 - 09:00</Long_Name>",
    "<Long_Name>Primera hora</Long_Name>",
  );
  assert.throws(() => convertirFetAFushe(sinIntervalo), /No se pudo deducir el intervalo.*H1/);

  const documento = convertirFetAFushe(sinIntervalo, {
    horas: { H1: { inicio: "08:15:00", fin: "09:15:00" } },
  });
  assert.equal(documento.perfiles[0].tramos[0].definiciones[0].inicio, "08:15:00");
});

test("rechaza un archivo FET sin horario final completo", () => {
  const incompleto = xmlFet.replace(
    /<ConstraintActivityPreferredStartingTime>\s*<Weight_Percentage>100<\/Weight_Percentage><Activity_Id>3<\/Activity_Id>[\s\S]*?<\/ConstraintActivityPreferredStartingTime>/,
    "",
  );
  assert.throws(() => convertirFetAFushe(incompleto), /actividad FET 3 no tiene una colocación final/);
});

test("rechaza DTD y entidades en archivos FET", () => {
  const peligroso = `<!DOCTYPE fet [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><fet>&xxe;</fet>`;
  assert.throws(() => convertirFetAFushe(peligroso), /DTD no están permitidos/);
});

const rutaMuestraPrivada = process.env.FUSHE_FET_MUESTRA;
test(
  "reconcilia la muestra FET privada completa",
  { skip: rutaMuestraPrivada ? false : "FUSHE_FET_MUESTRA no está definida" },
  () => {
    const documento = convertirFetAFushe(readFileSync(rutaMuestraPrivada!), {
      nombreArchivo: rutaMuestraPrivada,
    });
    assert.deepEqual(validarFushe(documento), []);
    assert.deepEqual(documento.estructura.dias, [1, 2, 3, 4, 5]);
    assert.deepEqual(documento.perfiles.map((perfil) => perfil.tramos.length), [15]);
    assert.equal(documento.perfiles[0].tramos.filter((tramo) => tramo.tipo === "recreo").length, 3);
    assert.equal(documento.profesores?.length, 96);
    assert.equal(documento.grupos?.length, 152);
    assert.equal(documento.espacios?.length, 25);
    assert.equal(documento.actividades.length, 599);
    assert.equal(documento.sesiones.length, 1721);

    const actividadesPorTipo = documento.actividades.reduce<Record<string, number>>(
      (total, actividad) => {
        total[actividad.tipo] = (total[actividad.tipo] ?? 0) + 1;
        return total;
      },
      {},
    );
    assert.deepEqual(actividadesPorTipo, { docencia: 510, guardia: 89 });

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
    assert.deepEqual(sesionesPorTipo, { docencia: 1494, guardia: 227 });
    assert.ok(documento.profesores?.every((profesor) => /^Profe\d{3}$/.test(profesor.nombre)));

    const releido = leerFushe(serializarFushe(documento));
    assert.deepEqual(validarFushe(releido), []);
    assert.equal(releido.actividades.length, 599);
    assert.equal(releido.sesiones.length, 1721);
  },
);

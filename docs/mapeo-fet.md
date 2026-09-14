# Mapeo de FET a FUSHE

## Estado

- Estado: implementación inicial.
- Versión de FET contrastada: 7.10.4.
- Entrada recomendada: `*_data_and_timetable.fet`.
- Alcance: horario final resuelto.
- Fuera de alcance: reconstrucción del problema de planificación de FET.

FET genera una carpeta con numerosas vistas HTML y tres proyecciones XML del
horario. El archivo `*_data_and_timetable.fet` reúne los catálogos originales y
la solución final, por lo que basta para realizar la conversión. No es necesario
analizar los HTML ni combinar `*_activities.xml` con otros archivos.

Un `.fet` de entrada ordinario puede contener actividades y restricciones sin
haber sido resuelto todavía. El conversor exige una colocación final inequívoca
para cada actividad activa y muestra un error si falta alguna.

## Representación de la solución

En `*_data_and_timetable.fet`, FET añade a cada actividad activa una restricción
`ConstraintActivityPreferredStartingTime` activa y con peso del 100 %. Esta
indica el día y el primer tramo de la colocación final. Las aulas asignadas se
guardan de manera equivalente mediante `ConstraintActivityPreferredRoom`.

`Permanently_Locked` describe el bloqueo de la restricción dentro de FET, no si
la colocación forma parte del horario exportado. Por eso el conversor utiliza
las restricciones activas al 100 % aunque ese campo sea `false`.

Si existen dos colocaciones o aulas distintas al 100 % para una misma actividad,
el conversor se detiene en lugar de elegir una silenciosamente.

## Correspondencia

| FET | FUSHE | Regla |
| --- | --- | --- |
| `fet/@version` | `metadatos/origen/@version` | Se conserva la versión de FET. |
| `Institution_Name` | `metadatos/titulo` | Se utiliza como título legible del horario. |
| `Days_List/Day` | `estructura/dias` | Se numeran por orden desde `1` hasta `7`. |
| `Hours_List/Hour` | `perfil/tramos/tramo` | Se crea un único perfil `PH01`. |
| `Hour/Name` | `tramo/referencia` | Se conserva la etiqueta breve de FET. |
| `Hour/Long_Name` | `definicion/inicio` y `fin` | Se extrae un intervalo como `08:00 - 09:00`. |
| `ConstraintBreakTimes` | `tramo/@tipo="recreo"` | Solo cuando el tramo es descanso todos los días. |
| `Teachers_List/Teacher` | `profesores/profesor` | Solo se incorporan docentes usados; se prefiere `Long_Name`. |
| `Students_List` | `grupos/grupo` | Años, grupos y subgrupos se aplanan cuando una actividad los usa. |
| `Rooms_List/Room` | `espacios/espacio` | Solo se incorporan aulas definitivamente asignadas; se prefiere `Long_Name`. |
| `Subjects_List/Subject` | `actividad` | `Long_Name` da el nombre y `Code`, o en su defecto `Name`, la referencia. |
| `Activity/Teacher` | `actividad/profesores` | Se admiten cero, uno o varios profesores. |
| `Activity/Students` | `actividad/grupos` | Se admiten cero, uno o varios conjuntos de estudiantes. |
| `Activity_Group_Id` | actividad lógica FUSHE | Las partes de una actividad dividida comparten una actividad FUSHE. |
| colocación temporal | `sesion/@dia`, `@perfil` y `@tramo` | Se crea una sesión por tramo realmente ocupado. |
| aula preferida final | `sesion/espacios` | Se aplica a cada tramo ocupado por la colocación. |

Los elementos con `Active=false` no forman parte del horario final y se omiten.

## Tramos y horas reales

FET trabaja con etiquetas de periodo y no exige que tengan horas de reloj. FUSHE
sí necesita `inicio` y `fin`. El conversor intenta obtenerlos de `Hour/Long_Name`
y, como alternativa, de `Hour/Name`.

La biblioteca permite proporcionar los intervalos que no sean deducibles:

```ts
convertirFetAFushe(xml, {
  horas: {
    H1: { inicio: "08:00:00", fin: "09:00:00" },
    H2: { inicio: "09:00:00", fin: "10:00:00" },
  },
});
```

El comando actual se detiene si las etiquetas no contienen intervalos. Una
interfaz interactiva podrá solicitar esas correspondencias al usuario.

## Actividades divididas y duración

FET representa una actividad semanal dividida mediante varios elementos que
comparten `Activity_Group_Id`. FUSHE genera una sola actividad lógica y una
sesión para cada colocación.

Si un elemento FET tiene `Duration` mayor que uno, el conversor crea una sesión
FUSHE por cada tramo consecutivo ocupado, todas referidas a la misma actividad.
Así se conserva íntegramente la cuadrícula final, aunque FUSHE todavía no marca
de forma explícita que esas sesiones constituían un único bloque indivisible.

## Tipos de actividad

FET no tiene un vocabulario universal que diferencie docencia, guardias,
reuniones o coordinaciones. El conversor aplica estas reglas:

1. Usa una correspondencia explícita de `tiposPorMateria`, si se proporciona.
2. Usa una correspondencia explícita de `tiposPorEtiqueta`, si se proporciona.
3. Reconoce etiquetas que coinciden con los tipos iniciales de FUSHE, por
   ejemplo `GUARDIA`, `REUNION` o `TUTORIA`.
4. Utiliza `docencia` como valor predeterminado configurable.

Las demás etiquetas FET no se trasladan al núcleo porque pueden representar
restricciones de planificación o clasificaciones propias de cada centro.

## Información descartada

Se descartan deliberadamente:

- restricciones duras y blandas usadas para generar el horario;
- conflictos leves y estadísticas de generación;
- semillas aleatorias;
- disponibilidad y carga objetivo de profesores o estudiantes;
- capacidades, edificios, aulas candidatas y preferencias de espacio;
- comentarios internos de actividades y catálogos;
- códigos de actividad no utilizados para clasificar el resultado;
- opciones de generación y datos de presentación;
- las vistas HTML y XML derivadas por profesor, grupo, materia o aula.

Esta información puede ser necesaria para volver a generar el proyecto, pero no
para representar el horario final resuelto.

## Reconciliación de la muestra

La muestra anonimizada analizada contiene:

- 5 días y 15 tramos, tres de ellos descansos generales;
- 1721 actividades FET colocadas, agrupadas en 599 actividades lógicas FUSHE;
- 96 profesores utilizados;
- 152 conjuntos de estudiantes utilizados;
- 25 espacios definitivamente asignados;
- 1721 sesiones FUSHE: 1494 de docencia y 227 de guardia;
- ninguna referencia rota ni sesión en un día o tramo inexistente.

La carpeta original no se incorpora al repositorio público.

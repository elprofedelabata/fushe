# Mapeo de Peñalara GHC a FUSHE

## Estado

- Estado: implementación inicial.
- Muestra analizada: `ejemploDosMarcosHorariosR1.xrho`.
- Alcance: horario final resuelto.
- Fuera de alcance: reconstrucción del proyecto de planificación de Peñalara.

El archivo de muestra es un contenedor GZIP. Al descomprimirlo contiene una cabecera binaria, un documento XML `datosGHC` codificado en ISO-8859-1 y un bloque binario posterior. El conversor localiza el documento XML por sus etiquetas de apertura y cierre; no interpreta ni publica los bloques binarios.

## Correspondencia

| Peñalara | FUSHE | Regla |
| --- | --- | --- |
| `datosGHC/version` | `metadatos/origen/@version` | Se conserva como versión general del origen. |
| `marcosDeHorario/marcoHorario` | `perfiles/perfil` | Se genera un perfil por marco, respetando el orden de origen. |
| `marcoHorario/tramo` | `perfil/tramos/tramo/definicion` | Se agrupa por índice dentro del perfil. |
| `tramo/dia` | `definicion/@dias` | Se suma uno: Peñalara usa `0..4` y FUSHE `1..5`. |
| `tramo/horaEntrada` | `definicion/inicio` | Se conserva `HH:mm:ss`. |
| `tramo/horaSalida` | `definicion/fin` | Se conserva `HH:mm:ss`. |
| `tramo/Tipo` | `tramo/@tipo` | Se normaliza a minúsculas. |
| `tramo/clavX` | `tramo/referencia` | Se conserva como referencia visible. |
| `profesores/profesor` | `profesores/profesor` | Se usa el nombre completo cuando existe. |
| `grupos/grupo` | `grupos/grupo` | Solo se conserva el nombre. |
| Aula usada en `horario` | `espacios/espacio` | Solo se incorporan espacios definitivos realmente usados. |
| `sesionesLectivas/sesion` | `actividades/actividad tipo="docencia"` | Materia, profesor y grupos forman la actividad habitual. |
| `reuniones/reunion` | `actividad tipo="reunion"` | Sus integrantes son profesores habituales. |
| `guardias/guardia` | `actividad tipo="guardia"` | Los integrantes elegibles no se guardan; cada colocación contiene el profesor definitivo. |
| `complementarias/complementaria` | `actividad tipo="complementaria"` | La tarea da nombre a la actividad y el profesor es habitual. |
| `horario/tramo/aula` | `sesion` lectiva | Se conserva perfil, tramo, día, actividad, profesor efectivo y espacio. |
| `horario/tramo/reunion` | `sesion` de reunión | Los participantes se heredan de la actividad. |
| `horario/tramo/guardia` | `sesion` de guardia | El profesor asignado sustituye la lista de la actividad. |
| `horario/tramo/complementaria` | `sesion` complementaria | El profesor se hereda de la actividad. |

## Agrupación de tramos

Peñalara repite la definición de cada índice para cada día. FUSHE crea normalmente un único tramo por índice:

- Si inicio, fin, tipo y referencia coinciden todos los días, crea una sola `definicion` sin `dias`.
- Si cambian, agrupa en una definición los días que comparten las mismas horas.
- Si también cambian el tipo o la referencia, crea tramos diferentes para no perder esa diferencia.
- Si un tramo no existe un día, ese día no aparece en ninguna definición.

## Identificadores FUSHE

Los identificadores se generan en el orden del archivo para obtener una salida determinista:

- perfiles: `PH01`, `PH02`, etc.;
- tramos: `T01`, `T02`, etc., dentro de cada perfil;
- profesores: `P001`, `P002`, etc.;
- grupos: `G001`, `G002`, etc.;
- espacios: `E001`, `E002`, etc.;
- actividades: `A001`, `A002`, etc.;
- sesiones: `S001`, `S002`, etc.

Los números originales de Peñalara solo se emplean durante la conversión. No se escriben como identificadores externos en FUSHE.

## Espacios anónimos

La muestra contiene un espacio definitivo `6` con el atributo `anonima="general"` que no aparece en el catálogo de aulas. Como forma parte del horario resuelto, el conversor crea igualmente un espacio FUSHE con ese nombre. El conjunto `general` y el carácter anónimo pertenecen a la planificación y se omiten.

## Información descartada

Se descartan deliberadamente:

- departamentos;
- cursos y materias como catálogos independientes;
- tutores y aulas habituales;
- plantillas de disponibilidad;
- prioridades y preferencias;
- duración y distribución semanal deseadas;
- aulas candidatas y conjuntos de aulas;
- relaciones de simultaneidad, consecutividad o separación entre sesiones;
- criterios, penalizaciones y opciones del generador;
- rutas locales, nombres de equipo, informes y presentación.

## Reconciliación de la muestra

La conversión se considera correcta cuando produce:

- 2 perfiles con 8 y 9 tramos;
- 10 profesores;
- 4 grupos;
- 48 actividades: 38 lectivas, 3 reuniones, 3 guardias y 4 complementarias;
- 199 sesiones: 116 lectivas, 3 reuniones, 60 guardias y 20 complementarias;
- ninguna referencia rota ni sesión en un día o tramo inexistente.

La muestra original no se incorpora al repositorio público porque contiene datos personales y metadatos locales.

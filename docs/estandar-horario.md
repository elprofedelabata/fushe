# FUSHE — Formato Unificado Simplificado de Horarios Escolares

## Estado del documento

- Estado: borrador vivo.
- Revisión del documento: 0.2.
- Nombre acordado: FUSHE, Formato Unificado Simplificado de Horarios Escolares.
- Extensión acordada: `.fushe`.
- Identificador de cabecera acordado: `fushe`.
- Versión provisional del formato usada en los ejemplos: 1.0.
- El contenido marcado como **acordado** forma parte del núcleo actual.
- El contenido marcado como **propuesta** debe validarse con más archivos y aplicaciones.

Este documento describe FUSHE, un formato propio para representar horarios de forma independiente de Séneca, Peñalara, HorW, FET y otras aplicaciones. Irá evolucionando a partir de archivos reales producidos por esos programas.

## 1. Objetivo y alcance

El estándar debe permitir:

1. Convertir horarios procedentes de hojas de cálculo, texto, fotografías y programas de generación de horarios.
2. Representar un horario ya generado mediante conceptos comunes y referencias legibles.
3. Resolver las referencias canónicas contra los catálogos de una aplicación de destino.
4. Importar el horario en Séneca u otras aplicaciones mediante adaptadores independientes.
5. Conservar información que un destino no utilice para que pueda aprovecharla otro adaptador.

El estándar representa principalmente el **resultado de un horario**. No pretende representar inicialmente todo el problema de generación: preferencias, penalizaciones, huecos, restricciones de simultaneidad o reglas de optimización pertenecen a otro ámbito.

## 2. Principios de diseño

### 2.1. Independencia de las aplicaciones

Las referencias internas del formato no serán identificadores de Séneca, Peñalara ni ningún otro programa. Cada adaptador será responsable de relacionarlas con los identificadores del destino.

### 2.2. Conservación de información

Un adaptador puede no utilizar determinados campos, pero no debe eliminarlos al leer y volver a guardar un archivo canónico.

Al preparar una importación, el adaptador debería clasificar la información como:

- utilizada;
- ignorada por el destino;
- pendiente de correspondencia;
- incompatible con el destino.

### 2.3. Definición frente a colocación

Una **actividad** describe qué es, quién participa y qué se imparte.

Una **sesión** coloca una actividad en un día y un tramo determinados. Una misma actividad puede aparecer en varias sesiones semanales.

### 2.4. Referencias estables

Los elementos canónicos tendrán identificadores locales como `T01`, `A001` o `S001`. Los nombres visibles podrán cambiar sin romper las relaciones internas.

### 2.5. Complejidad opcional

Un horario sencillo debe poder escribirse con pocos campos. Los campos adicionales se añadirán al final o mediante líneas repetibles, sin obligar a rellenar columnas vacías innecesarias.

## 3. Convenciones del archivo

### 3.1. Codificación y líneas

**Propuesta:**

- Codificación UTF-8.
- Se aceptan finales de línea LF y CRLF.
- Las líneas vacías no tienen significado.
- Una línea cuyo primer carácter no blanco sea `#` es un comentario.

Los archivos FUSHE utilizan la extensión:

```text
.fushe
```

Ejemplo de nombre de archivo:

```text
horario-profesor.fushe
```

### 3.2. Separador

**Propuesta:** utilizar `|` como separador fijo.

```text
T01|1ª hora|08:00|09:00
```

Cuando un valor contenga `|`, comillas o saltos de línea, se utilizarán reglas equivalentes a CSV:

```text
T06|"Apoyo | refuerzo"|13:00|14:00
```

Una comilla incluida dentro de un campo entrecomillado se duplica:

```text
A001|"Actividad ""especial"""
```

Los espacios exteriores se eliminan. Los espacios situados dentro de un campo entrecomillado se conservan.

### 3.3. Cabecera y secciones

La primera línea identifica el formato y su versión:

```text
fushe|1.0
```

Las secciones generales se escriben entre corchetes:

```text
[estructura]
```

Las secciones que definen un elemento incluyen su identificador:

```text
[actividad A001]
```

## 4. Estructura general

### 4.1. Días

**Acordado:** por ahora, la sección `[estructura]` contiene únicamente los días activos.

```text
[estructura]
dias|1,2,3,4,5
```

La numeración es:

| Valor | Día |
| ---: | --- |
| 1 | Lunes |
| 2 | Martes |
| 3 | Miércoles |
| 4 | Jueves |
| 5 | Viernes |
| 6 | Sábado |
| 7 | Domingo |

Reglas acordadas:

- Solo se admiten valores entre `1` y `7`.
- Un día no puede aparecer repetido.
- El orden declarado determina el orden de presentación.
- El adaptador de destino debe advertir si no admite alguno de los días utilizados.

## 5. Marcos horarios

**Propuesta surgida del análisis de Peñalara.**

Un centro puede utilizar simultáneamente varios marcos con horas diferentes. La sección es opcional:

```text
[marcos]
M01|Marco A
M02|Marco B
```

Formato provisional:

```text
id|referencia
```

Si no se declara ningún marco, todos los tramos pertenecen implícitamente a un único marco predeterminado.

## 6. Tramos horarios

### 6.1. Forma mínima

**Acordado:** un tramo puede expresarse mediante identificador, referencia, hora inicial y hora final.

```text
[tramos]
# id|referencia|inicio|fin
T01|1ª hora|08:00|09:00
T02|2ª hora|09:00|10:00
T03|Recreo|10:00|10:30
```

Reglas:

- `id` y `referencia` son obligatorios.
- `inicio` y `fin` deben aparecer juntos o quedar ambos vacíos.
- Las horas se expresan provisionalmente como `HH:mm` en formato de 24 horas.
- Los identificadores de tramo no pueden repetirse.

También se admite provisionalmente un tramo sin horas conocidas:

```text
T01|Primera sesión
```

### 6.2. Forma ampliada

**Propuesta pendiente de ratificación:** añadir campos opcionales al final, conservando compatibles los cuatro primeros.

```text
# id|referencia|inicio|fin|tipo|dias|marco
T01|1ª hora|08:30|09:20|lectivo|1,2,3,4,5|M01
T02|Recreo 1|10:15|10:30|recreo|1,2,3,4,5|M01
T20|B1|09:00|09:50|lectivo|1,2,3,4,5|M02
```

Campos opcionales:

- `tipo`: naturaleza del tramo. Vocabulario inicial abierto: `lectivo`, `recreo`, `mediodia`, `transicion`, `otro`.
- `dias`: días concretos en los que existe el tramo. Si se omite, se aplican los días de `[estructura]`.
- `marco`: referencia a un elemento de `[marcos]`.

El vocabulario de `tipo` no debe cerrarse hasta analizar más programas.

## 7. Actividades

### 7.1. Modelo

**Propuesta:** cada actividad se define mediante un bloque para admitir campos repetibles sin crear una fila excesivamente larga.

```text
[actividad A001]
referencia|FIS-2BACH
nombre|Física - 2.º Bachillerato
categoria|lectiva
tipo|docencia
profesor|PEPE
asignacion|2BHA|2BACH-CYT|FIS
asignacion|2BHB|2BACH-CYT|FIS
asignacion|2BHC|2BACH-CYT|FIS
ubicacion||211
origen|penalara|ACT-347
```

### 7.2. Campos generales

| Campo | Cardinalidad | Descripción |
| --- | --- | --- |
| `referencia` | 0..1 | Código o nombre corto visible en el horario. |
| `nombre` | 0..1 | Descripción legible de la actividad. |
| `categoria` | 0..1 | Clasificación general, inicialmente `lectiva` o `no_lectiva`. |
| `tipo` | 0..1 | Concepto concreto: `docencia`, `guardia`, `reunion`, `coordinacion`, etc. |
| `profesor` | 0..n | Referencia de un docente participante. |
| `asignacion` | 0..n | Relación entre grupo, curso y materia. |
| `ubicacion` | 0..n | Ubicación predeterminada de la actividad. |
| `etiqueta` | 0..n | Clasificación adicional de significado abierto. |
| `origen` | 0..n | Sistema e identificador de procedencia. |
| `extra` | 0..n | Dato específico de una aplicación que debe conservarse. |

La obligatoriedad real depende del tipo de actividad y del adaptador de destino. Por ejemplo, Séneca puede exigir grupo, curso y materia para una actividad docente, pero no para una guardia.

### 7.3. Profesores

```text
profesor|PEPE
profesor|MARIA
```

El campo es repetible para permitir docencia compartida. Un adaptador de Séneca que importe el horario del usuario conectado puede ignorarlo, mientras que Peñalara o FET pueden utilizarlo.

### 7.4. Asignaciones académicas

Formato provisional:

```text
asignacion|grupo|curso|materia
```

Ejemplo:

```text
asignacion|2BHA|2BACH-CYT|FIS
asignacion|2BHB|2BACH-CYT|FIS
asignacion|2BHC|2BACH-CYT|FIS
```

Cada línea representa una relación independiente. Esto permite trasladar una clase con varios grupos a las asignaciones independientes que utiliza Séneca.

Los valores vacíos significan que el dato no se conoce o no resulta aplicable:

```text
asignacion|2BHA||FIS
```

### 7.5. Ubicación predeterminada

Formato provisional:

```text
ubicacion|edificio|aula
```

Ejemplos:

```text
ubicacion|EDIFICIO-A|AULA-12
ubicacion||211
```

La ubicación declarada en la actividad es un valor predeterminado. Una sesión concreta puede sobrescribirla con la ubicación finalmente asignada.

### 7.6. Procedencia y extensiones

```text
origen|penalara|ACT-347
extra|penalara|grupoMateriaTipo|N
```

Formato de `extra`:

```text
extra|sistema|clave|valor
```

Estos datos no condicionan a los demás adaptadores, pero permiten conservar información específica y diagnosticar la conversión.

### 7.7. Ejemplos

Actividad no lectiva:

```text
[actividad A002]
referencia|GM
nombre|Guardia de mañana
categoria|no_lectiva
tipo|guardia
profesor|PEPE
origen|penalara|GUARDIA-MANANA
```

Actividad con docencia compartida:

```text
[actividad A003]
referencia|MAT-1ESO-A
nombre|Matemáticas de 1.º ESO A
categoria|lectiva
tipo|docencia
profesor|PEPE
profesor|MARIA
asignacion|1ESOA|1ESO|MAT
ubicacion|EDIFICIO-A|AULA-12
```

## 8. Sesiones

**Propuesta:** una sesión representa una aparición concreta de una actividad en el horario.

### 8.1. Forma mínima

```text
[sesiones]
# id|dia|tramo|actividad
S001|4|T02|A001
S002|3|T05|A001
S003|1|T02|A002
```

Campos mínimos:

| Campo | Descripción |
| --- | --- |
| `id` | Identificador canónico de la sesión. |
| `dia` | Día canónico del `1` al `7`. |
| `tramo` | Identificador declarado en `[tramos]`. |
| `actividad` | Identificador de un bloque `[actividad …]`. |

### 8.2. Ubicación final

**Propuesta pendiente de ratificación:** permitir que una sesión indique su ubicación definitiva.

```text
# id|dia|tramo|actividad|edificio|aula
S001|1|T01|A001||A-1
S002|3|T21|A001||A-2
```

La ubicación de la sesión prevalece sobre la ubicación predeterminada de la actividad.

## 9. Validación

### 9.1. Validación general

El lector canónico debe comprobar como mínimo:

- versión reconocida;
- días válidos y no repetidos;
- identificadores únicos dentro de cada clase de elemento;
- referencias a tramos y actividades existentes;
- formato coherente de las horas;
- presencia simultánea de hora inicial y final;
- ausencia de campos obligatorios duplicados dentro de una actividad;
- sintaxis correcta de campos entrecomillados.

### 9.2. Validación del destino

Cada adaptador añadirá sus propias comprobaciones. Un archivo canónico puede ser válido aunque no sea importable directamente en un destino concreto.

Antes de modificar el destino, el adaptador debe mostrar:

- correspondencias resueltas;
- valores ambiguos;
- información requerida que falta;
- funciones o días no compatibles;
- datos que se ignorarán;
- conflictos con el horario existente;
- resultado previsto de conservar o sobrescribir el horario actual.

## 10. Correspondencia provisional con Séneca

| Concepto canónico | Elemento de Séneca |
| --- | --- |
| `dia` y `tramo` de la sesión | Celda `LUNES_n` … `VIERNES_n` y `X_TRAMO_n`. |
| `categoria` | Filtro `FILTRADO_ACTIVIDAD`. |
| `tipo` y referencias resueltas | Selector `X_ACTIVIDAD`. |
| grupo de `asignacion` | `X_UNIDAD`. |
| curso de `asignacion` | `X_OFERTAMATRIC`. |
| materia de `asignacion` | `X_MATERIAOMG`. |
| edificio | `X_EDIFICIO`. |
| aula | `X_DEPENDENCIA`. |
| varias `asignacion` | Varios registros `TRAMO` en la misma celda. |
| `profesor` | No se utiliza al importar el horario del usuario conectado. |
| `origen` y `extra` | No se utilizan para escribir en Séneca. |

Los identificadores dinámicos de Séneca se resolverán durante la importación y no se almacenarán como identificadores canónicos.

## 11. Hallazgos de la muestra de Peñalara

Archivo analizado: `ejemploDosMarcosHorariosR1.xrho`.

- La muestra no está cifrada.
- Es un contenedor GZIP.
- Tras una cabecera binaria de 7 bytes contiene XML en ISO-8859-1.
- El XML tiene como raíz `datosGHC` y declara la versión `20230206`.
- Después del XML existe un bloque binario relacionado aparentemente con informes y presentación.
- Contiene dos marcos horarios con tramos diferentes.
- Peñalara numera los días de `0` a `4`; el adaptador debe convertirlos a `1` a `5`.
- Los tramos se definen por marco, día e índice e incluyen inicio, fin, tipo y referencia.
- Las sesiones lectivas contienen materia, grupo, profesor, duración, distribución, aulas candidatas, tarea y relaciones con otros grupos.
- El horario resuelto almacena por separado la colocación concreta: marco, día, índice, aula, sesión y profesor.
- También existen reuniones, guardias y actividades complementarias con estructuras diferentes.
- Las preferencias y restricciones de generación no son necesarias para obtener el horario final de un profesor.

Consecuencia para el estándar: el marco horario debe poder conservarse, y la ubicación final debe poder pertenecer a la sesión en vez de quedar fijada exclusivamente en la actividad.

## 12. Extensiones posibles todavía no diseñadas

Estas posibilidades se registran para no bloquear una ampliación futura, pero todavía no forman parte del formato:

- Catálogos independientes de profesores, grupos, cursos, materias, edificios y aulas.
- Alias y reglas de correspondencia entre referencias de diferentes aplicaciones.
- Fechas de vigencia y semanas alternas.
- Calendarios con ciclos superiores a una semana.
- Sesiones que ocupen varios tramos consecutivos.
- Sustituciones o sobrescrituras por sesión de profesores, grupos o materias.
- Varias ubicaciones simultáneas.
- Actividades sin hora concreta.
- Identificadores de centro, curso académico y propietario del horario.
- Procedencia por campo y fragmento original del que se extrajo el dato.
- Representación de incertidumbre procedente de OCR o importaciones ambiguas.
- Vocabularios normalizados para categorías, tipos de actividad y tipos de tramo.
- Restricciones de generación, si en el futuro se define un estándar diferente para proyectos de planificación.

## 13. Ejemplo completo provisional

```text
fushe|1.0

[estructura]
dias|1,2,3,4,5

[marcos]
M01|Marco general

[tramos]
# id|referencia|inicio|fin|tipo|dias|marco
T01|1ª hora|08:00|09:00|lectivo|1,2,3,4,5|M01
T02|2ª hora|09:00|10:00|lectivo|1,2,3,4,5|M01
T03|Recreo|10:00|10:30|recreo|1,2,3,4,5|M01
T04|3ª hora|10:30|11:30|lectivo|1,2,3,4,5|M01

[actividad A001]
referencia|FIS-2BACH
nombre|Física - 2.º Bachillerato
categoria|lectiva
tipo|docencia
profesor|PEPE
asignacion|2BHA|2BACH-CYT|FIS
asignacion|2BHB|2BACH-CYT|FIS
asignacion|2BHC|2BACH-CYT|FIS
ubicacion||211

[actividad A002]
referencia|GM
nombre|Guardia de mañana
categoria|no_lectiva
tipo|guardia
profesor|PEPE

[sesiones]
# id|dia|tramo|actividad|edificio|aula
S001|4|T02|A001||211
S002|3|T04|A001||211
S003|1|T02|A002||
```

## 14. Decisiones abiertas

1. Confirmar definitivamente el carácter `|` como separador.
2. Confirmar la sintaxis de comillas y escapes.
3. Decidir si los marcos deben ser entidades explícitas o simples atributos de los tramos.
4. Validar el orden de los campos opcionales de `[tramos]` con HorW y FET.
5. Definir un vocabulario inicial de `categoria` y `tipo` sin hacerlo dependiente de Séneca.
6. Decidir si `ubicacion` debe existir también en la actividad o únicamente en la sesión.
7. Decidir cómo representar una sesión que ocupe varios tramos.
8. Decidir cómo preservar datos desconocidos de secciones futuras.
9. Preparar ejemplos canónicos obtenidos de cada programa analizado.

## 15. Historial

### Revisión 0.2

- Adopción del nombre FUSHE: Formato Unificado Simplificado de Horarios Escolares.
- Adopción de la extensión `.fushe`.
- Adopción de `fushe` como identificador de cabecera.
- Actualización de los ejemplos completos.

### Revisión 0.1

- Creación del documento.
- Incorporación de días, tramos, actividades y sesiones.
- Incorporación provisional de marcos horarios.
- Registro de correspondencias conocidas con Séneca.
- Registro de hallazgos obtenidos de una muestra `.xrho` de Peñalara.

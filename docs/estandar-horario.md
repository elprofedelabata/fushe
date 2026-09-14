# FUSHE — Formato Unificado Simplificado de Horarios Escolares

## Estado del documento

- Estado: borrador vivo.
- Revisión del documento: 0.3.
- Nombre acordado: FUSHE, Formato Unificado Simplificado de Horarios Escolares.
- Extensión acordada: `.fushe`.
- Representación canónica acordada: XML.
- Versión provisional del formato usada en los ejemplos: 1.0.
- El contenido marcado como **acordado** forma parte del núcleo actual.
- El contenido marcado como **propuesta** debe validarse con más archivos y aplicaciones.

Este documento describe FUSHE, un formato para representar horarios escolares de forma independiente de Séneca, Peñalara, HorW, FET y otras aplicaciones. Evolucionará mediante el análisis de archivos reales producidos por esos programas.

## 1. Objetivo y alcance

FUSHE debe permitir:

1. Convertir horarios procedentes de hojas de cálculo, texto, fotografías y programas de generación de horarios.
2. Representar un horario ya generado mediante conceptos comunes y referencias legibles.
3. Resolver las referencias canónicas contra los catálogos de una aplicación de destino.
4. Importar el horario en Séneca u otras aplicaciones mediante adaptadores independientes.
5. Conservar información que un destino no utilice para que pueda aprovecharla otro adaptador.

FUSHE representa principalmente el **resultado de un horario**. No pretende describir inicialmente todo el problema de generación: preferencias, penalizaciones, huecos, restricciones de simultaneidad o reglas de optimización pertenecen a otro ámbito.

## 2. Principios de diseño

### 2.1. Independencia de las aplicaciones

Las referencias internas de FUSHE no serán identificadores de Séneca, Peñalara ni ningún otro programa. Cada adaptador será responsable de relacionarlas con los identificadores del origen o del destino.

### 2.2. Una única representación canónica

**Acordado:** todo archivo `.fushe` es un documento XML.

Excel, CSV, fotografías, portapapeles y formatos de terceros son fuentes de importación. No son representaciones alternativas de FUSHE.

### 2.3. Conservación de información

Un adaptador puede no utilizar determinados datos, pero no debería eliminarlos al leer y volver a guardar un archivo FUSHE.

Al preparar una importación, el adaptador debería clasificar la información como:

- utilizada;
- ignorada por el destino;
- pendiente de correspondencia;
- incompatible con el destino.

### 2.4. Definición frente a colocación

Una **actividad** describe qué es, quién participa y qué se imparte.

Una **sesión** coloca una actividad en un día y un tramo determinados. Una misma actividad puede aparecer en varias sesiones semanales.

### 2.5. Referencias estables

Los elementos canónicos tienen identificadores locales como `T01`, `A001` o `S001`. Los nombres visibles pueden cambiar sin romper sus relaciones internas.

### 2.6. Complejidad opcional

Un horario sencillo debe poder representarse con pocos elementos. Las características avanzadas se incorporarán mediante elementos y atributos opcionales.

## 3. Documento XML

### 3.1. Archivo

**Acordado:**

- Extensión: `.fushe`.
- XML 1.0.
- Codificación: UTF-8.
- Tipo MIME inicial: `application/xml`.
- Elemento raíz: `fushe`.

Ejemplo de nombre:

```text
horario-profesor.fushe
```

Todo archivo comienza con una declaración XML:

```xml
<?xml version="1.0" encoding="UTF-8"?>
```

No se recomienda escribir una marca BOM al comienzo de un archivo UTF-8.

### 3.2. Raíz

La raíz declara la versión del formato:

```xml
<fushe version="1.0">
  <!-- contenido -->
</fushe>
```

El número de versión pertenece al formato FUSHE, no a la aplicación que lo genera ni a la versión de la librería de referencia.

### 3.3. Orden canónico

**Propuesta:** los elementos principales aparecen en este orden:

```xml
<fushe version="1.0">
  <metadatos/>
  <estructura/>
  <marcos/>
  <tramos/>
  <actividades/>
  <sesiones/>
  <extensiones/>
</fushe>
```

Todos salvo `estructura`, `tramos`, `actividades` y `sesiones` pueden omitirse cuando no sean necesarios.

### 3.4. Convenciones de nombres

**Propuesta:**

- Los nombres de elementos y atributos se escriben en español, en minúsculas y sin tildes.
- Los identificadores, referencias breves y valores enumerados se expresan mediante atributos.
- Los nombres completos, descripciones y texto libre se expresan mediante contenido de elementos.
- Los booleanos utilizan exclusivamente `true` y `false`.
- El espacio en blanco usado para indentar no tiene significado.
- Los comentarios XML no forman parte del modelo de datos.

### 3.5. Identificadores

**Propuesta:** los identificadores locales:

- son únicos dentro de su clase;
- comienzan por una letra;
- pueden contener letras ASCII, números, guion, guion bajo y punto;
- distinguen mayúsculas de minúsculas.

Ejemplos recomendados:

```text
M01
T01
A001
S001
```

## 4. Estructura semanal

### 4.1. Días

**Acordado:** la estructura contiene inicialmente los días activos.

```xml
<estructura>
  <dias>
    <dia numero="1"/>
    <dia numero="2"/>
    <dia numero="3"/>
    <dia numero="4"/>
    <dia numero="5"/>
  </dias>
</estructura>
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

Reglas:

- Solo se admiten valores entre `1` y `7`.
- Un día no puede aparecer repetido.
- El orden de los elementos `dia` determina el orden de presentación.
- El adaptador de destino debe advertir si no admite alguno de los días utilizados.

## 5. Marcos horarios

**Propuesta surgida del análisis de Peñalara.**

Un centro puede utilizar simultáneamente varios marcos con horas diferentes:

```xml
<marcos>
  <marco id="M01">
    <referencia>Marco A</referencia>
  </marco>
  <marco id="M02">
    <referencia>Marco B</referencia>
  </marco>
</marcos>
```

Si no se declara `marcos`, todos los tramos pertenecen implícitamente a un único marco predeterminado.

## 6. Tramos horarios

### 6.1. Tramo mínimo

```xml
<tramos>
  <tramo id="T01">
    <referencia>1ª hora</referencia>
    <inicio>08:00:00</inicio>
    <fin>09:00:00</fin>
  </tramo>
</tramos>
```

Reglas propuestas:

- El atributo `id` y el elemento `referencia` son obligatorios.
- `inicio` y `fin` deben aparecer juntos o quedar ambos ausentes.
- Las horas utilizan el formato de 24 horas `HH:mm:ss`, compatible con el tipo `xs:time` de XML Schema.
- Los identificadores de tramo no pueden repetirse.

Un tramo sin horas conocidas puede expresarse así:

```xml
<tramo id="T01">
  <referencia>Primera sesión</referencia>
</tramo>
```

### 6.2. Tipo, días y marco

```xml
<tramo id="T01" tipo="lectivo" marco="M01">
  <referencia>1ª hora</referencia>
  <inicio>08:30:00</inicio>
  <fin>09:20:00</fin>
  <dias>
    <dia numero="1"/>
    <dia numero="2"/>
    <dia numero="3"/>
    <dia numero="4"/>
    <dia numero="5"/>
  </dias>
</tramo>
```

Campos opcionales:

- `tipo`: naturaleza del tramo. Vocabulario inicial abierto: `lectivo`, `recreo`, `mediodia`, `transicion`, `otro`.
- `marco`: referencia a un elemento de `marcos`.
- `dias`: días concretos en los que existe. Si se omite, se aplican los días de `estructura`.

El vocabulario de `tipo` no debe cerrarse hasta analizar más programas.

## 7. Actividades

### 7.1. Modelo general

```xml
<actividades>
  <actividad id="A001" categoria="lectiva" tipo="docencia">
    <referencia>FIS-2BACH</referencia>
    <nombre>Física - 2.º Bachillerato</nombre>

    <profesores>
      <profesor ref="PEPE"/>
    </profesores>

    <asignaciones>
      <asignacion grupo="2BHA" curso="2BACH-CYT" materia="FIS"/>
      <asignacion grupo="2BHB" curso="2BACH-CYT" materia="FIS"/>
      <asignacion grupo="2BHC" curso="2BACH-CYT" materia="FIS"/>
    </asignaciones>

    <ubicaciones>
      <ubicacion aula="211"/>
    </ubicaciones>

    <origen sistema="penalara" id="ACT-347"/>
  </actividad>
</actividades>
```

### 7.2. Campos generales

| Elemento o atributo | Cardinalidad | Descripción |
| --- | --- | --- |
| `actividad/@id` | 1 | Identificador canónico de la actividad. |
| `actividad/@categoria` | 0..1 | Clasificación general, inicialmente `lectiva` o `no_lectiva`. |
| `actividad/@tipo` | 0..1 | Concepto concreto: `docencia`, `guardia`, `reunion`, `coordinacion`, etc. |
| `referencia` | 0..1 | Código o nombre corto visible en el horario. |
| `nombre` | 0..1 | Descripción legible de la actividad. |
| `profesores/profesor` | 0..n | Referencias de docentes participantes. |
| `asignaciones/asignacion` | 0..n | Relaciones entre grupo, curso y materia. |
| `ubicaciones/ubicacion` | 0..n | Ubicaciones predeterminadas o posibles. |
| `etiquetas/etiqueta` | 0..n | Clasificaciones adicionales. |
| `origen` | 0..n | Sistema e identificador de procedencia. |
| `extensiones` | 0..1 | Información específica que debe conservarse. |

La obligatoriedad real depende del tipo de actividad y del adaptador de destino. Séneca puede exigir grupo, curso y materia para una actividad docente, pero no para una guardia.

### 7.3. Profesores

```xml
<profesores>
  <profesor ref="PEPE"/>
  <profesor ref="MARIA"/>
</profesores>
```

La colección permite docencia compartida. Un adaptador de Séneca que importe el horario del usuario conectado puede ignorarla, mientras que otros programas pueden utilizarla.

### 7.4. Asignaciones académicas

```xml
<asignaciones>
  <asignacion grupo="2BHA" curso="2BACH-CYT" materia="FIS"/>
  <asignacion grupo="2BHB" curso="2BACH-CYT" materia="FIS"/>
  <asignacion grupo="2BHC" curso="2BACH-CYT" materia="FIS"/>
</asignaciones>
```

Cada `asignacion` representa una relación independiente. Esto permite trasladar una clase con varios grupos a las asignaciones independientes utilizadas por Séneca.

Los atributos opcionales pueden omitirse:

```xml
<asignacion grupo="2BHA" materia="FIS"/>
```

### 7.5. Ubicación predeterminada

```xml
<ubicaciones>
  <ubicacion edificio="EDIFICIO-A" aula="AULA-12"/>
  <ubicacion aula="211"/>
</ubicaciones>
```

Una ubicación de la actividad puede ser un valor predeterminado o una posibilidad procedente de un generador. La ubicación definitiva de una sesión prevalece sobre ella.

### 7.6. Actividad no lectiva

```xml
<actividad id="A002" categoria="no_lectiva" tipo="guardia">
  <referencia>GM</referencia>
  <nombre>Guardia de mañana</nombre>
  <profesores>
    <profesor ref="PEPE"/>
  </profesores>
  <origen sistema="penalara" id="GUARDIA-MANANA"/>
</actividad>
```

## 8. Sesiones

Una sesión representa una aparición concreta de una actividad en el horario.

### 8.1. Sesión mínima

```xml
<sesiones>
  <sesion id="S001" dia="4" tramo="T02" actividad="A001"/>
  <sesion id="S002" dia="3" tramo="T05" actividad="A001"/>
  <sesion id="S003" dia="1" tramo="T02" actividad="A002"/>
</sesiones>
```

| Atributo | Descripción |
| --- | --- |
| `id` | Identificador canónico de la sesión. |
| `dia` | Día canónico del `1` al `7`. |
| `tramo` | Identificador declarado en `tramos`. |
| `actividad` | Identificador declarado en `actividades`. |

### 8.2. Ubicación final

```xml
<sesion id="S001" dia="1" tramo="T01" actividad="A001">
  <ubicacion aula="A-1"/>
</sesion>
```

La ubicación de la sesión prevalece sobre cualquier ubicación declarada en la actividad.

### 8.3. Procedencia de la sesión

```xml
<sesion id="S001" dia="1" tramo="T01" actividad="A001">
  <ubicacion aula="A-1"/>
  <origen sistema="penalara" id="SESION-34"/>
</sesion>
```

## 9. Metadatos, procedencia y extensiones

### 9.1. Metadatos del documento

**Propuesta:**

```xml
<metadatos>
  <titulo>Horario de Pepe</titulo>
  <creado>2026-09-14T19:00:00+02:00</creado>
  <generador nombre="FUSHE Core" version="0.1.0"/>
  <origen sistema="penalara" archivo="horario.xrho"/>
</metadatos>
```

No debe almacenarse información personal innecesaria.

### 9.2. Extensiones

Mientras no se diseñen namespaces de extensión, se propone un contenedor explícito:

```xml
<extensiones>
  <extension sistema="penalara" clave="grupoMateriaTipo">N</extension>
</extensiones>
```

Los adaptadores que no comprendan una extensión pueden ignorarla semánticamente, pero deberían conservarla durante una lectura y escritura.

### 9.3. Namespace XML

El namespace canónico queda pendiente hasta elegir una dirección estable para publicar los esquemas. Añadirlo antes de la primera versión estable será una decisión potencialmente incompatible y deberá documentarse.

## 10. Validación

### 10.1. XML bien formado

Todo archivo `.fushe` debe ser XML bien formado. Un error de sintaxis XML impide procesar el documento.

### 10.2. Validación general

La librería de referencia debe comprobar como mínimo:

- versión reconocida;
- días válidos y no repetidos;
- identificadores únicos dentro de cada clase;
- referencias a marcos, tramos y actividades existentes;
- formato coherente de las horas;
- presencia simultánea de hora inicial y final;
- atributos obligatorios;
- cardinalidad de elementos;
- ubicación de los elementos en el orden definido por el esquema.

### 10.3. XML Schema

Se publicará un archivo `fushe.xsd` cuando el modelo básico esté suficientemente validado con aplicaciones reales.

El esquema permitirá:

- validar documentos sin utilizar la librería oficial;
- generar tipos y clases en diferentes lenguajes;
- documentar cardinalidades y tipos;
- reservar puntos de extensión.

### 10.4. Validación del destino

Un archivo FUSHE puede ser válido aunque no sea importable directamente en un destino concreto.

Antes de modificar el destino, el adaptador debe mostrar:

- correspondencias resueltas;
- valores ambiguos;
- información requerida que falta;
- funciones o días no compatibles;
- datos que se ignorarán;
- conflictos con el horario existente;
- resultado previsto de conservar o sobrescribir el horario actual.

## 11. Correspondencia provisional con Séneca

| Concepto FUSHE | Elemento de Séneca |
| --- | --- |
| `sesion/@dia` y `sesion/@tramo` | Celda `LUNES_n` … `VIERNES_n` y `X_TRAMO_n`. |
| `actividad/@categoria` | Filtro `FILTRADO_ACTIVIDAD`. |
| `actividad/@tipo` y referencias resueltas | Selector `X_ACTIVIDAD`. |
| `asignacion/@grupo` | `X_UNIDAD`. |
| `asignacion/@curso` | `X_OFERTAMATRIC`. |
| `asignacion/@materia` | `X_MATERIAOMG`. |
| `ubicacion/@edificio` | `X_EDIFICIO`. |
| `ubicacion/@aula` | `X_DEPENDENCIA`. |
| Varias `asignacion` | Varios registros `TRAMO` en la misma celda. |
| `profesores` | No se utiliza al importar el horario del usuario conectado. |
| `origen` y `extensiones` | No se utilizan para escribir en Séneca. |

Los identificadores dinámicos de Séneca se resuelven durante la importación y no se almacenan como identificadores canónicos.

## 12. Hallazgos de la muestra de Peñalara

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

Consecuencia para FUSHE: el marco horario debe poder conservarse y la ubicación final debe poder pertenecer a la sesión.

## 13. Seguridad

Las implementaciones deben:

- rechazar documentos con DTD;
- desactivar entidades externas;
- impedir accesos a red o al sistema de archivos durante el análisis XML;
- limitar razonablemente el tamaño del documento, la profundidad y el número de elementos;
- no ejecutar contenido almacenado en texto, comentarios o extensiones;
- tratar todas las referencias procedentes del archivo como datos no confiables.

Estas medidas evitan ataques XXE, expansión de entidades y agotamiento de recursos.

## 14. Extensiones posibles todavía no diseñadas

Estas posibilidades se registran sin incorporarlas todavía al formato:

- Catálogos independientes de profesores, grupos, cursos, materias, edificios y aulas.
- Alias y reglas de correspondencia entre aplicaciones.
- Fechas de vigencia y semanas alternas.
- Calendarios con ciclos superiores a una semana.
- Sesiones que ocupen varios tramos consecutivos.
- Sustituciones por sesión de profesores, grupos o materias.
- Varias ubicaciones simultáneas.
- Actividades sin hora concreta.
- Identificadores de centro, curso académico y propietario del horario.
- Procedencia por campo y fragmento original del que se extrajo el dato.
- Representación de incertidumbre procedente de OCR o importaciones ambiguas.
- Vocabularios normalizados para categorías, actividades y tipos de tramo.
- Namespaces XML para extensiones desarrolladas por terceros.
- Restricciones de generación, si en el futuro se define otro estándar para proyectos de planificación.

## 15. Ejemplo completo provisional

```xml
<?xml version="1.0" encoding="UTF-8"?>
<fushe version="1.0">
  <metadatos>
    <titulo>Horario de Pepe</titulo>
    <generador nombre="Ejemplo FUSHE" version="0.1.0"/>
  </metadatos>

  <estructura>
    <dias>
      <dia numero="1"/>
      <dia numero="2"/>
      <dia numero="3"/>
      <dia numero="4"/>
      <dia numero="5"/>
    </dias>
  </estructura>

  <marcos>
    <marco id="M01">
      <referencia>Marco general</referencia>
    </marco>
  </marcos>

  <tramos>
    <tramo id="T01" tipo="lectivo" marco="M01">
      <referencia>1ª hora</referencia>
      <inicio>08:00:00</inicio>
      <fin>09:00:00</fin>
    </tramo>
    <tramo id="T02" tipo="lectivo" marco="M01">
      <referencia>2ª hora</referencia>
      <inicio>09:00:00</inicio>
      <fin>10:00:00</fin>
    </tramo>
    <tramo id="T03" tipo="recreo" marco="M01">
      <referencia>Recreo</referencia>
      <inicio>10:00:00</inicio>
      <fin>10:30:00</fin>
    </tramo>
  </tramos>

  <actividades>
    <actividad id="A001" categoria="lectiva" tipo="docencia">
      <referencia>FIS-2BACH</referencia>
      <nombre>Física - 2.º Bachillerato</nombre>
      <profesores>
        <profesor ref="PEPE"/>
      </profesores>
      <asignaciones>
        <asignacion grupo="2BHA" curso="2BACH-CYT" materia="FIS"/>
        <asignacion grupo="2BHB" curso="2BACH-CYT" materia="FIS"/>
        <asignacion grupo="2BHC" curso="2BACH-CYT" materia="FIS"/>
      </asignaciones>
      <ubicaciones>
        <ubicacion aula="211"/>
      </ubicaciones>
    </actividad>

    <actividad id="A002" categoria="no_lectiva" tipo="guardia">
      <referencia>GM</referencia>
      <nombre>Guardia de mañana</nombre>
      <profesores>
        <profesor ref="PEPE"/>
      </profesores>
    </actividad>
  </actividades>

  <sesiones>
    <sesion id="S001" dia="4" tramo="T02" actividad="A001">
      <ubicacion aula="211"/>
    </sesion>
    <sesion id="S002" dia="3" tramo="T01" actividad="A001">
      <ubicacion aula="211"/>
    </sesion>
    <sesion id="S003" dia="1" tramo="T02" actividad="A002"/>
  </sesiones>
</fushe>
```

## 16. Decisiones abiertas

1. Elegir y publicar el namespace XML canónico.
2. Validar el modelo con muestras de HorW y FET.
3. Definir un vocabulario inicial de `categoria` y `tipo` sin hacerlo dependiente de Séneca.
4. Decidir si las ubicaciones de una actividad son predeterminadas, posibles o ambas mediante elementos distintos.
5. Decidir cómo representar una sesión que ocupe varios tramos.
6. Diseñar catálogos reutilizables de profesores, grupos, materias y espacios.
7. Diseñar el mecanismo definitivo de extensiones y conservación de elementos desconocidos.
8. Preparar el primer XML Schema.
9. Preparar ejemplos canónicos obtenidos de cada programa analizado.

## 17. Historial

### Revisión 0.3

- Adopción de XML como única representación canónica de los archivos `.fushe`.
- Retirada de la sintaxis propia basada en el separador `|`.
- Conversión de todos los ejemplos a XML.
- Incorporación de convenciones y requisitos de seguridad para el procesamiento XML.
- Registro del futuro esquema `fushe.xsd`.

### Revisión 0.2

- Adopción del nombre FUSHE: Formato Unificado Simplificado de Horarios Escolares.
- Adopción de la extensión `.fushe`.
- Adopción de `fushe` como identificador de cabecera de la sintaxis inicial, retirado en la revisión 0.3.

### Revisión 0.1

- Creación del documento.
- Incorporación de días, tramos, actividades y sesiones.
- Incorporación provisional de marcos horarios.
- Registro de correspondencias conocidas con Séneca.
- Registro de hallazgos obtenidos de una muestra `.xrho` de Peñalara.

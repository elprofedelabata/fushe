# FUSHE — Formato Unificado Simplificado de Horarios Escolares

## Estado del documento

- Estado: borrador vivo.
- Revisión del documento: 0.5.
- Nombre: FUSHE, Formato Unificado Simplificado de Horarios Escolares.
- Extensión: `.fushe`.
- Representación canónica: XML.
- Versión provisional del formato usada en los ejemplos: 1.0.

Este documento describe un formato independiente de Séneca, Peñalara, HorW, FET y otras aplicaciones. El modelo seguirá contrastándose con archivos reales antes de publicar su primera versión estable.

## 1. Objetivo y alcance

FUSHE representa el **resultado de un horario escolar**: qué actividad se realiza, qué día y a qué hora, quién participa y dónde tiene lugar.

Debe permitir:

1. Convertir horarios procedentes de hojas de cálculo, texto, fotografías y programas de generación.
2. Intercambiar horarios ya resueltos sin depender de una aplicación concreta.
3. Conservar varios perfiles horarios, participantes, grupos y espacios.
4. Resolver sus referencias contra los catálogos de una aplicación de destino.
5. Servir como base para adaptadores de Séneca y otros programas.

FUSHE no describe inicialmente el problema de planificación que produjo el horario. Quedan fuera del núcleo:

- preferencias y prohibiciones horarias;
- aulas candidatas o preferentes;
- distribuciones semanales deseadas;
- penalizaciones y criterios de optimización;
- relaciones de simultaneidad o consecutividad usadas por un generador;
- formatos de informes y configuración interna de una aplicación.

La conversión desde un proyecto de planificación puede ser completa respecto al horario final aunque omita esos datos auxiliares.

## 2. Principios de diseño

### 2.1. Independencia de las aplicaciones

Los identificadores internos de FUSHE no son identificadores de Séneca, Peñalara ni ningún otro programa. Cada adaptador relaciona las referencias FUSHE con los datos del origen o del destino.

La versión inicial no conserva identificadores externos por elemento. Esa posibilidad se reserva para una futura extensión más compleja.

### 2.2. Una única representación canónica

Todo archivo `.fushe` es un documento XML.

Excel, CSV, fotografías, portapapeles y formatos de terceros son fuentes de importación. No son representaciones alternativas de FUSHE.

### 2.3. Definición frente a colocación

Una **actividad** describe lo que ocurre y sus participantes habituales. Puede ser una clase, guardia, reunión, tutoría, coordinación u otra actividad.

Una **sesión** coloca una actividad concreta en un día y un tramo de un perfil horario. Una misma actividad puede aparecer en varias sesiones semanales.

### 2.4. Catálogos mínimos

Profesores, grupos y espacios tienen catálogos independientes para poder referenciarlos sin repetir sus nombres.

Los catálogos contienen solamente información necesaria para interpretar el horario final. Por ejemplo, un grupo necesita inicialmente un identificador y un nombre, pero no su tutor, aula habitual ni preferencias de planificación.

### 2.5. Complejidad opcional

Un horario sencillo debe poder escribirse con pocos elementos. Las listas permiten representar casos con varios profesores, grupos o espacios sin complicar el caso habitual de un único participante.

## 3. Documento XML

### 3.1. Archivo

- XML 1.0.
- Codificación UTF-8.
- Extensión `.fushe`.
- Tipo MIME inicial `application/xml`.
- Elemento raíz `fushe`.

Todo archivo comienza con:

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

El número corresponde al formato FUSHE, no a la aplicación generadora ni a la versión de una librería.

### 3.3. Orden canónico

Los elementos principales aparecen en este orden:

```xml
<fushe version="1.0">
  <metadatos/>
  <estructura/>
  <perfiles/>
  <profesores/>
  <grupos/>
  <espacios/>
  <actividades/>
  <sesiones/>
  <extensiones/>
</fushe>
```

`metadatos`, `profesores`, `grupos`, `espacios` y `extensiones` pueden omitirse cuando estén vacíos. `estructura`, `perfiles`, `actividades` y `sesiones` forman el núcleo del documento.

### 3.4. Convenciones de nombres

- Los nombres de elementos y atributos se escriben en español, en minúsculas y sin tildes.
- Los identificadores, referencias y valores enumerados se expresan mediante atributos.
- Los nombres completos, descripciones y texto libre se expresan mediante elementos.
- Los booleanos utilizan exclusivamente `true` y `false`.
- El espacio usado para indentar no tiene significado.
- Los comentarios XML no forman parte del modelo de datos.

### 3.5. Identificadores

Los identificadores locales:

- son únicos dentro de su clase;
- comienzan por una letra;
- pueden contener letras ASCII, números, guion, guion bajo y punto;
- distinguen mayúsculas de minúsculas.

Ejemplos recomendados:

```text
PH01
T01
P001
G001
E001
A001
S001
```

Los identificadores de tramo son únicos dentro de su perfil. Una referencia completa a un tramo está formada por `perfil` y `tramo`.

## 4. Estructura semanal

La estructura declara los días que puede utilizar el horario:

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

La numeración canónica es:

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
- Un día no puede repetirse.
- El orden de los elementos determina el orden de presentación.
- Un adaptador debe advertir si el destino no admite alguno de los días utilizados.

## 5. Perfiles horarios

Un perfil reúne los tramos aplicables a una parte del horario. Permite que un centro utilice simultáneamente estructuras horarias diferentes.

```xml
<perfiles>
  <perfil id="PH01">
    <nombre>Horario general</nombre>
    <tramos>
      <tramo id="T01" tipo="lectivo">
        <referencia>1.ª hora</referencia>
        <definicion>
          <inicio>08:00:00</inicio>
          <fin>09:00:00</fin>
        </definicion>
      </tramo>
    </tramos>
  </perfil>
</perfiles>
```

Cada perfil contiene uno o más tramos. No existen tramos globales fuera de los perfiles.

### 5.1. Tramos

Un tramo contiene:

| Elemento o atributo | Cardinalidad | Descripción |
| --- | ---: | --- |
| `tramo/@id` | 1 | Identificador único dentro del perfil. |
| `tramo/@tipo` | 0..1 | Naturaleza del tramo. |
| `referencia` | 1 | Nombre breve, como `1.ª hora` o `Recreo`. |
| `definicion` | 1..n | Horario del tramo para uno o varios días. |

El vocabulario inicial de `tipo` permanece abierto. Algunos valores previsibles son `lectivo`, `recreo`, `mediodia`, `transicion` y `otro`.

### 5.2. Horario común y variaciones por día

Una definición sin el atributo `dias` se aplica a todos los días declarados en `estructura`:

```xml
<tramo id="T01" tipo="lectivo">
  <referencia>1.ª hora</referencia>
  <definicion>
    <inicio>08:00:00</inicio>
    <fin>09:00:00</fin>
  </definicion>
</tramo>
```

Cuando las horas cambian según el día, se escriben varias definiciones:

```xml
<tramo id="T01" tipo="lectivo">
  <referencia>1.ª hora</referencia>
  <definicion dias="1 2 3 4">
    <inicio>08:00:00</inicio>
    <fin>09:00:00</fin>
  </definicion>
  <definicion dias="5">
    <inicio>08:30:00</inicio>
    <fin>09:30:00</fin>
  </definicion>
</tramo>
```

Reglas:

- `dias` es una lista separada por espacios de números declarados en `estructura`.
- Dos definiciones del mismo tramo no pueden incluir el mismo día.
- Si una definición omite `dias`, debe ser la única definición del tramo.
- `inicio` y `fin` son obligatorios y usan el formato de 24 horas `HH:mm:ss`.
- Una sesión no puede utilizar un tramo en un día para el que no exista definición.

## 6. Profesores

El catálogo de profesores es opcional y utiliza un modelo mínimo:

```xml
<profesores>
  <profesor id="P001">
    <nombre>Pepe Pérez</nombre>
  </profesor>
  <profesor id="P002">
    <nombre>María García</nombre>
  </profesor>
</profesores>
```

Cada profesor tiene un `id` y un `nombre`. Departamentos, preferencias horarias y prioridades de generación quedan fuera del núcleo.

## 7. Grupos

El catálogo de grupos es opcional y también utiliza un modelo mínimo:

```xml
<grupos>
  <grupo id="G001">
    <nombre>2.º BHA</nombre>
  </grupo>
</grupos>
```

Cada grupo tiene únicamente un `id` y un `nombre`. El curso, la enseñanza, el tutor, el perfil predeterminado y el aula habitual no forman parte de la versión inicial.

Un adaptador puede deducir esos datos o solicitar al usuario la correspondencia necesaria para una aplicación de destino.

## 8. Espacios

El catálogo de espacios describe ubicaciones que aparecen realmente en el horario:

```xml
<espacios>
  <espacio id="E001">
    <nombre>Aula 211</nombre>
  </espacio>
</espacios>
```

Cada espacio tiene un `id` y un `nombre`. FUSHE Core no almacena espacios posibles, preferentes o prohibidos.

## 9. Actividades

Una actividad es el concepto común para clases, guardias, reuniones y otras tareas incluidas en un horario.

```xml
<actividades>
  <actividad id="A001" tipo="docencia">
    <referencia>FIS</referencia>
    <nombre>Física</nombre>
    <profesores>
      <profesor ref="P001"/>
    </profesores>
    <grupos>
      <grupo ref="G001"/>
    </grupos>
  </actividad>
</actividades>
```

### 9.1. Campos

| Elemento o atributo | Cardinalidad | Descripción |
| --- | ---: | --- |
| `actividad/@id` | 1 | Identificador canónico. |
| `actividad/@tipo` | 1 | Clase de actividad. |
| `referencia` | 0..1 | Código o nombre breve. |
| `nombre` | 1 | Nombre legible. |
| `profesores/profesor` | 0..n | Profesores habituales. |
| `grupos/grupo` | 0..n | Grupos habituales. |

El vocabulario de `tipo` permanece abierto. Algunos valores iniciales son `docencia`, `guardia`, `reunion`, `tutoria`, `coordinacion`, `complementaria` y `otra`.

Una actividad docente puede asociarse con varios grupos. FUSHE conserva esa relación sin decidir si la combinación es académicamente correcta; el adaptador de destino puede mostrar advertencias o solicitar una correspondencia.

Las listas permiten docencia compartida, agrupamientos y reuniones con varios participantes. Una guardia puede omitir profesores habituales cuando la persona asignada cambia en cada sesión.

## 10. Sesiones

Una sesión es una aparición concreta de una actividad en el horario.

### 10.1. Sesión mínima

```xml
<sesiones>
  <sesion id="S001" dia="1" perfil="PH01" tramo="T01" actividad="A001"/>
</sesiones>
```

| Atributo | Descripción |
| --- | --- |
| `id` | Identificador canónico de la sesión. |
| `dia` | Día canónico del `1` al `7`. |
| `perfil` | Perfil horario utilizado. |
| `tramo` | Tramo perteneciente a ese perfil. |
| `actividad` | Actividad colocada. |

### 10.2. Espacios definitivos

Una sesión puede tener uno o varios espacios definitivos:

```xml
<sesion id="S001" dia="1" perfil="PH01" tramo="T01" actividad="A001">
  <espacios>
    <espacio ref="E001"/>
  </espacios>
</sesion>
```

La ausencia de `espacios` significa que la ubicación se desconoce o no resulta aplicable.

### 10.3. Participantes específicos

Por defecto, una sesión utiliza los profesores y grupos de su actividad. Una sesión concreta puede declarar sus propios participantes:

```xml
<sesion id="S002" dia="2" perfil="PH01" tramo="T01" actividad="A001">
  <profesores>
    <profesor ref="P001"/>
    <profesor ref="P002"/>
  </profesores>
  <grupos>
    <grupo ref="G001"/>
  </grupos>
</sesion>
```

Si aparece una lista de profesores o grupos en la sesión, **sustituye por completo** a la lista correspondiente de la actividad para esa aparición. No se suman ambas listas.

Esto permite representar, entre otros casos, una guardia asignada a una persona concreta, docencia compartida o una sesión semanal con participantes diferentes.

## 11. Metadatos y extensiones

### 11.1. Metadatos del documento

Los metadatos son opcionales:

```xml
<metadatos>
  <titulo>Horario del centro</titulo>
  <creado>2026-09-14T19:00:00+02:00</creado>
  <generador nombre="Conversor FUSHE" version="0.1.0"/>
  <origen aplicacion="Peñalara GHC" version="20230206" archivo="horario.xrho"/>
</metadatos>
```

`origen` describe el documento de procedencia. No se guardan identificadores del sistema de origen en cada actividad, sesión u otra entidad.

No deben almacenarse rutas locales, nombres de ordenador ni información personal innecesaria.

### 11.2. Extensiones

Mientras no se diseñen namespaces de extensión, se reserva un contenedor explícito:

```xml
<extensiones>
  <extension sistema="ejemplo" clave="dato">valor</extension>
</extensiones>
```

Un adaptador que no comprenda una extensión puede ignorarla semánticamente, pero debería conservarla al volver a guardar el archivo.

### 11.3. Namespace XML

El namespace canónico queda pendiente hasta disponer de una dirección estable para publicar los esquemas. Se añadirá antes de la primera versión estable.

## 12. Validación

### 12.1. Validación general

Una implementación debe comprobar como mínimo:

- que el XML está bien formado;
- que la versión es reconocida;
- que los días son válidos y no están repetidos;
- que los identificadores son únicos dentro de su clase;
- que cada tramo es único dentro de su perfil;
- que todas las referencias apuntan a elementos existentes;
- que una sesión utiliza un tramo disponible para su día;
- que las definiciones de un tramo no solapan días;
- que las horas tienen un formato coherente y `inicio` es anterior a `fin`;
- que se respetan los elementos y atributos obligatorios.

### 12.2. XML Schema

Se publicará `fushe.xsd` cuando el modelo básico haya sido validado con más aplicaciones reales. Permitirá validar documentos, generar tipos en distintos lenguajes y documentar formalmente las cardinalidades.

### 12.3. Validación del destino

Un archivo FUSHE puede ser válido aunque no sea importable directamente en una aplicación concreta.

Antes de modificar el destino, un adaptador debe mostrar:

- correspondencias resueltas;
- valores ambiguos;
- información requerida que falta;
- funciones o días no compatibles;
- datos que serán ignorados;
- conflictos con el horario existente;
- resultado previsto de conservar o sobrescribir el horario actual.

La coherencia académica entre grupos y actividades corresponde al adaptador o al usuario, no al formato base.

## 13. Correspondencia provisional con Séneca

| Concepto FUSHE | Elemento de Séneca |
| --- | --- |
| `sesion/@dia`, `@perfil` y `@tramo` | Celda y tramo horario correspondiente. |
| `actividad/@tipo` | Filtro y selector de actividad. |
| `actividad/grupos` o sustitución en la sesión | Unidad o grupo. |
| `actividad/nombre` y `referencia` | Ayuda para resolver curso y materia. |
| `sesion/espacios` | Edificio y dependencia definitivos. |
| Varios grupos | Varios registros independientes en la misma celda. |
| Profesores | El adaptador del horario personal puede ignorarlos. |

FUSHE no guarda los identificadores dinámicos de Séneca. El adaptador carga sus desplegables, compara nombres y referencias y solicita al usuario que resuelva las correspondencias ambiguas o ausentes.

Como FUSHE Core no conserva curso y materia como catálogos independientes, una importación puede requerir confirmación adicional aunque el archivo sea válido.

## 14. Hallazgos de la muestra de Peñalara

Archivo analizado: `ejemploDosMarcosHorariosR1.xrho`. Se publica una copia
anonimizada junto con el FUSHE resultante en `examples/penalara/`.

- La muestra es un contenedor GZIP y no está cifrada.
- Contiene XML con raíz `datosGHC` y versión `20230206`, además de un bloque binario relacionado aparentemente con informes y presentación.
- Incluye dos perfiles horarios, con ocho y nueve tramos respectivamente.
- Peñalara numera los días de `0` a `4`; un adaptador debe convertirlos a `1` a `5`.
- Los tramos se definen por perfil, día e índice. En la muestra sus horas no varían según el día, aunque el formato permite hacerlo.
- Hay 38 definiciones lectivas y 199 colocaciones finales: 116 lectivas, 60 guardias, 3 reuniones y 20 complementarias.
- Las 199 colocaciones pueden expresarse con el modelo FUSHE acordado.
- Peñalara también conserva distribuciones deseadas, aulas candidatas, relaciones entre sesiones, preferencias y criterios del generador.

Esos últimos datos son importantes para volver a generar el proyecto, pero no para intercambiar su horario final; por ello quedan fuera de FUSHE Core.

## 15. Hallazgos de la muestra de FET

Carpeta analizada: salida generada por FET 7.10.4. Se publica una copia
anonimizada junto con el FUSHE resultante en `examples/fet/`.

- FET publica el horario como una carpeta de vistas HTML y XML.
- `*_data_and_timetable.fet` es autocontenido: conserva los catálogos, las
  actividades y todas las colocaciones finales.
- La solución se expresa mediante restricciones activas al 100 % de hora inicial
  y, cuando existe, aula preferida para cada actividad.
- FET usa un único catálogo global de días y tramos, que se convierte en un
  perfil FUSHE.
- Las horas reales no son obligatorias en FET. En la muestra pueden extraerse de
  `Hour/Long_Name`; otros archivos requerirán que el usuario las indique.
- `Activity_Group_Id` reúne las partes semanales de una misma actividad lógica.
- Una duración superior a un periodo puede representarse mediante varias
  sesiones FUSHE consecutivas que referencian la misma actividad.
- Las etiquetas de actividad no tienen semántica universal. Las coincidentes con
  tipos FUSHE pueden clasificarse y las demás necesitan correspondencia externa.
- Las 1721 colocaciones de la muestra son representables: producen 599
  actividades lógicas, 96 profesores usados, 152 grupos usados y 25 espacios.

Las restricciones, estadísticas, semillas, preferencias y datos de presentación
son importantes para regenerar el proyecto, pero quedan fuera de FUSHE Core.

## 16. Seguridad

Las implementaciones deben:

- rechazar documentos con DTD;
- desactivar entidades externas;
- impedir accesos a red o al sistema de archivos durante el análisis XML;
- limitar razonablemente tamaño, profundidad y número de elementos;
- no ejecutar contenido almacenado en texto, comentarios o extensiones;
- tratar todas las referencias como datos no confiables.

Estas medidas evitan ataques XXE, expansión de entidades y agotamiento de recursos.

## 17. Extensiones posibles todavía no diseñadas

- Curso, enseñanza y materia como datos estructurados.
- Identificadores externos por entidad y conversiones reversibles.
- Alias y reglas de correspondencia entre aplicaciones.
- Fechas de vigencia y semanas alternas.
- Calendarios con ciclos superiores a una semana.
- Sesiones que ocupen varios tramos consecutivos como un único bloque.
- Actividades sin hora concreta.
- Identificadores de centro, curso académico y propietario del horario.
- Procedencia por campo y representación de incertidumbre de OCR.
- Vocabularios normalizados para actividades y tipos de tramo.
- Namespaces XML para extensiones desarrolladas por terceros.
- Un formato o extensión independiente para proyectos de planificación.

## 18. Ejemplo completo provisional

```xml
<?xml version="1.0" encoding="UTF-8"?>
<fushe version="1.0">
  <metadatos>
    <titulo>Horario de ejemplo</titulo>
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

  <perfiles>
    <perfil id="PH01">
      <nombre>Horario general</nombre>
      <tramos>
        <tramo id="T01" tipo="lectivo">
          <referencia>1.ª hora</referencia>
          <definicion>
            <inicio>08:00:00</inicio>
            <fin>09:00:00</fin>
          </definicion>
        </tramo>
        <tramo id="T02" tipo="lectivo">
          <referencia>2.ª hora</referencia>
          <definicion dias="1 2 3 4">
            <inicio>09:00:00</inicio>
            <fin>10:00:00</fin>
          </definicion>
          <definicion dias="5">
            <inicio>09:15:00</inicio>
            <fin>10:15:00</fin>
          </definicion>
        </tramo>
      </tramos>
    </perfil>
  </perfiles>

  <profesores>
    <profesor id="P001">
      <nombre>Pepe Pérez</nombre>
    </profesor>
    <profesor id="P002">
      <nombre>María García</nombre>
    </profesor>
  </profesores>

  <grupos>
    <grupo id="G001">
      <nombre>2.º BHA</nombre>
    </grupo>
  </grupos>

  <espacios>
    <espacio id="E001">
      <nombre>Aula 211</nombre>
    </espacio>
  </espacios>

  <actividades>
    <actividad id="A001" tipo="docencia">
      <referencia>FIS</referencia>
      <nombre>Física</nombre>
      <profesores>
        <profesor ref="P001"/>
      </profesores>
      <grupos>
        <grupo ref="G001"/>
      </grupos>
    </actividad>

    <actividad id="A002" tipo="guardia">
      <referencia>GM</referencia>
      <nombre>Guardia de mañana</nombre>
    </actividad>
  </actividades>

  <sesiones>
    <sesion id="S001" dia="1" perfil="PH01" tramo="T01" actividad="A001">
      <espacios>
        <espacio ref="E001"/>
      </espacios>
    </sesion>
    <sesion id="S002" dia="5" perfil="PH01" tramo="T02" actividad="A001">
      <profesores>
        <profesor ref="P001"/>
        <profesor ref="P002"/>
      </profesores>
      <espacios>
        <espacio ref="E001"/>
      </espacios>
    </sesion>
    <sesion id="S003" dia="2" perfil="PH01" tramo="T02" actividad="A002">
      <profesores>
        <profesor ref="P002"/>
      </profesores>
    </sesion>
  </sesiones>
</fushe>
```

## 19. Decisiones abiertas

1. Elegir y publicar el namespace XML canónico.
2. Validar el modelo con una muestra de HorW.
3. Definir un vocabulario inicial de tipos de actividad y tramo sin ligarlo a Séneca.
4. Decidir cómo representar una sesión que ocupe varios tramos como un único bloque.
5. Evaluar si curso, enseñanza y materia necesitan estructura propia en una versión posterior.
6. Diseñar el mecanismo definitivo de extensiones y conservación de elementos desconocidos.
7. Preparar el primer XML Schema.
8. Preparar ejemplos canónicos obtenidos de cada programa analizado.

## 20. Historial

### Revisión 0.5

- Contraste del modelo con una salida completa de FET 7.10.4.
- Identificación de `*_data_and_timetable.fet` como entrada autocontenida.
- Documentación de actividades divididas, duración y tipos no universales.
- Confirmación de que las 1721 colocaciones de la muestra son representables.
- Implementación inicial del adaptador FET a FUSHE.
- Publicación de un par FET/FUSHE anonimizado y reproducible.
- Publicación de un par XRHO/FUSHE anonimizado y reproducible para Peñalara.

### Revisión 0.4

- Sustitución de marcos y tramos globales por perfiles que contienen sus propios tramos.
- Incorporación de variaciones horarias de un tramo según el día.
- Incorporación de catálogos mínimos de profesores, grupos y espacios.
- Simplificación de los grupos a identificador y nombre.
- Generalización de las actividades para docencia y tareas no lectivas.
- Admisión de varios profesores, grupos y espacios.
- Definición de participantes habituales en la actividad y sustituciones completas en la sesión.
- Conservación exclusiva de espacios definitivos.
- Limitación de la procedencia a los metadatos del documento.
- Exclusión explícita de datos de planificación del núcleo de FUSHE.
- Confirmación de que el horario final de la muestra de Peñalara es representable.

### Revisión 0.3

- Adopción de XML como única representación canónica de los archivos `.fushe`.
- Retirada de la sintaxis propia basada en el separador `|`.
- Conversión de todos los ejemplos a XML.
- Incorporación de convenciones y requisitos de seguridad para el procesamiento XML.
- Registro del futuro esquema `fushe.xsd`.

### Revisión 0.2

- Adopción del nombre FUSHE: Formato Unificado Simplificado de Horarios Escolares.
- Adopción de la extensión `.fushe`.

### Revisión 0.1

- Creación del documento.
- Incorporación de días, tramos, actividades y sesiones.
- Incorporación provisional de marcos horarios.
- Registro de correspondencias conocidas con Séneca.
- Registro de hallazgos obtenidos de una muestra `.xrho` de Peñalara.

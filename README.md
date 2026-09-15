# FUSHE

[![CI](https://github.com/elprofedelabata/fushe/actions/workflows/ci.yml/badge.svg)](https://github.com/elprofedelabata/fushe/actions/workflows/ci.yml)

**Formato Unificado Simplificado de Horarios Escolares**

FUSHE es un formato abierto basado en XML para representar horarios escolares ya resueltos sin depender de una aplicación concreta. Su objetivo es facilitar el intercambio entre hojas de cálculo, generadores de horarios y plataformas de gestión educativa como Séneca, Peñalara, HorW o FET.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<fushe version="1.0">
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
      </tramos>
    </perfil>
  </perfiles>

  <profesores>
    <profesor id="P001">
      <nombre>Pepe Pérez</nombre>
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
      <nombre>Física</nombre>
      <profesores>
        <profesor ref="P001"/>
      </profesores>
      <grupos>
        <grupo ref="G001"/>
      </grupos>
    </actividad>
  </actividades>

  <sesiones>
    <sesion id="S001" dia="1" perfil="PH01" tramo="T01" actividad="A001">
      <espacios>
        <espacio ref="E001"/>
      </espacios>
    </sesion>
  </sesiones>
</fushe>
```

## Estado

FUSHE se encuentra en fase de diseño. La sintaxis y el modelo todavía pueden cambiar antes de publicar una primera versión estable.

La [especificación en desarrollo](docs/estandar-horario.md) recoge las decisiones actuales y los aspectos que deben contrastarse con más aplicaciones y archivos reales.

## Herramientas de referencia

El repositorio incluye una implementación inicial en TypeScript con:

- lectura y escritura del XML FUSHE;
- validación estructural y de referencias;
- extracción segura de contenedores `.xrho`;
- conversión del horario final de Peñalara;
- conversión del horario final generado por FET;
- anonimización de nombres de profesores.

Instalación y pruebas:

```shell
npm install
npm test
```

Conversión de un archivo de Peñalara:

```shell
npm run convertir:penalara -- "entrada.xrho" "salida.fushe"
```

Para sustituir los nombres de docentes en la salida FUSHE:

```shell
npm run convertir:penalara -- "entrada.xrho" "salida.fushe" --anonimizar
```

La opción `--anonimizar`, disponible en ambos conversores, sustituye los
nombres de docentes, elimina el nombre del archivo de origen y usa un título
genérico. No examina posibles datos identificativos en grupos, espacios,
actividades u otros textos; antes de publicar el resultado hay que revisarlo.

Conversión de la solución generada por FET:

```shell
npm run convertir:fet -- "entrada_data_and_timetable.fet" "salida.fushe"
```

Los conversores no reemplazan un archivo existente salvo que se añada
`--sobrescribir`. Solo trasladan el horario resuelto y, si encuentran una
colocación que no pueden relacionar de forma segura, terminan con un error en
lugar de descartarla silenciosamente.

## Principios

- Independiente de cualquier programa de horarios.
- Basado en XML y compatible con herramientas estándar.
- Centrado en el horario final, no en las restricciones usadas para generarlo.
- Compatible con varios perfiles, profesores, grupos y espacios.
- Separación entre actividades y sus colocaciones semanales.
- Preparado para adaptadores específicos de cada aplicación.

## Contenido actual

- `docs/estandar-horario.md`: especificación viva del formato.
- `docs/mapeo-penalara.md`: correspondencia aplicada por el conversor de Peñalara.
- `docs/mapeo-fet.md`: correspondencia aplicada por el conversor de FET.
- `examples/horario-minimo.fushe`: ejemplo mínimo provisional.
- `examples/penalara-ficticio.fushe`: ejemplo completamente ficticio con estructuras observadas en Peñalara.
- `examples/penalara/`: entrada XRHO anonimizada y resultado FUSHE reproducible.
- `examples/fet/`: entrada FET anonimizada y resultado FUSHE reproducible.
- `src/`: núcleo FUSHE y adaptadores de Peñalara y FET en TypeScript.
- `tests/`: pruebas unitarias y reproducción exacta de las muestras públicas.

## Licencias

FUSHE utiliza licencias distintas según el tipo de contenido:

- El código fuente, las pruebas y las herramientas de referencia se publican bajo la
  [Mozilla Public License 2.0](LICENSE).
- La especificación, la documentación, los diagramas y los archivos de ejemplo
  —incluido este README— se publican bajo
  [Creative Commons Atribución-CompartirIgual 4.0 Internacional](LICENSE-DOCS).

Salvo indicación expresa en un archivo concreto, esta distribución se aplica a
`src/`, `tests/` y el código generado en `dist/` por una parte, y a
`docs/` y `examples/` por otra. Las dependencias de terceros conservan sus
propias licencias.

La atribución de los contenidos CC BY-SA puede indicarse como «FUSHE y sus
colaboradores», incluyendo un enlace a este repositorio, otro a la licencia e
indicando si se han realizado cambios.

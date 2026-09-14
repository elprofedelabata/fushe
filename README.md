# FUSHE

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

## Principios

- Independiente de cualquier programa de horarios.
- Basado en XML y compatible con herramientas estándar.
- Centrado en el horario final, no en las restricciones usadas para generarlo.
- Compatible con varios perfiles, profesores, grupos y espacios.
- Separación entre actividades y sus colocaciones semanales.
- Preparado para adaptadores específicos de cada aplicación.

## Contenido actual

- `docs/estandar-horario.md`: especificación viva del formato.
- `examples/horario-minimo.fushe`: ejemplo mínimo provisional.

## Licencia

La licencia del estándar y de su futura implementación de referencia está pendiente de decisión.

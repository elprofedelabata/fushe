# FUSHE

**Formato Unificado Simplificado de Horarios Escolares**

FUSHE es un formato abierto basado en XML para representar horarios escolares sin depender de una aplicación concreta. Su objetivo es facilitar el intercambio entre hojas de cálculo, generadores de horarios y plataformas de gestión educativa como Séneca, Peñalara, HorW o FET.

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

  <tramos>
    <tramo id="T01">
      <referencia>1ª hora</referencia>
      <inicio>08:00:00</inicio>
      <fin>09:00:00</fin>
    </tramo>
  </tramos>

  <actividades>
    <actividad id="A001" categoria="lectiva" tipo="docencia">
      <nombre>Física</nombre>
      <profesores>
        <profesor ref="PEPE"/>
      </profesores>
      <asignaciones>
        <asignacion grupo="2BHA" curso="2BACH" materia="FIS"/>
      </asignaciones>
    </actividad>
  </actividades>

  <sesiones>
    <sesion id="S001" dia="1" tramo="T01" actividad="A001"/>
  </sesiones>
</fushe>
```

## Estado

FUSHE se encuentra en fase de diseño. La sintaxis y el modelo todavía pueden cambiar antes de publicar una primera versión estable.

La [especificación en desarrollo](docs/estandar-horario.md) distingue las decisiones acordadas de las propuestas que deben validarse con más aplicaciones y archivos reales.

## Principios

- Independiente de cualquier programa de horarios.
- Basado en XML y compatible con herramientas estándar.
- Extensible sin perder campos desconocidos.
- Apto para herramientas locales y adaptadores específicos.
- Separación entre actividades y sus colocaciones semanales.

## Contenido actual

- `docs/estandar-horario.md`: especificación viva del formato.
- `examples/horario-minimo.fushe`: ejemplo mínimo provisional.

## Licencia

La licencia del estándar y de su futura implementación de referencia está pendiente de decisión.

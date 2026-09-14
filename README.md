# FUSHE

**Formato Unificado Simplificado de Horarios Escolares**

FUSHE es un formato abierto y legible para representar horarios escolares sin depender de una aplicación concreta. Su objetivo es facilitar el intercambio entre hojas de cálculo, generadores de horarios y plataformas de gestión educativa como Séneca, Peñalara, HorW o FET.

```text
fushe|1.0

[estructura]
dias|1,2,3,4,5

[tramos]
T01|1ª hora|08:00|09:00

[actividad A001]
nombre|Física
profesor|PEPE
asignacion|2BHA|2BACH|FIS

[sesiones]
S001|1|T01|A001
```

## Estado

FUSHE se encuentra en fase de diseño. La sintaxis y el modelo todavía pueden cambiar antes de publicar una primera versión estable.

La [especificación en desarrollo](docs/estandar-horario.md) distingue las decisiones acordadas de las propuestas que deben validarse con más aplicaciones y archivos reales.

## Principios

- Independiente de cualquier programa de horarios.
- Legible y editable por personas.
- Extensible sin perder campos desconocidos.
- Apto para herramientas locales y adaptadores específicos.
- Separación entre actividades y sus colocaciones semanales.

## Contenido actual

- `docs/estandar-horario.md`: especificación viva del formato.
- `examples/horario-minimo.fushe`: ejemplo mínimo provisional.

## Licencia

La licencia del estándar y de su futura implementación de referencia está pendiente de decisión.

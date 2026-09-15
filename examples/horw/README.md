# Muestra de HorW

Esta carpeta contiene una muestra ficticia y reproducible para comparar la
entrada exportada por HorW con su representación FUSHE:

- `horario-ficticio.csv`: CSV de colocaciones exportado por HorW;
- `configuracion.json`: horas y equivalencias que el CSV no incluye;
- `horario-ficticio.fushe`: resultado canónico anonimizado.

El CSV procede del proyecto demostrativo ficticio `ies6.tod` distribuido con
HorW. No contiene el nombre de un centro, nombres personales, rutas locales,
correos ni teléfonos. Se conserva en su codificación original Windows-1252
para comprobar también la detección automática del lector.

La salida puede regenerarse desde la raíz del repositorio:

```shell
npm run convertir:horw -- "examples/horw/horario-ficticio.csv" "examples/horw/horario-ficticio.fushe" --config "examples/horw/configuracion.json" --anonimizar --sobrescribir
```

La prueba automatizada exige que la salida regenerada sea idéntica al archivo
publicado.

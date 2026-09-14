# Muestra reproducible de FET

Esta carpeta permite comparar una solución completa generada por FET con su
representación FUSHE:

- `horario-ficticio-data-and-timetable.fet` es la entrada FET 7.10.4;
- `horario-ficticio.fushe` es la salida producida por el conversor de referencia.

Para regenerar la salida desde la raíz del repositorio:

```shell
npm run convertir:fet -- "examples/fet/horario-ficticio-data-and-timetable.fet" "examples/fet/horario-ficticio.fushe" --sobrescribir
```

Las pruebas verifican que el resultado regenerado coincide exactamente con el
archivo publicado.

## Anonimización

La fuente local se revisó antes de publicar la muestra. En la copia pública:

- el centro se denomina `Centro educativo ficticio FUSHE`;
- los 98 identificadores internos de docentes son `DOC001` a `DOC098`;
- sus nombres visibles son `Docente 001` a `Docente 098`;
- sus códigos son `P001` a `P098`;
- las referencias incluidas en comentarios también están sustituidas;
- no se incluyen rutas locales, cuentas de usuario, correos ni teléfonos.

La anonimización no modifica días, tramos, actividades, restricciones ni
colocaciones, de modo que la muestra conserva su utilidad técnica.

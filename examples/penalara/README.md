# Muestra pública de Peñalara

Esta carpeta permite comparar una entrada XRHO con el resultado producido por
el conversor de referencia:

- `horario-anonimizado.xrho`: horario de entrada anonimizado;
- `horario-anonimizado.fushe`: salida FUSHE canónica.

Para regenerar la salida desde la raíz del repositorio:

```shell
npm run convertir:penalara -- "examples/penalara/horario-anonimizado.xrho" "examples/penalara/horario-anonimizado.fushe" --sobrescribir
```

La muestra conserva la estructura técnica del contenedor: cabecera binaria,
XML `datosGHC` y bloque binario posterior. Se han sustituido los nombres y los
identificadores de diez docentes. El bloque posterior también usa valores
genéricos para el usuario de la ruta local, el equipo, el centro y la localidad.

Las sustituciones se hicieron con la misma longitud en bytes que los valores de
origen para mantener intactas las posiciones internas del formato propietario.
Eso explica que los identificadores breves anonimizados no tengan todos la
misma longitud. El original sin anonimizar no forma parte del repositorio.

La suite de pruebas valida la estructura, las referencias y los recuentos, y
comprueba que convertir esta entrada vuelve a producir exactamente el FUSHE
publicado.

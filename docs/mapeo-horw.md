# Mapeo de HorW a FUSHE

## Estado

- Estado: implementación inicial.
- Entrada recomendada: CSV de colocaciones exportado por HorW.
- Archivo contrastado: horario ficticio `ies6.tod` exportado por HorW el 15 de septiembre de 2026.
- Alcance: horario final resuelto.
- Fuera de alcance: lectura directa del formato binario `.tod` y reconstrucción del problema de planificación.

El formato `.tod` es binario, propietario y no cuenta con una especificación
pública conocida. HorW puede exportar las colocaciones del horario a CSV, una
interfaz más estable y suficiente para recuperar la cuadrícula final. Por ello,
la primera versión del adaptador exige que el usuario realice esa exportación.

## Estructura del CSV

El archivo observado no contiene cabecera. Cada fila tiene siete campos
separados por punto y coma:

```text
registro;grupo;profesor;actividad;aula;día;tramo
```

Ejemplo:

```text
1;"3ºE A";"CN 2 ";"BG   ";"     ";4;3
```

El lector también admite una cabecera equivalente y campos entrecomillados con
comillas dobles escapadas según CSV. Rechaza filas con un número distinto de
columnas, identificadores repetidos, días fuera de `1` a `7`, profesores o
actividades vacíos y colocaciones exactamente duplicadas.

HorW exportó la muestra en Windows-1252. El lector prueba primero UTF-8 de forma
estricta y, si no es válido, utiliza Windows-1252. Los espacios usados por HorW
para rellenar códigos de ancho fijo se eliminan en los extremos.

## Correspondencia

| HorW CSV | FUSHE | Regla |
| --- | --- | --- |
| `registro` | — | Solo identifica la fila de origen y se valida como entero único. |
| `grupo` | `grupos/grupo` | Cada código no vacío crea un grupo, salvo exclusión explícita. |
| `profesor` | `profesores/profesor` | Cada código crea un profesor. |
| `actividad` | `actividades/actividad` | Cada código crea una actividad lógica. |
| `aula` | `espacios/espacio` | Cada código no vacío crea un espacio. |
| `día` | `sesion/@dia` | HorW y FUSHE utilizan días numerados desde `1`. |
| `tramo` | `sesion/@tramo` | Se relaciona con `T01`, `T02` y sucesivos por orden numérico. |

El CSV solo aporta códigos breves. De forma predeterminada se utilizan también
como nombres y referencias. La configuración permite proporcionar nombres
legibles para profesores, grupos, actividades y espacios.

## Agrupación de sesiones

HorW escribe una relación por cada combinación de grupo, profesor, actividad,
aula, día y tramo. Varias filas pueden describir que un mismo profesor atiende
a varios grupos simultáneamente.

El conversor agrupa únicamente las filas con igual profesor, actividad, aula,
día y tramo, acumulando sus grupos. Nunca fusiona profesores diferentes aunque
coincidan los demás campos: el CSV no permite distinguir con seguridad entre
docencia conjunta, optativas paralelas y desdobles.

La relación se conserva en la sesión FUSHE, no en la actividad, porque un mismo
código de actividad puede aparecer con participantes diferentes a lo largo del
horario.

## Tramos y horas reales

El CSV identifica los tramos mediante números, pero no contiene sus horas de
inicio y fin. FUSHE sí las exige. Deben proporcionarse en un archivo JSON de
configuración:

```json
{
  "tramos": {
    "1": { "inicio": "08:00", "fin": "09:00", "referencia": "1.ª hora" },
    "2": { "inicio": "09:00", "fin": "10:00", "referencia": "2.ª hora" },
    "3": { "inicio": "10:00", "fin": "10:30", "referencia": "Recreo", "tipo": "recreo" }
  }
}
```

Pueden declararse tramos que no tengan ninguna colocación en el CSV. La opción
`dias` permite hacer lo mismo con días sin actividad.

## Tipos y nombres de actividad

HorW no incluye en esta exportación una clasificación inequívoca de los
códigos. El valor predeterminado es `docencia`. La configuración puede corregir
los tipos y nombres conocidos por el centro:

```json
{
  "tiposPorActividad": {
    "GUARD": "guardia",
    "RD": "reunion",
    "TUT": "tutoria"
  },
  "nombresActividades": {
    "GUARD": "Servicio de guardia",
    "RD": "Reunión de departamento"
  },
  "gruposOmitidos": ["GU"]
}
```

No se aplican estas equivalencias automáticamente porque los códigos son
configurables y podrían significar algo distinto en otro centro. Un supuesto
grupo técnico, como `GU` en la muestra analizada, se conserva salvo que el
usuario lo excluya expresamente.

## Uso

```shell
npm run convertir:horw -- "entrada.csv" "salida.fushe" --config "horw.json"
```

La opción `--anonimizar` sustituye los nombres de docentes en el FUSHE y elimina
el nombre del archivo de origen. `--sobrescribir` permite reemplazar una salida
existente.

## Información no disponible

El CSV de colocaciones no contiene:

- las horas reales de los tramos;
- los nombres largos de profesores, grupos, actividades y espacios;
- los catálogos no utilizados en el horario final;
- identificadores de actividades internas que permitan reconstruir con certeza
  la docencia conjunta y los desdobles;
- restricciones y preferencias utilizadas para generar el horario;
- metadatos generales del centro o del proyecto HorW.

Estos datos no se inventan. Los intervalos son obligatorios y los nombres y
tipos pueden completarse mediante la configuración.

## Muestra pública reproducible

El repositorio incluye el conjunto:

- `examples/horw/horario-ficticio.csv`: entrada original en Windows-1252;
- `examples/horw/configuracion.json`: horas, tipos y grupo técnico omitido;
- `examples/horw/horario-ficticio.fushe`: salida canónica anonimizada.

Puede regenerarse con:

```shell
npm run convertir:horw -- "examples/horw/horario-ficticio.csv" "examples/horw/horario-ficticio.fushe" --config "examples/horw/configuracion.json" --anonimizar --sobrescribir
```

Una prueba automatizada exige que el resultado sea idéntico al archivo
publicado.

## Reconciliación de la muestra

La muestra contiene:

- 926 relaciones de origen, 5 días y 6 tramos entre las 08:00 y las 14:00;
- 40 profesores, 19 grupos reales y un grupo técnico `GU` omitido;
- 62 actividades y un espacio utilizado;
- 741 sesiones FUSHE;
- 617 sesiones de docencia, 15 de tutoría, 88 de guardia y 21 de reunión;
- ninguna referencia rota ni sesión en un día o tramo inexistente.

El CSV forma parte de una demostración ficticia de HorW. No contiene nombres
personales, centro educativo, rutas locales, correos ni teléfonos. La salida
FUSHE sustituye además los códigos docentes por nombres anónimos consecutivos.

import {
  ActividadFushe,
  DocumentoFushe,
  EntidadNombradaFushe,
  SesionFushe,
} from "../modelo";

function escaparTexto(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escaparAtributo(valor: string): string {
  return escaparTexto(valor)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function atributo(nombre: string, valor: string | number | undefined): string {
  return valor === undefined ? "" : ` ${nombre}="${escaparAtributo(String(valor))}"`;
}

function escribirEntidades(
  lineas: string[],
  nombreColeccion: string,
  nombreEntidad: string,
  entidades: EntidadNombradaFushe[] | undefined,
): void {
  if (!entidades?.length) return;

  lineas.push(`  <${nombreColeccion}>`);
  for (const entidad of entidades) {
    lineas.push(`    <${nombreEntidad}${atributo("id", entidad.id)}>`);
    lineas.push(`      <nombre>${escaparTexto(entidad.nombre)}</nombre>`);
    lineas.push(`    </${nombreEntidad}>`);
  }
  lineas.push(`  </${nombreColeccion}>`, "");
}

function escribirReferencias(
  lineas: string[],
  sangria: string,
  nombreColeccion: string,
  nombreEntidad: string,
  referencias: string[] | undefined,
): void {
  if (!referencias?.length) return;

  lineas.push(`${sangria}<${nombreColeccion}>`);
  for (const referencia of referencias) {
    lineas.push(`${sangria}  <${nombreEntidad}${atributo("ref", referencia)}/>`);
  }
  lineas.push(`${sangria}</${nombreColeccion}>`);
}

function escribirActividad(lineas: string[], actividad: ActividadFushe): void {
  lineas.push(
    `    <actividad${atributo("id", actividad.id)}${atributo("tipo", actividad.tipo)}>`,
  );
  if (actividad.referencia !== undefined) {
    lineas.push(`      <referencia>${escaparTexto(actividad.referencia)}</referencia>`);
  }
  lineas.push(`      <nombre>${escaparTexto(actividad.nombre)}</nombre>`);
  escribirReferencias(lineas, "      ", "profesores", "profesor", actividad.profesores);
  escribirReferencias(lineas, "      ", "grupos", "grupo", actividad.grupos);
  lineas.push("    </actividad>");
}

function escribirSesion(lineas: string[], sesion: SesionFushe): void {
  const apertura =
    `    <sesion${atributo("id", sesion.id)}` +
    `${atributo("dia", sesion.dia)}` +
    `${atributo("perfil", sesion.perfil)}` +
    `${atributo("tramo", sesion.tramo)}` +
    `${atributo("actividad", sesion.actividad)}`;

  const tieneContenido = Boolean(
    sesion.profesores?.length || sesion.grupos?.length || sesion.espacios?.length,
  );

  if (!tieneContenido) {
    lineas.push(`${apertura}/>`);
    return;
  }

  lineas.push(`${apertura}>`);
  escribirReferencias(lineas, "      ", "profesores", "profesor", sesion.profesores);
  escribirReferencias(lineas, "      ", "grupos", "grupo", sesion.grupos);
  escribirReferencias(lineas, "      ", "espacios", "espacio", sesion.espacios);
  lineas.push("    </sesion>");
}

export function serializarFushe(documento: DocumentoFushe): string {
  const lineas: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<fushe${atributo("version", documento.version)}>`,
  ];

  const metadatos = documento.metadatos;
  if (metadatos) {
    lineas.push("  <metadatos>");
    if (metadatos.titulo !== undefined) {
      lineas.push(`    <titulo>${escaparTexto(metadatos.titulo)}</titulo>`);
    }
    if (metadatos.creado !== undefined) {
      lineas.push(`    <creado>${escaparTexto(metadatos.creado)}</creado>`);
    }
    if (metadatos.generador) {
      lineas.push(
        `    <generador${atributo("nombre", metadatos.generador.nombre)}` +
          `${atributo("version", metadatos.generador.version)}/>`,
      );
    }
    if (metadatos.origen) {
      lineas.push(
        `    <origen${atributo("aplicacion", metadatos.origen.aplicacion)}` +
          `${atributo("version", metadatos.origen.version)}` +
          `${atributo("archivo", metadatos.origen.archivo)}/>`,
      );
    }
    lineas.push("  </metadatos>", "");
  }

  lineas.push("  <estructura>", "    <dias>");
  for (const dia of documento.estructura.dias) {
    lineas.push(`      <dia${atributo("numero", dia)}/>`);
  }
  lineas.push("    </dias>", "  </estructura>", "");

  lineas.push("  <perfiles>");
  for (const perfil of documento.perfiles) {
    lineas.push(`    <perfil${atributo("id", perfil.id)}>`, `      <nombre>${escaparTexto(perfil.nombre)}</nombre>`, "      <tramos>");
    for (const tramo of perfil.tramos) {
      lineas.push(`        <tramo${atributo("id", tramo.id)}${atributo("tipo", tramo.tipo)}>`, `          <referencia>${escaparTexto(tramo.referencia)}</referencia>`);
      for (const definicion of tramo.definiciones) {
        const dias = definicion.dias?.join(" ");
        lineas.push(`          <definicion${atributo("dias", dias)}>`, `            <inicio>${escaparTexto(definicion.inicio)}</inicio>`, `            <fin>${escaparTexto(definicion.fin)}</fin>`, "          </definicion>");
      }
      lineas.push("        </tramo>");
    }
    lineas.push("      </tramos>", "    </perfil>");
  }
  lineas.push("  </perfiles>", "");

  escribirEntidades(lineas, "profesores", "profesor", documento.profesores);
  escribirEntidades(lineas, "grupos", "grupo", documento.grupos);
  escribirEntidades(lineas, "espacios", "espacio", documento.espacios);

  lineas.push("  <actividades>");
  for (const actividad of documento.actividades) escribirActividad(lineas, actividad);
  lineas.push("  </actividades>", "");

  lineas.push("  <sesiones>");
  for (const sesion of documento.sesiones) escribirSesion(lineas, sesion);
  lineas.push("  </sesiones>");

  if (documento.extensiones?.length) {
    lineas.push("", "  <extensiones>");
    for (const extension of documento.extensiones) {
      lineas.push(
        `    <extension${atributo("sistema", extension.sistema)}` +
          `${atributo("clave", extension.clave)}>${escaparTexto(extension.valor)}</extension>`,
      );
    }
    lineas.push("  </extensiones>");
  }

  lineas.push("</fushe>", "");
  return lineas.join("\n");
}

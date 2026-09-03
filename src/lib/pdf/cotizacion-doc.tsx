import fs from "fs";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { money } from "@/lib/finance";

const logoPath = path.join(process.cwd(), "public", "logo-dp.png");
const logoDataUri = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");

const M = 52; // margen de página

const C = {
  verde: "#639922",
  verdeOscuro: "#27500A",
  tinta: "#3A3A38",
  gris: "#6B6A66",
  grisClaro: "#9A9990",
  linea: "#DCDAD1",
  hueso: "#F5F4EF",
  blanco: "#FFFFFF",
};

const s = StyleSheet.create({
  page: {
    paddingTop: M,
    paddingBottom: 64,
    paddingHorizontal: M,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: C.tinta,
    lineHeight: 1.45,
  },

  // Cabecera
  header: { flexDirection: "row", alignItems: "flex-start" },
  logo: { width: 52, height: 52, objectFit: "contain", marginRight: 14 },
  headerText: { flexGrow: 1, paddingTop: 2 },
  brand: { fontSize: 10, color: C.verdeOscuro, fontWeight: 700, letterSpacing: 1 },
  brandSub: { fontSize: 7.5, color: C.grisClaro, letterSpacing: 0.6, marginTop: 2 },
  docLabelBox: {
    borderWidth: 1,
    borderColor: C.linea,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "flex-end",
    minWidth: 150,
  },
  docLabel: { fontSize: 7.5, color: C.grisClaro, letterSpacing: 1, textTransform: "uppercase" },
  docCodigo: { fontSize: 15, fontWeight: 700, color: C.verdeOscuro, marginTop: 2 },
  docMeta: { fontSize: 8, color: C.gris, marginTop: 3 },
  docAprob: { fontSize: 8, color: C.verde, marginTop: 3, fontWeight: 700 },

  rule: { height: 2, backgroundColor: C.verdeOscuro, marginTop: 14, marginBottom: 4 },
  ruleThin: { height: 3, backgroundColor: C.verde, width: 70, marginBottom: 20 },

  h: { fontSize: 8.5, fontWeight: 700, color: C.verdeOscuro, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 7 },

  // Bloque de datos del cliente (tabla con bordes)
  datosTabla: { borderWidth: 1, borderColor: C.linea, borderRadius: 4, marginBottom: 22, overflow: "hidden" },
  datosFila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.linea },
  datosFilaUlt: { flexDirection: "row" },
  datosLabel: {
    width: 130,
    backgroundColor: C.hueso,
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 8,
    color: C.gris,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    borderRightWidth: 1,
    borderRightColor: C.linea,
  },
  datosValor: { flex: 1, paddingVertical: 7, paddingHorizontal: 12, fontSize: 10, color: C.tinta },

  // Descripción
  descBox: {
    borderWidth: 1,
    borderColor: C.linea,
    borderLeftWidth: 3,
    borderLeftColor: C.verde,
    borderRadius: 4,
    padding: 14,
    marginBottom: 22,
  },
  descTexto: { fontSize: 9.5, color: C.tinta, lineHeight: 1.55 },

  // Resumen económico (tabla con bordes, alineada a la derecha)
  resumenWrap: { alignItems: "flex-end", marginBottom: 24 },
  resumen: { width: 260, borderWidth: 1, borderColor: C.linea, borderRadius: 4, overflow: "hidden" },
  resumenHead: {
    backgroundColor: C.verdeOscuro,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resumenHeadTxt: { fontSize: 7.5, color: C.blanco, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" },
  resumenFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.linea,
  },
  resumenFilaAlt: { backgroundColor: C.hueso },
  resumenLabel: { fontSize: 9, color: C.gris },
  resumenValor: { fontSize: 9, color: C.tinta },
  totalFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.hueso,
  },
  totalLabel: { fontSize: 9, fontWeight: 700, color: C.verdeOscuro, letterSpacing: 0.4, textTransform: "uppercase" },
  totalValor: { fontSize: 14, fontWeight: 700, color: C.verdeOscuro },

  // Condiciones
  condTabla: { borderWidth: 1, borderColor: C.linea, borderRadius: 4, flexDirection: "row", overflow: "hidden" },
  condCol: { flex: 1, padding: 12 },
  condColDiv: { borderRightWidth: 1, borderRightColor: C.linea },
  condLabel: { fontSize: 8, color: C.gris, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 },
  condTexto: { fontSize: 9, color: C.tinta, lineHeight: 1.5 },

  // Pie
  footerRule: { position: "absolute", bottom: 42, left: M, right: M, height: 0.75, backgroundColor: C.linea },
  footerLeft: { position: "absolute", bottom: 28, left: M, fontSize: 7.5, color: C.grisClaro },
  footerRight: { position: "absolute", bottom: 28, right: M, fontSize: 7.5, color: C.grisClaro },
});

const fmtDate = (v: string | null | undefined) => (v ? new Date(v + "T00:00:00").toLocaleDateString("es-CO") : "—");

export function CotizacionDoc({
  codigo,
  fecha,
  vigenciaDias,
  estado,
  fechaAprobacion,
  medioAprobacion,
  clienteNombre,
  clienteNit,
  empresaNombre,
  descripcionCliente,
  formaPago,
  condicionesCliente,
  clientSubtotal,
  aplicaIva,
  clientIva,
  clientTotal,
}: {
  codigo: string;
  fecha: string | null;
  vigenciaDias: number | null;
  estado?: string | null;
  fechaAprobacion?: string | null;
  medioAprobacion?: string | null;
  clienteNombre: string;
  clienteNit: string | null;
  empresaNombre: string;
  descripcionCliente: string | null;
  formaPago: string | null;
  condicionesCliente: string | null;
  clientSubtotal: number;
  aplicaIva: boolean;
  clientIva: number;
  clientTotal: number;
}) {
  const generado = new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML img */}
          <Image src={logoDataUri} style={s.logo} />
          <View style={s.headerText}>
            <Text style={s.brand}>D&P INGENIERÍA INTEGRAL</Text>
            <Text style={s.brandSub}>PROPUESTA COMERCIAL DE SERVICIOS Y SUMINISTROS</Text>
          </View>
          <View style={s.docLabelBox}>
            <Text style={s.docLabel}>Cotización</Text>
            <Text style={s.docCodigo}>{codigo}</Text>
            <Text style={s.docMeta}>Fecha: {fmtDate(fecha)}</Text>
            {vigenciaDias != null && <Text style={s.docMeta}>Vigencia: {vigenciaDias} días</Text>}
            {estado === "Aprobada" && fechaAprobacion && (
              <Text style={s.docAprob}>
                Aprobada el {fmtDate(fechaAprobacion)}
                {medioAprobacion ? ` · ${medioAprobacion}` : ""}
              </Text>
            )}
          </View>
        </View>

        <View style={s.rule} />
        <View style={s.ruleThin} />

        <Text style={s.h}>Datos del cliente</Text>
        <View style={s.datosTabla}>
          <View style={s.datosFila}>
            <Text style={s.datosLabel}>Cliente</Text>
            <Text style={s.datosValor}>{clienteNombre}</Text>
          </View>
          <View style={s.datosFila}>
            <Text style={s.datosLabel}>NIT</Text>
            <Text style={s.datosValor}>{clienteNit || "—"}</Text>
          </View>
          <View style={s.datosFilaUlt}>
            <Text style={s.datosLabel}>Empresa atendida</Text>
            <Text style={s.datosValor}>{empresaNombre}</Text>
          </View>
        </View>

        <Text style={s.h}>Descripción de la cotización</Text>
        <View style={s.descBox}>
          <Text style={s.descTexto}>{descripcionCliente || "—"}</Text>
        </View>

        <Text style={s.h}>Valor de la propuesta</Text>
        <View style={s.resumenWrap}>
          <View style={s.resumen}>
            <View style={s.resumenHead}>
              <Text style={s.resumenHeadTxt}>Resumen económico</Text>
            </View>
            <View style={s.resumenFila}>
              <Text style={s.resumenLabel}>Valor antes de IVA</Text>
              <Text style={s.resumenValor}>{money.format(clientSubtotal)}</Text>
            </View>
            <View style={[s.resumenFila, s.resumenFilaAlt]}>
              <Text style={s.resumenLabel}>IVA (19%)</Text>
              <Text style={s.resumenValor}>{aplicaIva ? money.format(clientIva) : "No aplica"}</Text>
            </View>
            <View style={s.totalFila}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValor}>{money.format(clientTotal)}</Text>
            </View>
          </View>
        </View>

        <Text style={s.h}>Condiciones comerciales</Text>
        <View style={s.condTabla}>
          <View style={[s.condCol, s.condColDiv]}>
            <Text style={s.condLabel}>Forma de pago</Text>
            <Text style={s.condTexto}>{formaPago || "A convenir"}</Text>
          </View>
          <View style={s.condCol}>
            <Text style={s.condLabel}>Condiciones adicionales</Text>
            <Text style={s.condTexto}>{condicionesCliente || "—"}</Text>
          </View>
        </View>

        <View style={s.footerRule} fixed />
        <Text style={s.footerLeft} fixed>
          D&P Ingeniería Integral · Generado el {generado}
        </Text>
        <Text
          style={s.footerRight}
          fixed
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

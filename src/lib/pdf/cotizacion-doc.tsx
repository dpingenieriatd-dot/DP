import fs from "fs";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { money } from "@/lib/finance";

const logoPath = path.join(process.cwd(), "public", "logo-dp.png");
const logoDataUri = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");

const PAGE_MARGIN = 44;

const styles = StyleSheet.create({
  page: { paddingTop: PAGE_MARGIN, paddingBottom: 56, paddingHorizontal: PAGE_MARGIN, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, borderBottom: 2, borderBottomColor: "#27500a", paddingBottom: 12 },
  logo: { width: 44, height: 44, marginRight: 14, objectFit: "contain" },
  headerText: { flexGrow: 1 },
  brand: { fontSize: 9, color: "#27500a", fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 },
  title: { fontSize: 17, fontWeight: 700, color: "#111" },
  subtitle: { fontSize: 9, color: "#666", marginTop: 3 },
  headerRight: { alignItems: "flex-end" },
  codigo: { fontSize: 13, fontWeight: 700, color: "#27500a" },
  meta: { fontSize: 8, color: "#999", marginTop: 3 },

  infoRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  infoBox: { flex: 1, border: 1, borderColor: "#e5e5e5", borderRadius: 5, padding: 10 },
  infoLabel: { fontSize: 7, color: "#888", textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 9.5, color: "#222", marginBottom: 6 },

  section: { fontSize: 10, fontWeight: 700, color: "#27500a", marginBottom: 6, marginTop: 4 },
  parrafo: { fontSize: 9, color: "#333", marginBottom: 12, lineHeight: 1.4 },

  tableRowHeader: { flexDirection: "row", backgroundColor: "#27500a", borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  tableRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#eee" },
  tableRowAlt: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#eee", backgroundColor: "#f6f8f7" },
  th: { padding: 6, fontSize: 8, fontWeight: 700, color: "#fff" },
  td: { padding: 6, fontSize: 8.5, color: "#333" },

  totales: { marginTop: 10, alignItems: "flex-end" },
  totalLinea: { flexDirection: "row", justifyContent: "space-between", width: 220, marginBottom: 3 },
  totalLabel: { fontSize: 9, color: "#555" },
  totalValor: { fontSize: 9, color: "#222" },
  totalFinalLinea: { flexDirection: "row", justifyContent: "space-between", width: 220, marginTop: 4, paddingTop: 6, borderTop: 1, borderTopColor: "#27500a" },
  totalFinalLabel: { fontSize: 11, fontWeight: 700, color: "#27500a" },
  totalFinalValor: { fontSize: 12, fontWeight: 700, color: "#27500a" },

  condiciones: { marginTop: 16, borderTop: 1, borderTopColor: "#eee", paddingTop: 12 },
  condicionesGrid: { flexDirection: "row", gap: 16 },
  condicionesCol: { flex: 1 },

  footerLeft: { position: "absolute", bottom: 24, left: PAGE_MARGIN, fontSize: 7, color: "#999" },
  footerRight: { position: "absolute", bottom: 24, right: PAGE_MARGIN, fontSize: 7, color: "#999" },
});

const fmtDate = (v: string | null | undefined) => (v ? new Date(v + "T00:00:00").toLocaleDateString("es-CO") : "—");

export type CotizacionPdfItem = {
  descripcion: string;
  subtotalCliente: number;
};

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
  items,
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
  items: CotizacionPdfItem[];
  clientSubtotal: number;
  aplicaIva: boolean;
  clientIva: number;
  clientTotal: number;
}) {
  const generado = new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML img */}
          <Image src={logoDataUri} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.brand}>D&P INGENIERÍA INTEGRAL</Text>
            <Text style={styles.title}>Cotización comercial</Text>
            <Text style={styles.subtitle}>Propuesta de servicios / suministros</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.codigo}>{codigo}</Text>
            <Text style={styles.meta}>Fecha: {fmtDate(fecha)}</Text>
            {vigenciaDias != null && <Text style={styles.meta}>Vigencia: {vigenciaDias} días</Text>}
            {estado === "Aprobada" && fechaAprobacion && (
              <Text style={[styles.meta, { color: "#27500a" }]}>
                Aprobada el {fmtDate(fechaAprobacion)}
                {medioAprobacion ? ` (${medioAprobacion})` : ""}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Cliente</Text>
            <Text style={styles.infoValue}>{clienteNombre}</Text>
            <Text style={styles.infoLabel}>NIT</Text>
            <Text style={styles.infoValue}>{clienteNit || "—"}</Text>
            <Text style={styles.infoLabel}>Empresa atendida</Text>
            <Text style={styles.infoValue}>{empresaNombre}</Text>
          </View>
        </View>

        {descripcionCliente && (
          <>
            <Text style={styles.section}>Descripción de la cotización</Text>
            <Text style={styles.parrafo}>{descripcionCliente}</Text>
          </>
        )}

        <Text style={styles.section}>Detalle</Text>
        <View>
          <View style={styles.tableRowHeader} fixed>
            <Text style={[styles.th, { flex: 4 }]}>Descripción</Text>
            <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>Valor</Text>
          </View>
          {items.length === 0 && <Text style={{ padding: 12, fontSize: 9, color: "#999" }}>Sin ítems.</Text>}
          {items.map((it, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} wrap={false}>
              <Text style={[styles.td, { flex: 4 }]}>{it.descripcion}</Text>
              <Text style={[styles.td, { flex: 1.4, textAlign: "right" }]}>{money.format(it.subtotalCliente)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totales}>
          <View style={styles.totalLinea}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValor}>{money.format(clientSubtotal)}</Text>
          </View>
          {aplicaIva && (
            <View style={styles.totalLinea}>
              <Text style={styles.totalLabel}>IVA (19%)</Text>
              <Text style={styles.totalValor}>{money.format(clientIva)}</Text>
            </View>
          )}
          <View style={styles.totalFinalLinea}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValor}>{money.format(clientTotal)}</Text>
          </View>
        </View>

        <View style={styles.condiciones}>
          <View style={styles.condicionesGrid}>
            <View style={styles.condicionesCol}>
              <Text style={styles.infoLabel}>Forma de pago</Text>
              <Text style={styles.parrafo}>{formaPago || "A convenir"}</Text>
            </View>
            <View style={styles.condicionesCol}>
              <Text style={styles.infoLabel}>Condiciones comerciales</Text>
              <Text style={styles.parrafo}>{condicionesCliente || "—"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerLeft} fixed>
          D&P Ingeniería Integral · Generado el {generado}
        </Text>
        <Text style={styles.footerRight} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}

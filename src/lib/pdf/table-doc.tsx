import fs from "fs";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export type Column = { key: string; label: string; width?: number };
export type KpiItem = { label: string; value: string };

const logoPath = path.join(process.cwd(), "public", "logo-dp.png");
const logoDataUri = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");

const PAGE_MARGIN = 44;

const styles = StyleSheet.create({
  page: { paddingTop: PAGE_MARGIN, paddingBottom: 56, paddingHorizontal: PAGE_MARGIN, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, borderBottom: 2, borderBottomColor: "#27500a", paddingBottom: 12 },
  logo: { width: 44, height: 44, marginRight: 14, objectFit: "contain" },
  headerText: { flexGrow: 1 },
  brand: { fontSize: 9, color: "#27500a", fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 },
  title: { fontSize: 17, fontWeight: 700, color: "#111" },
  subtitle: { fontSize: 9, color: "#666", marginTop: 3 },
  meta: { fontSize: 8, color: "#999", marginTop: 5 },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  kpiBox: { border: 1, borderColor: "#e5e5e5", borderRadius: 5, padding: 10, width: 136, marginRight: 10, marginBottom: 10 },
  kpiLabel: { fontSize: 7, color: "#888" },
  kpiValue: { fontSize: 13, fontWeight: 700, color: "#27500a", marginTop: 4 },
  tableRowHeader: { flexDirection: "row", backgroundColor: "#27500a", borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  tableRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#eee" },
  tableRowAlt: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#eee", backgroundColor: "#f6f8f7" },
  th: { padding: 6, fontSize: 8, fontWeight: 700, color: "#fff" },
  td: { padding: 6, fontSize: 8, color: "#333" },
  empty: { padding: 18, fontSize: 9, color: "#999" },
  footerLeft: { position: "absolute", bottom: 24, left: PAGE_MARGIN, fontSize: 7, color: "#999" },
  footerRight: { position: "absolute", bottom: 24, right: PAGE_MARGIN, fontSize: 7, color: "#999" },
});

export function TableReportDoc({
  title,
  subtitle,
  kpis,
  columns,
  rows,
}: {
  title: string;
  subtitle?: string;
  kpis?: KpiItem[];
  columns: Column[];
  rows: Record<string, string>[];
}) {
  const generado = new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });
  const orientation = columns.length > 0 ? "landscape" : "portrait";

  return (
    <Document>
      <Page size="A4" orientation={orientation} style={styles.page}>
        <View style={styles.header} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML img */}
          <Image src={logoDataUri} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.brand}>D&P INGENIERÍA INTEGRAL</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            <Text style={styles.meta}>
              Generado el {generado} {columns.length > 0 ? `· ${rows.length} registro(s)` : ""}
            </Text>
          </View>
        </View>

        {kpis && kpis.length > 0 && (
          <View style={styles.kpiRow}>
            {kpis.map((k) => (
              <View key={k.label} style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiValue}>{k.value}</Text>
              </View>
            ))}
          </View>
        )}

        {columns.length > 0 && (
          <View>
            <View style={styles.tableRowHeader} fixed>
              {columns.map((c) => (
                <Text key={c.key} style={[styles.th, { flex: c.width ?? 1 }]}>
                  {c.label}
                </Text>
              ))}
            </View>
            {rows.length === 0 && <Text style={styles.empty}>Sin registros.</Text>}
            {rows.map((r, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} wrap={false}>
                {columns.map((c) => (
                  <Text key={c.key} style={[styles.td, { flex: c.width ?? 1 }]}>
                    {r[c.key] ?? "—"}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footerLeft} fixed>
          D&P Ingeniería Integral · Plataforma interna
        </Text>
        <Text style={styles.footerRight} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}

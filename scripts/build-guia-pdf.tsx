import fs from "fs";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet, renderToFile } from "@react-pdf/renderer";

const logoPath = path.join(process.cwd(), "public", "logo-dp.png");
const logoDataUri = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");

const OUT = "C:\\Users\\cesar\\DP\\Documentacion_Proyecto\\16_Guia_de_Usuario.pdf";

const C = {
  verdeOscuro: "#27500A",
  verde: "#639922",
  ambar: "#BA7517",
  gris: "#5F5E5A",
  grisClaro: "#8A897F",
  hueso: "#F1EFE8",
  huesoClaro: "#FAF9F5",
  borde: "#E4E1D6",
  blanco: "#FFFFFF",
};

const PAGE_MARGIN = 46;

const s = StyleSheet.create({
  // Portada
  coverPage: { backgroundColor: C.verdeOscuro, padding: 0 },
  coverInner: { flex: 1, alignItems: "center", justifyContent: "center", padding: 60 },
  coverLogoWrap: { backgroundColor: C.blanco, borderRadius: 12, padding: 22, marginBottom: 40 },
  coverLogo: { width: 150, height: 107, objectFit: "contain" },
  coverTitle: { fontSize: 30, fontWeight: 700, color: C.blanco, textAlign: "center", letterSpacing: 0.3 },
  coverRule: { width: 64, height: 3, backgroundColor: C.verde, marginTop: 18, marginBottom: 18 },
  coverSubtitle: { fontSize: 13, color: "#D9E8C8", textAlign: "center", marginBottom: 4 },
  coverSubtitle2: { fontSize: 10.5, color: "#B9CFA0", textAlign: "center" },
  coverFooter: { position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#9DB884" },

  // Páginas de contenido
  page: { paddingTop: 78, paddingBottom: 60, paddingHorizontal: PAGE_MARGIN, fontSize: 10, fontFamily: "Helvetica", color: C.gris, backgroundColor: C.blanco },
  headerBar: { position: "absolute", top: 0, left: 0, right: 0, height: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: PAGE_MARGIN, backgroundColor: C.verdeOscuro },
  headerLogo: { width: 26, height: 19, objectFit: "contain", marginRight: 10 },
  headerText: { fontSize: 9, color: C.blanco, fontWeight: 700, letterSpacing: 0.6 },
  headerTextSub: { fontSize: 7.5, color: "#B9CFA0", marginTop: 1 },

  footerRule: { position: "absolute", bottom: 34, left: PAGE_MARGIN, right: PAGE_MARGIN, height: 0.75, backgroundColor: C.borde },
  footerLeft: { position: "absolute", bottom: 20, left: PAGE_MARGIN, fontSize: 8, color: C.grisClaro },
  footerRight: { position: "absolute", bottom: 20, right: PAGE_MARGIN, fontSize: 8, color: C.grisClaro },

  h1Block: { marginTop: 6, marginBottom: 14, flexDirection: "row", alignItems: "center" },
  h1Num: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.verdeOscuro, color: C.blanco, fontSize: 13, fontWeight: 700, textAlign: "center", paddingTop: 8, marginRight: 10 },
  h1: { fontSize: 17, fontWeight: 700, color: C.verdeOscuro },

  h2: { fontSize: 12, fontWeight: 700, color: C.verde, marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 10, fontWeight: 700, color: C.gris, marginTop: 10, marginBottom: 4 },

  p: { fontSize: 9.5, color: C.gris, lineHeight: 1.5, marginBottom: 6 },

  bulletRow: { flexDirection: "row", marginBottom: 5, paddingLeft: 4 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.verde, marginRight: 8, marginTop: 4 },
  bulletText: { fontSize: 9.5, color: C.gris, lineHeight: 1.45, flex: 1 },
  bulletLead: { fontWeight: 700, color: C.verdeOscuro },

  stepRow: { flexDirection: "row", marginBottom: 6, paddingLeft: 4 },
  stepNum: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.verdeOscuro, color: C.blanco, fontSize: 8, fontWeight: 700, textAlign: "center", paddingTop: 4, marginRight: 9 },
  stepText: { fontSize: 9.5, color: C.gris, lineHeight: 1.45, flex: 1, marginTop: 1 },

  nota: { flexDirection: "row", backgroundColor: C.hueso, borderLeft: 2.5, borderLeftColor: C.ambar, borderRadius: 3, padding: 10, marginTop: 4, marginBottom: 10 },
  notaLabel: { fontSize: 9, fontWeight: 700, color: C.ambar, marginRight: 5 },
  notaText: { fontSize: 9, color: C.gris, lineHeight: 1.45, flex: 1 },

  divider: { height: 0.75, backgroundColor: C.borde, marginTop: 4, marginBottom: 16 },

  table: { marginTop: 6, marginBottom: 10, borderRadius: 3, overflow: "hidden", border: 0.75, borderColor: C.borde },
  theadRow: { flexDirection: "row", backgroundColor: C.verdeOscuro },
  th: { padding: 7, fontSize: 8.5, fontWeight: 700, color: C.blanco },
  trow: { flexDirection: "row", borderTop: 0.75, borderTopColor: C.borde },
  trowAlt: { flexDirection: "row", borderTop: 0.75, borderTopColor: C.borde, backgroundColor: C.huesoClaro },
  td: { padding: 7, fontSize: 8.5, color: C.gris },

  toc: { marginTop: 4 },
  tocRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottom: 0.75, borderBottomColor: C.borde },
  tocLabel: { fontSize: 10, color: C.verdeOscuro, fontWeight: 700 },
  tocSub: { fontSize: 8.5, color: C.grisClaro, marginTop: 2 },
});

function H1({ n, children }: { n: string; children: string }) {
  return (
    <View style={s.h1Block} wrap={false}>
      <Text style={s.h1Num}>{n}</Text>
      <Text style={s.h1}>{children}</Text>
    </View>
  );
}
function H2({ children }: { children: string }) {
  return <Text style={s.h2}>{children}</Text>;
}
function H3({ children }: { children: string }) {
  return <Text style={s.h3}>{children}</Text>;
}
function P({ children }: { children: React.ReactNode }) {
  return <Text style={s.p}>{children}</Text>;
}
function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ marginBottom: 6 }}>
      {items.map((item, i) => {
        const idx = item.indexOf(":");
        const hasLead = idx > -1 && idx < 40;
        return (
          <View key={i} style={s.bulletRow} wrap={false}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>
              {hasLead ? (
                <>
                  <Text style={s.bulletLead}>{item.slice(0, idx + 1)}</Text>
                  {item.slice(idx + 1)}
                </>
              ) : (
                item
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
function Steps({ items }: { items: string[] }) {
  return (
    <View style={{ marginBottom: 6 }}>
      {items.map((item, i) => (
        <View key={i} style={s.stepRow} wrap={false}>
          <Text style={s.stepNum}>{i + 1}</Text>
          <Text style={s.stepText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
function Nota({ children }: { children: string }) {
  return (
    <View style={s.nota} wrap={false}>
      <Text style={s.notaLabel}>NOTA</Text>
      <Text style={s.notaText}>{children}</Text>
    </View>
  );
}
function Tabla({ header, rows }: { header: string[]; rows: string[][] }) {
  return (
    <View style={s.table} wrap={false}>
      <View style={s.theadRow}>
        {header.map((h, i) => (
          <Text key={i} style={[s.th, { flex: i === 0 ? 0.9 : 1.6 }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 0 ? s.trow : s.trowAlt}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[s.td, { flex: ci === 0 ? 0.9 : 1.6 }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function HeaderFooter({ section }: { section: string }) {
  return (
    <>
      <View style={s.headerBar} fixed>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={logoDataUri} style={s.headerLogo} />
        <View>
          <Text style={s.headerText}>D&P INGENIERÍA INTEGRAL</Text>
          <Text style={s.headerTextSub}>Guía de Usuario — Plataforma interna · {section}</Text>
        </View>
      </View>
      <View style={s.footerRule} fixed />
      <Text style={s.footerLeft} fixed>
        D&P Ingeniería Integral S.A.S.
      </Text>
      <Text style={s.footerRight} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </>
  );
}

function Doc() {
  return (
    <Document title="Guía de Usuario — Plataforma Interna D&P Ingeniería Integral" author="D&P Ingeniería Integral S.A.S.">
      {/* ---------- Portada ---------- */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverInner}>
          <View style={s.coverLogoWrap}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoDataUri} style={s.coverLogo} />
          </View>
          <Text style={s.coverTitle}>Guía de Usuario</Text>
          <View style={s.coverRule} />
          <Text style={s.coverSubtitle}>Plataforma Interna — D&P Ingeniería Integral S.A.S.</Text>
          <Text style={s.coverSubtitle2}>Fase 1 · Seguimiento del equipo y Gestión de proyectos</Text>
        </View>
        <Text style={s.coverFooter}>Agosto de 2026</Text>
      </Page>

      {/* ---------- Contenido ---------- */}
      <Page size="A4" style={s.page} wrap>
        <HeaderFooter section="Contenido" />

        <Text style={{ fontSize: 14, fontWeight: 700, color: C.verdeOscuro, marginBottom: 4 }}>Contenido</Text>
        <View style={s.divider} />
        <View style={s.toc}>
          {[
            ["1", "Introducción", "Qué es la plataforma y cómo está organizada"],
            ["2", "Cómo entrar", "Primer ingreso, inicio de sesión, contraseña"],
            ["3", "Navegación general", "Menú, notificaciones, recordatorios de Agenda"],
            ["4", "Módulo Seguimiento", "Tareas, Actividades, Agendas, Capacidad, Efectividad"],
            ["5", "Módulo Gestión", "Cotizaciones, Proyectos, Presupuestos, Compras, Catálogos"],
            ["6", "Reportes", "Panel general y reportes descargables en PDF"],
            ["7", "Preguntas frecuentes", "Soporte y solución de problemas comunes"],
          ].map(([n, t, d]) => (
            <View key={n} style={s.tocRow}>
              <View>
                <Text style={s.tocLabel}>
                  {n}. {t}
                </Text>
                <Text style={s.tocSub}>{d}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>

      {/* ---------- 1. Introducción ---------- */}
      <Page size="A4" style={s.page} wrap>
        <HeaderFooter section="1. Introducción" />
        <View>
          <H1 n="1">Introducción</H1>
          <P>
            Esta plataforma centraliza el trabajo diario del equipo de D&P Ingeniería Integral: el seguimiento de tareas,
            agendas y efectividad de cada persona, y la gestión de cotizaciones, proyectos, presupuestos y compras.
            Reemplaza el seguimiento informal por WhatsApp y hojas de cálculo sueltas por un solo lugar con datos
            centralizados y visibles según lo que le corresponde a cada quien.
          </P>
          <P>
            La plataforma está dividida en dos grandes áreas — Seguimiento y Gestión — y cada persona ve solo los módulos
            que tiene asignados según su cargo. Es normal que tu menú no muestre todo lo que aparece en esta guía: usa las
            secciones que apliquen a tu rol.
          </P>
        </View>
      </Page>

      {/* ---------- 2. Cómo entrar ---------- */}
      <Page size="A4" style={s.page} wrap>
        <HeaderFooter section="2. Cómo entrar" />
        <View>
          <H1 n="2">Cómo entrar</H1>

          <H2>2.1 Primer ingreso</H2>
          <P>Cuando un administrador te da acceso, recibes un correo de invitación. Para activarlo:</P>
          <Steps
            items={[
              "Abre el correo de invitación (revisa spam si no lo ves) y haz clic en el enlace.",
              "Crea tu contraseña en la pantalla que se abre.",
              "Ya puedes entrar a la plataforma con tu correo y esa contraseña.",
            ]}
          />

          <H2>2.2 Iniciar sesión</H2>
          <P>
            Entra a la dirección de la plataforma e ingresa tu correo y contraseña. Si tu sesión se cierra sola después de
            un tiempo sin usarla, simplemente vuelve a iniciar sesión.
          </P>

          <H2>2.3 Olvidé mi contraseña</H2>
          <Steps
            items={[
              "En la pantalla de inicio de sesión, haz clic en ¿Olvidaste tu contraseña?",
              "Escribe tu correo y haz clic en Enviar enlace.",
              "Revisa tu correo (y spam) y haz clic en el enlace que te llega.",
              "Escribe tu contraseña nueva dos veces y guarda.",
            ]}
          />

          <H2>2.4 Cambiar mi contraseña (ya con sesión iniciada)</H2>
          <P>
            En el menú lateral, junto a Cerrar sesión, encuentras el enlace Cambiar contraseña. Te lleva al mismo
            formulario para definir una contraseña nueva.
          </P>
        </View>
      </Page>

      {/* ---------- 3. Navegación general ---------- */}
      <Page size="A4" style={s.page} wrap>
        <HeaderFooter section="3. Navegación general" />
        <View>
          <H1 n="3">Navegación general</H1>

          <H2>3.1 Menú lateral</H2>
          <P>
            A la izquierda encuentras el menú, agrupado en Seguimiento, Gestión, Reportes y (si eres administrador)
            Administración. En celular o tablet, el menú se oculta y aparece con el botón de las tres líneas arriba.
          </P>

          <H2>3.2 Notificaciones</H2>
          <P>
            El ícono de campana (arriba, junto al logo) muestra un número cuando tienes notificaciones sin leer: cambios de
            estado en cotizaciones, tareas que alguien tomó, y recordatorios de tu Agenda. Haz clic para ver el detalle; se
            marcan como leídas automáticamente al abrirlas, o puedes usar Marcar todas como leídas.
          </P>

          <H2>3.3 Recordatorios de Agenda</H2>
          <P>
            Si tienes bloques en tu Agenda, la plataforma te avisa antes de que empiecen con un aviso emergente y un
            sonido, sin importar en qué parte de la app estés trabajando en ese momento.
          </P>
          <Bullets
            items={[
              "Entendido: confirma el aviso y no vuelve a aparecer para ese bloque.",
              "Posponer 5 min: lo vuelve a mostrar 5 minutos después.",
            ]}
          />
          <Nota>
            Puedes ajustar con cuánta anticipación te avisa y si quieres o no el sonido, desde el ícono de engranaje junto
            a + Agregar bloque en Agendas.
          </Nota>

          <H2>3.4 Para administradores</H2>
          <P>
            Además de lo anterior, los administradores cuentan con dos herramientas de visibilidad del equipo:
          </P>
          <Bullets
            items={[
              "Quién está en línea: en Administración, Usuarios, un punto verde junto al nombre indica que la persona está activa en la plataforma en ese momento; si no, muestra hace cuánto se le vio por última vez.",
              "Resumen semanal por correo: cada lunes en la mañana llega automáticamente un correo con tareas cerradas la semana anterior, proyectos con margen negativo y compras pendientes de pago, para tener una vista rápida sin entrar a revisar cada módulo.",
            ]}
          />
        </View>
      </Page>

      {/* ---------- 4. Módulo Seguimiento ---------- */}
      <Page size="A4" style={s.page} wrap>
        <HeaderFooter section="4. Módulo Seguimiento" />
        <View>
          <H1 n="4">Módulo Seguimiento</H1>
          <P>Para el control del trabajo diario del equipo: tareas, tiempo, agendas, capacidad y efectividad.</P>

          <H2>4.1 Banco de tareas</H2>
          <P>Tablero con tres columnas: Disponibles, En proceso y Terminadas.</P>
          <Bullets
            items={[
              "Tomar una tarea: entra a una tarea Disponible y tómala; pasa a En proceso bajo tu nombre.",
              "Cronómetro: inicia y detén el tiempo dedicado a la tarea; solo puedes tener uno corriendo a la vez.",
              "Terminar: registra el entregable y notas al cerrarla.",
              "Publicar una tarea nueva: cualquier persona puede publicar una tarea para que el equipo la tome.",
            ]}
          />

          <H2>4.2 Actividades</H2>
          <P>
            Registro histórico de actividades del equipo, con su fecha, cliente/proyecto relacionado y estado de
            cumplimiento.
          </P>
          <Nota>
            Al terminar una tarea desde el Banco de tareas, su registro se agrega automáticamente aquí — no es necesario
            volver a digitarla en Actividades.
          </Nota>

          <H2>4.3 Agendas</H2>
          <P>
            Calendario semanal (lunes a domingo) por persona. Sábado y domingo quedan disponibles solo para trabajo
            extraordinario, no se espera que se usen de forma regular.
          </P>
          <Bullets items={["+ Agregar bloque: elige persona, día, hora, duración, tarea y cliente/proyecto (opcional)."]} />

          <H2>4.4 Capacidad del equipo</H2>
          <P>Muestra las horas planificadas frente a las disponibles de cada persona, y marca sobrecarga cuando corresponde.</P>

          <H2>4.5 Efectividad</H2>
          <P>
            Puntaje individual compuesto por cumplimiento, oportunidad, calidad y equilibrio de carga. Puedes ver cómo se
            compone tu propio puntaje; los pesos de cada factor los define Dirección.
          </P>
          <Nota>La Efectividad es una herramienta de seguimiento personal, no se usa para comparar públicamente entre compañeros.</Nota>
        </View>
      </Page>

      {/* ---------- 5. Módulo Gestión ---------- */}
      <Page size="A4" style={s.page} wrap>
        <HeaderFooter section="5. Módulo Gestión" />
        <View>
          <H1 n="5">Módulo Gestión</H1>
          <P>Para cotizaciones, proyectos, presupuestos, compras y los catálogos que los alimentan.</P>

          <H2>5.1 Cotizaciones</H2>
          <P>
            Registra la oferta que se le hace a un cliente. Calcula automáticamente si es rentable (costos,
            administración, utilidad, IVA) antes de aceptarla. Al aprobar una cotización, se crea el Proyecto y su primer
            Presupuesto automáticamente, sin volver a digitar los datos.
          </P>

          <H2>5.2 Proyectos</H2>
          <P>
            Ficha de cada proyecto: cliente, empresa atendida, responsable, fechas, presupuestos y compras asociadas. La
            tarjeta Contrato y retenciones calcula el efectivo neto que realmente recibe D&P después de IVA, retención en
            la fuente, ICA y otras retenciones.
          </P>

          <H2>5.3 Presupuestos</H2>
          <P>
            Control de costos reales de ejecución de un proyecto frente a lo presupuestado, con la ganancia estimada y la
            ganancia real según lo que efectivamente se ha gastado.
          </P>

          <H2>5.4 Compras</H2>
          <P>Registro de compras por proyecto, proveedor e insumo, con su estado de pago (Pendiente, Parcial, Pagado).</P>

          <H2>5.5 Catálogos</H2>
          <P>Listas reutilizables desde cotizaciones, proyectos y compras:</P>
          <Tabla
            header={["Catálogo", "Para qué sirve"]}
            rows={[
              ["Clientes", "Empresas o personas que contratan a D&P."],
              ["Empresas atendidas", "Sedes o dependencias específicas dentro de un cliente."],
              ["Proveedores", "A quienes D&P les compra materiales o servicios."],
              ["Materiales de trabajo", "Equipos/materiales propios de D&P, con su costo de reposición."],
              ["Profesionales", "Personas externas que D&P contrata por proyecto."],
              ["Banco de insumos", "Insumos y su costo, para usarlos al armar compras y presupuestos."],
            ]}
          />
        </View>
      </Page>

      {/* ---------- 6. Reportes ---------- */}
      <Page size="A4" style={s.page} wrap>
        <HeaderFooter section="6. Reportes" />
        <View>
          <H1 n="6">Reportes</H1>
          <P>
            El Inicio muestra un resumen general con gráficos. En Reportes puedes descargar en PDF reportes predefinidos
            (por ejemplo, compras o presupuestos por proyecto) y reportes personalizados filtrando por proyecto, cliente,
            usuario o estado, según el tipo de reporte elegido.
          </P>
        </View>
      </Page>

      {/* ---------- 7. Preguntas frecuentes ---------- */}
      <Page size="A4" style={s.page} wrap>
        <HeaderFooter section="7. Preguntas frecuentes" />
        <View>
          <H1 n="7">Preguntas frecuentes</H1>

          <H3>No veo un módulo que debería tener</H3>
          <P>Tu acceso lo configura un administrador según tu cargo. Escríbele para que revise tus módulos asignados.</P>

          <H3>No me suena el aviso de recordatorio</H3>
          <P>
            Los navegadores solo permiten sonido después de haber hecho clic en algo dentro de la página. Si acabas de
            abrir la plataforma y no has hecho clic en nada todavía, el primer aviso puede llegar sin sonido; los
            siguientes sí sonarán. También revisa que el sonido esté activado en el ícono de engranaje de Agendas.
          </P>

          <H3>Algo no funciona o se ve raro</H3>
          <P>Avísale a tu consultor o administrador con una captura de pantalla y qué estabas haciendo justo antes.</P>
        </View>
      </Page>
    </Document>
  );
}

async function main() {
  await renderToFile(<Doc />, OUT);
  console.log("PDF guardado en", OUT);
}

main();

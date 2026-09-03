import fs from "fs";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet, renderToFile } from "@react-pdf/renderer";

const logoPath = path.join(process.cwd(), "public", "logo-dp.png");
const logoDataUri = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");

const OUT = "C:\\Users\\cesar\\DP\\Documentacion_Proyecto\\19_Guia_de_Usuario.pdf";

const C = {
  verdeOscuro: "#27500A",
  verde: "#639922",
  ambar: "#BA7517",
  gris: "#43423E",
  grisSuave: "#5F5E5A",
  grisClaro: "#8A897F",
  hueso: "#F1EFE8",
  huesoClaro: "#FAF9F5",
  borde: "#E4E1D6",
  blanco: "#FFFFFF",
};

const PAGE_MARGIN = 46;

const s = StyleSheet.create({
  coverPage: { backgroundColor: C.verdeOscuro, padding: 0 },
  coverInner: { flex: 1, alignItems: "center", justifyContent: "center", padding: 60 },
  coverLogoWrap: { backgroundColor: C.blanco, borderRadius: 12, padding: 22, marginBottom: 38 },
  coverLogo: { width: 150, height: 107, objectFit: "contain" },
  coverTitle: { fontSize: 30, fontWeight: 700, color: C.blanco, textAlign: "center", letterSpacing: 0.3 },
  coverRule: { width: 64, height: 3, backgroundColor: C.verde, marginTop: 18, marginBottom: 18 },
  coverSubtitle: { fontSize: 13, color: "#D9E8C8", textAlign: "center", marginBottom: 4 },
  coverSubtitle2: { fontSize: 10.5, color: "#B9CFA0", textAlign: "center", marginBottom: 2 },
  coverFooter: { position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#9DB884" },

  page: { paddingTop: 78, paddingBottom: 58, paddingHorizontal: PAGE_MARGIN, fontSize: 10, fontFamily: "Helvetica", color: C.gris, backgroundColor: C.blanco },
  headerBar: { position: "absolute", top: 0, left: 0, right: 0, height: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: PAGE_MARGIN, backgroundColor: C.verdeOscuro },
  headerLogo: { width: 26, height: 19, objectFit: "contain", marginRight: 10 },
  headerText: { fontSize: 9, color: C.blanco, fontWeight: 700, letterSpacing: 0.6 },
  headerTextSub: { fontSize: 7.5, color: "#B9CFA0", marginTop: 1 },

  footerRule: { position: "absolute", bottom: 34, left: PAGE_MARGIN, right: PAGE_MARGIN, height: 0.75, backgroundColor: C.borde },
  footerLeft: { position: "absolute", bottom: 20, left: PAGE_MARGIN, fontSize: 8, color: C.grisClaro },
  footerRight: { position: "absolute", bottom: 20, right: PAGE_MARGIN, fontSize: 8, color: C.grisClaro },

  h1Block: { marginTop: 4, marginBottom: 12, flexDirection: "row", alignItems: "center" },
  h1Num: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.verdeOscuro, color: C.blanco, fontSize: 13, fontWeight: 700, textAlign: "center", paddingTop: 8, marginRight: 10 },
  h1: { fontSize: 17, fontWeight: 700, color: C.verdeOscuro, flex: 1 },

  h2: { fontSize: 12, fontWeight: 700, color: C.verde, marginTop: 15, marginBottom: 5 },
  h3: { fontSize: 10.5, fontWeight: 700, color: C.verdeOscuro, marginTop: 11, marginBottom: 3 },

  p: { fontSize: 9.5, color: C.gris, lineHeight: 1.5, marginBottom: 6 },
  intro: { fontSize: 9.5, color: C.grisSuave, lineHeight: 1.5, marginBottom: 8, fontStyle: "italic" },

  bulletRow: { flexDirection: "row", marginBottom: 4.5, paddingLeft: 4 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.verde, marginRight: 8, marginTop: 4 },
  bulletText: { fontSize: 9.5, color: C.gris, lineHeight: 1.45, flex: 1 },
  bulletLead: { fontWeight: 700, color: C.verdeOscuro },

  stepRow: { flexDirection: "row", marginBottom: 5.5, paddingLeft: 4 },
  stepNum: { width: 15, height: 15, borderRadius: 7.5, backgroundColor: C.verdeOscuro, color: C.blanco, fontSize: 8, fontWeight: 700, textAlign: "center", paddingTop: 4, marginRight: 9 },
  stepText: { fontSize: 9.5, color: C.gris, lineHeight: 1.45, flex: 1, marginTop: 1 },

  nota: { flexDirection: "row", backgroundColor: C.hueso, borderLeft: 2.5, borderLeftColor: C.ambar, borderRadius: 3, padding: 9, marginTop: 3, marginBottom: 9 },
  notaLabel: { fontSize: 8.5, fontWeight: 700, color: C.ambar, marginRight: 6, marginTop: 0.5 },
  notaText: { fontSize: 9, color: C.gris, lineHeight: 1.45, flex: 1 },

  divider: { height: 0.75, backgroundColor: C.borde, marginTop: 4, marginBottom: 14 },

  table: { marginTop: 5, marginBottom: 9, borderRadius: 3, overflow: "hidden", border: 0.75, borderColor: C.borde },
  theadRow: { flexDirection: "row", backgroundColor: C.verdeOscuro },
  th: { padding: 6, fontSize: 8, fontWeight: 700, color: C.blanco },
  trow: { flexDirection: "row", borderTop: 0.75, borderTopColor: C.borde },
  trowAlt: { flexDirection: "row", borderTop: 0.75, borderTopColor: C.borde, backgroundColor: C.huesoClaro },
  td: { padding: 6, fontSize: 8, color: C.gris, lineHeight: 1.4 },

  toc: { marginTop: 2 },
  tocRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottom: 0.75, borderBottomColor: C.borde },
  tocLabel: { fontSize: 10, color: C.verdeOscuro, fontWeight: 700 },
  tocSub: { fontSize: 8, color: C.grisClaro, marginTop: 1.5 },

  roleTag: { fontSize: 7.5, fontWeight: 700, color: C.blanco, backgroundColor: C.ambar, borderRadius: 3, paddingVertical: 1.5, paddingHorizontal: 5, marginLeft: 8 },
});

function H1({ n, children, role }: { n: string; children: string; role?: string }) {
  return (
    <View style={s.h1Block} wrap={false}>
      <Text style={s.h1Num}>{n}</Text>
      <Text style={s.h1}>{children}</Text>
      {role && <Text style={s.roleTag}>{role}</Text>}
    </View>
  );
}
function H2({ children }: { children: string }) {
  return <Text style={s.h2} minPresenceAhead={90}>{children}</Text>;
}
function H3({ children }: { children: string }) {
  return <Text style={s.h3} minPresenceAhead={80}>{children}</Text>;
}
function P({ children }: { children: React.ReactNode }) {
  return <Text style={s.p}>{children}</Text>;
}
function Intro({ children }: { children: string }) {
  return <Text style={s.intro}>{children}</Text>;
}
function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ marginBottom: 5 }}>
      {items.map((item, i) => {
        const idx = item.indexOf(":");
        const hasLead = idx > -1 && idx < 46;
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
    <View style={{ marginBottom: 5 }}>
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
function Tabla({ header, rows, w, title }: { header: string[]; rows: string[][]; w?: number[]; title?: string }) {
  const flex = (i: number) => (w ? w[i] : i === 0 ? 1 : 1.8);
  return (
    <View wrap={false}>
      {title && <Text style={s.h3}>{title}</Text>}
      <View style={s.table}>
      <View style={s.theadRow}>
        {header.map((h, i) => (
          <Text key={i} style={[s.th, { flex: flex(i) }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 0 ? s.trow : s.trowAlt}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[s.td, { flex: flex(ci) }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
      </View>
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
          <Text style={s.headerTextSub}>Guía de Usuario · {section}</Text>
        </View>
      </View>
      <View style={s.footerRule} fixed />
      <Text style={s.footerLeft} fixed>
        D&P Ingeniería Integral S.A.S. · Plataforma interna
      </Text>
      <Text style={s.footerRight} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </>
  );
}
function ContentPage({ section, children }: { section: string; children: React.ReactNode }) {
  return (
    <Page size="A4" style={s.page} wrap>
      <HeaderFooter section={section} />
      <View>{children}</View>
    </Page>
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
          <Text style={s.coverSubtitle2}>Seguimiento del equipo · Gestión de cotizaciones, proyectos, presupuestos y compras</Text>
          <Text style={s.coverSubtitle2}>Manual completo de funcionalidades y procesos</Text>
        </View>
        <Text style={s.coverFooter}>Septiembre de 2026 · Versión detallada</Text>
      </Page>

      {/* ---------- Contenido ---------- */}
      <ContentPage section="Contenido">
        <Text style={{ fontSize: 14, fontWeight: 700, color: C.verdeOscuro, marginBottom: 4 }}>Contenido</Text>
        <View style={s.divider} />
        <View style={s.toc}>
          {[
            ["1", "Introducción", "Qué es la plataforma, para qué sirve y cómo está organizada"],
            ["2", "Acceso a la plataforma", "Primer ingreso, iniciar sesión, contraseña, cerrar sesión"],
            ["3", "Cómo moverse en la plataforma", "Menú, filtro por persona, notificaciones, recordatorios, tablas"],
            ["4", "Roles y permisos", "Qué puede hacer un miembro y qué es exclusivo de la Directora"],
            ["5", "Módulo Seguimiento", "Inicio, Banco de tareas, Actividades, Agenda, Equipo, Efectividad, Procesos, Archivadas"],
            ["6", "Módulo Gestión", "Control de proyectos, Cotizaciones, Proyectos, Presupuestos, Compras, Catálogos"],
            ["7", "Reportes", "Reportes descargables y reportes personalizados"],
            ["8", "Administración", "Usuarios, Parámetros, Temas, Auditoría, resumen semanal"],
            ["9", "Preguntas frecuentes", "Problemas comunes y cómo resolverlos"],
            ["10", "Glosario", "Definición de los términos que usa la plataforma"],
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
      </ContentPage>

      {/* ========== 1. Introducción ========== */}
      <ContentPage section="1. Introducción">
        <H1 n="1">Introducción</H1>
        <P>
          Esta plataforma reúne en un solo lugar el trabajo diario del equipo de D&P Ingeniería Integral. Reemplaza el
          seguimiento informal por WhatsApp y las hojas de cálculo sueltas por una herramienta con datos centralizados,
          conectados entre sí y visibles según lo que le corresponde a cada persona.
        </P>

        <H2>1.1 Cómo está organizada</H2>
        <P>La plataforma tiene cuatro grandes áreas. En el menú de la izquierda aparecen solo las que tu cargo tiene habilitadas:</P>
        <Tabla
          header={["Área", "Para qué sirve"]}
          rows={[
            ["Seguimiento", "El trabajo diario del equipo: tareas, tiempo dedicado, agenda semanal, carga de trabajo y efectividad de cada persona."],
            ["Gestión", "El negocio: cotizaciones a clientes, proyectos, presupuestos, compras y los catálogos que los alimentan."],
            ["Reportes", "Descarga de informes en PDF, listos para imprimir o enviar."],
            ["Administración", "Solo para la Directora: usuarios, parámetros del negocio, tema visual y auditoría de cambios."],
          ]}
        />

        <H2>1.2 La regla de oro: la información se registra una sola vez</H2>
        <P>
          Los módulos están conectados. Lo que registras en un lugar se refleja automáticamente en los demás, sin volver a
          digitarlo:
        </P>
        <Bullets
          items={[
            "Cuando terminas una tarea en el Banco de tareas, queda registrada sola en Actividades.",
            "Cuando tomas o te asignan una tarea, aparece sola como bloque en tu Agenda.",
            "Cuando el cliente aprueba una cotización, se crean solos el Proyecto y su Presupuesto.",
            "Cuando registras una compra contra un proyecto, se descuenta sola del presupuesto de ese proyecto.",
          ]}
        />
        <Nota>
          Es normal que tu menú no muestre todo lo que aparece en esta guía. Usa las secciones que apliquen a tu rol y
          pídele a la Directora que revise tus accesos si crees que te falta alguno.
        </Nota>
      </ContentPage>

      {/* ========== 2. Acceso ========== */}
      <ContentPage section="2. Acceso a la plataforma">
        <H1 n="2">Acceso a la plataforma</H1>

        <H2>2.1 Primer ingreso</H2>
        <P>Cuando la Directora te da acceso, recibes un correo de invitación. Para activarlo:</P>
        <Steps
          items={[
            "Abre el correo de invitación (revisa la carpeta de spam o correo no deseado si no lo ves).",
            "Haz clic en el enlace del correo.",
            "En la pantalla que se abre, crea tu contraseña.",
            "Listo: ya puedes entrar con tu correo y esa contraseña.",
          ]}
        />

        <H2>2.2 Iniciar sesión</H2>
        <Steps
          items={[
            "Abre la dirección de la plataforma en el navegador (Chrome, Edge o el que uses habitualmente).",
            "Escribe tu correo y tu contraseña.",
            "Haz clic en Ingresar.",
          ]}
        />
        <P>
          Si dejas la plataforma abierta sin usarla mucho tiempo, la sesión puede cerrarse sola por seguridad. Si eso
          pasa, simplemente vuelve a iniciar sesión.
        </P>

        <H2>2.3 Olvidé mi contraseña</H2>
        <Steps
          items={[
            "En la pantalla de inicio de sesión, haz clic en ¿Olvidaste tu contraseña?",
            "Escribe tu correo y confirma.",
            "Revisa tu correo (y la carpeta de spam) y haz clic en el enlace que llega.",
            "Escribe tu contraseña nueva y guárdala. Vuelve a iniciar sesión con ella.",
          ]}
        />

        <H2>2.4 Cambiar mi contraseña estando dentro</H2>
        <P>
          En la parte de abajo del menú lateral, junto a tu nombre, está el enlace Cambiar contraseña. Te lleva al
          formulario para definir una contraseña nueva sin necesidad de cerrar sesión.
        </P>

        <H2>2.5 Cerrar sesión</H2>
        <P>Al lado de Cambiar contraseña está el enlace Cerrar sesión. Úsalo siempre que trabajes en un computador compartido.</P>
      </ContentPage>

      {/* ========== 3. Navegación ========== */}
      <ContentPage section="3. Cómo moverse en la plataforma">
        <H1 n="3">Cómo moverse en la plataforma</H1>

        <H2>3.1 El menú lateral</H2>
        <P>
          A la izquierda está el menú, agrupado por área (Seguimiento, Gestión, Reportes y, si eres Directora,
          Administración). Dentro de Gestión, los catálogos aparecen agrupados aparte, bajo el título Catálogos.
        </P>
        <P>
          En celular o tablet el menú se oculta; aparece con el botón de las tres líneas (☰) en la barra verde de arriba.
          Al tocar una opción, el menú se cierra solo.
        </P>

        <H2>3.2 Filtro por persona (parte superior)</H2>
        <P>
          En varias pantallas de Seguimiento, arriba a la derecha, hay un selector de persona. Sirve para ver el tablero
          "como si fueras" esa persona: sus tareas, su agenda, su carga. Si eres miembro normal, normalmente ves solo lo
          tuyo; la Directora puede ver el de cualquiera.
        </P>

        <H2>3.3 Campana de notificaciones</H2>
        <P>
          El ícono de campana (arriba, junto al logo) muestra un número cuando tienes avisos sin leer. Recibes
          notificación cuando:
        </P>
        <Bullets
          items={[
            "Alguien toma una tarea que tú publicaste.",
            "Una cotización que creaste pasa a Aprobada o Rechazada.",
            "Se acerca la hora de un bloque de tu Agenda.",
          ]}
        />
        <P>
          Haz clic en la campana para ver el detalle. Los avisos se marcan como leídos al abrirlos, o puedes usar Marcar
          todas como leídas.
        </P>

        <H2>3.4 Recordatorios de Agenda (aviso emergente con sonido)</H2>
        <P>
          Si tienes bloques en tu Agenda, la plataforma te avisa antes de que empiecen con una ventanita en la esquina
          inferior y un sonido, sin importar en qué parte de la app estés trabajando.
        </P>
        <Bullets
          items={[
            "Entendido: confirma el aviso; no vuelve a aparecer para ese bloque.",
            "Posponer 5 min: lo vuelve a mostrar cinco minutos después.",
          ]}
        />
        <Nota>
          Puedes ajustar con cuánta anticipación te avisa y si quieres o no el sonido, desde el ícono de engranaje que
          está junto a + Agregar bloque en la pantalla de Agenda.
        </Nota>

        <H2>3.5 Buscar y filtrar en las tablas</H2>
        <P>La mayoría de las listas tienen las mismas herramientas de búsqueda:</P>
        <Bullets
          items={[
            "Buscar: escribe una palabra (código, nombre, cliente) y la lista se reduce a lo que coincide.",
            "Filtrar por columna: eliges una columna y escribes el valor a buscar solo dentro de ella.",
            "Limpiar filtro: quita todo lo anterior y vuelve a mostrar la lista completa.",
            "Algunas listas (Compras, Presupuestos, Actividades) tienen además filtro por rango de fechas y por estado.",
          ]}
        />
      </ContentPage>

      {/* ========== 4. Roles ========== */}
      <ContentPage section="4. Roles y permisos">
        <H1 n="4">Roles y permisos</H1>
        <P>Cada persona tiene un rol y una lista de módulos. Los define la Directora en Administración, sección Usuarios.</P>

        <H2>4.1 Rol</H2>
        <Tabla
          header={["Rol", "Qué puede hacer"]}
          rows={[
            ["Miembro", "Usa los módulos que tenga asignados: registrar y tomar tareas, llevar su tiempo y su agenda, crear cotizaciones, registrar compras, consultar proyectos y presupuestos, descargar reportes."],
            ["Administrador (Directora de Proyectos)", "Todo lo anterior, para cualquier persona, más: aprobar/rechazar cotizaciones, calificar la calidad de las tareas, archivar y eliminar tareas, gestionar usuarios, cambiar los parámetros del negocio, el tema visual y ver la auditoría de cambios."],
          ]}
        />

        <H2>4.2 Módulos</H2>
        <P>
          Un miembro puede tener acceso a Seguimiento, a Gestión, a ambos o (temporalmente) a ninguno. Solo ve en el menú
          los módulos que tiene. La Directora ve todo siempre.
        </P>

        <H2>4.3 Acciones exclusivas de la Directora</H2>
        <Bullets
          items={[
            "Aprobar o rechazar una cotización (y con ello crear el proyecto y el presupuesto).",
            "Calificar la calidad del entregable de una tarea terminada.",
            "Archivar o eliminar tareas del Banco de tareas.",
            "Invitar usuarios y cambiar sus roles, cargos y módulos.",
            "Editar los Parámetros del negocio (porcentajes, umbrales de alerta) y el Tema visual.",
            "Consultar la Auditoría (quién cambió qué y cuándo, en Proyectos, Compras y Parámetros).",
            "Ver quién está en línea y recibir el resumen semanal por correo.",
          ]}
        />
        <Nota>
          En esta guía, las secciones marcadas con la etiqueta SOLO DIRECTORA solo están disponibles para el rol
          Administrador.
        </Nota>
      </ContentPage>

      {/* ========== 5. SEGUIMIENTO ========== */}
      <ContentPage section="5. Módulo Seguimiento">
        <H1 n="5">Módulo Seguimiento</H1>
        <Intro>
          Para el control del trabajo diario del equipo: qué hay que hacer, quién lo hace, cuánto tiempo toma, cómo está
          la carga de cada persona y qué tan bien se está cumpliendo.
        </Intro>

        <H2>5.1 Inicio de Seguimiento</H2>
        <P>Es el resumen del área. Muestra:</P>
        <Bullets
          items={[
            "Cuatro indicadores: pendientes abiertos, vencidas, que vencen en 3 días y terminadas activas.",
            "Dos gráficos de torta: tareas por estado y resultado de las actividades.",
            "Una tabla Qué requiere atención: las tareas más urgentes primero (vencidas, luego próximas, luego prioridad alta).",
          ]}
        />
        <P>Con el filtro de persona de arriba, puedes ver este resumen para ti o (si eres Directora) para cualquiera del equipo.</P>

        <H2>5.2 Banco de tareas</H2>
        <P>
          Es el tablero central del trabajo del equipo. Tiene tres columnas: <Text style={s.bulletLead}>Disponibles</Text>,{" "}
          <Text style={s.bulletLead}>En proceso</Text> y <Text style={s.bulletLead}>Terminadas</Text>. Una tarea también
          puede estar <Text style={s.bulletLead}>Pausada</Text> (sigue en la columna En proceso, con el cronómetro
          detenido).
        </P>

        <H3>Publicar una tarea nueva</H3>
        <P>Cualquier persona puede publicar una tarea. Con el botón Publicar tarea se abre un formulario con estos campos:</P>
        <Tabla
          header={["Campo", "Para qué"]}
          w={[1, 1.7]}
          rows={[
            ["Título", "Nombre corto de la tarea (obligatorio)."],
            ["Cliente / Proyecto / Empresa atendida", "A qué trabajo pertenece (se eligen de los catálogos)."],
            ["Prioridad", "Alta, Media o Baja."],
            ["Fecha límite", "Cuándo debe estar lista."],
            ["Horas estimadas", "Cuánto se calcula que toma. Alimenta la Agenda y la carga del Equipo."],
            ["Proceso / Actividad del catálogo", "Clasifica la tarea según el mapa de procesos de D&P."],
            ["Instrucciones y Entregable requerido", "Qué hay que hacer y qué se debe entregar."],
            ["Responsable", "Si se deja en blanco, la tarea nace Disponible para que alguien la tome. Si se elige una persona, nace ya asignada (En proceso) y con su bloque en la Agenda."],
            ["Fecha y hora en agenda", "Cuándo va el bloque en la agenda de esa persona (si se asignó)."],
          ]}
        />

        <H3>Tomar una tarea</H3>
        <Steps
          items={[
            "Abre una tarea de la columna Disponibles.",
            "Indica en qué día y a qué hora la vas a trabajar (para el bloque de agenda).",
            "Confirma. La tarea pasa a En proceso bajo tu nombre y aparece en tu Agenda. A quien la publicó le llega una notificación.",
          ]}
        />

        <H3>Cronómetro</H3>
        <Bullets
          items={[
            "Sobre una tarea En proceso que tomaste, puedes iniciar el cronómetro para medir el tiempo real.",
            "Solo puedes tener un cronómetro corriendo a la vez. Si inicias otro, el anterior se cierra solo.",
            "Pausar: detiene el cronómetro y deja la tarea Pausada, conservando el tiempo acumulado.",
            "Reanudar: la vuelve a poner En proceso y arranca el cronómetro de nuevo.",
            "El tiempo se va sumando en Horas reales de la tarea, que después se compara con las horas estimadas en Efectividad.",
          ]}
        />

        <H3>Ver detalles</H3>
        <P>Abre la tarjeta de una tarea para ver toda su información: instrucciones, entregable, proceso, historial de tiempo y notas.</P>

        <H3>Terminar una tarea</H3>
        <Steps
          items={[
            "En una tarea En proceso tuya, usa Terminar.",
            "Escribe el entregable (qué se produjo) y las notas de cierre.",
            "Confirma. La tarea pasa a Terminadas, el cronómetro se cierra si seguía corriendo, y se crea sola su fila en Actividades.",
          ]}
        />

        <H3>Acciones de la Directora sobre tareas</H3>
        <Bullets
          items={[
            "Calificar calidad: sobre una tarea Terminada, la Directora le pone una calificación de 1 a 5 (ver Efectividad).",
            "Archivar: guarda la tarea en el histórico. No se puede archivar sin haber calificado la calidad primero.",
            "Eliminar: borra la tarea por completo. Se usa solo para tareas creadas por error.",
            "Liberar / retirar: devuelve una tarea a Disponibles. Un miembro solo puede liberar una tarea que él mismo tomó.",
          ]}
        />

        <H2>5.3 Actividades</H2>
        <P>
          Es la bitácora de cumplimiento del equipo: qué se hizo, cuándo, para qué cliente/proyecto y con qué resultado
          (Cumplida, Pendiente/Parcial o No cumplida).
        </P>
        <Bullets
          items={[
            "Se alimenta sola: al terminar una tarea, su registro aparece aquí automáticamente con origen Banco de tareas.",
            "También se pueden registrar actividades a mano, para trabajo que no pasó por el Banco de tareas.",
            "Filtro por cargo: la tabla y los contadores de arriba se ajustan al cargo que elijas.",
          ]}
        />

        <H2>5.4 Agenda</H2>
        <P>
          Calendario semanal por persona, de lunes a domingo. Sábado y domingo quedan disponibles solo para trabajo
          extraordinario: no se espera que se usen de forma regular y aparecen marcados.
        </P>
        <Bullets
          items={[
            "Semana anterior / Semana siguiente: para moverte entre semanas.",
            "+ Agregar bloque: eliges persona, día, hora, duración, y opcionalmente tarea y cliente/proyecto.",
            "Los bloques que salen de tomar una tarea se crean solos y quedan ligados a esa tarea: su estado se lee de la tarea, no se duplica.",
            "Desde un bloque ligado a una tarea puedes usar el mismo cronómetro (iniciar, pausar, reanudar, terminar) sin ir al Banco de tareas.",
            "Reprogramar un bloque ligado a una tarea solo lo puede hacer quien tomó la tarea (o la Directora).",
            "Engranaje: ajusta tus minutos de aviso previo y si quieres sonido en los recordatorios.",
          ]}
        />

        <H2>5.5 Equipo (Capacidad)</H2>
        <P>
          Muestra, por persona y para la semana visible, las horas de trabajo planificadas frente a su capacidad semanal,
          y una lectura de carga:
        </P>
        <Tabla
          header={["Lectura", "Significado"]}
          rows={[
            ["Capacidad disponible", "Menos del 50% de la capacidad planificada."],
            ["Carga equilibrada", "Entre 50% y 80%."],
            ["Carga alta", "Entre 80% y 100%."],
            ["Sobrecarga", "Más del 100% de la capacidad."],
          ]}
        />
        <P>También muestra, por persona: tareas abiertas, vencidas, en proceso y archivadas. La Directora puede abrir el histórico de archivadas de cada quien.</P>

        <H2>5.6 Efectividad</H2>
        <P>
          Herramienta de seguimiento del desempeño individual, sobre las tareas Terminadas de cada persona. El componente
          principal que se registra aquí es la <Text style={s.bulletLead}>calidad del entregable</Text>.
        </P>
        <Bullets
          items={[
            "Solo la Directora califica: pone una nota de 1 a 5 estrellas (equivale a 20 / 40 / 60 / 80 / 100 %).",
            "Se califica antes de archivar la tarea: si no tiene nota, la plataforma no deja archivarla.",
            "Efectividad provisional: mientras una tarea (o una persona) no tenga calidad calificada, su resultado se muestra como provisional.",
            "Efectividad final: una vez calificada, queda con su porcentaje definitivo.",
            "Además de la calidad, la efectividad considera el cumplimiento (terminar lo asignado), la oportunidad (hacerlo a tiempo) y la eficiencia de tiempo (horas reales frente a estimadas). Los pesos de cada factor los define la Directora en Parámetros.",
          ]}
        />
        <Nota>
          La Efectividad es una herramienta de seguimiento personal y de mejora, no un ranking para comparar públicamente
          entre compañeros.
        </Nota>

        <H2>5.7 Procesos</H2>
        <P>
          Vista del mapa de procesos de D&P (estratégicos, misionales y de apoyo). Por cada proceso muestra cuántas
          tareas tiene abiertas, vencidas, archivadas y el total histórico. Sirve para ver en qué procesos se concentra el
          trabajo.
        </P>

        <H2>5.8 Finalizadas y archivadas</H2>
        <P>
          El histórico de tareas terminadas y archivadas. Se puede filtrar por proceso o por persona. Es la fuente para
          consultar trabajo pasado sin saturar el Banco de tareas.
        </P>
      </ContentPage>

      {/* ========== 6. GESTIÓN ========== */}
      <ContentPage section="6. Módulo Gestión">
        <H1 n="6">Módulo Gestión</H1>
        <Intro>
          El flujo del negocio, de punta a punta: se cotiza a un cliente, el cliente aprueba, nace el proyecto con su
          presupuesto, se ejecutan las compras y la plataforma muestra si cada proyecto va en ganancia y a tiempo.
        </Intro>

        <H2>6.1 El flujo completo</H2>
        <Steps
          items={[
            "Se crea una Cotización con los ítems y precios que se le ofrecen al cliente. La plataforma calcula si es rentable.",
            "La cotización se le envía al cliente y queda registrada con su estado.",
            "Cuando el cliente aprueba, la Directora la marca como Aprobada e indica las fechas: se crean solos el Proyecto y su Presupuesto.",
            "El presupuesto arranca con los mismos ítems de la cotización como plan de costos.",
            "El equipo registra las Compras del proyecto. Cada compra se descuenta sola del presupuesto.",
            "El Inicio de Gestión muestra el Control de proyectos: presupuesto vs. gastado, ganancia proyectada vs. real, y si va a tiempo.",
          ]}
        />

        <H2>6.2 Inicio de Gestión — Control de proyectos</H2>
        <P>
          Es el tablero para ver, de un vistazo, cómo va cada proyecto en curso. Se calcula solo desde la cotización
          aprobada, el presupuesto y las compras.
        </P>
        <Tabla
          header={["Columna", "Qué muestra"]}
          w={[1, 1.7]}
          rows={[
            ["Aprobado", "El valor que aceptó pagar el cliente (de la cotización)."],
            ["Presupuesto", "El plan de costos del proyecto."],
            ["Gastado", "La suma de todas las compras registradas contra el proyecto (comprometido). Debajo, cuánto de eso ya está pagado."],
            ["Disponible", "Presupuesto menos gastado. En rojo si es negativo."],
            ["Ganancia real", "Valor aprobado menos lo gastado, menos administración e IVA. Antes de retenciones."],
            ["Plata (semáforo)", "En presupuesto (verde) · En atención al llegar al umbral de ejecución (amarillo) · Sobre presupuesto o en pérdida (rojo)."],
            ["Tiempo (semáforo)", "A tiempo (verde) · Por vencer cuando faltan pocos días (amarillo) · Atrasado si ya pasó la fecha de entrega (rojo) · Sin fecha si no se registró."],
          ]}
        />
        <Bullets
          items={[
            "Arriba hay totales: proyectos activos, cuántos tienen alerta, cuántos atrasados, y la ganancia proyectada y real del conjunto.",
            "Filtro por cliente: para mostrar solo los proyectos de un cliente (útil para una reunión con ese cliente).",
            "Botón PDF: descarga el tablero como informe, respetando el filtro por cliente.",
            "Si algún proyecto no tiene fecha de entrega, aparece un aviso para completarla.",
            "Solo aparecen los proyectos en curso (Planeado, En ejecución, Suspendido). Los finalizados o rechazados no.",
          ]}
        />
        <P>Más abajo en la misma página está el tablero de crecimiento y rentabilidad por período (año, mes, cliente), con la evolución mensual.</P>

        <H2>6.3 Cotizaciones</H2>
        <P>Registra la oferta que se le hace a un cliente y calcula su rentabilidad antes de comprometerse.</P>

        <H3>Crear una cotización</H3>
        <P>Con + Nueva cotización se abre el formulario completo:</P>
        <Tabla
          header={["Campo", "Para qué"]}
          w={[1, 1.7]}
          rows={[
            ["Código / consecutivo", "Identificador único de la cotización. Se escribe a mano y no se puede repetir, ni siquiera si la cotización que lo tenía se borró."],
            ["Fecha de elaboración · Vigencia de la oferta", "Cuándo se hizo y por cuántos días es válida."],
            ["Cliente · Empresa atendida", "A quién se le cotiza. Empresa atendida puede ser el mismo cliente."],
            ["Nombre de la cotización · Responsable comercial", "Título del trabajo y quién lo lleva."],
            ["Contacto, correo, teléfono", "Datos de la persona del cliente."],
            ["¿Responde por IVA?", "Interruptor maestro: si D&P responde por IVA. En cada ítem hay además una casilla IVA para marcar cuáles renglones son gravados (hay ítems que llevan y otros que no). El IVA del 19% se calcula solo sobre los ítems gravados."],
            ["Margen de utilidad (%)", "El margen objetivo de esta cotización (se puede ajustar por cotización)."],
            ["Ítems", "Cada línea de la oferta: se elige del Banco de insumos / Profesionales / Materiales, con cantidad. El precio al cliente se calcula solo, o se puede fijar a mano."],
            ["Descripción, forma de pago, condiciones", "Textos que salen en el PDF de la cotización."],
            ["Seguimiento interno", "Nota interna sobre qué pasó con la propuesta (no sale en el PDF)."],
          ]}
        />

        <H3>El cálculo de rentabilidad</H3>
        <P>Mientras armas los ítems, la plataforma muestra en tiempo real:</P>
        <Bullets
          items={[
            "Costos directos (interno): lo que le cuesta a D&P.",
            "Costos administrativos: un porcentaje sobre el costo directo.",
            "Utilidad esperada: según el margen objetivo.",
            "Valor comercial antes de IVA, IVA y valor sugerido al cliente.",
            "Si el valor cotizado cubre todo, la cotización es viable; si no, no viable.",
          ]}
        />

        <Tabla
          title="Estados de la cotización"
          header={["Estado", "Significado"]}
          rows={[
            ["Borrador", "Todavía se está armando."],
            ["Pendiente por definir", "Enviada internamente, sin decisión."],
            ["Enviada", "Ya se le envió al cliente."],
            ["Aprobada", "El cliente la aceptó. Genera proyecto y presupuesto."],
            ["Rechazada", "El cliente no la aceptó. Genera un proyecto en estado Rechazado, solo para dejar el registro."],
          ]}
        />

        <H3>Enlaces</H3>
        <P>
          A una cotización se le pueden agregar hasta 10 enlaces (a SharePoint u otros) con los documentos que la
          acompañan —la propuesta firmada, correos, etc.— desde su ficha. Aparecen en la columna Enlaces de la lista y
          son clickeables. Se usan enlaces en vez de subir archivos para no llenar el almacenamiento.
        </P>

        <H3>Aprobar una cotización</H3>
        <Text style={s.roleTag}>SOLO DIRECTORA</Text>
        <View style={{ height: 4 }} />
        <P>Al aprobar, se abre una ventana para registrar:</P>
        <Bullets
          items={[
            "Fecha en que el cliente aprobó y cómo aprobó (correo, orden de compra firmada, acta…). Queda como registro formal.",
            "Fecha de inicio del proyecto.",
            "Fecha de entrega comprometida (obligatoria): sin ella, el semáforo de tiempo no puede evaluar el proyecto.",
          ]}
        />
        <P>Al confirmar: la cotización queda Aprobada, se crea el Proyecto (con código propio tipo PROY-2026-001) y su Presupuesto sembrado con los ítems de la cotización.</P>

        <H3>Rechazar una cotización</H3>
        <Text style={s.roleTag}>SOLO DIRECTORA</Text>
        <View style={{ height: 4 }} />
        <P>Deja la cotización como Rechazada y crea un proyecto en estado Rechazado (sin presupuesto), para que Proyectos muestre en un solo lugar el resultado de cada cotización.</P>

        <H3>Descargar la cotización en PDF</H3>
        <P>Desde la lista o desde la ficha, el botón PDF genera la cotización con la marca de D&P, lista para enviar al cliente. Si ya está aprobada, el PDF muestra la fecha de aprobación.</P>
      </ContentPage>

      <ContentPage section="6. Módulo Gestión">
        <H2>6.4 Proyectos</H2>
        <P>La ficha de cada proyecto. Los proyectos nacen siempre de una cotización aprobada (o rechazada).</P>
        <Bullets
          items={[
            "Datos del proyecto: nombre, cliente, empresa atendida, responsable, estado, fechas de inicio y cierre, observaciones. Muestra también de qué cotización nació y cuándo la aprobó el cliente.",
            "Estados: Planeado, En ejecución, Suspendido, Finalizado, Cancelado (y Rechazado, para los que salen de una cotización rechazada).",
            "Contrato y retenciones: se ingresa el valor del contrato, si aplica IVA, el porcentaje de retención en la fuente, la tarifa de ICA (por mil, ej. 9,66) y otras retenciones. La plataforma calcula el efectivo neto esperado, es decir, cuánto le llega realmente a D&P después de lo que el cliente retiene y paga a la DIAN.",
            "Presupuestos del proyecto: se listan en la ficha, con su estado de viabilidad. Las compras se gestionan en el módulo Compras y su costo real se refleja en el control de cada presupuesto.",
            "Archivar: saca el proyecto de la lista principal (se puede volver a mostrar con la casilla Mostrar archivados y rechazados).",
          ]}
        />
        <Nota>
          El efectivo neto esperado (retenciones) es distinto de la ganancia del proyecto. La ganancia responde a "¿este
          proyecto deja utilidad?"; el efectivo neto responde a "¿cuánto dinero entra a caja?". Son dos preguntas
          distintas y la plataforma las mantiene separadas.
        </Nota>

        <H2>6.5 Presupuestos</H2>
        <P>Es el control de costos de un proyecto: lo planeado frente a lo realmente gastado.</P>
        <Bullets
          items={[
            "Cotización base aprobada: una tabla congelada con la oferta que aceptó el cliente. Es solo referencia y nunca cambia.",
            "Plan de costos del proyecto: los ítems presupuestados. Empiezan con los de la cotización; aquí sí se pueden ajustar, agregar o quitar.",
            "Costo real: sale solo de las compras registradas contra el proyecto. La columna Real del plan es de referencia y no se edita a mano.",
            "Ejecución del presupuesto: una barra que muestra cuánto se ha gastado del plan, con alerta cuando se pasa del 80% (amarillo) o del 100% (rojo).",
            "Restaurar base: vuelve a traer los ítems originales de la cotización, por si se editaron o borraron por error.",
          ]}
        />
        <H3>Resumen financiero</H3>
        <P>El recuadro de resumen tiene dos bloques:</P>
        <Bullets
          items={[
            "Referencia · cotización aprobada: costo directo, administración, utilidad esperada, IVA y valor sugerido. Cifras fijas de la oferta; no cambian.",
            "Control del proyecto · líneas vigentes: presupuesto vigente, costo real ejecutado, disponible, ganancia estimada (vs. plan) y ganancia según costos reales. Estas sí se mueven con las compras.",
          ]}
        />

        <H2>6.6 Compras</H2>
        <P>Registro de cada compra o gasto de un proyecto.</P>
        <Tabla
          header={["Campo", "Para qué"]}
          w={[1, 1.7]}
          rows={[
            ["Proyecto", "Obligatorio. Es el centro de costos: sin proyecto, la compra no se puede conectar al presupuesto."],
            ["Proveedor · Insumo", "De los catálogos. El insumo trae su costo de referencia."],
            ["Descripción", "Qué se compró (obligatorio)."],
            ["Cantidad · Valor unitario", "El total se calcula solo."],
            ["Estado de pago", "Cotizado, Aprobado o Pagado."],
            ["Valor pagado · Referencia · Categoría · Notas", "Datos de soporte del pago."],
          ]}
        />
        <Bullets
          items={[
            "La lista se puede filtrar por proyecto, rango de fechas, estado y búsqueda por columna.",
            "Archivar una compra la saca de la lista sin borrarla (queda en el histórico para auditoría).",
          ]}
        />

        <H2>6.7 Catálogos</H2>
        <P>Listas reutilizables. Se llenan una vez y se usan desde cotizaciones, proyectos y compras.</P>
        <Tabla
          header={["Catálogo", "Qué guarda"]}
          rows={[
            ["Clientes", "Empresas o personas que contratan a D&P: NIT, tipo, sector, contacto, asesor, dirección."],
            ["Empresas atendidas", "Sedes o dependencias dentro de un cliente. Cada una queda ligada a su cliente."],
            ["Proveedores", "A quienes D&P les compra: NIT, contacto, forma de pago."],
            ["Banco de insumos", "Insumos y servicios con su costo unitario o valor hora. Se usan al armar cotizaciones, presupuestos y compras."],
            ["Inventario materiales", "Equipos y materiales propios de D&P, con su valor de reposición y vida útil; la plataforma calcula el costo por jornada de uso."],
            ["Profesionales", "Personas externas que D&P contrata por proyecto (no tienen acceso a la plataforma)."],
          ]}
        />
        <P>Todos los catálogos funcionan igual: botón Nuevo para agregar, clic en una fila para editarla, y borrar desde la fila. Se ordenan alfabéticamente.</P>
      </ContentPage>

      {/* ========== 7. REPORTES ========== */}
      <ContentPage section="7. Reportes">
        <H1 n="7">Reportes</H1>
        <P>Todos los reportes se descargan en PDF con la marca de D&P, listos para imprimir o enviar.</P>

        <H2>7.1 Reportes predefinidos</H2>
        <P>En Reportes, en Descargar PDF, hay diez reportes de un clic:</P>
        <Tabla
          header={["Reporte", "Contenido"]}
          rows={[
            ["Resumen ejecutivo", "Indicadores generales de Seguimiento y Gestión."],
            ["Proyectos", "Listado de proyectos con ganancia estimada."],
            ["Presupuestos", "Costos, utilidad esperada, IVA y viabilidad por presupuesto."],
            ["Cotizaciones", "Histórico de cotizaciones enviadas."],
            ["Compras", "Compras por proyecto, proveedor y estado de pago."],
            ["Clientes / Proveedores / Banco de insumos", "Los catálogos, en formato imprimible."],
            ["Banco de tareas / Actividades", "Estado del trabajo del equipo."],
          ]}
        />

        <H2>7.2 Reportes personalizados</H2>
        <P>
          Debajo, en Reportes personalizados, se elige un tipo de reporte y se filtra por proyecto, cliente, usuario o
          estado (según el tipo). El PDF sale solo con ese recorte y sus totales.
        </P>

        <H2>7.3 Control de proyectos en PDF</H2>
        <P>
          Además, desde el Inicio de Gestión, el botón PDF del Control de proyectos descarga el tablero de estado de
          proyectos (presupuesto, gastado, ganancia, semáforos), respetando el filtro por cliente que tengas puesto.
        </P>
      </ContentPage>

      {/* ========== 8. ADMINISTRACIÓN ========== */}
      <ContentPage section="8. Administración">
        <H1 n="8" role="SOLO DIRECTORA">Administración</H1>
        <Intro>Sección visible solo para el rol Administrador (la Directora de Proyectos).</Intro>

        <H2>8.1 Usuarios</H2>
        <Bullets
          items={[
            "+ Invitar usuario: se ingresa correo, nombre, cargo, rol y módulos. La plataforma envía un correo con el enlace de activación y deja el perfil preconfigurado.",
            "Editar un usuario: cambiar su cargo, su rol (Miembro / Administrador) y sus módulos (Seguimiento, Gestión).",
            "Presencia: un punto verde y En línea indican que la persona está activa en la plataforma en ese momento; si no, muestra hace cuánto se le vio por última vez.",
          ]}
        />

        <H2>8.2 Parámetros del negocio</H2>
        <P>Valores que usa toda la plataforma para sus cálculos. Se editan sin necesidad de un desarrollador:</P>
        <Tabla
          header={["Parámetro", "Para qué"]}
          w={[1.1, 1.7]}
          rows={[
            ["Costos administrativos (%)", "Porcentaje que se suma al costo directo en cotizaciones y presupuestos."],
            ["Margen de utilidad objetivo (%)", "Margen por defecto de las cotizaciones nuevas."],
            ["IVA predeterminado (%)", "Tarifa de IVA."],
            ["Alerta de ejecución del presupuesto (%)", "En el Control de proyectos, a partir de qué % gastado un proyecto pasa a amarillo (por defecto 80%)."],
            ["Aviso previo a la entrega (días)", "Cuántos días antes de la fecha de entrega un proyecto pasa a Por vencer (por defecto 15)."],
            ["Gastos e ingresos mensuales de la empresa", "Referencia para el análisis de crecimiento."],
            ["Pesos de Efectividad", "Cuánto pesa el cumplimiento, la oportunidad, la calidad y la eficiencia de tiempo en el puntaje de cada persona."],
          ]}
        />

        <H2>8.3 Temas</H2>
        <P>Cambia la paleta de colores de toda la plataforma (verde D&P y otras opciones). El cambio aplica para todo el equipo.</P>

        <H2>8.4 Auditoría</H2>
        <P>
          Historial de cambios en Proyectos, Compras y Parámetros: quién, cuándo y qué campo cambió (valor anterior a
          valor nuevo). Se registran también las creaciones y eliminaciones. Muestra los últimos 200 movimientos.
        </P>

        <H2>8.5 Resumen semanal por correo</H2>
        <P>
          Cada lunes en la mañana llega automáticamente a la Directora un correo con: tareas cerradas la semana anterior,
          proyectos con margen negativo y compras pendientes de pago. Sirve para tener una vista rápida sin entrar a
          revisar cada módulo.
        </P>
      </ContentPage>

      {/* ========== 9. FAQ ========== */}
      <ContentPage section="9. Preguntas frecuentes">
        <H1 n="9">Preguntas frecuentes</H1>

        <H3>No veo un módulo que debería tener</H3>
        <P>Tus accesos los configura la Directora en Administración, sección Usuarios. Pídele que revise tus módulos asignados.</P>

        <H3>No me suena el aviso de recordatorio</H3>
        <P>
          Los navegadores solo permiten sonido después de que hayas hecho clic en algo dentro de la página. Si acabas de
          abrir la plataforma y no has hecho clic en nada, el primer aviso puede llegar sin sonido; los siguientes sí
          suenan. Revisa también que el sonido esté activado en el engranaje de la Agenda.
        </P>

        <H3>Aprobé una cotización pero no puedo aprobarla de nuevo / no sale el proyecto</H3>
        <P>
          Al aprobar, la plataforma pide las fechas del proyecto (inicio y entrega). Si cerraste esa ventana sin
          completarla, la cotización sigue como estaba. Vuelve a intentarlo llenando la fecha de entrega, que es
          obligatoria.
        </P>

        <H3>Un proyecto aparece en rojo pero sé que va bien</H3>
        <P>
          Revisa que sus compras estén bien registradas y que su presupuesto tenga los ítems correctos. El semáforo se
          calcula solo con esos datos: si hay compras cargadas de más, o el presupuesto quedó muy bajo, se verá en rojo.
        </P>

        <H3>El costo real del presupuesto no cuadra</H3>
        <P>
          El costo real sale de las compras del proyecto. Si falta una compra por registrar, el real se verá más bajo de
          lo esperado. Revisa Compras filtrando por ese proyecto.
        </P>

        <H3>Cerré sesión sin querer / la sesión se cerró sola</H3>
        <P>Es normal tras un tiempo de inactividad. Vuelve a iniciar sesión con tu correo y contraseña.</P>

        <H3>Algo no funciona o se ve raro</H3>
        <P>Avísale a la Directora o al consultor con una captura de pantalla y contando qué estabas haciendo justo antes.</P>
      </ContentPage>

      {/* ========== 10. GLOSARIO ========== */}
      <ContentPage section="10. Glosario">
        <H1 n="10">Glosario</H1>
        <Tabla
          header={["Término", "Qué significa"]}
          w={[1, 2.1]}
          rows={[
            ["Módulo", "Un área de la plataforma (Seguimiento o Gestión). Cada persona ve solo los que tiene asignados."],
            ["Rol", "Miembro o Administrador (Directora). Define qué acciones puede hacer una persona."],
            ["Cargo", "El puesto de la persona (texto libre). Se usa para filtrar Actividades y para mostrarlo en su perfil."],
            ["Cotización", "La oferta económica que se le hace a un cliente."],
            ["Ítem", "Cada línea de una cotización o de un presupuesto (un insumo, un servicio, un material) con su cantidad y valor."],
            ["Viable / No viable", "Una cotización es viable si el valor que se le cobra al cliente cubre los costos, la administración, la utilidad y el IVA."],
            ["Proyecto", "El trabajo que se ejecuta después de que el cliente aprueba una cotización."],
            ["Presupuesto", "El plan de costos de un proyecto y su control frente a lo realmente gastado."],
            ["Plan / Presupuesto vigente", "La suma de los ítems presupuestados de un proyecto."],
            ["Gastado / Comprometido", "La suma de todas las compras registradas contra el proyecto (aunque no estén pagadas)."],
            ["Pagado", "La parte del gasto que ya tiene estado de pago Pagado."],
            ["Valor aprobado", "El monto que el cliente aceptó pagar, según la cotización aprobada."],
            ["Ganancia proyectada", "Valor aprobado menos el plan de costos, menos administración e IVA. Lo que se ganaría si todo sale como se presupuestó."],
            ["Ganancia real", "Valor aprobado menos lo realmente gastado en compras, menos administración e IVA."],
            ["Efectivo neto esperado", "Lo que le llega a caja a D&P después de IVA, retención en la fuente, ICA y otras retenciones que el cliente descuenta."],
            ["Semáforo de plata", "En presupuesto (verde) / En atención (amarillo) / Sobre presupuesto o en pérdida (rojo)."],
            ["Semáforo de tiempo", "A tiempo / Por vencer / Atrasado / Sin fecha, según la fecha de entrega del proyecto."],
            ["Efectividad provisional", "El resultado de una persona o tarea mientras no se haya calificado su calidad."],
            ["Enlace", "Un vínculo (a SharePoint u otro) agregado a una cotización con documentos que la acompañan."],
            ["Archivar", "Sacar un registro de la lista principal sin borrarlo; queda en el histórico."],
          ]}
        />
        <View style={{ height: 12 }} />
        <View style={s.divider} />
        <P>
          Esta guía describe la plataforma tal como está en septiembre de 2026. Para dudas puntuales, escribe a la Directora
          de Proyectos.
        </P>
      </ContentPage>
    </Document>
  );
}

async function main() {
  await renderToFile(<Doc />, OUT);
  console.log("PDF guardado en", OUT);
}

main();

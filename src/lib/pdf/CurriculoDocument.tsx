import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CurriculoGerado } from "@/lib/types";

const BRASS = "#9c7a3c";
const INK = "#1c1a17";
const INK_MUTED = "#4a463f";
const HAIRLINE = "#d8d2c4";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
  },
  nome: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: INK,
  },
  titulo: {
    fontSize: 12,
    color: BRASS,
    marginTop: 2,
  },
  contatoLinha: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 10,
  },
  contatoItem: {
    fontSize: 9,
    color: INK_MUTED,
  },
  divisor: {
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
    marginTop: 14,
    marginBottom: 14,
  },
  secaoTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: INK,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  resumo: {
    fontSize: 10,
    color: INK_MUTED,
    lineHeight: 1.5,
  },
  bloco: {
    marginBottom: 12,
  },
  linhaEntreItens: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cargo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    color: INK,
  },
  empresa: {
    fontSize: 9.5,
    color: BRASS,
    marginTop: 1,
  },
  periodo: {
    fontSize: 9,
    color: INK_MUTED,
  },
  bullet: {
    flexDirection: "row",
    marginTop: 4,
    paddingLeft: 2,
  },
  bulletMarcador: {
    fontSize: 9.5,
    color: BRASS,
    marginRight: 6,
  },
  bulletTexto: {
    fontSize: 9.5,
    color: INK_MUTED,
    flex: 1,
    lineHeight: 1.4,
  },
  habilidadesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  habilidadeTag: {
    fontSize: 8.5,
    color: INK,
    backgroundColor: "#f1ece0",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 3,
  },
  idiomaLinha: {
    fontSize: 9.5,
    color: INK_MUTED,
    marginBottom: 3,
  },
});

export function CurriculoDocument({ curriculo }: { curriculo: CurriculoGerado }) {
  const contatos = [
    curriculo.contato.email,
    curriculo.contato.telefone,
    curriculo.contato.localizacao,
    curriculo.contato.linkedin,
    curriculo.contato.github,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.nome}>{curriculo.nome}</Text>
        {curriculo.titulo ? (
          <Text style={styles.titulo}>{curriculo.titulo}</Text>
        ) : null}
        <View style={styles.contatoLinha}>
          {contatos.map((c, i) => (
            <Text key={i} style={styles.contatoItem}>
              {c}
              {i < contatos.length - 1 ? "  ·" : ""}
            </Text>
          ))}
        </View>

        <View style={styles.divisor} />

        {curriculo.resumo && (
          <View style={styles.bloco}>
            <Text style={styles.secaoTitulo}>Resumo</Text>
            <Text style={styles.resumo}>{curriculo.resumo}</Text>
          </View>
        )}

        {curriculo.experiencias?.length > 0 && (
          <View style={styles.bloco}>
            <Text style={styles.secaoTitulo}>Experiência</Text>
            {curriculo.experiencias.map((exp, i) => (
              <View key={i} style={{ marginBottom: 10 }} wrap={false}>
                <View style={styles.linhaEntreItens}>
                  <View>
                    <Text style={styles.cargo}>{exp.cargo}</Text>
                    <Text style={styles.empresa}>{exp.empresa}</Text>
                  </View>
                  <Text style={styles.periodo}>{exp.periodo}</Text>
                </View>
                {exp.bullets?.map((b, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletMarcador}>›</Text>
                    <Text style={styles.bulletTexto}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {curriculo.formacao?.length > 0 && (
          <View style={styles.bloco}>
            <Text style={styles.secaoTitulo}>Formação</Text>
            {curriculo.formacao.map((f, i) => (
              <View key={i} style={[styles.linhaEntreItens, { marginBottom: 6 }]}>
                <View>
                  <Text style={styles.cargo}>{f.curso}</Text>
                  <Text style={styles.empresa}>{f.instituicao}</Text>
                </View>
                <Text style={styles.periodo}>{f.periodo}</Text>
              </View>
            ))}
          </View>
        )}

        {curriculo.habilidades?.length > 0 && (
          <View style={styles.bloco}>
            <Text style={styles.secaoTitulo}>Habilidades</Text>
            <View style={styles.habilidadesWrap}>
              {curriculo.habilidades.map((h, i) => (
                <Text key={i} style={styles.habilidadeTag}>
                  {h}
                </Text>
              ))}
            </View>
          </View>
        )}

        {curriculo.idiomas?.length > 0 && (
          <View style={styles.bloco}>
            <Text style={styles.secaoTitulo}>Idiomas</Text>
            {curriculo.idiomas.map((idm, i) => (
              <Text key={i} style={styles.idiomaLinha}>
                {idm.idioma} — {idm.nivel}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

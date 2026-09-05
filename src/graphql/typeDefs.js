const typeDefs = `#graphql

  type Usuario {
    id: ID!
    nome: String!
    email: String!
    perfil: String!
    ativo: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Categoria {
    id: ID!
    nome: String!
    descricao: String
    isAtivo: Boolean!
  }

  type Localizacao {
    type: String
    coordinates: [Float]!
  }

  type Reporte {
    id: ID!
    titulo: String!
    descricao: String!
    categoria: Categoria
    autor: Usuario
    status: String!
    localizacao: Localizacao
    endereco: String
    imagens: [String]
    createdAt: String!
    updatedAt: String!
  }

  type Comentario {
    id: ID!
    reporte: ID!
    autor: Usuario
    conteudo: String!
    createdAt: String!
  }

  type StatusHistorico {
    id: ID!
    reporte: ID!
    statusAnterior: String!
    statusAtual: String!
    mudadoPor: Usuario
    observacao: String
    dataMudanca: String!
  }

  type ContagemPorStatus {
    _id: String!
    quantidade: Int!
  }

  type CategoriaContagem {
    _id: ID
    nome: String
  }

  type ContagemPorCategoria {
    categoria: CategoriaContagem
    quantidade: Int!
  }

  type ContagemPorPeriodo {
    data: String!
    quantidade: Int!
  }

  type EstatisticasDashboard {
    total: Int!
    porStatus: [ContagemPorStatus]!
  }

  type AuthPayload {
    token: String!
    usuario: Usuario!
  }

  type PaginacaoInfo {
    total: Int!
    pagina: Int!
    limite: Int!
    paginas: Int!
  }

  type ReportesComPaginacao {
    reportes: [Reporte]!
    paginacao: PaginacaoInfo!
  }

  input RegistroEntrada {
    nome: String!
    email: String!
    senha: String!
  }

  input LocalizacaoEntrada {
    type: String
    coordinates: [Float]!
  }

  input CriarReporteEntrada {
    titulo: String!
    descricao: String!
    categoria: ID!
    localizacao: LocalizacaoEntrada!
    endereco: String
    imagens: [String]
  }

  type Query {
    reportes(status: String, categoria: ID, pagina: Int, limite: Int): ReportesComPaginacao!
    reporte(id: ID!): Reporte
    categorias: [Categoria]!
    categoria(id: ID!): Categoria
    estatisticasDashboard: EstatisticasDashboard!
    reportesPorCategoria: [ContagemPorCategoria]!
    reportesPorStatus: [ContagemPorStatus]!
    reportesPorPeriodo(dias: Int): [ContagemPorPeriodo]!
  }

  type Mutation {
    registro(entrada: RegistroEntrada!): AuthPayload!
    login(email: String!, senha: String!): AuthPayload!
    criarReporte(entrada: CriarReporteEntrada!): Reporte!
    atualizarStatusReporte(id: ID!, status: String!, observacao: String): Reporte!
    adicionarComentario(reporteId: ID!, conteudo: String!): Comentario!
  }
`;

module.exports = typeDefs;

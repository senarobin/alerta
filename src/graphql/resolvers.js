const jwt = require('jsonwebtoken');

const bcrypt = require('bcryptjs');

const Usuario = require('../models/Usuario');

const Categoria = require('../models/Categoria');

const Reporte = require('../models/Reporte');

const Comentario = require('../models/Comentario');

const StatusHistorico = require('../models/StatusHistorico');

const gerarToken = (idUsuario) => {

  return jwt.sign({ id: idUsuario }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

};

const obterUsuarioAutenticado = (contexto) => {

  if (!contexto.usuario) {
    throw new Error('Não autenticado. Faça login para continuar.');
  }

  return contexto.usuario;
};

const resolvers = {

  Query: {

    reportes: async (_, { status, categoria, pagina = 1, limite = 10 }) => {

      const filtro = {};
      if (status) filtro.status = status;
      if (categoria) filtro.categoria = categoria;

      const pular = (pagina - 1) * limite;

      const [reportes, total] = await Promise.all([
        Reporte.find(filtro).populate('categoria', 'nome descricao').populate('autor', 'nome email')
          .sort({ createdAt: -1 }).skip(pular).limit(limite).select('-__v'),
        Reporte.countDocuments(filtro),
      ]);

      return {
        reportes,
        paginacao: {
          total,
          pagina,
          limite,
          paginas: Math.ceil(total / limite),
        },
      };
    },

    reporte: async (_, { id }) => {

      return await Reporte.findById(id).populate('categoria', 'nome icone descricao').populate('autor', 'nome email')
        .select('-__v');
    },

    categorias: async () => {
      return await Categoria.find({ isAtivo: true }).select('-__v');
    },

    categoria: async (_, { id }) => {
      return await Categoria.findById(id).select('-__v');
    },

    estatisticasDashboard: async () => {
      const porStatus = await Reporte.aggregate([
        {
          $group: {
            _id: '$status',
            quantidade: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            _id: 1
          }
        },
      ]);

      const total = porStatus.reduce((soma, item) => soma + item.quantidade, 0);

      return { total, porStatus };
    },

    reportesPorCategoria: async () => {
      return await Reporte.aggregate([
        {
          $group: {
            _id: '$categoria',
            quantidade: {
              $sum: 1
            }
          }
        },
        {
          $lookup: {
            from: 'categorias',
            localField: '_id',
            foreignField: '_id',
            as: 'categoriaInfo',
          },
        },
        { $unwind: '$categoriaInfo' },
        {
          $project: {
            _id: 0,
            categoria: {
              _id: '$categoriaInfo._id',
              nome: '$categoriaInfo.nome',
            },
            quantidade: 1,
          },
        },
        {
          $sort: {
            quantidade: -1
          }
        },
      ]);
    },

    reportesPorStatus: async () => {
      return await Reporte.aggregate([
        {
          $group: {
            _id: '$status',
            quantidade: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            _id: 1
          }
        },
      ]);
    },

    reportesPorPeriodo: async (_, { dias = 30 }) => {

      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - dias);

      return await Reporte.aggregate([
        {
          $match: {
            createdAt: {
              $gte: dataInicio
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            quantidade: {
              $sum: 1
            },
          },
        },
        {
          $sort: {
            _id: 1
          }
        },
        {
          $project: {
            _id: 0,
            data: '$_id',
            quantidade: 1,
          },
        },
      ]);
    },
  },

  Mutation: {

    registro: async (_, { entrada }) => {

      const { nome, email, senha } = entrada;

      const usuarioExistente = await Usuario.findOne({ email });

      if (usuarioExistente) {
        throw new Error('Este email já está cadastrado.');
      }

      const usuario = await Usuario.create({ nome, email, senha });
      const token = gerarToken(usuario._id);

      return { token, usuario };
    },

    login: async (_, { email, senha }) => {

      if (!email || !senha) {
        throw new Error('Email e senha são obrigatórios.');
      }

      const usuario = await Usuario.findOne({ email }).select('+senha');

      if (!usuario) {
        throw new Error('Credenciais inválidas.');
      }

      if (!usuario.ativo) {
        throw new Error('Conta desativada. Entre em contato com o administrador.');
      }

      const senhaCorreta = await usuario.comparePassword(senha);

      if (!senhaCorreta) {
        throw new Error('Credenciais inválidas.');
      }

      const token = gerarToken(usuario._id);

      return { token, usuario };
    },

    criarReporte: async (_, { entrada }, contexto) => {

      const usuario = obterUsuarioAutenticado(contexto);

      const { titulo, descricao, categoria, localizacao, endereco, imagens } = entrada;

      const reporte = await Reporte.create({
        titulo,
        descricao,
        categoria,
        autor: usuario._id,
        localizacao,
        endereco,
        imagens,
      });

      await reporte.populate('categoria autor', 'nome email');

      return reporte;
    },

    atualizarStatusReporte: async (_, { id, status, observacao }, contexto) => {

      const usuario = obterUsuarioAutenticado(contexto);

      if (!['aberto', 'em_andamento', 'resolvido', 'fechado'].includes(status)) {
        throw new Error('Status inválido. Use: aberto, em_andamento, resolvido ou fechado.');
      }

      if (!['admin', 'moderador'].includes(usuario.perfil)) {
        throw new Error('Apenas admin ou moderador pode alterar o status.');
      }

      const reporte = await Reporte.findById(id);

      if (!reporte) {
        throw new Error('Reporte não encontrado.');
      }

      const statusAnterior = reporte.status;
      reporte.status = status;
      await reporte.save();

      await StatusHistorico.create({
        reporte: reporte._id,
        statusAnterior,
        statusAtual: status,
        mudadoPor: usuario._id,
        observacao: observacao || '',
      });

      await reporte.populate('categoria autor', 'nome email');

      return reporte;
    },

    adicionarComentario: async (_, { reporteId, conteudo }, contexto) => {

      const usuario = obterUsuarioAutenticado(contexto);

      const reporte = await Reporte.findById(reporteId);

      if (!reporte) {
        throw new Error('Reporte não encontrado.');
      }

      const comentario = await Comentario.create({
        reporte: reporteId,
        autor: usuario._id,
        conteudo,
      });

      await comentario.populate('autor', 'nome email');

      return comentario;
    },
  },

  Reporte: {
    id: (reporte) => reporte._id || reporte.id,
  },

  Usuario: {
    id: (usuario) => usuario._id || usuario.id,
  },

  Categoria: {
    id: (categoria) => categoria._id || categoria.id,
  },

  Comentario: {
    id: (comentario) => comentario._id || comentario.id,
  },
};

module.exports = resolvers;

const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express5');

const jwt = require('jsonwebtoken');

const Usuario = require('../models/Usuario');

const typeDefs = require('./typeDefs');

const resolvers = require('./resolvers');

const configurarGraphQL = async (app) => {

  const servidor = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await servidor.start();

  app.use('/graphql', expressMiddleware(servidor, {

    context: async ({ req }) => {

      const contexto = { usuario: null };

      const headerAuth = req.headers.authorization;

      if (headerAuth && headerAuth.startsWith('Bearer ')) {

        try {

          const token = headerAuth.split(' ')[1];
          const decodificado = jwt.verify(token, process.env.JWT_SECRET);

          const usuario = await Usuario.findById(decodificado.id);

          if (usuario && usuario.ativo) {
            contexto.usuario = usuario;
          }
        } catch (erro) { }
      }
      return contexto;
    },
  })
  );

  console.log('GraphQL disponível em: /graphql');
};

module.exports = configurarGraphQL;

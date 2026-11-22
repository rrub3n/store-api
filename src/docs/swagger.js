/**
 A página interativa em http://localhost:3000/docs
**/

// Atalho para criar parâmetros de query string
const query = (name, description, schema = { type: 'string' }, example) => ({
  name,
  in: 'query',
  description,
  schema,
  ...(example !== undefined && { example }),
});

// Respostas de erro reaproveitadas em vários endpoints
const ref = (name) => ({ $ref: `#/components/responses/${name}` });
const security = [{ bearerAuth: [] }];

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'API da Loja',
    version: '1.0.0',
    description:
      'API REST de e-commerce com usuários, categorias e produtos.\n\n' +
      '**Como autenticar:** cadastre um usuário em `POST /v1/user`, faça login em `POST /v1/user/token`, ' +
      'copie o token recebido, clique em **Authorize** (cadeado, no topo) e cole só o token. ' +
      'Os endpoints POST, PUT e DELETE (exceto cadastro e login) exigem o token.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Servidor local' }],
  tags: [
    { name: 'Usuários' },
    { name: 'Categorias' },
    { name: 'Produtos' },
  ],

  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },

    parameters: {
      Id: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', example: 1 },
        description: 'ID do recurso',
      },
    },

    responses: {
      BadRequest: {
        description: 'Dados da requisição incorretos',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Unauthorized: {
        description: 'Token não enviado, inválido ou expirado',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Recurso não encontrado',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },

    schemas: {
      Error: {
        type: 'object',
        properties: { message: { type: 'string', example: 'Mensagem explicando o erro' } },
      },

      // ----- Usuário -----
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          firstname: { type: 'string', example: 'Maria' },
          surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', example: 'maria@mail.com' },
        },
      },
      UserCreate: {
        type: 'object',
        required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
        properties: {
          firstname: { type: 'string', example: 'Maria' },
          surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', example: 'maria@mail.com' },
          password: { type: 'string', example: '123@123' },
          confirmPassword: { type: 'string', example: '123@123' },
        },
      },
      UserUpdate: {
        type: 'object',
        required: ['firstname', 'surname', 'email'],
        properties: {
          firstname: { type: 'string', example: 'Maria' },
          surname: { type: 'string', example: 'Souza' },
          email: { type: 'string', example: 'maria@mail.com' },
        },
      },
      Login: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'maria@mail.com' },
          password: { type: 'string', example: '123@123' },
        },
      },
      Token: {
        type: 'object',
        properties: { token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } },
      },

      // ----- Categoria -----
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      CategoryInput: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      CategoryList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
          total: { type: 'integer', example: 10 },
          limit: { type: 'integer', example: 12 },
          page: { type: 'integer', example: 1 },
        },
      },

      // ----- Produto -----
      ProductOption: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Tamanho' },
          shape: { type: 'string', enum: ['square', 'circle'], example: 'square' },
          radius: { type: 'integer', example: 4 },
          type: { type: 'string', enum: ['text', 'color'], example: 'text' },
          values: { type: 'array', items: { type: 'string' }, example: ['40', '41', '42'] },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Tênis Runner' },
          slug: { type: 'string', example: 'tenis-runner' },
          use_in_menu: { type: 'boolean', example: false },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Tênis leve para corrida' },
          price: { type: 'number', example: 199.9 },
          price_with_discount: { type: 'number', example: 149.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 3] },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                content: { type: 'string', example: 'http://localhost:3000/media/product-1/imagem.png' },
              },
            },
          },
          options: { type: 'array', items: { $ref: '#/components/schemas/ProductOption' } },
        },
      },
      ProductCreate: {
        type: 'object',
        required: ['name', 'slug', 'price', 'price_with_discount'],
        properties: {
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Tênis Runner' },
          slug: { type: 'string', example: 'tenis-runner' },
          use_in_menu: { type: 'boolean', example: false },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Tênis leve para corrida' },
          price: { type: 'number', example: 199.9 },
          price_with_discount: { type: 'number', example: 149.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1] },
          images: {
            type: 'array',
            description: 'Imagens em base64 (a API salva os arquivos no servidor)',
            items: {
              type: 'object',
              required: ['content'],
              properties: {
                type: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/jpg'], example: 'image/png' },
                content: {
                  type: 'string',
                  example:
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                },
              },
            },
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title', 'values'],
              properties: {
                title: { type: 'string', example: 'Tamanho' },
                shape: { type: 'string', enum: ['square', 'circle'], example: 'square' },
                radius: { type: 'integer', example: 4 },
                type: { type: 'string', enum: ['text', 'color'], example: 'text' },
                values: { type: 'array', items: { type: 'string' }, example: ['40', '41', '42'] },
              },
            },
          },
        },
      },
      ProductUpdate: {
        type: 'object',
        required: ['name', 'slug', 'price', 'price_with_discount'],
        description:
          '**Regras de `images`:** sem `id` + `content` base64 = cria nova; com `id` + `deleted: true` = apaga; ' +
          'com `id` + `content` base64 = troca o arquivo; com `id` + `content` URL = mantém como está.\n\n' +
          '**Regras de `options`:** sem `id` = cria nova; com `id` + `deleted: true` = apaga; ' +
          'com `id` + outros campos = altera só os campos enviados.\n\n' +
          '**`category_ids`:** quando enviado, substitui as categorias do produto.',
        properties: {
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Tênis Runner Pro' },
          slug: { type: 'string', example: 'tenis-runner-pro' },
          use_in_menu: { type: 'boolean', example: false },
          stock: { type: 'integer', example: 25 },
          description: { type: 'string', example: 'Versão atualizada' },
          price: { type: 'number', example: 249.9 },
          price_with_discount: { type: 'number', example: 199.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1] },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                deleted: { type: 'boolean', example: false },
                type: { type: 'string', example: 'image/png' },
                content: { type: 'string', example: 'base64 da imagem ou URL atual' },
              },
            },
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                deleted: { type: 'boolean', example: false },
                title: { type: 'string', example: 'Tamanho' },
                shape: { type: 'string', enum: ['square', 'circle'] },
                radius: { type: 'integer', example: 10 },
                type: { type: 'string', enum: ['text', 'color'] },
                values: { type: 'array', items: { type: 'string' }, example: ['38', '39'] },
              },
            },
          },
        },
      },
      ProductList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
          total: { type: 'integer', example: 120 },
          limit: { type: 'integer', example: 12 },
          page: { type: 'integer', example: 1 },
        },
      },
    },
  },

  paths: {
    // ================= USUÁRIOS =================
    '/v1/user': {
      post: {
        tags: ['Usuários'],
        summary: 'Cadastrar usuário',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserCreate' } } },
        },
        responses: {
          201: {
            description: 'Usuário cadastrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: ref('BadRequest'),
        },
      },
    },
    '/v1/user/token': {
      post: {
        tags: ['Usuários'],
        summary: 'Gerar token JWT (login)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } },
        },
        responses: {
          200: {
            description: 'Token gerado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Token' } } },
          },
          400: ref('BadRequest'),
        },
      },
    },
    '/v1/user/{id}': {
      get: {
        tags: ['Usuários'],
        summary: 'Buscar usuário pelo ID',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          200: {
            description: 'Usuário encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          404: ref('NotFound'),
        },
      },
      put: {
        tags: ['Usuários'],
        summary: 'Atualizar usuário',
        security,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UserUpdate' } } },
        },
        responses: {
          204: { description: 'Atualizado (sem corpo)' },
          400: ref('BadRequest'),
          401: ref('Unauthorized'),
          404: ref('NotFound'),
        },
      },
      delete: {
        tags: ['Usuários'],
        summary: 'Deletar usuário',
        security,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          204: { description: 'Deletado (sem corpo)' },
          401: ref('Unauthorized'),
          404: ref('NotFound'),
        },
      },
    },

    // ================= CATEGORIAS =================
    '/v1/category/search': {
      get: {
        tags: ['Categorias'],
        summary: 'Listar categorias (com paginação e filtros)',
        parameters: [
          query('limit', 'Itens por página. Use -1 para buscar todos. Padrão: 12', { type: 'integer' }, 12),
          query('page', 'Página (sem efeito quando limit = -1). Padrão: 1', { type: 'integer' }, 1),
          query('fields', 'Campos a retornar, separados por vírgula', { type: 'string' }, 'name,slug'),
          query('use_in_menu', 'Filtra as categorias que aparecem no menu', { type: 'boolean' }),
        ],
        responses: {
          200: {
            description: 'Lista de categorias',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryList' } } },
          },
          400: ref('BadRequest'),
        },
      },
    },
    '/v1/category': {
      post: {
        tags: ['Categorias'],
        summary: 'Cadastrar categoria',
        security,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } } },
        },
        responses: {
          201: {
            description: 'Categoria criada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } },
          },
          400: ref('BadRequest'),
          401: ref('Unauthorized'),
        },
      },
    },
    '/v1/category/{id}': {
      get: {
        tags: ['Categorias'],
        summary: 'Buscar categoria pelo ID',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          200: {
            description: 'Categoria encontrada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } },
          },
          404: ref('NotFound'),
        },
      },
      put: {
        tags: ['Categorias'],
        summary: 'Atualizar categoria',
        security,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } } },
        },
        responses: {
          204: { description: 'Atualizada (sem corpo)' },
          400: ref('BadRequest'),
          401: ref('Unauthorized'),
          404: ref('NotFound'),
        },
      },
      delete: {
        tags: ['Categorias'],
        summary: 'Deletar categoria',
        security,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          204: { description: 'Deletada (sem corpo)' },
          401: ref('Unauthorized'),
          404: ref('NotFound'),
        },
      },
    },

    // ================= PRODUTOS =================
    '/v1/product/search': {
      get: {
        tags: ['Produtos'],
        summary: 'Listar produtos (com paginação e filtros)',
        description: 'Todos os filtros são opcionais e podem ser combinados: o produto precisa atender a todos.',
        parameters: [
          query('limit', 'Itens por página. Use -1 para buscar todos. Padrão: 12', { type: 'integer' }, 12),
          query('page', 'Página (sem efeito quando limit = -1). Padrão: 1', { type: 'integer' }, 1),
          query('fields', 'Campos a retornar, separados por vírgula', { type: 'string' }, 'name,images,price'),
          query('match', 'Termo buscado no nome ou na descrição', { type: 'string' }, 'Tênis'),
          query('category_ids', 'IDs de categorias, separados por vírgula', { type: 'string' }, '1,3'),
          query('price-range', 'Faixa de preço no formato mínimo-máximo', { type: 'string' }, '100-200'),
          {
            name: 'option',
            in: 'query',
            description: 'Filtra pelo valor de uma opção: `option[ID_DA_OPCAO]=valor1,valor2`',
            style: 'deepObject',
            explode: true,
            schema: { type: 'object', additionalProperties: { type: 'string' } },
            example: { 1: '40,41' },
          },
        ],
        responses: {
          200: {
            description: 'Lista de produtos',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductList' } } },
          },
          400: ref('BadRequest'),
        },
      },
    },
    '/v1/product': {
      post: {
        tags: ['Produtos'],
        summary: 'Cadastrar produto (com categorias, imagens e opções)',
        security,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductCreate' } } },
        },
        responses: {
          201: {
            description: 'Produto criado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          400: ref('BadRequest'),
          401: ref('Unauthorized'),
        },
      },
    },
    '/v1/product/{id}': {
      get: {
        tags: ['Produtos'],
        summary: 'Buscar produto pelo ID',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          200: {
            description: 'Produto encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          404: ref('NotFound'),
        },
      },
      put: {
        tags: ['Produtos'],
        summary: 'Atualizar produto (inclui imagens e opções)',
        security,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductUpdate' } } },
        },
        responses: {
          204: { description: 'Atualizado (sem corpo)' },
          400: ref('BadRequest'),
          401: ref('Unauthorized'),
          404: ref('NotFound'),
        },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Deletar produto (apaga também as imagens do servidor)',
        security,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          204: { description: 'Deletado (sem corpo)' },
          401: ref('Unauthorized'),
          404: ref('NotFound'),
        },
      },
    },
  },
};
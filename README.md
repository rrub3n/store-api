# API da Loja

API REST de e-commerce desenvolvida como projeto final do curso **Desenvolvimento Web Fullstack**.

Permite cadastrar usuários, categorias e produtos (com imagens e opções), com autenticação via JWT, busca com filtros e paginação e documentação interativa em Swagger.

## Tecnologias

- **Node.js** e **Express** para o servidor e as rotas
- **MySQL** e **Sequelize** (ORM e migrations) para o banco de dados
- **JWT** (`jsonwebtoken`) e **bcrypt** para autenticação e hash de senhas
- **Dotenv** para variáveis de ambiente
- **Nodemon** para desenvolvimento
- **Jest** e **Supertest** para testes automatizados
- **Swagger UI** para a documentação

## Pré-requisitos

- [Node.js](https://nodejs.org) 18 ou superior
- [MySQL](https://dev.mysql.com/downloads/) 8 ou superior, em execução

## Como rodar o projeto

### 1. Clonar e instalar

```bash
git clone [URL-DO-REPOSITORIO]
cd store-api
npm install
```

### 2. Configurar as variáveis de ambiente

Copie o arquivo de exemplo e preencha com os dados do seu MySQL:

```bash
cp .env.example .env
```

No Windows (CMD): `copy .env.example .env`

| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta da API | `3000` |
| `DB_HOST` | Endereço do MySQL | `localhost` |
| `DB_PORT` | Porta do MySQL | `3306` |
| `DB_NAME` | Nome do banco de desenvolvimento | `store_db` |
| `DB_USER` | Usuário do MySQL | `root` |
| `DB_PASS` | Senha do MySQL | `suasenha` |
| `JWT_SECRET` | Chave secreta para assinar os tokens (use um texto longo e aleatório) | `...` |
| `JWT_EXPIRES_IN` | Validade do token | `1h` |

### 3. Criar os bancos de dados

```bash
npm run db:create
```

Isso cria o banco definido em `DB_NAME`. O banco usado nos testes (`<DB_NAME>_test`, por exemplo `store_db_test`) deve ser criado manualmente no MySQL:

```sql
CREATE DATABASE store_db_test;
```

### 4. Criar as tabelas (migrations)

```bash
npm run db:migrate
```

### 5. Iniciar a API

```bash
npm run dev     # desenvolvimento (reinicia ao salvar)
npm start       # produção
```

A API fica em `http://localhost:3000` e a documentação em **`http://localhost:3000/docs`**.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia com Nodemon |
| `npm start` | Inicia com Node |
| `npm test` | Roda os testes automatizados |
| `npm run db:create` | Cria o banco de dados |
| `npm run db:migrate` | Executa as migrations |
| `npm run db:migrate:undo` | Desfaz a última migration |
| `npm run db:migrate:test` | Executa as migrations no banco de testes |

## Testes

Os testes usam um banco separado (`<DB_NAME>_test`) e **apagam os dados dele a cada execução**. Antes da primeira vez:

```bash
npm run db:migrate:test
npm test
```

São 83 testes que cobrem usuários, autenticação, categorias e produtos (CRUD, validações, filtros, paginação e códigos HTTP).

## Documentação da API

Com a API rodando, acesse **http://localhost:3000/docs** (Swagger UI).

Para testar rotas protegidas: faça login em `POST /v1/user/token`, copie o token, clique em **Authorize** e cole apenas o token.

## Autenticação

Os endpoints **POST, PUT e DELETE** exigem o cabeçalho:

```
Authorization: Bearer <token>
```

Exceções públicas: `POST /v1/user` (cadastro) e `POST /v1/user/token` (login). Todos os `GET` são públicos.

## Endpoints

### Usuários

| Método | Rota | Token | Descrição |
|---|---|---|---|
| POST | `/v1/user` | não | Cadastrar usuário |
| POST | `/v1/user/token` | não | Gerar token JWT (login) |
| GET | `/v1/user/:id` | não | Buscar usuário |
| PUT | `/v1/user/:id` | sim | Atualizar usuário |
| DELETE | `/v1/user/:id` | sim | Deletar usuário |

### Categorias

| Método | Rota | Token | Descrição |
|---|---|---|---|
| GET | `/v1/category/search` | não | Listar com paginação e filtros |
| GET | `/v1/category/:id` | não | Buscar categoria |
| POST | `/v1/category` | sim | Cadastrar categoria |
| PUT | `/v1/category/:id` | sim | Atualizar categoria |
| DELETE | `/v1/category/:id` | sim | Deletar categoria |

Parâmetros de `/search`: `limit` (padrão 12, `-1` = todos), `page` (padrão 1), `fields`, `use_in_menu`.

### Produtos

| Método | Rota | Token | Descrição |
|---|---|---|---|
| GET | `/v1/product/search` | não | Listar com paginação e filtros |
| GET | `/v1/product/:id` | não | Buscar produto |
| POST | `/v1/product` | sim | Cadastrar produto (com categorias, imagens e opções) |
| PUT | `/v1/product/:id` | sim | Atualizar produto, imagens e opções |
| DELETE | `/v1/product/:id` | sim | Deletar produto e suas imagens |

Parâmetros de `/search`: `limit`, `page`, `fields`, `match` (nome ou descrição), `category_ids` (ex.: `15,24`), `price-range` (ex.: `100-200`) e `option[ID]` (ex.: `option[45]=GG,PP`). Os filtros podem ser combinados.

### Imagens

As imagens são enviadas em **base64** no JSON. A API decodifica, salva o arquivo em `public/media/product-<id>/` e guarda apenas o caminho no banco. Nas respostas, cada imagem vem como uma URL pública (`http://localhost:3000/media/...`).

No `PUT /v1/product/:id`:

| Item enviado | Efeito |
|---|---|
| Imagem sem `id`, com `content` em base64 | Cria uma imagem nova |
| `id` + `deleted: true` | Remove a imagem (banco e arquivo) |
| `id` + `content` em base64 | Troca o arquivo da imagem |
| `id` + `content` com URL | Mantém a imagem como está |
| Opção sem `id` | Cria uma opção nova |
| Opção com `id` + `deleted: true` | Remove a opção |
| Opção com `id` + outros campos | Altera apenas os campos enviados |

## Códigos de resposta

| Código | Quando |
|---|---|
| 200 OK | Requisição bem-sucedida, com corpo |
| 201 Created | Recurso criado |
| 204 No Content | Atualização ou exclusão bem-sucedida, sem corpo |
| 400 Bad Request | Dados incorretos ou ausentes |
| 401 Unauthorized | Token ausente, inválido ou expirado |
| 404 Not Found | Recurso não encontrado |

Os erros retornam JSON no formato `{ "message": "..." }`.

## Estrutura do projeto

```
project-root/
├── src/
│   ├── config/        # configuração do banco (Sequelize)
│   ├── controllers/   # recebem a requisição e devolvem a resposta HTTP
│   ├── docs/          # especificação OpenAPI (Swagger)
│   ├── middleware/    # autenticação JWT e tratamento de erros
│   ├── migrations/    # criação das tabelas
│   ├── models/        # models do Sequelize e relacionamentos
│   ├── routes/        # definição das rotas
│   ├── services/      # regras de negócio e validações
│   ├── app.js         # configuração do Express
│   └── server.js      # inicialização do servidor
├── tests/             # testes automatizados (Jest)
├── public/media/      # imagens enviadas (gerada automaticamente)
├── .env.example       # modelo das variáveis de ambiente
└── package.json
```

O projeto segue uma arquitetura em camadas: **rota → controller → service → model**.

## Modelagem do banco de dados

| Tabela | Descrição |
|---|---|
| `users` | Usuários (senha armazenada como hash bcrypt, e-mail único) |
| `categories` | Categorias de produtos |
| `products` | Produtos |
| `product_images` | Imagens do produto (N:1 com `products`) |
| `product_options` | Opções do produto, como tamanho e cor (N:1 com `products`) |
| `product_categories` | Tabela de ligação entre produtos e categorias (N:N) |

As chaves estrangeiras usam `ON DELETE CASCADE`: ao apagar um produto, suas imagens, opções e ligações com categorias são removidas junto.

## Decisões de projeto

- **Token ausente ou inválido retorna 401**, o código HTTP correto para falta de autenticação.
- **Transações** na criação e na atualização de produtos: ou tudo é salvo, ou nada é alterado. Se algo falhar, os arquivos de imagem gravados são removidos.
- **`email` único** na tabela de usuários, para impedir cadastros duplicados.
- **Opções do produto** aceitam `value` ou `values` e `radius` como número ou texto (`"4px"`), pois o escopo do projeto usa os dois formatos. Os valores são guardados separados por vírgula, então um valor não pode conter vírgula.
- **Busca de produtos** feita em duas consultas (ids da página e depois os dados completos), para que o `total` e a paginação saiam corretos mesmo com relacionamentos.
- **Campos de `fields`** são validados contra uma lista permitida.
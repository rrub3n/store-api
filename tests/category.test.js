const request = require('supertest');
const app = require('../src/app');
const { resetDatabase, getToken, closeDatabase } = require('./helpers');

describe('Categorias', () => {
  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const create = (data) => request(app).post('/v1/category').set(auth()).send(data);

  beforeAll(async () => {
    await resetDatabase();
    token = await getToken();
  });

  afterAll(closeDatabase);

  describe('POST /v1/category', () => {
    it('cria a categoria (201)', async () => {
      const res = await create({ name: 'Shoes', slug: 'shoes', use_in_menu: true });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Shoes');
    });

    it('rejeita sem token (401)', async () => {
      const res = await request(app).post('/v1/category').send({ name: 'X', slug: 'x' });
      expect(res.status).toBe(401);
    });

    it('rejeita sem slug (400)', async () => {
      const res = await create({ name: 'Sem slug' });
      expect(res.status).toBe(400);
    });

    it('rejeita use_in_menu que não é booleano (400)', async () => {
      const res = await create({ name: 'X', slug: 'x', use_in_menu: 'sim' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/category/search', () => {
    beforeAll(async () => {

      await create({ name: 'Offers', slug: 'offers', use_in_menu: true });
      await create({ name: 'Black Friday', slug: 'black-friday', use_in_menu: false });
    });

    it('usa os padrões limit=12 e page=1 (200)', async () => {
      const res = await request(app).get('/v1/category/search');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 3, limit: 12, page: 1 });
      expect(res.body.data).toHaveLength(3);
    });

    it('limit=-1 devolve todos', async () => {
      const res = await request(app).get('/v1/category/search?limit=-1');
      expect(res.body.limit).toBe(-1);
      expect(res.body.data).toHaveLength(3);
    });

    it('pagina os resultados mantendo o total', async () => {
      const res = await request(app).get('/v1/category/search?limit=2&page=2');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(3);
    });

    it('limita os campos com fields', async () => {
      const res = await request(app).get('/v1/category/search?fields=name,slug');
      expect(Object.keys(res.body.data[0]).sort()).toEqual(['name', 'slug']);
    });

    it('filtra por use_in_menu', async () => {
      const res = await request(app).get('/v1/category/search?use_in_menu=true');
      expect(res.body.total).toBe(2);
      expect(res.body.data.every((category) => category.use_in_menu === true)).toBe(true);
    });

    it('rejeita parâmetros inválidos (400)', async () => {
      const limit = await request(app).get('/v1/category/search?limit=abc');
      const fields = await request(app).get('/v1/category/search?fields=senha');
      const menu = await request(app).get('/v1/category/search?use_in_menu=talvez');

      expect(limit.status).toBe(400);
      expect(fields.status).toBe(400);
      expect(menu.status).toBe(400);
    });
  });

  describe('GET, PUT e DELETE por id', () => {
    let id;
    beforeAll(async () => {
      const res = await create({ name: 'Para editar', slug: 'para-editar' });
      id = res.body.id;
    });

    it('busca por id (200)', async () => {
      const res = await request(app).get(`/v1/category/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('para-editar');
    });

    it('devolve 404 para id inexistente', async () => {
      const res = await request(app).get('/v1/category/99999');
      expect(res.status).toBe(404);
    });

    it('atualiza (204)', async () => {
      const res = await request(app)
        .put(`/v1/category/${id}`)
        .set(auth())
        .send({ name: 'Editada', slug: 'editada', use_in_menu: true });
      expect(res.status).toBe(204);

      const check = await request(app).get(`/v1/category/${id}`);
      expect(check.body.name).toBe('Editada');
    });

    it('PUT rejeita sem token (401), dados ruins (400) e id inexistente (404)', async () => {
      const body = { name: 'X', slug: 'x' };
      const noToken = await request(app).put(`/v1/category/${id}`).send(body);
      const invalid = await request(app).put(`/v1/category/${id}`).set(auth()).send({ name: 'X' });
      const missing = await request(app).put('/v1/category/99999').set(auth()).send(body);

      expect(noToken.status).toBe(401);
      expect(invalid.status).toBe(400);
      expect(missing.status).toBe(404);
    });

    it('DELETE rejeita sem token (401)', async () => {
      const res = await request(app).delete(`/v1/category/${id}`);
      expect(res.status).toBe(401);
    });

    it('apaga (204) e depois devolve 404', async () => {
      const res = await request(app).delete(`/v1/category/${id}`).set(auth());
      expect(res.status).toBe(204);

      const again = await request(app).delete(`/v1/category/${id}`).set(auth());
      expect(again.status).toBe(404);
    });
  });
});
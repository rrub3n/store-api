const request = require('supertest');
const app = require('../src/app');
const { resetDatabase, getToken, closeDatabase } = require('./helpers');

const newUser = {
  firstname: 'João',
  surname: 'Souza',
  email: 'joao@mail.com',
  password: '123@123',
  confirmPassword: '123@123',
};

describe('Usuários e autenticação', () => {
  let token;

  beforeAll(async () => {
    await resetDatabase();
    token = await getToken();
  });

  afterAll(closeDatabase);

  describe('POST /v1/user', () => {
    it('cadastra o usuário e não devolve a senha (201)', async () => {
      const res = await request(app).post('/v1/user').send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(newUser.email);
      expect(res.body.password).toBeUndefined();
    });

    it('rejeita e-mail repetido (400)', async () => {
      const res = await request(app).post('/v1/user').send(newUser);
      expect(res.status).toBe(400);
    });

    it('rejeita senhas diferentes (400)', async () => {
      const res = await request(app)
        .post('/v1/user')
        .send({ ...newUser, email: 'outro@mail.com', confirmPassword: 'diferente' });
      expect(res.status).toBe(400);
    });

    it('rejeita campo faltando (400)', async () => {
      const { surname, ...incomplete } = newUser;
      const res = await request(app).post('/v1/user').send({ ...incomplete, email: 'x@mail.com' });
      expect(res.status).toBe(400);
    });

    it('rejeita e-mail inválido (400)', async () => {
      const res = await request(app).post('/v1/user').send({ ...newUser, email: 'abc' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/user/token', () => {
    it('devolve o token com credenciais corretas (200)', async () => {
      const res = await request(app)
        .post('/v1/user/token')
        .send({ email: newUser.email, password: newUser.password });

      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');
    });

    it('rejeita senha errada (400)', async () => {
      const res = await request(app).post('/v1/user/token').send({ email: newUser.email, password: 'errada' });
      expect(res.status).toBe(400);
    });

    it('rejeita body vazio (400)', async () => {
      const res = await request(app).post('/v1/user/token').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/user/:id', () => {
    it('busca o usuário sem precisar de token (200)', async () => {
      const created = await request(app)
        .post('/v1/user')
        .send({ ...newUser, email: 'busca@mail.com' });

      const res = await request(app).get(`/v1/user/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('busca@mail.com');
      expect(res.body.password).toBeUndefined();
    });

    it('devolve 404 para id inexistente', async () => {
      const res = await request(app).get('/v1/user/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /v1/user/:id', () => {
    let id;
    beforeAll(async () => {
      const created = await request(app).post('/v1/user').send({ ...newUser, email: 'edita@mail.com' });
      id = created.body.id;
    });

    const body = { firstname: 'Novo', surname: 'Nome', email: 'edita@mail.com' };

    it('atualiza com token (204)', async () => {
      const res = await request(app).put(`/v1/user/${id}`).set('Authorization', `Bearer ${token}`).send(body);
      expect(res.status).toBe(204);

      const check = await request(app).get(`/v1/user/${id}`);
      expect(check.body.firstname).toBe('Novo');
    });

    it('rejeita sem token (401)', async () => {
      const res = await request(app).put(`/v1/user/${id}`).send(body);
      expect(res.status).toBe(401);
    });

    it('rejeita token inválido (401)', async () => {
      const res = await request(app).put(`/v1/user/${id}`).set('Authorization', 'Bearer falso').send(body);
      expect(res.status).toBe(401);
    });

    it('rejeita dados incorretos (400)', async () => {
      const res = await request(app)
        .put(`/v1/user/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstname: 'Só nome', email: 'invalido' });
      expect(res.status).toBe(400);
    });

    it('devolve 404 para usuário inexistente', async () => {
      const res = await request(app).put('/v1/user/99999').set('Authorization', `Bearer ${token}`).send(body);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /v1/user/:id', () => {
    let id;
    beforeAll(async () => {
      const created = await request(app).post('/v1/user').send({ ...newUser, email: 'apaga@mail.com' });
      id = created.body.id;
    });

    it('rejeita sem token (401)', async () => {
      const res = await request(app).delete(`/v1/user/${id}`);
      expect(res.status).toBe(401);
    });

    it('apaga com token (204) e depois o usuário não existe mais (404)', async () => {
      const res = await request(app).delete(`/v1/user/${id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);

      const check = await request(app).get(`/v1/user/${id}`);
      expect(check.status).toBe(404);
    });

    it('devolve 404 para usuário inexistente', async () => {
      const res = await request(app).delete('/v1/user/99999').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
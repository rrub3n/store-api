const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');
const { PNG_BASE64, resetDatabase, getToken, mediaFilePath, closeDatabase } = require('./helpers');

describe('Produtos', () => {
    let token;
    let categoryA;
    let categoryB;
    const auth = () => ({ Authorization: `Bearer ${token}` });

    const relativePath = (url) => url.split('/media/')[1];

    const productBody = (overrides = {}) => ({
        enabled: true,
        name: 'Tênis Runner',
        slug: 'tenis-runner',
        stock: 10,
        description: 'Tênis leve para corrida',
        price: 199.9,
        price_with_discount: 149.9,
        ...overrides,
    });

    const createProduct = (overrides) => request(app).post('/v1/product').set(auth()).send(productBody(overrides));

    beforeAll(async () => {
        await resetDatabase();
        token = await getToken();

        const a = await request(app).post('/v1/category').set(auth()).send({ name: 'Calçados', slug: 'calcados' });
        const b = await request(app).post('/v1/category').set(auth()).send({ name: 'Roupas', slug: 'roupas' });
        categoryA = a.body.id;
        categoryB = b.body.id;
    });

    afterAll(closeDatabase);

    describe('POST /v1/product', () => {
        it('cria o produto completo, com categorias, imagem e opções (201)', async () => {
            const res = await createProduct({
                category_ids: [categoryA, categoryB],
                images: [{ type: 'image/png', content: PNG_BASE64 }],
                options: [
                    { title: 'Tamanho', shape: 'square', radius: 4, type: 'text', values: ['40', '41', '42'] },
                    { title: 'Cor', shape: 'circle', type: 'color', values: ['#000', '#fff'] },
                ],
            });

            expect(res.status).toBe(201);
            expect(res.body.category_ids.sort()).toEqual([categoryA, categoryB].sort());
            expect(res.body.options).toHaveLength(2);
            expect(res.body.options[0].values).toEqual(['40', '41', '42']);

            // A imagem foi salva em disco e a URL aponta para ela
            expect(res.body.images).toHaveLength(1);
            expect(fs.existsSync(mediaFilePath(res.body.images[0].content))).toBe(true);

            await request(app).delete(`/v1/product/${res.body.id}`).set(auth()); // limpa os arquivos
        });

        it('cria produto simples, sem imagens nem opções (201)', async () => {
            const res = await createProduct({ slug: 'simples' });
            expect(res.status).toBe(201);
            expect(res.body.images).toEqual([]);
            expect(res.body.options).toEqual([]);
        });

        it('rejeita sem token (401)', async () => {
            const res = await request(app).post('/v1/product').send(productBody());
            expect(res.status).toBe(401);
        });

        it('rejeita sem name (400)', async () => {
            const { name, ...semNome } = productBody();
            const res = await request(app).post('/v1/product').set(auth()).send(semNome);
            expect(res.status).toBe(400);
        });

        it('rejeita preço negativo (400)', async () => {
            const res = await createProduct({ price: -1 });
            expect(res.status).toBe(400);
        });

        it('rejeita categoria inexistente (400)', async () => {
            const res = await createProduct({ category_ids: [99999] });
            expect(res.status).toBe(400);
        });

        it('rejeita tipo de imagem inválido (400)', async () => {
            const res = await createProduct({ images: [{ type: 'image/gif', content: 'AAAA' }] });
            expect(res.status).toBe(400);
        });

        it('não cria o produto quando algo falha (transação)', async () => {
            const before = await request(app).get('/v1/product/search?limit=-1');
            await createProduct({ slug: 'vai-falhar', category_ids: [99999] });
            const after = await request(app).get('/v1/product/search?limit=-1');

            expect(after.body.total).toBe(before.body.total);
        });
    });

    describe('GET /v1/product/:id', () => {
        it('busca por id (200) e devolve 404 se não existir', async () => {
            const created = await createProduct({ slug: 'busca-id' });

            const ok = await request(app).get(`/v1/product/${created.body.id}`);
            const missing = await request(app).get('/v1/product/99999');

            expect(ok.status).toBe(200);
            expect(ok.body.slug).toBe('busca-id');
            expect(missing.status).toBe(404);
        });
    });

    describe('GET /v1/product/search', () => {
        let optionId;

        beforeAll(async () => {
            const { Product } = require('../src/models');
            await Product.destroy({ where: {} });

            const shoe = await createProduct({
                name: 'Tênis Runner',
                slug: 'tenis',
                price: 199.9,
                category_ids: [categoryA],
                options: [{ title: 'Tamanho', values: ['40', '41'] }],
            });
            optionId = shoe.body.options[0].id;

            await createProduct({
                name: 'Camiseta Básica',
                slug: 'camiseta',
                description: 'Algodão',
                price: 59.9,
                price_with_discount: 49.9,
                category_ids: [categoryB],
            });
        });

        it('lista com os padrões (200)', async () => {
            const res = await request(app).get('/v1/product/search');
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ total: 2, limit: 12, page: 1 });
        });

        it('pagina mantendo o total', async () => {
            const res = await request(app).get('/v1/product/search?limit=1&page=2');
            expect(res.body.data).toHaveLength(1);
            expect(res.body.total).toBe(2);
        });

        it('limita os campos com fields', async () => {
            const res = await request(app).get('/v1/product/search?fields=name,price');
            expect(Object.keys(res.body.data[0]).sort()).toEqual(['name', 'price']);
        });

        it('filtra por texto no nome ou descrição (match)', async () => {
            const byName = await request(app).get('/v1/product/search?match=Runner');
            const byDescription = await request(app).get('/v1/product/search?match=Algod');

            expect(byName.body.total).toBe(1);
            expect(byName.body.data[0].slug).toBe('tenis');
            expect(byDescription.body.data[0].slug).toBe('camiseta');
        });

        it('filtra por categoria', async () => {
            const res = await request(app).get(`/v1/product/search?category_ids=${categoryB}`);
            expect(res.body.total).toBe(1);
            expect(res.body.data[0].slug).toBe('camiseta');
        });

        it('filtra por faixa de preço', async () => {
            const res = await request(app).get('/v1/product/search?price-range=100-200');
            expect(res.body.total).toBe(1);
            expect(res.body.data[0].slug).toBe('tenis');
        });

        it('filtra por opção', async () => {
            const hit = await request(app).get(`/v1/product/search?option[${optionId}]=40,99`);
            const miss = await request(app).get(`/v1/product/search?option[${optionId}]=99`);

            expect(hit.body.total).toBe(1);
            expect(miss.body.total).toBe(0);
        });

        it('combina filtros (precisa atender todos)', async () => {
            const res = await request(app).get(`/v1/product/search?category_ids=${categoryB}&price-range=100-200`);
            expect(res.body.total).toBe(0);
        });

        it('rejeita parâmetros inválidos (400)', async () => {
            const range = await request(app).get('/v1/product/search?price-range=abc');
            const limit = await request(app).get('/v1/product/search?limit=0');
            const fields = await request(app).get('/v1/product/search?fields=senha');

            expect(range.status).toBe(400);
            expect(limit.status).toBe(400);
            expect(fields.status).toBe(400);
        });
    });

    describe('PUT /v1/product/:id', () => {
        let product;

        beforeEach(async () => {
            const res = await createProduct({
                slug: `put-${Date.now()}`,
                category_ids: [categoryA],
                images: [{ type: 'image/png', content: PNG_BASE64 }],
                options: [
                    { title: 'Tamanho', values: ['40', '41'] },
                    { title: 'Cor', type: 'color', values: ['#000'] },
                ],
            });
            product = res.body;
        });

        afterEach(async () => {
            await request(app).delete(`/v1/product/${product.id}`).set(auth());
        });

        const put = (body) => request(app).put(`/v1/product/${product.id}`).set(auth()).send(body);

        it('atualiza os campos e as categorias (204)', async () => {
            const res = await put(productBody({ name: 'Atualizado', stock: 99, category_ids: [categoryB] }));
            expect(res.status).toBe(204);

            const check = await request(app).get(`/v1/product/${product.id}`);
            expect(check.body.name).toBe('Atualizado');
            expect(check.body.stock).toBe(99);
            expect(check.body.category_ids).toEqual([categoryB]);
        });

        it('adiciona uma imagem nova (sem id)', async () => {
            await put(productBody({ images: [{ type: 'image/png', content: PNG_BASE64 }] }));

            const check = await request(app).get(`/v1/product/${product.id}`);
            expect(check.body.images).toHaveLength(2);
        });

        it('apaga uma imagem (deleted) e remove o arquivo do disco', async () => {
            const image = product.images[0];
            const file = mediaFilePath(image.content);
            expect(fs.existsSync(file)).toBe(true);

            const res = await put(productBody({ images: [{ id: image.id, deleted: true }] }));
            expect(res.status).toBe(204);

            const check = await request(app).get(`/v1/product/${product.id}`);
            expect(check.body.images).toHaveLength(0);
            expect(fs.existsSync(file)).toBe(false);
        });

        it('troca o arquivo de uma imagem existente (base64 com id)', async () => {
            const image = product.images[0];
            const oldFile = mediaFilePath(image.content);

            await put(productBody({ images: [{ id: image.id, content: PNG_BASE64 }] }));

            const check = await request(app).get(`/v1/product/${product.id}`);
            expect(check.body.images[0].id).toBe(image.id);
            expect(relativePath(check.body.images[0].content)).not.toBe(relativePath(image.content));
            expect(fs.existsSync(oldFile)).toBe(false);
        });

        it('mantém a imagem quando content é uma URL', async () => {
            const image = product.images[0];
            await put(productBody({ images: [{ id: image.id, content: image.content }] }));

            const check = await request(app).get(`/v1/product/${product.id}`);
            expect(relativePath(check.body.images[0].content)).toBe(relativePath(image.content));
        });

        it('altera, apaga e cria opções', async () => {
            const [first, second] = product.options;

            const res = await put(
                productBody({
                    options: [
                        { id: first.id, radius: '10px', value: ['38', '39'] },
                        { id: second.id, deleted: true },
                        { title: 'Material', values: ['Algodão'] },
                    ],
                })
            );
            expect(res.status).toBe(204);

            const check = await request(app).get(`/v1/product/${product.id}`);
            const ids = check.body.options.map((option) => option.id);
            const changed = check.body.options.find((option) => option.id === first.id);

            expect(check.body.options).toHaveLength(2);
            expect(ids).not.toContain(second.id);
            expect(changed.radius).toBe(10);
            expect(changed.values).toEqual(['38', '39']);
            expect(changed.title).toBe('Tamanho');
        });

        it('rejeita sem token (401)', async () => {
            const res = await request(app).put(`/v1/product/${product.id}`).send(productBody());
            expect(res.status).toBe(401);
        });

        it('rejeita dados incorretos (400) sem alterar nada', async () => {
            const { name, ...semNome } = productBody();
            const res = await put({ ...semNome, images: [{ id: product.images[0].id, deleted: true }] });
            expect(res.status).toBe(400);

            const check = await request(app).get(`/v1/product/${product.id}`);
            expect(check.body.images).toHaveLength(1);
        });

        it('rejeita imagem que não pertence ao produto (400)', async () => {
            const res = await put(productBody({ images: [{ id: 99999, deleted: true }] }));
            expect(res.status).toBe(400);
        });

        it('devolve 404 para produto inexistente', async () => {
            const res = await request(app).put('/v1/product/99999').set(auth()).send(productBody());
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /v1/product/:id', () => {
        it('rejeita sem token (401)', async () => {
            const res = await request(app).delete('/v1/product/1');
            expect(res.status).toBe(401);
        });

        it('apaga o produto (204), os arquivos e depois devolve 404', async () => {
            const created = await createProduct({
                slug: 'para-apagar',
                images: [{ type: 'image/png', content: PNG_BASE64 }],
            });
            const file = mediaFilePath(created.body.images[0].content);
            expect(fs.existsSync(file)).toBe(true);

            const res = await request(app).delete(`/v1/product/${created.body.id}`).set(auth());
            expect(res.status).toBe(204);
            expect(fs.existsSync(file)).toBe(false);

            const check = await request(app).get(`/v1/product/${created.body.id}`);
            expect(check.status).toBe(404);
        });

        it('devolve 404 para produto inexistente', async () => {
            const res = await request(app).delete('/v1/product/99999').set(auth());
            expect(res.status).toBe(404);
        });
    });
});
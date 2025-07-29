import request from 'supertest';
import app from '../src/app'; // المفروض app هو express()

describe('Auth API', () => {
  it('should register a shop owner', async () => {
    const res = await request(app).post('/api/auth/register-shop-owner').send({
      full_name: 'Test Shop',
      email: 'testshop@test.com',
      password: '123456',
      shop_name: 'Test Fashion',
      category: 'رجالي',
      description: 'ملابس رجالي',
      city: 'القاهرة',
      address: 'شارع التحرير'
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Shop owner registered successfully');
    expect(res.body.user).toHaveProperty('email');
    expect(res.body.shop).toHaveProperty('name');
  });
});

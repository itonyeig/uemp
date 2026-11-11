import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('/api/v1 (GET) formats successful responses', () => {
    return request(app.getHttpServer()).get('/api/v1').expect(200).expect({
      success: true,
      statusCode: 200,
      message: 'OK',
    });
  });

  it('/ (GET) returns a formatted error outside the API prefix', () => {
    return request(app.getHttpServer()).get('/').expect(404).expect({
      success: false,
      statusCode: 404,
      error: 'NotFoundException',
      message: 'Cannot GET /',
    });
  });
});

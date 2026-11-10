import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllErrorsExceptionsFilter } from '../common/error/all-error-exceptions';
import { ResponseFormatterInterceptor } from '../common/interceptors/response-formatter';
import { SwaggerAuthMiddleware } from '../common/middlewares/swagger-auth.middleware';
import { GLOBAL_PREFIX } from '../constants';
import compression from 'compression';
import morgan from 'morgan';
import type { Request } from 'express';

export function configureApp(app: INestApplication) {
  const isDev = process.env.NODE_ENV === 'dev';

  app.setGlobalPrefix(`api/${GLOBAL_PREFIX}`);

  if (isDev) {
    const swaggerPath = `/docs/${GLOBAL_PREFIX}`;
    app.use(
      [swaggerPath, `${swaggerPath}-json`, `${swaggerPath}-yaml`],
      new SwaggerAuthMiddleware().use,
    );

    const config = new DocumentBuilder()
      .setTitle('UEMP API')
      .setDescription('API documentation for the UEMP backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        filter: true,
        displayRequestDuration: true,
      },
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: isDev,
      transform: true,
    }),
  );
  app.use(compression());
  app.use(
    morgan('dev', {
      skip: (req: Request) =>
        req.originalUrl === `/api/${GLOBAL_PREFIX}/health`,
    }),
  );
  app.use(helmet());
  app.enableCors({ origin: '*' });
  app.useGlobalFilters(new AllErrorsExceptionsFilter());
  app.useGlobalInterceptors(new ResponseFormatterInterceptor());
}

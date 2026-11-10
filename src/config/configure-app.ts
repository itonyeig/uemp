import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllErrorsExceptionsFilter } from '../common/error/all-error-exceptions';
import { ResponseFormatterInterceptor } from '../common/interceptors/response-formatter';
import { SwaggerAuthMiddleware } from '../common/middlewares/swagger-auth.middleware';
import { GLOBAL_PREFIX } from '../constants';

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
        persistAuthorization: true,
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
  app.use(helmet());
  app.enableCors({ origin: '*' });
  app.useGlobalFilters(new AllErrorsExceptionsFilter());
  app.useGlobalInterceptors(new ResponseFormatterInterceptor());
}

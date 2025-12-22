import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';
import fs from 'fs';

// Загружаем YAML файл
const swaggerYamlPath = path.join(__dirname, 'swagger.yaml');
const swaggerYamlContent = fs.readFileSync(swaggerYamlPath, 'utf8');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Template Management API',
      version: '1.0.0',
      description: 'API для управления шаблонами документов',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.template-system.com/api',
        description: 'Production server',
      },
    ],
  },
  // Если хотите использовать JSDoc комментарии в коде
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts'
  ],
};

const swaggerSpec = swaggerJsdoc(options);

// Альтернативно, можно напрямую использовать YAML
const swaggerSpecFromYaml = {
  ...swaggerJsdoc(options),
  ...require('js-yaml').load(swaggerYamlContent),
};

export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecFromYaml));
  
  // JSON endpoint для документации
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpecFromYaml);
  });
  
  // YAML endpoint
  app.get('/api-docs.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(swaggerYamlContent);
  });
  
  console.log('Swagger documentation available at http://localhost:3000/api-docs');
}
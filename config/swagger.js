import swaggerJsdoc from 'swagger-jsdoc';

const definicion = {
  openapi: '3.0.3',
  info: {
    title: 'API Fundacion Nuestra Esperanza',
    version: '1.0.0',
    description:
      'Backend del sistema de gestion documental y alimentario de la Fundacion Nuestra Esperanza (La Paz, Bolivia).\n\n' +
      'La autenticacion es por JWT: `POST /api/auth/login` devuelve un token que se envia ' +
      'en el header `Authorization: Bearer <token>`. Las respuestas usan la forma ' +
      '`{ ok, msg, error? }`. El campo `error` solo aparece fuera de produccion.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Desarrollo local'
    }
  ],
  tags: [
    {
      name: 'Salud',
      description: 'Estado del servicio'
    },
    {
      name: 'Auth',
      description: 'Autenticacion y sesion del usuario'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token devuelto por POST /api/auth/login. Expira a las 8 horas.'
      }
    },
    schemas: {
      Usuario: {
        type: 'object',
        description: 'Datos publicos de un usuario. Nunca incluye el hash de la contrasena.',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          nombre: {
            type: 'string'
          },
          apellido: {
            type: 'string'
          },
          email: {
            type: 'string',
            format: 'email'
          },
          rol: {
            type: 'string',
            enum: ['admin', 'archivista', 'visitante']
          }
        }
      },
      ErrorValidacion: {
        type: 'object',
        properties: {
          ok: {
            type: 'boolean',
            example: false
          },
          msg: {
            type: 'string'
          },
          errores: {
            type: 'array',
            description: 'Detalle por campo. Solo en respuestas 400 de validacion.',
            items: {
              type: 'object',
              properties: {
                campo: {
                  type: 'string'
                },
                mensaje: {
                  type: 'string'
                }
              }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          ok: {
            type: 'boolean',
            example: false
          },
          msg: {
            type: 'string'
          },
          error: {
            type: 'string',
            description: 'Solo se expone fuera de produccion.'
          }
        }
      }
    }
  }
};

const opciones = {
  definition: definicion,
  apis: ['./routes/*.js']
};

const swaggerDocument = swaggerJsdoc(opciones);

export default swaggerDocument;
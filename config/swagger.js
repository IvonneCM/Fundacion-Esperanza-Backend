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
    },
    {
      name: 'Usuarios',
      description: 'Gestion de usuarios. Solo administradores.'
    },
    {
      name: 'Documentos',
      description: 'Modulo documental: catalogo de tipos y carga de documentos.'
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
      UsuarioAdmin: {
        type: 'object',
        description: 'Usuario tal como lo devuelve la gestion de usuarios. Nunca incluye el hash.',
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
          },
          activo: {
            type: 'boolean'
          },
          creado_en: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      UsuarioCrear: {
        type: 'object',
        required: ['nombre', 'apellido', 'email', 'password'],
        properties: {
          nombre: {
            type: 'string',
            maxLength: 100
          },
          apellido: {
            type: 'string',
            maxLength: 100
          },
          email: {
            type: 'string',
            format: 'email'
          },
          password: {
            type: 'string',
            format: 'password',
            minLength: 8,
            description: 'Minimo 8 caracteres. Se guarda con bcrypt y nunca se devuelve.'
          },
          rol: {
            type: 'string',
            enum: ['admin', 'archivista', 'visitante'],
            default: 'visitante'
          }
        }
      },
      UsuarioEditar: {
        type: 'object',
        description: 'Todos los campos son opcionales. No admite password.',
        properties: {
          nombre: {
            type: 'string',
            maxLength: 100
          },
          apellido: {
            type: 'string',
            maxLength: 100
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
      UsuarioEstado: {
        type: 'object',
        required: ['activo'],
        properties: {
          activo: {
            type: 'boolean',
            example: false
          }
        }
      },
      TipoDocumento: {
        type: 'object',
        description: 'Tipo de documento del catalogo.',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          nombre_tipo: {
            type: 'string'
          },
          codigo: {
            type: 'string',
            maxLength: 10,
            description: 'Codigo corto usado como segmento de la ruta en S3/MinIO.'
          }
        }
      },
      Documento: {
        type: 'object',
        description: 'Documento comun. Los metadatos por tipo viven en tablas de extension.',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          codigo: {
            type: 'string',
            maxLength: 30
          },
          tipos_documentos_id: {
            type: 'string',
            format: 'uuid'
          },
          ruta_archivo: {
            type: 'string',
            description: 'Clave del objeto en S3/MinIO.'
          },
          estado_ocr: {
            type: 'string',
            enum: ['pendiente', 'procesado', 'error']
          },
          estado_validacion: {
            type: 'string',
            enum: ['pendiente', 'validado', 'rechazado']
          },
          fecha_registro: {
            type: 'string',
            format: 'date-time'
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
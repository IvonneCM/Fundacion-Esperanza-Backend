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
      description: 'Modulo documental: catalogo de tipos, carga, metadatos, busqueda y paginacion.'
    },
    {
      name: 'Inventario',
      description: 'Modulo alimentario: proveedores, productos y lotes del almacen. Solo administradores.'
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
      TipoDocumentoCrear: {
        type: 'object',
        required: ['nombre_tipo', 'codigo'],
        properties: {
          nombre_tipo: {
            type: 'string',
            maxLength: 50
          },
          codigo: {
            type: 'string',
            maxLength: 10,
            description: 'Unico. Se normaliza a mayusculas y no se puede editar despues.'
          }
        }
      },
      TipoDocumentoEditar: {
        type: 'object',
        required: ['nombre_tipo'],
        description: 'El codigo no es editable: si se envia uno distinto al actual responde 400.',
        properties: {
          nombre_tipo: {
            type: 'string',
            maxLength: 50
          }
        }
      },
      Proveedor: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          razon_proveedor: {
            type: 'string',
            maxLength: 150
          },
          ci_nit_proveedor: {
            type: 'string',
            maxLength: 20,
            description: 'Unico.'
          },
          telefono: {
            type: 'string',
            maxLength: 20
          },
          activo: {
            type: 'boolean'
          }
        }
      },
      ProveedorCrear: {
        type: 'object',
        required: ['razon_proveedor', 'ci_nit_proveedor', 'telefono'],
        properties: {
          razon_proveedor: {
            type: 'string',
            maxLength: 150
          },
          ci_nit_proveedor: {
            type: 'string',
            maxLength: 20,
            description: 'Unico.'
          },
          telefono: {
            type: 'string',
            maxLength: 20
          }
        }
      },
      ProveedorEstado: {
        type: 'object',
        required: ['activo'],
        properties: {
          activo: {
            type: 'boolean',
            example: false
          }
        }
      },
      ProductoInventario: {
        type: 'object',
        description: 'Presentacion de un producto del almacen, con su stock calculado desde los lotes.',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          codigo: {
            type: 'string',
            maxLength: 10
          },
          nombre: {
            type: 'string',
            maxLength: 150
          },
          tipo_envase: {
            type: 'string',
            maxLength: 30,
            example: 'quintal'
          },
          unidad_medida: {
            type: 'string',
            maxLength: 20,
            description: 'Unidad base en la que se guardan las cantidades.',
            example: 'kg'
          },
          contenido_neto_referencia: {
            type: 'number',
            description: 'Unidades base que trae una presentacion.',
            example: 46
          },
          precio_referencia_usd: {
            type: 'number',
            description: 'Precio de referencia por presentacion, en USD.',
            example: 55
          },
          stock_base: {
            type: 'number',
            description: 'Suma de cantidad_actual de sus lotes, en unidad base.',
            example: 92
          },
          stock_presentaciones: {
            type: 'number',
            description: 'stock_base dividido por el contenido neto.',
            example: 2
          },
          stock_disponible_base: {
            type: 'number',
            description: 'Stock sin contar los lotes vencidos, en unidad base. Solo en GET /api/productos/por-agotarse.',
            example: 46
          }
        }
      },
      ProductoInventarioCrear: {
        type: 'object',
        required: ['codigo', 'nombre', 'tipo_envase', 'unidad_medida', 'contenido_neto_referencia', 'precio_referencia_usd'],
        properties: {
          codigo: {
            type: 'string',
            maxLength: 10,
            description: 'Unico. Se normaliza a mayusculas.',
            example: 'ARR-Q'
          },
          nombre: {
            type: 'string',
            maxLength: 150,
            example: 'Arroz por quintal'
          },
          tipo_envase: {
            type: 'string',
            maxLength: 30,
            example: 'quintal'
          },
          unidad_medida: {
            type: 'string',
            maxLength: 20,
            example: 'kg'
          },
          contenido_neto_referencia: {
            type: 'number',
            exclusiveMinimum: 0,
            example: 46
          },
          precio_referencia_usd: {
            type: 'number',
            exclusiveMinimum: 0,
            example: 55
          }
        }
      },
      LoteInventario: {
        type: 'object',
        description: 'Existencias de un producto con una fecha de vencimiento. Cantidades en unidad base.',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          producto_id: {
            type: 'string',
            format: 'uuid'
          },
          nombre: {
            type: 'string'
          },
          cantidad_actual: {
            type: 'number'
          },
          cantidad_inicial: {
            type: 'number',
            description: 'Cantidad con la que nacio el lote; no se modifica despues.'
          },
          unidad_medida: {
            type: 'string'
          },
          precio_unitario_usd: {
            type: 'number',
            nullable: true,
            description: 'Precio por presentacion, en USD.'
          },
          notas: {
            type: 'string',
            nullable: true
          },
          fecha_expiracion: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'null = sin fecha de vencimiento (SFV).'
          },
          vence_el: {
            type: 'string',
            format: 'date',
            nullable: true,
            description: 'Fecha de vencimiento en calendario de La Paz. null = SFV.',
            example: '2027-03-31'
          },
          fecha_inventario_inicial: {
            type: 'string',
            format: 'date-time'
          },
          cantidad_presentaciones: {
            type: 'number',
            nullable: true,
            description: 'cantidad_actual en presentaciones. Solo en las consultas de lotes.'
          },
          producto: {
            type: 'object',
            nullable: true,
            description: 'Producto del lote. Solo en las consultas de lotes.',
            properties: {
              id: {
                type: 'string',
                format: 'uuid'
              },
              codigo: {
                type: 'string'
              },
              nombre: {
                type: 'string'
              },
              unidad_medida: {
                type: 'string'
              },
              contenido_neto_referencia: {
                type: 'number'
              }
            }
          }
        }
      },
      LoteAlerta: {
        type: 'object',
        description: 'Lote de la alerta de vencimientos: todo lo de LoteInventario mas los dias que faltan.',
        allOf: [
          {
            $ref: '#/components/schemas/LoteInventario'
          },
          {
            type: 'object',
            properties: {
              dias_para_vencer: {
                type: 'integer',
                nullable: true,
                description: 'Negativo si ya vencio. null si el lote no tiene fecha (SFV); esos lotes no aparecen en la alerta.',
                example: 12
              },
              vencido: {
                type: 'boolean'
              }
            }
          }
        ]
      },
      MovimientoLote: {
        type: 'object',
        description: 'Ingreso o salida (incluidos los ajustes) que tocaron un lote.',
        properties: {
          tipo: {
            type: 'string',
            enum: ['ingreso', 'salida']
          },
          subtipo: {
            type: 'string',
            description: 'tipo_ingreso (compra, donacion, traspaso, ajuste) o tipo_salida (consumo, ajuste).'
          },
          movimiento_id: {
            type: 'string',
            format: 'uuid',
            description: 'Id del ingreso o de la salida; se consulta con GET /api/ingresos/{id} o /api/salidas/{id}.'
          },
          fecha: {
            type: 'string',
            format: 'date-time'
          },
          cantidad_base: {
            type: 'number'
          }
        }
      },
      IngresoAlmacenItemCrear: {
        type: 'object',
        required: ['producto_id', 'cantidad_presentaciones'],
        properties: {
          producto_id: {
            type: 'string',
            format: 'uuid'
          },
          cantidad_presentaciones: {
            type: 'number',
            exclusiveMinimum: 0,
            description: 'Cantidad en presentaciones (ej. 3 quintales). Se guarda en unidad base.',
            example: 2
          },
          precio_unitario_usd: {
            type: 'number',
            exclusiveMinimum: 0,
            description: 'Precio por presentacion en USD. Si se omite: el del lote existente o el de referencia del producto.',
            example: 55
          },
          precio_unitario_bs: {
            type: 'number',
            exclusiveMinimum: 0,
            description: 'Precio por presentacion en bolivianos, tal como figura en la factura (opcional).',
            example: 383
          },
          fecha_expiracion: {
            type: 'string',
            format: 'date',
            nullable: true,
            description: 'Opcional. Si se omite o es null, el lote queda sin fecha de vencimiento (SFV).',
            example: '2027-03-31'
          },
          inventario_almacen_lote_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Si se indica, suma a ese lote (mismo producto y misma fecha de vencimiento). Si se omite, se crea un lote nuevo.'
          },
          notas: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: 'Notas del lote nuevo.'
          }
        }
      },
      IngresoAlmacenCrear: {
        type: 'object',
        required: ['tipo_ingreso', 'tipo_cambio_bs_usd', 'detalles'],
        properties: {
          tipo_ingreso: {
            type: 'string',
            enum: ['compra', 'donacion', 'traspaso', 'ajuste'],
            description: 'La compra requiere proveedor. El conteo inicial se carga como ajuste.'
          },
          proveedor_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Debe existir y estar activo.'
          },
          fecha: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Por defecto, ahora. Permite registrar ingresos con fecha pasada (ej. el conteo del 2026-09-16).'
          },
          tipo_cambio_bs_usd: {
            type: 'number',
            exclusiveMinimum: 0,
            example: 6.96
          },
          moneda_compra: {
            type: 'string',
            enum: ['BOB', 'USD'],
            default: 'BOB'
          },
          monto_total_bs: {
            type: 'number',
            nullable: true,
            description: 'Importe real pagado en bolivianos (opcional).'
          },
          nro_cia: {
            type: 'integer',
            nullable: true,
            description: 'Numero del formulario CIA en papel (opcional).'
          },
          nro_documento_respaldo: {
            type: 'string',
            maxLength: 30,
            nullable: true,
            description: 'Numero de factura, si existe.'
          },
          motivo: {
            type: 'string',
            maxLength: 200,
            nullable: true,
            example: 'Conteo inicial 2026-09-16'
          },
          observaciones: {
            type: 'string',
            maxLength: 255,
            nullable: true
          },
          detalles: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              $ref: '#/components/schemas/IngresoAlmacenItemCrear'
            }
          }
        }
      },
      DetalleIngreso: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          producto: {
            type: 'object',
            nullable: true,
            properties: {
              id: {
                type: 'string',
                format: 'uuid'
              },
              codigo: {
                type: 'string'
              },
              nombre: {
                type: 'string'
              },
              unidad_medida: {
                type: 'string'
              },
              contenido_neto_referencia: {
                type: 'number'
              }
            }
          },
          lote_id: {
            type: 'string',
            format: 'uuid'
          },
          cantidad_base: {
            type: 'number',
            description: 'Cantidad ingresada en unidad base.'
          },
          cantidad_presentaciones: {
            type: 'number',
            nullable: true
          },
          precio_unitario_usd: {
            type: 'number'
          },
          precio_unitario_bs: {
            type: 'number',
            nullable: true
          },
          fecha_expiracion: {
            type: 'string',
            format: 'date',
            nullable: true
          }
        }
      },
      IngresoAlmacen: {
        type: 'object',
        description: 'Cabecera de un ingreso, tal como aparece en los listados.',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          tipo_ingreso: {
            type: 'string',
            enum: ['compra', 'donacion', 'traspaso', 'ajuste']
          },
          fecha: {
            type: 'string',
            format: 'date-time'
          },
          nro_cia: {
            type: 'integer',
            nullable: true
          },
          nro_documento_respaldo: {
            type: 'string',
            nullable: true
          },
          tipo_cambio_bs_usd: {
            type: 'number'
          },
          moneda_compra: {
            type: 'string',
            enum: ['BOB', 'USD']
          },
          monto_total_bs: {
            type: 'number',
            nullable: true
          },
          motivo: {
            type: 'string',
            nullable: true
          },
          observaciones: {
            type: 'string',
            nullable: true
          },
          proveedor: {
            type: 'object',
            nullable: true,
            properties: {
              id: {
                type: 'string',
                format: 'uuid'
              },
              razon_proveedor: {
                type: 'string'
              },
              ci_nit_proveedor: {
                type: 'string'
              }
            }
          },
          items: {
            type: 'integer',
            description: 'Cantidad de lineas de detalle (solo en el listado).'
          }
        }
      },
      IngresoAlmacenDetalle: {
        type: 'object',
        description: 'Ingreso con quien lo recibio y sus detalles.',
        allOf: [
          {
            $ref: '#/components/schemas/IngresoAlmacen'
          },
          {
            type: 'object',
            properties: {
              recibido_por: {
                type: 'object',
                nullable: true,
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
                  }
                }
              },
              detalles: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/DetalleIngreso'
                }
              }
            }
          }
        ]
      },
      SalidaAlmacenItemCrear: {
        type: 'object',
        required: ['producto_id', 'cantidad_base'],
        properties: {
          producto_id: {
            type: 'string',
            format: 'uuid'
          },
          cantidad_base: {
            type: 'number',
            exclusiveMinimum: 0,
            description: 'Cantidad en unidad base del producto (ej. kg), no en presentaciones.',
            example: 5
          },
          inventario_almacen_lote_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Opcional. Si se omite, se aplica FEFO (primero el que vence antes; los lotes sin fecha, al final; nunca uno vencido). Si se indica, debe ser del mismo producto; si esta vencido hace falta confirmar_vencido.'
          },
          confirmar_vencido: {
            type: 'boolean',
            description: 'Autoriza sacar el lote indicado aunque este vencido. Requiere motivo_vencido. Sin esto, un lote vencido responde 409 con los dias vencidos.'
          },
          motivo_vencido: {
            type: 'string',
            maxLength: 255,
            description: 'Obligatorio si confirmar_vencido es true.'
          }
        }
      },
      SalidaAlmacenCrear: {
        type: 'object',
        required: ['responsable', 'detalles'],
        properties: {
          responsable: {
            type: 'string',
            maxLength: 100,
            description: 'Quien entrega los insumos del almacen.',
            example: 'Maria Lopez'
          },
          nro_csa: {
            type: 'string',
            maxLength: 10,
            nullable: true,
            description: 'Numero del formulario CSA en papel (opcional).'
          },
          area_solicitante: {
            type: 'string',
            maxLength: 20,
            nullable: true
          },
          programa_poa: {
            type: 'string',
            maxLength: 10,
            nullable: true
          },
          fecha: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Por defecto, ahora.'
          },
          observaciones: {
            type: 'string',
            maxLength: 255,
            nullable: true
          },
          detalles: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              $ref: '#/components/schemas/SalidaAlmacenItemCrear'
            }
          }
        }
      },
      DetalleSalida: {
        type: 'object',
        description: 'Una linea por lote: si un item sale de varios lotes (FEFO), aparecen varias lineas.',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          producto: {
            type: 'object',
            nullable: true,
            properties: {
              id: {
                type: 'string',
                format: 'uuid'
              },
              codigo: {
                type: 'string'
              },
              nombre: {
                type: 'string'
              },
              unidad_medida: {
                type: 'string'
              },
              contenido_neto_referencia: {
                type: 'number'
              }
            }
          },
          lote_id: {
            type: 'string',
            format: 'uuid'
          },
          fecha_expiracion: {
            type: 'string',
            format: 'date',
            nullable: true
          },
          cantidad_base: {
            type: 'number'
          },
          cantidad_presentaciones: {
            type: 'number',
            nullable: true
          },
          dias_vencido: {
            type: 'integer',
            nullable: true,
            description: 'Solo si se saco un lote vencido con confirmacion: dias que llevaba vencido.'
          },
          motivo_vencido: {
            type: 'string',
            nullable: true
          }
        }
      },
      SalidaAlmacen: {
        type: 'object',
        description: 'Cabecera de una salida, tal como aparece en los listados.',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          tipo_salida: {
            type: 'string',
            enum: ['consumo', 'ajuste']
          },
          fecha: {
            type: 'string',
            format: 'date-time'
          },
          nro_csa: {
            type: 'string',
            nullable: true
          },
          area_solicitante: {
            type: 'string',
            nullable: true
          },
          responsable: {
            type: 'string'
          },
          programa_poa: {
            type: 'string',
            nullable: true
          },
          observaciones: {
            type: 'string',
            nullable: true
          },
          despachado_por: {
            type: 'object',
            nullable: true,
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
              }
            }
          },
          items: {
            type: 'integer',
            description: 'Cantidad de lineas de detalle (solo en el listado).'
          }
        }
      },
      SalidaAlmacenDetalle: {
        type: 'object',
        description: 'Salida con sus detalles.',
        allOf: [
          {
            $ref: '#/components/schemas/SalidaAlmacen'
          },
          {
            type: 'object',
            properties: {
              detalles: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/DetalleSalida'
                }
              }
            }
          }
        ]
      },
      AjusteLoteCrear: {
        type: 'object',
        required: ['motivo'],
        description: 'Indique cantidad_contada o cantidad_contada_presentaciones, solo una de las dos.',
        properties: {
          cantidad_contada: {
            type: 'number',
            minimum: 0,
            description: 'Lo que hay fisicamente, en unidad base.',
            example: 40
          },
          cantidad_contada_presentaciones: {
            type: 'number',
            minimum: 0,
            description: 'Lo que hay fisicamente, en presentaciones.',
            example: 2
          },
          motivo: {
            type: 'string',
            maxLength: 200,
            example: 'Conteo manual de noviembre'
          },
          tipo_cambio_bs_usd: {
            type: 'number',
            exclusiveMinimum: 0,
            description: 'Solo si la diferencia es positiva. Si se omite, se usa el del ingreso mas reciente.'
          },
          precio_unitario_usd: {
            type: 'number',
            exclusiveMinimum: 0,
            description: 'Solo si la diferencia es positiva. Por presentacion. Si se omite, el del lote o el del producto.'
          }
        }
      },
      AjusteLoteResultado: {
        type: 'object',
        properties: {
          movimiento: {
            type: 'object',
            properties: {
              tipo: {
                type: 'string',
                enum: ['ingreso', 'salida']
              },
              id: {
                type: 'string',
                format: 'uuid'
              }
            }
          },
          cantidad_anterior: {
            type: 'number'
          },
          cantidad_contada: {
            type: 'number'
          },
          diferencia: {
            type: 'number',
            description: 'Positiva = sobraba (ingreso de ajuste). Negativa = faltaba (salida de ajuste).'
          },
          lote: {
            $ref: '#/components/schemas/LoteInventario'
          }
        }
      },
      DocumentoListado: {
        type: 'object',
        description: 'Documento en la lista/busqueda, con el tipo resumido.',
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
          tipo: {
            type: 'object',
            nullable: true,
            properties: {
              id: {
                type: 'string',
                format: 'uuid'
              },
              nombre_tipo: {
                type: 'string'
              },
              codigo: {
                type: 'string'
              }
            }
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
          },
          fecha_validacion: {
            type: 'string',
            format: 'date-time',
            nullable: true
          }
        }
      },
      ResumenTipo: {
        type: 'object',
        description:
          'Conteo de documentos de un tipo. Todos los roles reciben `total` y `por_validar` completos.',
        properties: {
          tipos_documentos_id: {
            type: 'string',
            format: 'uuid'
          },
          codigo: {
            type: 'string'
          },
          nombre_tipo: {
            type: 'string'
          },
          total: {
            type: 'integer'
          },
          por_validar: {
            type: 'integer',
            description: 'Solo admin/archivista. Documentos pendientes de validacion.'
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
      FichaSocialDatos: {
        type: 'object',
        description: 'Metadatos de ficha social (1:1 con el documento).',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          documento_id: {
            type: 'string',
            format: 'uuid'
          },
          nombre_paciente: {
            type: 'string'
          },
          fecha_nacimiento: {
            type: 'string',
            format: 'date'
          },
          edad_entrada: {
            type: 'integer'
          },
          grado_escolaridad: {
            type: 'string'
          },
          procedencia: {
            type: 'string'
          },
          domicilio_zona: {
            type: 'string'
          },
          calle: {
            type: 'string'
          },
          numero_casa: {
            type: 'string'
          },
          celular_padre: {
            type: 'string'
          },
          celular_madre: {
            type: 'string'
          },
          diagnostico: {
            type: 'string'
          },
          fecha_diagnostico: {
            type: 'string',
            format: 'date'
          },
          medico_tratante: {
            type: 'string'
          },
          hospital: {
            type: 'string'
          },
          observaciones: {
            type: 'string'
          }
        }
      },
      FichaSocialDatosCrear: {
        type: 'object',
        required: ['nombre_paciente'],
        properties: {
          nombre_paciente: {
            type: 'string'
          },
          fecha_nacimiento: {
            type: 'string',
            format: 'date'
          },
          edad_entrada: {
            type: 'integer'
          },
          grado_escolaridad: {
            type: 'string'
          },
          procedencia: {
            type: 'string'
          },
          domicilio_zona: {
            type: 'string'
          },
          calle: {
            type: 'string'
          },
          numero_casa: {
            type: 'string'
          },
          celular_padre: {
            type: 'string'
          },
          celular_madre: {
            type: 'string'
          },
          diagnostico: {
            type: 'string'
          },
          fecha_diagnostico: {
            type: 'string',
            format: 'date'
          },
          medico_tratante: {
            type: 'string'
          },
          hospital: {
            type: 'string'
          },
          observaciones: {
            type: 'string'
          }
        }
      },
      FichaSocialGrupoFamiliar: {
        type: 'object',
        description: 'Integrante del grupo familiar (1:N de la ficha social).',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          ficha_social_id: {
            type: 'string',
            format: 'uuid'
          },
          nombre_apellido: {
            type: 'string'
          },
          parentesco: {
            type: 'string'
          },
          edad: {
            type: 'integer'
          },
          estado_civil: {
            type: 'string'
          },
          grado_instruccion: {
            type: 'string'
          },
          ocupacion: {
            type: 'string'
          }
        }
      },
      FichaSocialGrupoFamiliarCrear: {
        type: 'object',
        required: ['nombre_apellido'],
        properties: {
          nombre_apellido: {
            type: 'string'
          },
          parentesco: {
            type: 'string'
          },
          edad: {
            type: 'integer'
          },
          estado_civil: {
            type: 'string'
          },
          grado_instruccion: {
            type: 'string'
          },
          ocupacion: {
            type: 'string'
          }
        }
      },
      ReferenciaSocialDatos: {
        type: 'object',
        description: 'Metadatos de referencia social (1:1 con el documento).',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          documento_id: {
            type: 'string',
            format: 'uuid'
          },
          cite: {
            type: 'string'
          },
          fecha: {
            type: 'string',
            format: 'date'
          },
          remitente_nombre: {
            type: 'string'
          },
          remitente_cargo: {
            type: 'string'
          },
          institucion_remitente: {
            type: 'string'
          },
          nombre_paciente: {
            type: 'string'
          },
          edad_paciente: {
            type: 'string'
          },
          expediente_clinico: {
            type: 'string'
          },
          diagnostico: {
            type: 'string'
          },
          procedencia: {
            type: 'string'
          },
          contenido: {
            type: 'string'
          }
        }
      },
      ReferenciaSocialDatosCrear: {
        type: 'object',
        required: ['nombre_paciente'],
        properties: {
          cite: {
            type: 'string'
          },
          fecha: {
            type: 'string',
            format: 'date'
          },
          remitente_nombre: {
            type: 'string'
          },
          remitente_cargo: {
            type: 'string'
          },
          institucion_remitente: {
            type: 'string'
          },
          nombre_paciente: {
            type: 'string'
          },
          edad_paciente: {
            type: 'string'
          },
          expediente_clinico: {
            type: 'string'
          },
          diagnostico: {
            type: 'string'
          },
          procedencia: {
            type: 'string'
          },
          contenido: {
            type: 'string'
          }
        }
      },
      AlmuerzoRegistro: {
        type: 'object',
        description: 'Fila de registro de almuerzo (1:N con el documento).',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          documento_id: {
            type: 'string',
            format: 'uuid'
          },
          fila_numero: {
            type: 'integer'
          },
          fecha_almuerzo: {
            type: 'string',
            format: 'date'
          },
          apellido_paciente: {
            type: 'string'
          },
          nombres_paciente: {
            type: 'string'
          },
          nombre_cuidador: {
            type: 'string'
          },
          hospital: {
            type: 'string'
          },
          cantidad_almuerzos: {
            type: 'integer'
          },
          estado_fila_validacion: {
            type: 'string',
            enum: ['pendiente', 'validado', 'rechazado']
          }
        }
      },
      AlmuerzoRegistroCrear: {
        type: 'object',
        required: ['nombres_paciente'],
        properties: {
          fila_numero: {
            type: 'integer'
          },
          fecha_almuerzo: {
            type: 'string',
            format: 'date'
          },
          apellido_paciente: {
            type: 'string'
          },
          nombres_paciente: {
            type: 'string'
          },
          nombre_cuidador: {
            type: 'string'
          },
          hospital: {
            type: 'string'
          },
          cantidad_almuerzos: {
            type: 'integer'
          }
        }
      },
      SalidaEntradaRegistro: {
        type: 'object',
        description: 'Fila de registro de salida/entrada (1:N con el documento).',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          documento_id: {
            type: 'string',
            format: 'uuid'
          },
          fila_numero: {
            type: 'integer'
          },
          nombre_nino: {
            type: 'string'
          },
          nombre_acompanante: {
            type: 'string'
          },
          ci_acompanante: {
            type: 'string'
          },
          celular_acompanante: {
            type: 'string'
          },
          fecha_ingreso: {
            type: 'string',
            format: 'date'
          },
          fecha_salida: {
            type: 'string',
            format: 'date'
          },
          estado_fila_validacion: {
            type: 'string',
            enum: ['pendiente', 'validado', 'rechazado']
          }
        }
      },
      SalidaEntradaRegistroCrear: {
        type: 'object',
        required: ['nombre_nino'],
        properties: {
          fila_numero: {
            type: 'integer'
          },
          nombre_nino: {
            type: 'string'
          },
          nombre_acompanante: {
            type: 'string'
          },
          ci_acompanante: {
            type: 'string'
          },
          celular_acompanante: {
            type: 'string'
          },
          fecha_ingreso: {
            type: 'string',
            format: 'date'
          },
          fecha_salida: {
            type: 'string',
            format: 'date'
          }
        }
      },
      TicketTransporteRegistro: {
        type: 'object',
        description: 'Fila de ticket de transporte (1:N con el documento).',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          documento_id: {
            type: 'string',
            format: 'uuid'
          },
          fila_numero: {
            type: 'integer'
          },
          fecha_ticket: {
            type: 'string',
            format: 'date'
          },
          nombre_solicitante: {
            type: 'string'
          },
          nro_ticket: {
            type: 'string'
          },
          ruta: {
            type: 'string'
          },
          tipo_viaje: {
            type: 'string',
            enum: ['ida', 'vuelta', 'ida_vuelta']
          },
          estado_fila_validacion: {
            type: 'string',
            enum: ['pendiente', 'validado', 'rechazado']
          }
        }
      },
      TicketTransporteRegistroCrear: {
        type: 'object',
        required: ['nombre_solicitante'],
        properties: {
          fila_numero: {
            type: 'integer'
          },
          fecha_ticket: {
            type: 'string',
            format: 'date'
          },
          nombre_solicitante: {
            type: 'string'
          },
          nro_ticket: {
            type: 'string'
          },
          ruta: {
            type: 'string'
          },
          tipo_viaje: {
            type: 'string',
            enum: ['ida', 'vuelta', 'ida_vuelta']
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
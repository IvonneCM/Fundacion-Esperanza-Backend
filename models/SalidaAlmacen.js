import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const TIPOS_SALIDA = ['consumo', 'ajuste'];
export const ESTADOS_MOVIMIENTO = ['activo', 'anulado'];

const SalidaAlmacen = sequelize.define(
  'SalidaAlmacen',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nro_csa: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    area_solicitante: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    responsable: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    programa_poa: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    usuario_id_despacha: {
      type: DataTypes.UUID,
      allowNull: false
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    tipo_salida: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'consumo',
      validate: {
        isIn: [TIPOS_SALIDA]
      }
    },
    observaciones: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ci_responsable: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    recibido_conforme: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    fecha_recepcion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    comprobante_documento_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'activo',
      validate: {
        isIn: [ESTADOS_MOVIMIENTO]
      }
    },
    anulado_en: {
      type: DataTypes.DATE,
      allowNull: true
    },
    usuario_anula_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    motivo_anulacion: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    tableName: 'salida_almacen',
    timestamps: false
  }
);

export default SalidaAlmacen;

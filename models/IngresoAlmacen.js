import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const TIPOS_INGRESO = ['compra', 'donacion', 'traspaso', 'ajuste'];
export const MONEDAS_COMPRA = ['BOB', 'USD'];

const IngresoAlmacen = sequelize.define(
  'IngresoAlmacen',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nro_cia: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo_ingreso: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [TIPOS_INGRESO]
      }
    },
    motivo: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    usuario_recibe: {
      type: DataTypes.UUID,
      allowNull: false
    },
    proveedor_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    tipo_cambio_bs_usd: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false
    },
    moneda_compra: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'BOB',
      validate: {
        isIn: [MONEDAS_COMPRA]
      }
    },
    monto_total_bs: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true
    },
    nro_documento_respaldo: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    observaciones: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    tableName: 'ingreso_almacen',
    timestamps: false
  }
);

export default IngresoAlmacen;

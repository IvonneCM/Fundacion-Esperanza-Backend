import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DetalleIngresoAlmacen = sequelize.define(
  'DetalleIngresoAlmacen',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cantidad_ingresada: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    precio_unitario_usd: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false
    },
    precio_unitario_bs: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true
    },
    fecha_expiracion: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    ingreso_almacen_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    inventario_almacen_lote_id: {
      type: DataTypes.UUID,
      allowNull: false
    }
  },
  {
    tableName: 'detalle_ingreso_almacen',
    timestamps: false
  }
);

export default DetalleIngresoAlmacen;

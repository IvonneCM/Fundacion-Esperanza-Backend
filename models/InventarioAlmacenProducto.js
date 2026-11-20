import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const InventarioAlmacenProducto = sequelize.define(
  'InventarioAlmacenProducto',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    tipo_envase: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    unidad_medida: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    contenido_neto_referencia: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    precio_referencia_usd: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false
    }
  },
  {
    tableName: 'inventario_almacen_producto',
    timestamps: false
  }
);

export default InventarioAlmacenProducto;

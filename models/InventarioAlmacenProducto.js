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
    },
    producto_base_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    marca: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    medida_casera_nombre: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    medida_casera_cantidad: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true
    }
  },
  {
    tableName: 'inventario_almacen_producto',
    timestamps: false
  }
);

export default InventarioAlmacenProducto;

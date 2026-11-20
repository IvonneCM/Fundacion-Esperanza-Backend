import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const InventarioAlmacenLote = sequelize.define(
  'InventarioAlmacenLote',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    producto_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    cantidad_actual: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    cantidad_inicial: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unidad_medida: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    precio_unitario_usd: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true
    },
    notas: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fecha_expiracion: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fecha_inventario_inicial: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'inventario_almacen_lote',
    timestamps: false
  }
);

export default InventarioAlmacenLote;

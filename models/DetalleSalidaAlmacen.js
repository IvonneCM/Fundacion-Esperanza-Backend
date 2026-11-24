import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DetalleSalidaAlmacen = sequelize.define(
  'DetalleSalidaAlmacen',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cantidad_salida: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    inventario_almacen_lote_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    salida_almacen_id: {
      type: DataTypes.UUID,
      allowNull: false
    }
  },
  {
    tableName: 'detalle_salida_almacen',
    timestamps: false
  }
);

export default DetalleSalidaAlmacen;

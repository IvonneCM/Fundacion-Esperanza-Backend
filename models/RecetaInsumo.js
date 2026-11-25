import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Llave primaria compuesta (receta_id, insumo_id). `insumo_id` apunta a un producto base.
const RecetaInsumo = sequelize.define(
  'RecetaInsumo',
  {
    receta_id: {
      type: DataTypes.UUID,
      primaryKey: true
    },
    insumo_id: {
      type: DataTypes.UUID,
      primaryKey: true
    },
    cantidad_requerida: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false
    }
  },
  {
    tableName: 'receta_insumos',
    timestamps: false
  }
);

export default RecetaInsumo;

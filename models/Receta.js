import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Receta = sequelize.define(
  'Receta',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'recetas',
    timestamps: false
  }
);

export default Receta;

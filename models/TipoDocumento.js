import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const TipoDocumento = sequelize.define(
  'TipoDocumento',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nombre_tipo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    codigo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    }
  },
  {
    tableName: 'tipos_documentos',
    timestamps: false
  }
);

export default TipoDocumento;

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Proveedor = sequelize.define(
  'Proveedor',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    razon_proveedor: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    ci_nit_proveedor: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'proveedor',
    timestamps: false
  }
);

export default Proveedor;

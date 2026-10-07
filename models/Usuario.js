import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ROLES = ['admin', 'archivista', 'visitante'];

const Usuario = sequelize.define(
  'Usuario',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    rol: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'visitante',
      validate: {
        isIn: {
          args: [ROLES],
          msg: `El rol debe ser uno de: ${ROLES.join(', ')}`
        }
      }
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    creado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'usuarios',
    timestamps: false,
    defaultScope: {
      attributes: { exclude: ['password_hash'] }
    },
    scopes: {
      conPassword: {
        attributes: { include: ['password_hash'] }
      }
    }
  }
);

export { ROLES };
export default Usuario;
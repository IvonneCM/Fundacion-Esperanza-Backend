import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ReferenciaSocialDatos = sequelize.define(
  'ReferenciaSocialDatos',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documento_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    cite: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    remitente_nombre: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    remitente_cargo: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    institucion_remitente: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    nombre_paciente: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    edad_paciente: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    expediente_clinico: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    diagnostico: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    procedencia: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    contenido: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'referencia_social_datos',
    timestamps: false
  }
);

export default ReferenciaSocialDatos;

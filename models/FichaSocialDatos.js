import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const FichaSocialDatos = sequelize.define(
  'FichaSocialDatos',
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
    nombre_paciente: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    edad_entrada: {
      type: DataTypes.SMALLINT,
      allowNull: true
    },
    grado_escolaridad: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    procedencia: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    domicilio_zona: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    calle: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    numero_casa: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    celular_padre: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    celular_madre: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    diagnostico: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    fecha_diagnostico: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    medico_tratante: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    hospital: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'ficha_social_datos',
    timestamps: false
  }
);

export default FichaSocialDatos;

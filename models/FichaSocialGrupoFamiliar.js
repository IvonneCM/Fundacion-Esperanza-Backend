import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const FichaSocialGrupoFamiliar = sequelize.define(
  'FichaSocialGrupoFamiliar',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ficha_social_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    nombre_apellido: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    parentesco: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    edad: {
      type: DataTypes.SMALLINT,
      allowNull: true
    },
    estado_civil: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    grado_instruccion: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    ocupacion: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  },
  {
    tableName: 'ficha_social_grupo_familiar',
    timestamps: false
  }
);

export default FichaSocialGrupoFamiliar;

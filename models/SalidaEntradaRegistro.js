import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ESTADOS_FILA = ['pendiente', 'validado', 'rechazado'];

const SalidaEntradaRegistro = sequelize.define(
  'SalidaEntradaRegistro',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documento_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    fila_numero: {
      type: DataTypes.SMALLINT,
      allowNull: true
    },
    nombre_nino: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    nombre_acompanante: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    ci_acompanante: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    celular_acompanante: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    fecha_ingreso: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    fecha_salida: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    estado_fila_validacion: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pendiente',
      validate: {
        isIn: {
          args: [ESTADOS_FILA],
          msg: `El estado de la fila debe ser uno de: ${ESTADOS_FILA.join(', ')}`
        }
      }
    }
  },
  {
    tableName: 'salida_entrada_registro',
    timestamps: false
  }
);

export { ESTADOS_FILA };
export default SalidaEntradaRegistro;

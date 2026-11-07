import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ESTADOS_FILA = ['pendiente', 'validado', 'rechazado'];

const AlmuerzoRegistro = sequelize.define(
  'AlmuerzoRegistro',
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
    fecha_almuerzo: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    apellido_paciente: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    nombres_paciente: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    nombre_cuidador: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    hospital: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    cantidad_almuerzos: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 1
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
    tableName: 'almuerzo_registro',
    timestamps: false
  }
);

export { ESTADOS_FILA };
export default AlmuerzoRegistro;

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const TIPOS_VIAJE = ['ida', 'vuelta', 'ida_vuelta'];
const ESTADOS_FILA = ['pendiente', 'validado', 'rechazado'];

const TicketTransporteRegistro = sequelize.define(
  'TicketTransporteRegistro',
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
    fecha_ticket: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    nombre_solicitante: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    nro_ticket: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ruta: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    tipo_viaje: {
      type: DataTypes.STRING(12),
      allowNull: false,
      defaultValue: 'ida',
      validate: {
        isIn: {
          args: [TIPOS_VIAJE],
          msg: `El tipo de viaje debe ser uno de: ${TIPOS_VIAJE.join(', ')}`
        }
      }
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
    tableName: 'ticket_transporte_registro',
    timestamps: false
  }
);

export { TIPOS_VIAJE, ESTADOS_FILA };
export default TicketTransporteRegistro;

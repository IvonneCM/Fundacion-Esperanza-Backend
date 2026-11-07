import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ESTADOS_OCR = ['pendiente', 'procesado', 'error'];
const ESTADOS_VALIDACION = ['pendiente', 'validado', 'rechazado'];

const Documento = sequelize.define(
  'Documento',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    tipos_documentos_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    ruta_archivo: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    texto_ocr: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estado_ocr: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pendiente',
      validate: {
        isIn: {
          args: [ESTADOS_OCR],
          msg: `El estado OCR debe ser uno de: ${ESTADOS_OCR.join(', ')}`
        }
      }
    },
    estado_validacion: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pendiente',
      validate: {
        isIn: {
          args: [ESTADOS_VALIDACION],
          msg: `El estado de validacion debe ser uno de: ${ESTADOS_VALIDACION.join(', ')}`
        }
      }
    },
    usuario_registro_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    usuario_validacion_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    fecha_registro: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    fecha_validacion: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'documentos',
    timestamps: false
  }
);

export { ESTADOS_OCR, ESTADOS_VALIDACION };
export default Documento;

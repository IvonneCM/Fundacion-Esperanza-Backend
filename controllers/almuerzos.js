import AlmuerzoRegistro from '../models/AlmuerzoRegistro.js';
import { crearControladorFilas } from '../utils/crud-filas.js';

const controlador = crearControladorFilas({
  modelo: AlmuerzoRegistro,
  codigoTipo: 'ALMUERZOS',
  nombreRecurso: 'Almuerzo',
  camposPermitidos: [
    'fecha_almuerzo',
    'apellido_paciente',
    'nombres_paciente',
    'nombre_cuidador',
    'hospital',
    'cantidad_almuerzos'
  ]
});

export const { getFilas, crearFila, actualizarFila, eliminarFila } = controlador;

export default controlador;

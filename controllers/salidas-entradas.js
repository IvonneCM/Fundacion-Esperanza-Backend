import SalidaEntradaRegistro from '../models/SalidaEntradaRegistro.js';
import { crearControladorFilas } from '../utils/crud-filas.js';

const controlador = crearControladorFilas({
  modelo: SalidaEntradaRegistro,
  codigoTipo: 'SALIDAS',
  nombreRecurso: 'Salida/entrada',
  camposPermitidos: [
    'nombre_nino',
    'nombre_acompanante',
    'ci_acompanante',
    'celular_acompanante',
    'fecha_ingreso',
    'fecha_salida'
  ]
});

export const { getFilas, crearFila, actualizarFila, eliminarFila } = controlador;

export default controlador;

import TicketTransporteRegistro from '../models/TicketTransporteRegistro.js';
import { crearControladorFilas } from '../utils/crud-filas.js';

const controlador = crearControladorFilas({
  modelo: TicketTransporteRegistro,
  codigoTipo: 'TICKETS',
  nombreRecurso: 'Ticket de transporte',
  camposPermitidos: [
    'fecha_ticket',
    'nombre_solicitante',
    'nro_ticket',
    'ruta',
    'tipo_viaje'
  ]
});

export const { getFilas, crearFila, actualizarFila, eliminarFila } = controlador;

export default controlador;

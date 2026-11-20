// Error esperado por una regla de negocio (stock insuficiente, referencia inexistente, etc.).
// Se lanza dentro de una transaccion para revertirla y lo traduce responderError a su codigo HTTP.
export class ErrorNegocio extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.estado = estado;
  }
}

export default ErrorNegocio;

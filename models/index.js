import { sequelize } from '../config/database.js';
import Usuario from './Usuario.js';
import TipoDocumento from './TipoDocumento.js';
import Documento from './Documento.js';
import FichaSocialDatos from './FichaSocialDatos.js';
import FichaSocialGrupoFamiliar from './FichaSocialGrupoFamiliar.js';
import ReferenciaSocialDatos from './ReferenciaSocialDatos.js';
import AlmuerzoRegistro from './AlmuerzoRegistro.js';
import SalidaEntradaRegistro from './SalidaEntradaRegistro.js';
import TicketTransporteRegistro from './TicketTransporteRegistro.js';
import Proveedor from './Proveedor.js';
import InventarioAlmacenProducto from './InventarioAlmacenProducto.js';
import InventarioAlmacenLote from './InventarioAlmacenLote.js';
import IngresoAlmacen from './IngresoAlmacen.js';
import DetalleIngresoAlmacen from './DetalleIngresoAlmacen.js';
import SalidaAlmacen from './SalidaAlmacen.js';
import DetalleSalidaAlmacen from './DetalleSalidaAlmacen.js';
import Receta from './Receta.js';
import RecetaInsumo from './RecetaInsumo.js';

TipoDocumento.hasMany(Documento, {
  foreignKey: 'tipos_documentos_id',
  as: 'documentos'
});

Documento.belongsTo(TipoDocumento, {
  foreignKey: 'tipos_documentos_id',
  as: 'tipoDocumento'
});

Usuario.hasMany(Documento, {
  foreignKey: 'usuario_registro_id',
  as: 'documentosRegistrados'
});

Documento.belongsTo(Usuario, {
  foreignKey: 'usuario_registro_id',
  as: 'usuarioRegistro'
});

Usuario.hasMany(Documento, {
  foreignKey: 'usuario_validacion_id',
  as: 'documentosValidados'
});

Documento.belongsTo(Usuario, {
  foreignKey: 'usuario_validacion_id',
  as: 'usuarioValidacion'
});

Documento.hasOne(FichaSocialDatos, {
  foreignKey: 'documento_id',
  as: 'fichaSocial',
  onDelete: 'CASCADE'
});

FichaSocialDatos.belongsTo(Documento, {
  foreignKey: 'documento_id',
  as: 'documento'
});

FichaSocialDatos.hasMany(FichaSocialGrupoFamiliar, {
  foreignKey: 'ficha_social_id',
  as: 'grupoFamiliar',
  onDelete: 'CASCADE'
});

FichaSocialGrupoFamiliar.belongsTo(FichaSocialDatos, {
  foreignKey: 'ficha_social_id',
  as: 'fichaSocial'
});

Documento.hasOne(ReferenciaSocialDatos, {
  foreignKey: 'documento_id',
  as: 'referenciaSocial',
  onDelete: 'CASCADE'
});

ReferenciaSocialDatos.belongsTo(Documento, {
  foreignKey: 'documento_id',
  as: 'documento'
});

Documento.hasMany(AlmuerzoRegistro, {
  foreignKey: 'documento_id',
  as: 'almuerzos',
  onDelete: 'CASCADE'
});

AlmuerzoRegistro.belongsTo(Documento, {
  foreignKey: 'documento_id',
  as: 'documento'
});

Documento.hasMany(SalidaEntradaRegistro, {
  foreignKey: 'documento_id',
  as: 'salidasEntradas',
  onDelete: 'CASCADE'
});

SalidaEntradaRegistro.belongsTo(Documento, {
  foreignKey: 'documento_id',
  as: 'documento'
});

Documento.hasMany(TicketTransporteRegistro, {
  foreignKey: 'documento_id',
  as: 'ticketsTransporte'
});

TicketTransporteRegistro.belongsTo(Documento, {
  foreignKey: 'documento_id',
  as: 'documento'
});

InventarioAlmacenProducto.hasMany(InventarioAlmacenLote, {
  foreignKey: 'producto_id',
  as: 'lotes'
});

InventarioAlmacenLote.belongsTo(InventarioAlmacenProducto, {
  foreignKey: 'producto_id',
  as: 'producto'
});

Proveedor.hasMany(IngresoAlmacen, {
  foreignKey: 'proveedor_id',
  as: 'ingresos'
});

IngresoAlmacen.belongsTo(Proveedor, {
  foreignKey: 'proveedor_id',
  as: 'proveedor'
});

IngresoAlmacen.belongsTo(Usuario, {
  foreignKey: 'usuario_recibe',
  as: 'recibidoPor'
});

IngresoAlmacen.hasMany(DetalleIngresoAlmacen, {
  foreignKey: 'ingreso_almacen_id',
  as: 'detalles'
});

DetalleIngresoAlmacen.belongsTo(IngresoAlmacen, {
  foreignKey: 'ingreso_almacen_id',
  as: 'ingreso'
});

InventarioAlmacenLote.hasMany(DetalleIngresoAlmacen, {
  foreignKey: 'inventario_almacen_lote_id',
  as: 'detallesIngreso'
});

DetalleIngresoAlmacen.belongsTo(InventarioAlmacenLote, {
  foreignKey: 'inventario_almacen_lote_id',
  as: 'lote'
});

SalidaAlmacen.belongsTo(Usuario, {
  foreignKey: 'usuario_id_despacha',
  as: 'despachadoPor'
});

SalidaAlmacen.hasMany(DetalleSalidaAlmacen, {
  foreignKey: 'salida_almacen_id',
  as: 'detalles'
});

DetalleSalidaAlmacen.belongsTo(SalidaAlmacen, {
  foreignKey: 'salida_almacen_id',
  as: 'salida'
});

InventarioAlmacenLote.hasMany(DetalleSalidaAlmacen, {
  foreignKey: 'inventario_almacen_lote_id',
  as: 'detallesSalida'
});

DetalleSalidaAlmacen.belongsTo(InventarioAlmacenLote, {
  foreignKey: 'inventario_almacen_lote_id',
  as: 'lote'
});

InventarioAlmacenProducto.belongsTo(InventarioAlmacenProducto, {
  foreignKey: 'producto_base_id',
  as: 'base'
});

InventarioAlmacenProducto.hasMany(InventarioAlmacenProducto, {
  foreignKey: 'producto_base_id',
  as: 'presentaciones'
});

Receta.hasMany(RecetaInsumo, {
  foreignKey: 'receta_id',
  as: 'insumos'
});

RecetaInsumo.belongsTo(Receta, {
  foreignKey: 'receta_id',
  as: 'receta'
});

RecetaInsumo.belongsTo(InventarioAlmacenProducto, {
  foreignKey: 'insumo_id',
  as: 'producto'
});

export {
  sequelize,
  Usuario,
  TipoDocumento,
  Documento,
  FichaSocialDatos,
  FichaSocialGrupoFamiliar,
  ReferenciaSocialDatos,
  AlmuerzoRegistro,
  SalidaEntradaRegistro,
  TicketTransporteRegistro,
  Proveedor,
  InventarioAlmacenProducto,
  InventarioAlmacenLote,
  IngresoAlmacen,
  DetalleIngresoAlmacen,
  SalidaAlmacen,
  DetalleSalidaAlmacen,
  Receta,
  RecetaInsumo
};

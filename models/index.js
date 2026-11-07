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
  TicketTransporteRegistro
};

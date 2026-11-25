-- Productos de EJEMPLO para probar T-17 (design.md 11). Correr DESPUES de migracion_t17_2026-11-25.sql.
-- Los precios (USD por presentacion) son APROXIMADOS: corregirlos antes de usar datos reales.
-- Idempotente: no duplica por codigo. Ajusta contenido neto, precio y medida casera de ser necesario.

BEGIN;

INSERT INTO inventario_almacen_producto
    (codigo, nombre, tipo_envase, unidad_medida, contenido_neto_referencia, precio_referencia_usd)
VALUES
    -- Bases (una por insumo)
    ('ARR-GR', 'Arroz a granel',   'granel',  'kg',    1,    1.15),
    ('AZU-GR', 'Azucar a granel',  'granel',  'kg',    1,    1.00),
    ('ACE-GR', 'Aceite a granel',  'granel',  'L',     1,    2.20),
    ('SAL-GR', 'Sal a granel',     'granel',  'kg',    1,    0.40),
    ('POL-PR', 'Pollo (presa)',    'presa',   'presa', 1,    0.35),
    -- Presentaciones
    ('ARR-QQ', 'Arroz quintal',          'quintal', 'kg',    46,   50.00),
    ('ARR-B1', 'Arroz bolsa 1 kg',       'bolsa',   'kg',    1,    1.30),
    ('AZU-B1', 'Azucar bolsa 1 kg',      'bolsa',   'kg',    1,    1.10),
    ('ACE-BI', 'Aceite bidon 5 L',       'bidon',   'L',     5,    11.00),
    ('POL-KG', 'Pollo por kilo',         'kilo',    'presa', 4,    1.40),
    ('POL-EN', 'Pollo entero',           'unidad',  'presa', 10,   3.50)
ON CONFLICT (codigo) DO NOTHING;

-- Enlazar presentaciones con su base
UPDATE inventario_almacen_producto p
SET producto_base_id = b.id
FROM inventario_almacen_producto b
WHERE (p.codigo, b.codigo) IN (
    ('ARR-QQ', 'ARR-GR'),
    ('ARR-B1', 'ARR-GR'),
    ('AZU-B1', 'AZU-GR'),
    ('ACE-BI', 'ACE-GR'),
    ('POL-KG', 'POL-PR'),
    ('POL-EN', 'POL-PR')
)
AND p.producto_base_id IS NULL;

-- Medida casera (jarra) en las bases
UPDATE inventario_almacen_producto
SET medida_casera_nombre = 'jarra', medida_casera_cantidad = 0.51
WHERE codigo = 'ARR-GR' AND medida_casera_nombre IS NULL;

UPDATE inventario_almacen_producto
SET medida_casera_nombre = 'jarra', medida_casera_cantidad = 0.56
WHERE codigo = 'AZU-GR' AND medida_casera_nombre IS NULL;

-- Verificacion (solo lectura)
SELECT p.codigo, p.nombre, p.unidad_medida, p.contenido_neto_referencia, b.codigo AS base
FROM inventario_almacen_producto p
LEFT JOIN inventario_almacen_producto b ON b.id = p.producto_base_id
ORDER BY COALESCE(b.codigo, p.codigo), p.producto_base_id NULLS FIRST, p.codigo;

COMMIT;

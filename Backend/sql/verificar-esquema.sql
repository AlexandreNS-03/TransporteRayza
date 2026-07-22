-- ============================================================================
-- Verificación de esquema — ¿le falta alguna migración a esta base de datos?
--
--   mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/verificar-esquema.sql
--
-- No modifica nada. Si todo está al día no devuelve ninguna fila.
-- Cada fila que aparezca es una tabla o columna que el backend necesita y
-- la base no tiene: corre la migración correspondiente (ver README.md).
--
-- Generado desde las entidades JPA. Al agregar campos nuevos, regenerar.
-- ============================================================================

-- 1) Tablas faltantes
SELECT 'TABLA FALTANTE' AS problema, t.tabla AS nombre, '' AS columna FROM (
  SELECT 'auditoria' AS tabla
  UNION ALL   SELECT 'cajas' AS tabla
  UNION ALL   SELECT 'clientes' AS tabla
  UNION ALL   SELECT 'comprobantes' AS tabla
  UNION ALL   SELECT 'embarcacion_asientos' AS tabla
  UNION ALL   SELECT 'embarcacion_tripulantes' AS tabla
  UNION ALL   SELECT 'embarcaciones' AS tabla
  UNION ALL   SELECT 'encomiendas' AS tabla
  UNION ALL   SELECT 'gastos' AS tabla
  UNION ALL   SELECT 'movimientos_caja' AS tabla
  UNION ALL   SELECT 'notificaciones' AS tabla
  UNION ALL   SELECT 'ruta_paradas' AS tabla
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla
  UNION ALL   SELECT 'rutas' AS tabla
  UNION ALL   SELECT 'sucursales' AS tabla
  UNION ALL   SELECT 'usuarios' AS tabla
  UNION ALL   SELECT 'venta_tramos_usados' AS tabla
  UNION ALL   SELECT 'ventas' AS tabla
  UNION ALL   SELECT 'viaje_asiento_tramos_ocupados' AS tabla
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla
  UNION ALL   SELECT 'viaje_paradas' AS tabla
  UNION ALL   SELECT 'viajes' AS tabla
) t LEFT JOIN information_schema.tables i
  ON i.table_schema = DATABASE() AND i.table_name = t.tabla
WHERE i.table_name IS NULL

UNION ALL

-- 2) Columnas faltantes
SELECT 'COLUMNA FALTANTE', c.tabla, c.col FROM (
  SELECT 'auditoria' AS tabla, 'accion' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'descripcion' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'id' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'ip_origen' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'modulo' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'referencia_id' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'usuario_id' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'usuario_rol' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'cerrada_at' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'diferencia' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'fecha_apertura' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'hora_apertura' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'monto_cierre' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'monto_inicial' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'observacion_apertura' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'observacion_cierre' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'sucursal_id' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'sucursal_nombre' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'total_anulaciones' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'total_neto' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'total_ventas' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'usuario_id' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'usuario_rol' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'apellidos' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'codigo_pais_telefono' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'email' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'fecha_nacimiento' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'id' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'nombres' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'numero_documento' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'pais_documento' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'password' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'telefono' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'tipo_documento' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'ultimo_login' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'anulado_at' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'cliente_denominacion' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'cliente_direccion' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'cliente_email' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'cliente_numero_de_documento' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'cliente_tipo_de_documento' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'descripcion' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'encomienda_id' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'enlace_pdf' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'fecha_de_emision' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'id' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'moneda' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'motivo_anulacion' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'numero' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'porcentaje_de_igv' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'ref_numero' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'ref_serie' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'respuesta_nubefact' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'serie' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'tipo_de_comprobante' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'total' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'total_exonerada' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'total_igv' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'comprobantes' AS tabla, 'venta_id' AS col
  UNION ALL   SELECT 'embarcacion_asientos' AS tabla, 'embarcacion_id' AS col
  UNION ALL   SELECT 'embarcacion_asientos' AS tabla, 'id' AS col
  UNION ALL   SELECT 'embarcacion_asientos' AS tabla, 'numero' AS col
  UNION ALL   SELECT 'embarcacion_asientos' AS tabla, 'tipo' AS col
  UNION ALL   SELECT 'embarcacion_tripulantes' AS tabla, 'cargo' AS col
  UNION ALL   SELECT 'embarcacion_tripulantes' AS tabla, 'embarcacion_id' AS col
  UNION ALL   SELECT 'embarcacion_tripulantes' AS tabla, 'id' AS col
  UNION ALL   SELECT 'embarcacion_tripulantes' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'cantidad_normal' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'cantidad_vip' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'capacidad_total' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'capitan' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'codigo' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'id' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'embarcaciones' AS tabla, 'vip_posicion' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'codigo_encomienda' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'descripcion' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'destinatario_documento' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'destinatario_nombre' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'destinatario_telefono' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'fecha_registro' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'observacion' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'peso' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'precio' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'remitente_documento' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'remitente_nombre' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'remitente_telefono' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'sucursal_destino_id' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'sucursal_destino_nombre' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'sucursal_origen_id' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'sucursal_origen_nombre' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'usuario_id' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'viaje_descripcion' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'viaje_id' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'categoria' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'descripcion' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'fecha' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'id' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'monto' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'observacion' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'responsable_id' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'responsable_nombre' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'sucursal_id' AS col
  UNION ALL   SELECT 'gastos' AS tabla, 'sucursal_nombre' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'caja_id' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'fecha' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'hora' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'id' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'monto' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'motivo' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'observacion' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'sucursal_id' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'sucursal_nombre' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'tipo' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'usuario_id' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'id' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'leido' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'leido_at' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'mensaje' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'modulo' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'referencia_id' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'sucursal_destino_id' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'tipo' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'titulo' AS col
  UNION ALL   SELECT 'notificaciones' AS tabla, 'usuario_destino_id' AS col
  UNION ALL   SELECT 'ruta_paradas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'ruta_paradas' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'ruta_paradas' AS tabla, 'orden' AS col
  UNION ALL   SELECT 'ruta_paradas' AS tabla, 'ruta_id' AS col
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla, 'destino_tramo' AS col
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla, 'id' AS col
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla, 'orden_destino' AS col
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla, 'orden_origen' AS col
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla, 'origen_tramo' AS col
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla, 'precio_normal' AS col
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla, 'precio_vip' AS col
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla, 'ruta_id' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'destino' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'duracion_aproximada' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'origen' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'precio_normal' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'precio_vip' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'sucursal_administradora_id' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'sucursal_administradora_nombre' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'ciudad' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'direccion' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'id' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'telefono' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'email' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'id' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'password' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'rol' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'sucursal_id' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'sucursal_nombre' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'ultimo_login' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'username' AS col
  UNION ALL   SELECT 'venta_tramos_usados' AS tabla, 'id' AS col
  UNION ALL   SELECT 'venta_tramos_usados' AS tabla, 'tramo' AS col
  UNION ALL   SELECT 'venta_tramos_usados' AS tabla, 'venta_id' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'anulada_at' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'asiento_numero' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'asiento_tipo' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'canal' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_documento' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_email' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_id' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_nombre' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_tipo_doc' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'codigo_qr' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'culqi_charge_id' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'detalle_comprobante' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'edad' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'embarcado_at' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'embarcado_por' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'embarque_estado' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'fecha_venta' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'numero_comprobante' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'observacion' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'orden_destino' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'orden_origen' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'parada_destino' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'parada_origen' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'pasajero_documento' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'pasajero_nombre' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'pasajero_telefono' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'precio' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'procedencia' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'reserva_expira' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'serie_comprobante' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'sexo' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'tipo_comprobante' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'tipo_documento' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'usuario_id' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'viaje_codigo' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'viaje_descripcion' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'viaje_id' AS col
  UNION ALL   SELECT 'viaje_asiento_tramos_ocupados' AS tabla, 'id' AS col
  UNION ALL   SELECT 'viaje_asiento_tramos_ocupados' AS tabla, 'tramo' AS col
  UNION ALL   SELECT 'viaje_asiento_tramos_ocupados' AS tabla, 'viaje_asiento_estado_id' AS col
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla, 'id' AS col
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla, 'numero' AS col
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla, 'pasajero_doc' AS col
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla, 'pasajero_nombre' AS col
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla, 'pasajero_tel' AS col
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla, 'tipo' AS col
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla, 'venta_id' AS col
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla, 'viaje_id' AS col
  UNION ALL   SELECT 'viaje_paradas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'viaje_paradas' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'viaje_paradas' AS tabla, 'orden' AS col
  UNION ALL   SELECT 'viaje_paradas' AS tabla, 'viaje_id' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'codigo_viaje' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'destino' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'embarcacion_id' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'embarcacion_nombre' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'fecha_salida' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'hora_salida' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'id' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'origen' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'precio_normal' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'precio_vip' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'ruta_id' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'ruta_nombre' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'sucursal_id' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'sucursal_nombre' AS col
) c
JOIN information_schema.tables it
  ON it.table_schema = DATABASE() AND it.table_name = c.tabla
LEFT JOIN information_schema.columns ic
  ON ic.table_schema = DATABASE() AND ic.table_name = c.tabla AND ic.column_name = c.col
WHERE ic.column_name IS NULL;


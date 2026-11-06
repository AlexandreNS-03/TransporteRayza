-- ============================================================================
-- Verificación de esquema — ¿le falta alguna migración a esta base de datos?
--
--   mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/verificar-esquema.sql
--
-- No modifica nada. Si todo está al día no devuelve ninguna fila.
-- Cada fila que aparezca es una tabla o columna que el backend necesita y la
-- base no tiene: corre la migración correspondiente (ver README.md).
--
-- NO SE EDITA A MANO. Se regenera con:
--
--   node Backend/sql/regenerar-verificador.mjs
--
-- y eso va en el mismo PR que la migración. Escrito a mano quedó un año sin
-- tocar mientras entraban seis migraciones, contestando "todo al día" sobre una
-- base a la que le faltaban columnas.
--
-- Generado el 2026-11-06 desde 41 entidades.
-- ============================================================================

-- 1) Tablas faltantes
SELECT 'TABLA FALTANTE' AS problema, t.tabla AS nombre, '' AS columna FROM (
  SELECT 'acompanantes_frecuentes' AS tabla
  UNION ALL   SELECT 'anuncios' AS tabla
  UNION ALL   SELECT 'auditoria' AS tabla
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla
  UNION ALL   SELECT 'cajas' AS tabla
  UNION ALL   SELECT 'clientes' AS tabla
  UNION ALL   SELECT 'codigos_verificacion' AS tabla
  UNION ALL   SELECT 'comprobantes' AS tabla
  UNION ALL   SELECT 'cupones_sorteo' AS tabla
  UNION ALL   SELECT 'documentos_viaje' AS tabla
  UNION ALL   SELECT 'embarcacion_asientos' AS tabla
  UNION ALL   SELECT 'embarcacion_tripulantes' AS tabla
  UNION ALL   SELECT 'embarcaciones' AS tabla
  UNION ALL   SELECT 'encomiendas' AS tabla
  UNION ALL   SELECT 'gastos' AS tabla
  UNION ALL   SELECT 'intentos_login' AS tabla
  UNION ALL   SELECT 'movimientos_caja' AS tabla
  UNION ALL   SELECT 'notificaciones' AS tabla
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla
  UNION ALL   SELECT 'premios_sorteo' AS tabla
  UNION ALL   SELECT 'recargas_wallet' AS tabla
  UNION ALL   SELECT 'reclamacion_adjuntos' AS tabla
  UNION ALL   SELECT 'reclamaciones' AS tabla
  UNION ALL   SELECT 'ruta_paradas' AS tabla
  UNION ALL   SELECT 'ruta_tarifas_tramo' AS tabla
  UNION ALL   SELECT 'ruta_tramos_bloqueados' AS tabla
  UNION ALL   SELECT 'rutas' AS tabla
  UNION ALL   SELECT 'saldo_movimientos' AS tabla
  UNION ALL   SELECT 'sorteos' AS tabla
  UNION ALL   SELECT 'sucursales' AS tabla
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla
  UNION ALL   SELECT 'tokens_recuperacion' AS tabla
  UNION ALL   SELECT 'usuarios' AS tabla
  UNION ALL   SELECT 'venta_tramos_usados' AS tabla
  UNION ALL   SELECT 'ventas' AS tabla
  UNION ALL   SELECT 'verificaciones_celular' AS tabla
  UNION ALL   SELECT 'verificaciones_email' AS tabla
  UNION ALL   SELECT 'viaje_asiento_tramos_ocupados' AS tabla
  UNION ALL   SELECT 'viaje_asientos_estado' AS tabla
  UNION ALL   SELECT 'viaje_paradas' AS tabla
  UNION ALL   SELECT 'viajes' AS tabla
) t
LEFT JOIN information_schema.tables it
  ON it.table_schema = DATABASE() AND it.table_name = t.tabla
WHERE it.table_name IS NULL

UNION ALL

-- 2) Columnas faltantes
--    Solo mira tablas que existen: si falta la tabla entera ya la nombró el
--    bloque de arriba, y repetir sus treinta columnas tapa lo demás.
SELECT 'COLUMNA FALTANTE', c.tabla, c.col FROM (
  SELECT 'acompanantes_frecuentes' AS tabla, 'cliente_id' AS col
  UNION ALL   SELECT 'acompanantes_frecuentes' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'acompanantes_frecuentes' AS tabla, 'fecha_nacimiento' AS col
  UNION ALL   SELECT 'acompanantes_frecuentes' AS tabla, 'id' AS col
  UNION ALL   SELECT 'acompanantes_frecuentes' AS tabla, 'nombre_completo' AS col
  UNION ALL   SELECT 'acompanantes_frecuentes' AS tabla, 'numero_documento' AS col
  UNION ALL   SELECT 'acompanantes_frecuentes' AS tabla, 'sexo' AS col
  UNION ALL   SELECT 'acompanantes_frecuentes' AS tabla, 'telefono' AS col
  UNION ALL   SELECT 'acompanantes_frecuentes' AS tabla, 'tipo_documento' AS col
  UNION ALL   SELECT 'acompanantes_frecuentes' AS tabla, 'updated_at' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'fecha_fin' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'fecha_inicio' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'id' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'mensaje' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'texto_enlace' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'tipo' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'titulo' AS col
  UNION ALL   SELECT 'anuncios' AS tabla, 'url_enlace' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'accion' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'descripcion' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'id' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'ip_origen' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'modulo' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'referencia_id' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'usuario_id' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'auditoria' AS tabla, 'usuario_rol' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'autorizado_at' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'celular_final' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'cliente_email' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'cliente_nombre' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'id' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'motivo_baja' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'referencia_externa' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'revocado_at' AS col
  UNION ALL   SELECT 'autorizaciones_yape' AS tabla, 'token' AS col
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
  UNION ALL   SELECT 'cajas' AS tabla, 'total_digital' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'total_efectivo' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'total_neto' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'total_ventas' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'usuario_id' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'cajas' AS tabla, 'usuario_rol' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'apellidos' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'codigo_pais_telefono' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'codigo_pasajero' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'email' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'email_verificado_at' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'emergencia_apellidos' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'emergencia_codigo_pais' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'emergencia_nombres' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'emergencia_relacion' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'emergencia_telefono' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'fecha_nacimiento' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'genero' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'id' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'nacionalidad' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'nombres' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'numero_documento' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'pais_documento' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'password' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'sesiones_desde' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'telefono' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'telefono_verificado_at' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'tipo_documento' AS col
  UNION ALL   SELECT 'clientes' AS tabla, 'ultimo_login' AS col
  UNION ALL   SELECT 'codigos_verificacion' AS tabla, 'codigo_hash' AS col
  UNION ALL   SELECT 'codigos_verificacion' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'codigos_verificacion' AS tabla, 'expira_at' AS col
  UNION ALL   SELECT 'codigos_verificacion' AS tabla, 'id' AS col
  UNION ALL   SELECT 'codigos_verificacion' AS tabla, 'intentos' AS col
  UNION ALL   SELECT 'codigos_verificacion' AS tabla, 'usado_at' AS col
  UNION ALL   SELECT 'codigos_verificacion' AS tabla, 'usuario_id' AS col
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
  UNION ALL   SELECT 'comprobantes' AS tabla, 'grupo_venta_id' AS col
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
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'codigo' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'email' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'id' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'pasajero_documento' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'pasajero_nombre' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'peso' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'registrado_at' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'sorteo_id' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'telefono' AS col
  UNION ALL   SELECT 'cupones_sorteo' AS tabla, 'venta_id' AS col
  UNION ALL   SELECT 'documentos_viaje' AS tabla, 'cliente_id' AS col
  UNION ALL   SELECT 'documentos_viaje' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'documentos_viaje' AS tabla, 'fecha_expiracion' AS col
  UNION ALL   SELECT 'documentos_viaje' AS tabla, 'id' AS col
  UNION ALL   SELECT 'documentos_viaje' AS tabla, 'numero' AS col
  UNION ALL   SELECT 'documentos_viaje' AS tabla, 'pais_emision' AS col
  UNION ALL   SELECT 'documentos_viaje' AS tabla, 'tipo' AS col
  UNION ALL   SELECT 'documentos_viaje' AS tabla, 'updated_at' AS col
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
  UNION ALL   SELECT 'encomiendas' AS tabla, 'clave_seguridad' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'codigo_encomienda' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'descripcion' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'destinatario_documento' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'destinatario_nombre' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'destinatario_telefono' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'entregado_at' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'estado_pago' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'fecha_registro' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'observacion' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'orden_destino' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'orden_origen' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'parada_destino' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'parada_origen' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'pasarela_referencia' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'peso' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'precio' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'receptor_documento' AS col
  UNION ALL   SELECT 'encomiendas' AS tabla, 'receptor_nombre' AS col
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
  UNION ALL   SELECT 'intentos_login' AS tabla, 'bloqueado_hasta' AS col
  UNION ALL   SELECT 'intentos_login' AS tabla, 'bloqueos' AS col
  UNION ALL   SELECT 'intentos_login' AS tabla, 'fallos' AS col
  UNION ALL   SELECT 'intentos_login' AS tabla, 'llave' AS col
  UNION ALL   SELECT 'intentos_login' AS tabla, 'ultimo_fallo' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'caja_id' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'fecha' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'hora' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'id' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'metodo_pago' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'monto' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'motivo' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'observacion' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'sucursal_id' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'sucursal_nombre' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'tipo' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'usuario_id' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'movimientos_caja' AS tabla, 'venta_id' AS col
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
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'cliente_id' AS col
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'info_sms' AS col
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'info_whatsapp' AS col
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'promo_aceptado_at' AS col
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'promo_email' AS col
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'promo_origen' AS col
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'promo_revocado_at' AS col
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'promo_sms' AS col
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'promo_whatsapp' AS col
  UNION ALL   SELECT 'preferencias_notificacion' AS tabla, 'updated_at' AS col
  UNION ALL   SELECT 'premios_sorteo' AS tabla, 'cupon_ganador_id' AS col
  UNION ALL   SELECT 'premios_sorteo' AS tabla, 'descripcion' AS col
  UNION ALL   SELECT 'premios_sorteo' AS tabla, 'id' AS col
  UNION ALL   SELECT 'premios_sorteo' AS tabla, 'orden' AS col
  UNION ALL   SELECT 'premios_sorteo' AS tabla, 'sorteado_at' AS col
  UNION ALL   SELECT 'premios_sorteo' AS tabla, 'sorteado_por' AS col
  UNION ALL   SELECT 'premios_sorteo' AS tabla, 'sorteo_id' AS col
  UNION ALL   SELECT 'premios_sorteo' AS tabla, 'valor' AS col
  UNION ALL   SELECT 'recargas_wallet' AS tabla, 'cliente_email' AS col
  UNION ALL   SELECT 'recargas_wallet' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'recargas_wallet' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'recargas_wallet' AS tabla, 'id' AS col
  UNION ALL   SELECT 'recargas_wallet' AS tabla, 'monto' AS col
  UNION ALL   SELECT 'recargas_wallet' AS tabla, 'motivo_falla' AS col
  UNION ALL   SELECT 'recargas_wallet' AS tabla, 'pagada_at' AS col
  UNION ALL   SELECT 'recargas_wallet' AS tabla, 'referencia_pasarela' AS col
  UNION ALL   SELECT 'reclamacion_adjuntos' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'reclamacion_adjuntos' AS tabla, 'reclamacion_id' AS col
  UNION ALL   SELECT 'reclamacion_adjuntos' AS tabla, 'url' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'apoderado_documento' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'apoderado_nombre' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'bien_descripcion' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'bien_tipo' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'consumidor_documento' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'consumidor_domicilio' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'consumidor_email' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'consumidor_nombre' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'consumidor_telefono' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'consumidor_tipo_documento' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'detalle' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'id' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'menor_de_edad' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'monto_reclamado' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'numero' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'pedido' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'respondido_at' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'respondido_por' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'respuesta' AS col
  UNION ALL   SELECT 'reclamaciones' AS tabla, 'tipo' AS col
  UNION ALL   SELECT 'ruta_paradas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'ruta_paradas' AS tabla, 'minutos_desde_salida' AS col
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
  UNION ALL   SELECT 'ruta_tramos_bloqueados' AS tabla, 'destino_tramo' AS col
  UNION ALL   SELECT 'ruta_tramos_bloqueados' AS tabla, 'id' AS col
  UNION ALL   SELECT 'ruta_tramos_bloqueados' AS tabla, 'orden_destino' AS col
  UNION ALL   SELECT 'ruta_tramos_bloqueados' AS tabla, 'orden_origen' AS col
  UNION ALL   SELECT 'ruta_tramos_bloqueados' AS tabla, 'origen_tramo' AS col
  UNION ALL   SELECT 'ruta_tramos_bloqueados' AS tabla, 'ruta_id' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'destino' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'duracion_aproximada' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'oferta_activa' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'oferta_desde' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'oferta_hasta' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'origen' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'precio_normal' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'precio_normal_oferta' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'precio_vip' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'precio_vip_oferta' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'requiere_preembarque' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'sucursal_administradora_id' AS col
  UNION ALL   SELECT 'rutas' AS tabla, 'sucursal_administradora_nombre' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'cliente_documento' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'cliente_email' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'cliente_nombre' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'id' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'monto' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'motivo' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'referencia' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'tipo' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'saldo_movimientos' AS tabla, 'venta_id' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'bases_url' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'cupon_ganador_id' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'cupones_participantes' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'fecha_sorteo' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'id' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'premio' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'premio_valor' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'sorteado_at' AS col
  UNION ALL   SELECT 'sorteos' AS tabla, 'sorteado_por' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'ciudad' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'direccion' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'id' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'sucursales' AS tabla, 'telefono' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'cliente_email' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'marca' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'motivo_baja' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'preferida' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'revocada_at' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'token' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'ultimos4' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'usada_at' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'vence_anio' AS col
  UNION ALL   SELECT 'tarjetas_guardadas' AS tabla, 'vence_mes' AS col
  UNION ALL   SELECT 'tokens_recuperacion' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'tokens_recuperacion' AS tabla, 'cuenta_id' AS col
  UNION ALL   SELECT 'tokens_recuperacion' AS tabla, 'expira_at' AS col
  UNION ALL   SELECT 'tokens_recuperacion' AS tabla, 'id' AS col
  UNION ALL   SELECT 'tokens_recuperacion' AS tabla, 'tipo_cuenta' AS col
  UNION ALL   SELECT 'tokens_recuperacion' AS tabla, 'token_hash' AS col
  UNION ALL   SELECT 'tokens_recuperacion' AS tabla, 'usado_at' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'activo' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'doble_factor' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'email' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'id' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'password' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'rol' AS col
  UNION ALL   SELECT 'usuarios' AS tabla, 'sesiones_desde' AS col
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
  UNION ALL   SELECT 'ventas' AS tabla, 'aviso_pago_enviado' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'canal' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_documento' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_email' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_id' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_nombre' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'cliente_tipo_doc' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'codigo_qr' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'comprobante_unico' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'descuento' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'detalle_comprobante' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'edad' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'embarcado_at' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'embarcado_por' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'embarque_estado' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'fecha_venta' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'grupo_venta_id' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'id' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'lugar_pago' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'metodo_pago' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'numero_comprobante' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'observacion' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'orden_destino' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'orden_origen' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'orden_pago' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'parada_destino' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'parada_origen' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'pasajero_documento' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'pasajero_nombre' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'pasajero_telefono' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'pasarela_referencia' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'precio' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'precio_original' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'preembarcado_at' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'preembarcado_por' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'preembarque_estado' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'procedencia' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'reserva_expira' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'resolucion' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'serie_comprobante' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'sexo' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'tipo_comprobante' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'tipo_documento' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'usuario_id' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'usuario_nombre' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'viaje_codigo' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'viaje_descripcion' AS col
  UNION ALL   SELECT 'ventas' AS tabla, 'viaje_id' AS col
  UNION ALL   SELECT 'verificaciones_celular' AS tabla, 'canal' AS col
  UNION ALL   SELECT 'verificaciones_celular' AS tabla, 'cliente_id' AS col
  UNION ALL   SELECT 'verificaciones_celular' AS tabla, 'codigo_hash' AS col
  UNION ALL   SELECT 'verificaciones_celular' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'verificaciones_celular' AS tabla, 'expira_at' AS col
  UNION ALL   SELECT 'verificaciones_celular' AS tabla, 'id' AS col
  UNION ALL   SELECT 'verificaciones_celular' AS tabla, 'intentos' AS col
  UNION ALL   SELECT 'verificaciones_celular' AS tabla, 'telefono' AS col
  UNION ALL   SELECT 'verificaciones_celular' AS tabla, 'usado_at' AS col
  UNION ALL   SELECT 'verificaciones_email' AS tabla, 'cliente_id' AS col
  UNION ALL   SELECT 'verificaciones_email' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'verificaciones_email' AS tabla, 'email' AS col
  UNION ALL   SELECT 'verificaciones_email' AS tabla, 'expira_at' AS col
  UNION ALL   SELECT 'verificaciones_email' AS tabla, 'id' AS col
  UNION ALL   SELECT 'verificaciones_email' AS tabla, 'token_hash' AS col
  UNION ALL   SELECT 'verificaciones_email' AS tabla, 'usado_at' AS col
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
  UNION ALL   SELECT 'viaje_paradas' AS tabla, 'minutos_desde_salida' AS col
  UNION ALL   SELECT 'viaje_paradas' AS tabla, 'nombre' AS col
  UNION ALL   SELECT 'viaje_paradas' AS tabla, 'orden' AS col
  UNION ALL   SELECT 'viaje_paradas' AS tabla, 'viaje_id' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'cancelado_at' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'codigo_viaje' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'created_at' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'destino' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'embarcacion_id' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'embarcacion_nombre' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'estado' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'fecha_salida' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'hora_salida' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'id' AS col
  UNION ALL   SELECT 'viajes' AS tabla, 'motivo_cancelacion' AS col
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

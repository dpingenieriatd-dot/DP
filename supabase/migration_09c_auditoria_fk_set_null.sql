-- =========================================================================
-- Migración 09c — auditoria.usuario_id no debe bloquear borrar un usuario
--
-- Encontrado probando el borrado de una cuenta de prueba: al no tener
-- ON DELETE SET NULL, la referencia desde auditoria bloqueaba con RESTRICT
-- el borrado del perfil (y por lo tanto de la cuenta de auth) de cualquier
-- persona que alguna vez haya editado un proyecto/compra/parámetro — un
-- registro de auditoría tiene que sobrevivir aunque la persona se vaya del
-- equipo, no impedir que se le borre la cuenta.
-- =========================================================================

alter table auditoria drop constraint if exists auditoria_usuario_id_fkey;
alter table auditoria add constraint auditoria_usuario_id_fkey
  foreign key (usuario_id) references profiles(id) on delete set null;

# Permisos de usuarios LOSERCOL

## Comportamiento implementado

Los permisos guardados en `Usuario.permisos` son la fuente de verdad para el acceso de usuarios normales y administradores. `superadmin` conserva acceso total para evitar que el sistema quede bloqueado.

Cada módulo controla como mínimo `ver`, y cuando corresponde `crear`, `editar`, `eliminar`, `pdf`, `whatsapp`, `cerrar`, `reabrir`, `exportar`, `cambiarPassword` y `cambiarRol`.

El servidor vuelve a comprobar los permisos en cada API. Ocultar un botón o una sección en el navegador no es la protección principal.

## Prueba recomendada

1. Crear un usuario de prueba.
2. Darle `ver` en Clientes, pero dejar `editar` y `eliminar` desmarcados.
3. Cerrar sesión e iniciar con ese usuario.
4. Confirmar que Clientes aparece en el menú.
5. Confirmar que puede consultar clientes.
6. Confirmar que no aparecen las acciones de editar/eliminar.
7. Intentar manualmente `PUT`/`DELETE` sobre `/api/clientes/<id>`: debe responder HTTP 403.
8. Escribir directamente `/clientes`: debe permitir la entrada porque tiene `ver`.
9. Quitar `clientes.ver` desde el usuario administrador.
10. Sin cerrar sesión en el usuario de prueba, volver a `/clientes`: debe aparecer "Acceso no autorizado" porque `/api/me` vuelve a leer los permisos actuales de la base de datos.
11. Quitar `reportes.ver` y comprobar `/reportes`: debe quedar bloqueado.
12. Dar `reportes.ver` pero quitar `reportes.exportar`: Reportes debe abrir, pero la exportación debe estar bloqueada por el servidor.
13. Dar `usuarios.ver` sin `usuarios.crear`, `usuarios.editar` ni `usuarios.eliminar`: podrá consultar usuarios, pero no gestionarlos.
14. Para un administrador personalizado, quitar `dashboard.ver`: el Dashboard no debe aparecer ni poder abrirse directamente.

## Cambios de rol

Cambiar el rol ya no reemplaza automáticamente los permisos personalizados enviados previamente. Por ejemplo, un usuario puede conservar un conjunto personalizado después de pasar de operador a admin.

## Base de datos

No se agrega una nueva tabla de permisos. Se utiliza el campo existente `Usuario.permisos` definido en Prisma. El proyecto ya contiene la migración `20260718234500_add_missing_security_columns` que agrega este campo cuando la base de datos aún no lo tiene.

## Verificación local

```bash
npm install
npx prisma generate
npm run lint
npm run build
```

Si el proyecto ya tiene `node_modules`, ejecutar además:

```bash
npx tsc --noEmit
```

# PLAYFORJA
Página web oficial de PLAYFORJA


## Backend real de PLAYFORJA (Supabase)

La rama `feature/supabase-auth-foundation` conecta la interfaz estática con el proyecto Supabase `gojtxyzlqueeaspynppr`.

### Funciones disponibles

- Auth: registro e inicio de sesión por correo y contraseña, sesión persistente y cierre de sesión.
- Perfil: saldo PF y XP guardados por usuario; el rango se calcula desde el XP.
- Torneos: inscripciones atómicas, cupos controlados en la base y prevención de inscripciones duplicadas.
- Salas: membresías persistentes y cupos controlados en la base.
- Marcos: compra atómica, saldo PF validado en servidor, propiedad persistente y transacción de billetera.
- Misiones: pestañas diarias/semanales/temporada, activación, progreso por eventos verificados y reclamo único con acreditación de XP/PF.
- Seguridad: RLS activado en las tablas. Las operaciones de premio y cupo se realizan mediante funciones SQL con permisos limitados.

### Eventos de juego verificados

La interfaz web **no puede inventar victorias, eliminaciones ni tiempo jugado**. El servidor que administra las partidas debe enviar los resultados a esta función:

`POST https://gojtxyzlqueeaspynppr.supabase.co/functions/v1/ingest-verified-event`

Ejemplo desde un backend confiable (nunca desde JavaScript del navegador):

```http
POST /functions/v1/ingest-verified-event
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json

{
  "user_id": "<AUTH_USER_UUID>",
  "event_type": "win",
  "amount": 1,
  "external_event_id": "<UNIQUE_MATCH_EVENT_ID>"
}
```

Tipos aceptados: `win`, `elimination`, `team_minute`, `room_game`, `tournament_join`, `night_game`, `tournament_top3`, `rank_up`. El identificador externo debe ser único e idempotente para que un resultado no se contabilice dos veces.

**Seguridad crítica:** `SUPABASE_SERVICE_ROLE_KEY` solo puede existir en el backend confiable o en secretos del servidor. Nunca se agrega a `index.html`, `auth.js`, archivos públicos, GitHub Pages ni apps cliente. La clave publicable del cliente no permite enviar eventos verificados ni modificar directamente saldo, XP, compras o progreso.

### Puesta en marcha y límites conocidos

1. Configurar en Supabase Auth los redirect URLs del dominio de producción y de desarrollo.
2. Probar registro, confirmación de correo, login, logout, cupos y compras con cuentas de prueba.
3. Conectar el backend real de cada juego/partida al endpoint de eventos verificados. Hasta entonces, el progreso de misiones queda correctamente bloqueado y no se falsifica desde el cliente.
4. GitHub Pages sirve archivos estáticos: las operaciones de datos están protegidas por Auth/RLS, pero una página estática no puede ocultar sus propios archivos ni implementar protección SSR de rutas. Las vistas privadas deben seguir comprobando la sesión y los datos sensibles siempre deben pasar por RLS/funciones de servidor.
5. No hay todavía un APK/instalador ni un enlace de descarga real configurado. No mostrar una descarga ficticia.



## Aplicación instalable (PWA)

- Manifiesto web, icono SVG y service worker para cachear el shell estático.
- En navegadores compatibles y bajo HTTPS, Android y desktop pueden ofrecer Instalar PLAYFORJA.
- La PWA no es un APK nativo: las funciones que requieren Supabase necesitan conexión. No se declara soporte offline para cuentas, compras, torneos o misiones.
- El catálogo de GitHub Releases sigue disponible, pero todavía no hay un APK/instalador publicado.

## Seguridad adicional

- Se retiró el permiso SQL de UPDATE sobre profiles para anon y authenticated. El saldo PF y XP solo se modifican mediante operaciones de servidor autorizadas.
- Los contadores públicos de torneos/salas son agregados de solo lectura. Las funciones transaccionales requieren sesión y validan al usuario.
- Los eventos de juego siguen reservados al backend confiable; la clave de servicio nunca se expone al navegador.

## Calidad y documentos

- GitHub Actions valida sintaxis JavaScript, JSON del manifiesto y puntos esenciales de la PWA.
- Se agregaron páginas iniciales de privacidad, términos y soporte. Son borradores: antes del lanzamiento público deben completarse datos del responsable, contacto privado, retención y revisión legal.

- Migraciones aplicadas y versionadas para las correcciones recientes: `20261116182546_lock_profile_economy_fields` y `20261116182900_use_current_jwt_role_claim_for_game_events`.

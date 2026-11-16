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
5. La página no ofrece APK ni instalador; solo informa que la aplicación llegará próximamente.



## Entrega exclusivamente web

- PLAYFORJA se entrega como sitio web estático en GitHub Pages.
- No se genera APK, proyecto Android, Capacitor, PWA instalable ni instalador de escritorio.
- El bloque de descarga informa **La App llega pronto**. Cuando el propietario entregue una aplicación oficial en el futuro, sus instaladores verificados podrán publicarse desde esta misma página.
- La página se adapta a PC, móvil y tablet sin ofrecer instalación de una aplicación inexistente.

## Seguridad adicional

- Se retiró el permiso SQL de UPDATE sobre profiles para anon y authenticated. El saldo PF y XP solo se modifican mediante operaciones de servidor autorizadas.
- Los contadores públicos de torneos/salas son agregados de solo lectura. Las funciones transaccionales requieren sesión y validan al usuario.
- Los eventos de juego siguen reservados al backend confiable; la clave de servicio nunca se expone al navegador.

## Calidad y documentos

- GitHub Actions valida sintaxis JavaScript y comprueba que el repositorio siga siendo exclusivamente web.
- Se agregaron páginas iniciales de privacidad, términos y soporte. Son borradores: antes del lanzamiento público deben completarse datos del responsable, contacto privado, retención y revisión legal.

- Migraciones aplicadas y versionadas para las correcciones recientes: `20261116182546_lock_profile_economy_fields` y `20261116182900_use_current_jwt_role_claim_for_game_events`.

- La política de inserción de evidencias solo permite crear registros propios con `validated = false`; la validación queda reservada a una operación administrativa confiable.

## Datos reales, muestras y límites actuales

- Los torneos y salas sembrados en la base están marcados con `is_demo = true` y la interfaz los identifica como muestras. Los contadores muestran inscripciones/membresías reales en la base (inicialmente cero), no espectadores ni participantes inventados.
- Los marcos y sus precios se cargan desde el catálogo de Supabase y se muestran en PF. Las cifras de XP/PF y rangos del perfil proceden del perfil autenticado.
- La galería solo lista evidencias con `validated = true`. No se crean capturas de ejemplo para aparentar actividad.
- Las temporadas registradas son históricas (Forja Inicial y Llama Eterna); no se declara una temporada activa cuando no existe en la base.
- El globo mundial es una visualización interactiva de referencia: arrastre, zoom, selección de coordenadas y ciudades predefinidas. No representa centros de datos, ping ni partidas regionales.
- Streaming permanece en estado **Próximamente** hasta conectar un proveedor autorizado.
- Las misiones se renuevan usando la fecha y semana de Argentina. Los ciclos de temporada se identifican por la temporada activa; mientras no exista una activa, se muestran como pretemporada de prueba.
- Los eventos de partidas deben llegar desde un backend confiable. La Edge Function acepta `win`, `elimination`, `team_minute`, `room_game`, `night_game`, `tournament_top3`, `rank_up`, `match_complete`, `friend_invite` y `win_no_deaths`. El token service-role solo se configura en el backend de juego, nunca en el navegador.

## Pruebas de navegador

El workflow `PLAYFORJA browser E2E` ejecuta Chromium contra la página local y comprueba carga de datos de muestra, filtros, formulario de acceso y globo interactivo. El caso de inicio de sesión se ejecuta únicamente si existen los secretos de GitHub `PLAYFORJA_E2E_EMAIL` y `PLAYFORJA_E2E_PASSWORD`, correspondientes a una cuenta E2E dedicada. No se deben usar credenciales personales ni una cuenta de producción. Las pruebas de inscripción/compra/reclamo con cuenta real todavía requieren esa cuenta aislada y pruebas controladas.

Las implementaciones privilegiadas (`SECURITY DEFINER`) viven en el esquema no expuesto `private`; los RPC públicos son wrappers `SECURITY INVOKER` con permisos explícitos. Los wrappers de usuario requieren `authenticated`, los eventos verificados solo aceptan `service_role`, y los agregados públicos se sirven desde tablas de conteos sin exponer IDs de usuarios. La tabla `verified_game_events` no concede acceso de tabla a `anon` ni `authenticated`. Tras este cambio, Supabase Security Advisor devuelve **cero hallazgos**. Los contadores públicos son tablas agregadas de solo lectura, con RLS y triggers internos.

## URL temporal y pruebas autenticadas

- URL temporal de GitHub Pages configurada actualmente en el repositorio: `https://matuucrea.github.io/PLAYFORJA/`. La publicación activa sigue saliendo de `main`; el contenido de esta rama no se publica allí mientras el PR siga en borrador.
- El formulario de registro envía el retorno de confirmación a la ruta actual del sitio. En Supabase Auth → URL Configuration falta agregar la URL temporal anterior a Site URL / Redirect URLs permitidas; no se modificó esa configuración del proyecto porque la conexión disponible no ofrece la operación de Auth URL Configuration.
- Para activar la prueba autenticada del workflow, crear una cuenta E2E aislada en Supabase y guardar `PLAYFORJA_E2E_EMAIL` y `PLAYFORJA_E2E_PASSWORD` en GitHub Actions Secrets. No usar cuentas personales ni credenciales de producción.

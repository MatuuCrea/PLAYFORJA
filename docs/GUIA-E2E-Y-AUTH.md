# Guía de prueba E2E y confirmación de correo — PLAYFORJA

Esta guía configura una cuenta técnica aislada para probar autenticación. No uses tu cuenta personal ni una cuenta real de producción con datos o saldo.

## 1. Crear una cuenta E2E dedicada

1. Crea un correo de prueba que controles (idealmente un alias dedicado, por ejemplo `playforja-e2e+<entorno>@tu-dominio`). Debe poder recibir el correo de confirmación.
2. Abre el proyecto Supabase **gojtxyzlqueeaspynppr** → **Authentication** → **Users**.
3. Crea la cuenta E2E con ese correo y una contraseña aleatoria, larga y exclusiva para pruebas. Si la creas desde el formulario público de PLAYFORJA, revisa también el correo de confirmación.
4. Confirma el correo desde el enlace recibido. No desactives globalmente la confirmación de correo en producción.
5. Inicia sesión una vez en PLAYFORJA con esa cuenta para verificar que se creó el perfil. Usa solo datos de prueba; no cargues saldo real ni información personal.
6. Guarda la contraseña en un gestor seguro. No la pegues en el repositorio, issues, PR, chat ni archivos .env versionados.

## 2. Configurar las URLs de Supabase Auth

En Supabase → **Authentication** → **URL Configuration**:

- **Site URL (producción):** `https://matuucrea.github.io/PLAYFORJA/`
- **Redirect URLs adicionales:**
  - `https://matuucrea.github.io/PLAYFORJA/**`
  - `http://127.0.0.1:4173/**`
  - `http://localhost:4173/**`

Guarda los cambios. El formulario actual usa `new URL('./', window.location.href)` como `emailRedirectTo`, por lo que el retorno sigue el origen/ruta desde donde se inició el registro. La vista previa externa de HTML no es el destino de confirmación recomendado; para la prueba E2E local se usa el servidor de Playwright en el puerto 4173.

No cambies la **Site URL** a localhost ni al dominio de la vista previa. La URL de producción anterior corresponde al sitio GitHub Pages del repositorio.

## 3. Guardar los secretos de GitHub Actions

1. Abre el repositorio: https://github.com/MatuuCrea/PLAYFORJA
2. Entra en **Settings → Secrets and variables → Actions**.
3. En **Repository secrets**, pulsa **New repository secret**.
4. Crea estos dos secretos con estos nombres exactos:
   - `PLAYFORJA_E2E_EMAIL` — correo de la cuenta E2E.
   - `PLAYFORJA_E2E_PASSWORD` — contraseña de esa cuenta.
5. No agregues estos valores como variables públicas, no los incluyas en YAML ni los compartas en el PR.

El workflow `PLAYFORJA browser E2E` los inyecta solo como variables de entorno del job. Cuando no están definidos, la prueba autenticada se omite y las pruebas públicas siguen ejecutándose.

## 4. Ejecutar y revisar la prueba

1. Abre **Actions → PLAYFORJA browser E2E**.
2. Selecciona la ejecución más reciente de `feature/supabase-auth-foundation` o usa **Run workflow** sobre esa rama.
3. Abre el job `chromium-e2e` y revisa el paso **Run browser tests**.
4. La prueba de login debe dejar de figurar como omitida cuando ambos secretos sean válidos. Si falla, revisa que el usuario esté confirmado, que la contraseña sea correcta y que las URLs de Auth estén permitidas.
5. No compartas logs que incluyan datos de acceso. GitHub oculta los secretos reconocidos, pero evitá imprimirlos desde el test.

## 5. Alcance de esta cuenta

La cuenta E2E sirve para verificar registro/login y carga de perfil. No demuestra por sí sola que los resultados de partidas sean reales. Los eventos de victorias, eliminaciones y progreso deben provenir del backend confiable del juego; nunca deben simularse desde el navegador.

El streaming permanece **PRÓXIMAMENTE** hasta conectar un proveedor autorizado. No se muestran espectadores ficticios.

## 6. Vista previa del diseño de la rama

Vista previa visual (servicio externo, solo para inspeccionar la rama; no es GitHub Pages publicado):  
https://htmlpreview.github.io/?https://raw.githubusercontent.com/MatuuCrea/PLAYFORJA/feature/supabase-auth-foundation/index.html

La URL oficial de GitHub Pages sigue sirviendo el contenido publicado desde `main`:  
https://matuucrea.github.io/PLAYFORJA/

No se debe fusionar el PR ni cambiar la publicación hasta que el propietario apruebe el diseño.

## 7. Limpieza de los dos APK históricos

Los dos artefactos que deben borrarse desde GitHub Actions son:

- Run **43932782833** — artifact **PLAYFORJA-android-debug-apk**, ID `14258382650`: https://github.com/MatuuCrea/PLAYFORJA/actions/runs/43932782833
- Run **43932339240** — artifact **PLAYFORJA-android-debug-apk**, ID `14258447247`: https://github.com/MatuuCrea/PLAYFORJA/actions/runs/43932339240

Para cada uno:
1. Abre el enlace del run.
2. Baja hasta **Artifacts**.
3. En la fila `PLAYFORJA-android-debug-apk`, abre el menú de tres puntos o el control de eliminar (según la interfaz) y elige **Delete artifact**.
4. Confirma la eliminación.
5. Repite con el otro run.

Esto elimina únicamente el ZIP del APK. **No borra el workflow run, los commits, la rama ni el PR.** No elijas **Delete workflow run** ni borres la rama.

La integración disponible para esta sesión permite consultar los artefactos, pero no ofrece una acción de borrado. Por eso esta eliminación debe completarla el propietario desde la interfaz de GitHub.

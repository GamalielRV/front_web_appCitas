# Super Admin - App de Citas

Panel web en React + Tailwind para administracion global de la plataforma.

## Modulos MVP implementados

1. Categorias de negocio.
2. Sucursales globales.
3. Owners/Admins.
4. Dashboard + reportes (CSV).
5. Auditoria.

## Requisitos

- Node.js 20+
- npm 10+

## Ejecutar en local

```bash
npm install
npm run dev
```

Build de produccion:

```bash
npm run build
```

## Conexion con API

Define la URL base del backend en un archivo `.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_PLATFORM_ADMIN_TOKEN=pega_aqui_un_bearer_jwt
VITE_AWS_S3_REGION=us-east-1
VITE_AUTH_TOKEN_ENDPOINT=/api/v1/auth/platform-token
VITE_AUTH_REFRESH_ENDPOINT=/api/v1/auth/refresh
VITE_AUTH_LOGOUT_ENDPOINT=/api/v1/auth/logout
VITE_PLATFORM_ADMIN_ALLOWED_USERNAME=Gama
```

Cliente base disponible en:

- `src/services/apiClient.js`
- `src/services/platformAdminApi.js`

Importante:

- En frontend solo se leen variables con prefijo `VITE_`.
- Si en backend tienes `AWS_S3_REGION=us-east-1`, en frontend debe ser `VITE_AWS_S3_REGION=us-east-1`.
- El panel ya consume los endpoints `/api/v1/platform/*` con Bearer token.
- Login frontend: autentica contra `/api/v1/auth/platform-token` y guarda `access+refresh`.
- Si expira el access token, el cliente intenta `/api/v1/auth/refresh` y reintenta el request una sola vez.
- Si refresh falla (`invalid_refresh_token`/`token_expired`), se limpia sesion local y vuelve a login.
- Logout usa `/api/v1/auth/logout` para revocar refresh token en backend.

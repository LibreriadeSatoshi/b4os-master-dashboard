# Configuración para Producción - B4OS Challenges

## Pasos para Desplegar en Producción

### 1. Configurar Variables de Entorno

En tu plataforma de despliegue (Vercel, Netlify, etc.), configura estas variables:

```env
NEXTAUTH_URL=https://tu-dominio.com
NEXTAUTH_SECRET=genera-un-secreto-super-seguro-aqui
GITHUB_ID=tu-github-client-id
GITHUB_SECRET=tu-github-client-secret
NODE_ENV=production
```

### 2. Configurar GitHub OAuth App

1. Ve a [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Crea una nueva OAuth App o edita la existente
3. Configura:
   - **Application name**: B4OS Challenges
   - **Homepage URL**: `https://tu-dominio.com`
   - **Authorization callback URL**: `https://tu-dominio.com/api/auth/callback/github`

### 3. Generar NEXTAUTH_SECRET

```bash
# Genera un secreto seguro
openssl rand -base64 32
```

### 4. Verificar Configuración

- ✅ NEXTAUTH_URL apunta a tu dominio de producción
- ✅ GitHub OAuth App configurado con el dominio correcto
- ✅ Variables de entorno configuradas en la plataforma de despliegue
- ✅ HTTPS habilitado (requerido para OAuth)

### 5. Testing en Producción

1. Visita `https://tu-dominio.com/auth/signin`
2. Haz clic en "Continue with GitHub"
3. Autoriza la aplicación
4. Verifica que seas redirigido correctamente

## Troubleshooting

### Error: "Invalid redirect_uri"
- Verifica que la URL de callback en GitHub coincida exactamente con tu dominio
- Asegúrate de que no haya trailing slashes

### Error: "NEXTAUTH_URL not set"
- Verifica que la variable NEXTAUTH_URL esté configurada en tu plataforma de despliegue
- Debe ser exactamente `https://tu-dominio.com` (sin trailing slash)

### Error: "Invalid client secret"
- Verifica que GITHUB_SECRET esté configurado correctamente
- Regenera el client secret en GitHub si es necesario

## Seguridad

- ✅ Cookies seguras habilitadas en producción
- ✅ Headers de seguridad configurados
- ✅ HTTPS requerido para OAuth
- ✅ Logging configurado para debugging

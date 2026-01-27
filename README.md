# B4OS Master Dashboard

Dashboard administrativo para el programa Bitcoin 4 Open Source (B4OS) que permite monitorear el progreso de los estudiantes en sus assignments de GitHub Classroom.

## Características

- **Dashboard en tiempo real** con estadísticas de estudiantes
- **Sistema de autenticación** con GitHub OAuth
- **Ranking dinámico** basado en Tiempo dedicado
- **Filtros avanzados** para análisis de datos
- **Tooltips informativos** con actividad de GitHub
- **Vista responsive** para desktop y móvil
- **Datos sincronizados** desde GitHub Classroom (vía backend separado)

## Estructura del Proyecto

```
b4os-admin-dashboard/
├── src/
│   ├── app/            # Páginas principales
│   ├── components/     # Componentes React
│   └── lib/           # Utilidades y servicios
├── public/            # Assets estáticos
└── package.json       # Dependencias
```

> **Nota**: El backend de sincronización está en un repositorio separado.

## Tecnologías

- **Next.js 15** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **NextAuth.js** - Autenticación
- **Supabase** - Base de datos
- **Lucide React** - Iconos

> **Backend**: El backend de sincronización (Python) está en un repositorio separado y sincroniza datos de GitHub Classroom a Supabase.

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- Cuenta de GitHub
- Proyecto de Supabase

### Instalación
```bash
npm install
cp .env.local.example .env.local
# Configurar variables de entorno en .env.local
npm run dev
```

## ⚙️ Variables de Entorno

Configura las siguientes variables en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
GITHUB_ID=your_github_oauth_id
GITHUB_SECRET=your_github_oauth_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

> **Nota**: El backend requiere sus propias variables de entorno en su repositorio separado.

## Funcionalidades

### Dashboard Principal
- **Estadísticas generales**: Total de estudiantes, assignments, puntuación promedio
- **Tabla de ranking**: Ordenada por Tiempo dedicado
- **Filtros dinámicos**: Por estado, tiempo, Progreso
- **Ordenamiento**: Por columnas individuales

### Sistema de Autenticación
- **Login con GitHub**: OAuth 2.0
- **Control de acceso**: Solo usuarios autorizados
- **Roles de usuario**: Admin, estudiante

### Sincronización de Datos
- **GitHub Classroom**: Obtiene assignments y estudiantes
- **Calificaciones**: Sincroniza puntuaciones
- **Tiempo dedicado**: Calcula tiempo desde fork hasta completado
- **Estado de fork**: Detecta si el estudiante hizo fork

## Uso

### Desarrollo
```bash
npm run dev
```

El dashboard estará disponible en `http://localhost:3000`

> **Sincronización de datos**: El backend de sincronización debe ejecutarse periódicamente desde su repositorio separado para mantener los datos actualizados en Supabase.

## Monitoreo

El dashboard muestra:
- **Progreso individual** de cada estudiante
- **Tiempo dedicado** de assignments
- **Actividad reciente** en GitHub
- **Estadísticas comparativas**

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Equipo

- **Programa**: Bitcoin 4 Open Source (B4OS)

---

**B4OS Master Dashboard** - Monitoreo inteligente para el programa Bitcoin 4 Open Source
# B4OS Backend - GitHub Classroom Sync

Sistema de sincronización automática entre GitHub Classroom y Supabase para el dashboard de administración de B4OS.

## Descripción General

Este sistema descarga datos de GitHub Classroom usando `gh classroom` CLI y los sincroniza con una base de datos Supabase, permitiendo:

- Visualización del progreso de estudiantes
- Leaderboard con rankings automáticos
- Tracking de intentos de solución vía GitHub Actions
- Métricas de tiempo de resolución

## Arquitectura de Datos

### Flujo de Sincronización

```
GitHub Classroom (gh CLI)
    ↓
classroom_sync.py (Procesamiento)
    ↓
Supabase (5 tablas principales)
    ↓
Dashboard Admin (Frontend)
```

## Mapeo de Datos: GitHub → Supabase

### 1. Tabla: `zzz_students`

**Datos de GitHub Classroom:**
- `gh classroom assignments -c {classroom_id}` → `student_repository_url`

**Datos de GitHub API:**
- `gh api repos/{owner}/{repo}` → Información del repositorio fork

**Mapeo de campos:**

| Campo GitHub API | Campo Supabase | Descripción |
|-----------------|----------------|-------------|
| `login` (del roster) | `github_username` | Username de GitHub (PK) |
| `repository.created_at` | `fork_created_at` | Fecha cuando el estudiante aceptó el assignment |
| `repository.updated_at` | `last_updated_at` | Última actualización del repositorio |
| (calculado) | `resolution_time_hours` | Horas entre `fork_created_at` y `last_updated_at` |
| `repository.fork` | `has_fork` | Boolean indicando si tiene fork activo |

**Notas:**
- Solo se almacenan estudiantes que hayan aceptado al menos un assignment
- `resolution_time_hours` representa el tiempo total trabajado en el assignment

---

### 2. Tabla: `zzz_assignments`

**Datos de GitHub Classroom:**
- `gh classroom assignments -c {classroom_id}`

**Mapeo de campos:**

| Campo GitHub Classroom | Campo Supabase | Descripción |
|----------------------|----------------|-------------|
| `title` (formateado) | `name` | Nombre del assignment (PK, slug-format) |
| `points_available` | `points_available` | Puntos máximos del assignment |
| (auto) | `updated_at` | Timestamp de última sincronización |

**Transformación de nombre:**
```python
# Ejemplo: "The Moria Mining Codex - Part 1"
#       → "the-moria-mining-codex-part-1"
formatted_name = name.lower()
    .replace(special_chars, '')
    .replace(spaces, '-')
    .strip('-')
```

**Fallback para `points_available`:**
- Si GitHub Classroom retorna 0, se usa el máximo `points_awarded` encontrado
- Para assignments "Part 2", se asume 100 puntos por defecto

---

### 3. Tabla: `zzz_grades`

**Datos de GitHub Classroom:**
- `gh classroom assignment-grades -a {assignment_id}` → CSV con grades

**Datos de GitHub API:**
- `gh api repos/{owner}/{repo}` → Fork dates

**Mapeo de campos:**

| Campo GitHub Classroom | Campo Supabase | Descripción |
|----------------------|----------------|-------------|
| `github_username` | `github_username` | Username del estudiante (FK) |
| `assignment_name` (formateado) | `assignment_name` | Nombre del assignment (FK) |
| `points_awarded` | `points_awarded` | Puntos obtenidos |
| `repository.created_at` | `fork_created_at` | Cuándo aceptó este assignment específico |
| `repository.updated_at` | `fork_updated_at` | Última actualización para este assignment |

**Constraint único:** `(github_username, assignment_name)`

**Notas:**
- Cada fila representa la calificación de un estudiante en un assignment específico
- `fork_created_at` es específico por assignment (puede diferir entre assignments)

---

### 4. Tabla: `zzz_assignment_attempts`

**Datos de GitHub Actions API:**
- `gh api repos/{owner}/{repo}/actions/runs?per_page=100`

**Mapeo de campos:**

| Campo GitHub Actions API | Campo Supabase | Descripción |
|------------------------|----------------|-------------|
| (lookup) | `user_id` | UUID del estudiante en `zzz_students` (FK) |
| (lookup) | `assignment_id` | UUID del assignment en `zzz_assignments` (FK) |
| `html_url` | `repo_url` | URL del repositorio |
| `total_count` | `total_attempts` | Total de workflow runs |
| `workflow_runs[].conclusion = 'success'` | `successful_attempts` | Conteo de runs exitosos |
| `workflow_runs[].conclusion = 'failure'` | `failed_attempts` | Conteo de runs fallidos |
| `workflow_runs[-1].created_at` | `first_attempt_at` | Timestamp del primer intento |
| `workflow_runs[0].created_at` | `last_attempt_at` | Timestamp del último intento |
| `repository.created_at` | `fork_created_at` | Cuándo se creó el fork |
| `repository.updated_at` | `fork_updated_at` | Última actualización del fork |

**Constraint único:** `(user_id, assignment_id)`

**Notas:**
- Solo se rastrean los 100 runs más recientes por límites de API
- Los runs están ordenados por `created_at DESC` (más reciente primero)
- `successful_attempts + failed_attempts ≤ total_attempts` (algunos pueden estar pending/cancelled)

**Vista calculada:** `vw_assignment_attempt_stats`
```sql
-- Métricas adicionales calculadas:
- success_rate_percentage = (successful_attempts / total_attempts) * 100
- attempt_duration_hours = (last_attempt_at - first_attempt_at) en horas
```

---

### 5. Tabla: `zzz_admin_leaderboard`

**Datos calculados** (no vienen directamente de GitHub):

| Fuente | Campo Supabase | Descripción |
|--------|----------------|-------------|
| `zzz_students` | `github_username` | Username del estudiante (PK) |
| `zzz_students` | `fork_created_at` | Fecha del primer fork |
| `zzz_students` | `last_updated_at` | Última actualización |
| `zzz_students` | `resolution_time_hours` | Tiempo total trabajado |
| `zzz_students` | `has_fork` | Si tiene fork activo |
| SUM(`zzz_grades.points_awarded`) | `total_score` | Suma de puntos obtenidos |
| SUM(`zzz_assignments.points_available`) | `total_possible` | Suma de puntos posibles |
| COUNT(DISTINCT `assignment_name`) | `assignments_completed` | Número de assignments completados |
| (cálculo) | `percentage` | Progreso promedio ponderado |
| (cálculo) | `ranking_position` | Posición en el ranking |

**Cálculo de `percentage` (Progress):**
```python
# Progreso = Suma de (puntos_obtenidos / puntos_totales * 100) / total_assignments_sistema
# Esto normaliza el progreso entre estudiantes con diferente número de assignments

sum_of_percentages = sum(
    (points_awarded / points_available) * 100
    for each assignment
)
percentage = round(sum_of_percentages / total_system_assignments)
```

**Ranking (ORDER BY):**
1. `resolution_time_hours` ASC (más rápido = mejor)
2. `percentage` DESC (mayor progreso = mejor)
3. `github_username` ASC (alfabético como desempate)

**Notas:**
- Se recalcula completamente en cada sync (DELETE + INSERT/UPSERT)
- Representa una snapshot del estado actual del leaderboard

---

## Comandos GitHub CLI Utilizados

### 1. Listar Classrooms
```bash
gh classroom list
```
**Output:**
```
ID          Name              URL
12345       B4OS-Dev-2025    https://classroom.github.com/classrooms/12345
```

### 2. Listar Assignments
```bash
gh classroom assignments -c {classroom_id}
```
**Output (TSV):**
```
ID      Title                           Type        ...     Repository
67890   The Moria Mining Codex Part 1   individual  ...     B4OS-Dev/moria-part-1
```

### 3. Descargar Grades
```bash
gh classroom assignment-grades -a {assignment_id} -f grades.csv
```
**Output (CSV):**
```csv
github_username,student_repository_url,points_awarded,points_available
aluifuensan,https://github.com/B4OS-Dev/moria-part-1-aluifuensan,85,100
```

### 4. GitHub API - Repository Info
```bash
gh api repos/{owner}/{repo}
```
**Output (JSON):**
```json
{
  "created_at": "2024-12-01T10:30:00Z",
  "updated_at": "2024-12-10T15:45:00Z",
  "fork": true,
  "parent": { "full_name": "B4OS-Dev/moria-part-1" }
}
```

### 5. GitHub API - Workflow Runs
```bash
gh api repos/{owner}/{repo}/actions/runs?per_page=100
```
**Output (JSON):**
```json
{
  "total_count": 42,
  "workflow_runs": [
    {
      "created_at": "2024-12-10T15:45:00Z",
      "conclusion": "success"
    },
    {
      "created_at": "2024-12-09T12:20:00Z",
      "conclusion": "failure"
    }
  ]
}
```

---

## Instalación y Configuración

### Pre-requisitos

1. **GitHub CLI** instalado y autenticado:
```bash
# Instalar (Ubuntu/Debian)
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Autenticar
gh auth login
```

2. **Python 3.8+** con pip

3. **Credenciales de Supabase**

### Instalación

```bash
# 1. Clonar el repositorio
cd b4os-backend

# 2. Crear entorno virtual
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env.local
nano .env.local
```

### Configuración `.env.local`

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# GitHub Classroom
CLASSROOM_NAME=B4OS-Dev-2025

# Optional: Track specific user in logs
SEARCH_USERNAME=aluifuensan

# Optional: Sync only one assignment
# ASSIGNMENT_ID=12345

# Logging
LOG_LEVEL=INFO
```

**⚠️ IMPORTANTE:** Usa `SUPABASE_SERVICE_ROLE_KEY`, NO la anon key (la anon key solo tiene permisos de lectura).

---

## Uso

### Sincronización Manual

```bash
# Sincronizar todos los assignments
python sync-classroom.py
```

**Output esperado:**
```
============================================================
Starting GitHub Classroom sync to Supabase
============================================================
🔍 Checking requirements...
✅ GitHub CLI is installed
✅ GitHub CLI is authenticated
✅ Supabase credentials found
   Using key type: Service Role
✅ Classroom name set to: B4OS-Dev-2025

🔄 Starting sync process...
Searching for classroom: B4OS-Dev-2025
Found classroom ID: 12345
Getting assignments for classroom: 12345
Found 6 assignments
Processing assignments in memory...

Processing assignment: The Moria Mining Codex - Part 1 (ID: 67890)
Processing 149 students for assignment the-moria-mining-codex-part-1...
  ★ TRACKED USER: aluifuensan - the-moria-mining-codex-part-1: 100 points
Processed 149 grades for assignment: the-moria-mining-codex-part-1

[... repite para cada assignment ...]

✓ Synced 6 assignments: the-moria-mining-codex-part-1, the-moria-mining-codex-part-2...
✓ Synced 149 students (127 with forks)
✓ Synced 275 grade records (149 students × 6 assignments)
✓ Synced 275 assignment attempts (Total: 1523, Success: 892, Failed: 631)
✓ Refreshed leaderboard: 149 students (Inserted: 0, Updated: 149)

============================================================
✓ Sync completed successfully!
  • 149 students
  • 6 assignments
  • 275 grade records

Check your Supabase dashboard to verify the changes
============================================================
```

### Tracking de Usuario Específico

```bash
# En .env.local
SEARCH_USERNAME=aluifuensan

# Ejecutar sync
python sync-classroom.py
```

Verás logs destacados:
```
★ TRACKED USER: aluifuensan - the-moria-mining-codex-part-1: 100 points
★ TRACKED USER: aluifuensan - the-moria-mining-codex-part-2: 85 points
```

### Sincronización de un Solo Assignment

```bash
# En .env.local
ASSIGNMENT_ID=67890

# Ejecutar sync
python sync-classroom.py
```

---

## Estructura del Proyecto

```
b4os-backend/
├── src/
│   └── lib/
│       └── classroom_sync.py      # Lógica principal de sincronización
├── migrations/
│   └── add_workflow_attempts_columns.sql  # Migración de DB
├── sync-classroom.py              # Script de entrada
├── .env.local                     # Configuración (NO committear)
├── .env.example                   # Template de configuración
├── requirements.txt               # Dependencias Python
└── README.md                      # Este archivo
```

---

## Tablas de Supabase (Esquema)

### `zzz_students`
```sql
CREATE TABLE zzz_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_username TEXT UNIQUE NOT NULL,
    fork_created_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ,
    resolution_time_hours INTEGER,
    has_fork BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `zzz_assignments`
```sql
CREATE TABLE zzz_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    points_available INTEGER,
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `zzz_grades`
```sql
CREATE TABLE zzz_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_username TEXT NOT NULL,
    assignment_name TEXT NOT NULL,
    points_awarded INTEGER,
    fork_created_at TIMESTAMPTZ,
    fork_updated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(github_username, assignment_name)
);
```

### `zzz_assignment_attempts`
```sql
CREATE TABLE zzz_assignment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES zzz_students(id),
    assignment_id UUID REFERENCES zzz_assignments(id),
    repo_url TEXT,
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0,
    first_attempt_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    fork_created_at TIMESTAMPTZ,
    fork_updated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, assignment_id)
);
```

### `zzz_admin_leaderboard`
```sql
CREATE TABLE zzz_admin_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_username TEXT UNIQUE NOT NULL,
    fork_created_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ,
    resolution_time_hours INTEGER,
    has_fork BOOLEAN,
    total_score INTEGER,
    total_possible INTEGER,
    percentage INTEGER,
    assignments_completed INTEGER,
    ranking_position INTEGER,
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Troubleshooting

### Error: "GitHub CLI not authenticated"
```bash
gh auth login
# Selecciona: GitHub.com → HTTPS → Yes (git) → Login with browser
```

### Error: "Supabase API error 401"
- Verifica que estás usando `SUPABASE_SERVICE_ROLE_KEY`, no la anon key
- Revisa que la URL no tenga espacios o caracteres extra

### Error: "Classroom not found"
```bash
# Verifica que el nombre sea exacto
gh classroom list

# Copia el nombre exacto a .env.local
CLASSROOM_NAME=B4OS-Dev-2025
```

### Los datos no aparecen en Supabase
- Verifica las políticas RLS (Row Level Security)
- Usa la service role key para bypass RLS
- Revisa logs en Supabase Dashboard → Logs

### Rate limit de GitHub API
- El script respeta rate limits con delays de 0.1s entre requests
- Si obtienes rate limit errors, aumenta el delay en `classroom_sync.py` línea 1150
- Considera usar un GitHub token con mayores límites

---

## Automatización (Cron)

Para sincronizar automáticamente cada hora:

```bash
# Editar crontab
crontab -e

# Agregar línea (ejecutar cada hora)
0 * * * * cd /path/to/b4os-backend && /path/to/.venv/bin/python sync-classroom.py >> /var/log/classroom-sync.log 2>&1
```

O usar GitHub Actions:

```yaml
# .github/workflows/sync-classroom.yml
name: Sync Classroom Data

on:
  schedule:
    - cron: '0 * * * *'  # Cada hora
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install gh CLI
        run: |
          curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
          echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
          sudo apt update
          sudo apt install gh

      - name: Authenticate gh CLI
        run: echo "${{ secrets.GH_TOKEN }}" | gh auth login --with-token

      - name: Install dependencies
        run: |
          cd b4os-backend
          pip install -r requirements.txt

      - name: Run sync
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          CLASSROOM_NAME: B4OS-Dev-2025
        run: |
          cd b4os-backend
          python sync-classroom.py
```

---

## Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

---

## Licencia

MIT License - ver LICENSE file para detalles

---

## Soporte

Para issues y preguntas:
- GitHub Issues: https://github.com/LibreriadeSatoshi/b4os-backend/issues
- Email: dev@b4os.dev

---

## Changelog

### v2.0.0 (2024-12-15)
- ✨ Logging mejorado con información concisa
- ✨ Tracking de usuarios específicos
- ✨ Resumen de cambios al final
- ✨ Silenciado de logs verbosos de httpx
- 🐛 Manejo silencioso de errores 409 Conflict

### v1.1.0 (2024-12-11)
- ✨ Agregado tracking de GitHub Actions attempts
- ✨ Nueva tabla `zzz_assignment_attempts`
- ✨ Vista calculada `vw_assignment_attempt_stats`

### v1.0.0 (2024-12-01)
- 🎉 Release inicial
- ✨ Sincronización básica de students, assignments, grades
- ✨ Leaderboard automático

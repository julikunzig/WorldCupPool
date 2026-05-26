# 🚀 Inicio Rápido - Polla Mundial 2026

## Pasos para ejecutar la aplicación

### 1️⃣ Instalar PostgreSQL (si no lo tienes)

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Crear la base de datos:**
```bash
psql postgres
```

Dentro de psql:
```sql
CREATE DATABASE polla_mundial;
\q
```

### 2️⃣ Instalar dependencias de Node.js

```bash
npm install
```

### 3️⃣ Configurar variables de entorno

El archivo `.env` ya está creado con valores por defecto. Si tu PostgreSQL usa otra contraseña, edita:

```bash
# Editar .env y cambiar DB_PASSWORD si es necesario
nano .env
```

### 4️⃣ Crear tablas en la base de datos

```bash
npm run setup-db
```

Deberías ver:
```
✅ Schema creado/verificado correctamente
```

### 5️⃣ Cargar datos iniciales (grupos, equipos, partidos)

```bash
npm run seed-db
```

Deberías ver:
```
✅ 12 grupos insertados
✅ 48 equipos insertados
✅ 72 partidos insertados
✅ Usuario administrador creado
```

### 6️⃣ Iniciar el servidor

```bash
npm run dev
```

Deberías ver:
```
╔═══════════════════════════════════════════════════════════╗
║          🏆  POLLA MUNDIAL 2026  🏆                       ║
║  Servidor iniciado exitosamente                          ║
║  URL: http://localhost:3000                              ║
╚═══════════════════════════════════════════════════════════╝
```

### 7️⃣ Abrir en el navegador

Abre tu navegador en: **http://localhost:3000**

## 🎯 Credenciales de Administrador

- **Email:** admin@polla2026.com
- **Password:** Admin2026!

## 📱 Probar en el celular

1. Encuentra tu IP local:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Busca algo como: 192.168.1.X
```

2. En tu celular (conectado a la misma red WiFi), abre:
```
http://TU_IP_LOCAL:3000
```

Por ejemplo: `http://192.168.1.100:3000`

## ✅ Verificar que todo funciona

1. **Registra un usuario nuevo**
   - Haz clic en "Registrarse"
   - Completa el formulario
   - Deberías ver "¡Registro exitoso!"

2. **Haz una predicción**
   - Ve a "Predicciones"
   - Ingresa marcadores para un partido
   - Haz clic en "Guardar Predicción"

3. **Prueba el panel de admin**
   - Cierra sesión
   - Inicia sesión con las credenciales de admin
   - Ve a la pestaña "Admin"
   - Registra un marcador real
   - Verifica que se calculen los puntos

4. **Ver tabla de posiciones**
   - Ve a la pestaña "Tabla"
   - Deberías ver tu posición y puntos

## 🐛 Problemas Comunes

### Error: "No se pudo conectar a PostgreSQL"

**Solución:**
```bash
# Verificar que PostgreSQL está corriendo
brew services list

# Si no está corriendo:
brew services start postgresql@14

# Verificar que la base de datos existe:
psql -l | grep polla_mundial
```

### Error: "Variables de entorno faltantes"

**Solución:**
```bash
# Verificar que existe .env
ls -la .env

# Si no existe, copiar desde el ejemplo:
cp .env.example .env
```

### Error: "Puerto 3000 ya en uso"

**Solución:**
```bash
# Cambiar el puerto en .env
echo "PORT=3001" >> .env

# O matar el proceso que usa el puerto 3000:
lsof -ti:3000 | xargs kill -9
```

### La aplicación no se ve bien en el celular

**Solución:**
- Asegúrate de estar en la misma red WiFi
- Usa la IP local, no localhost
- Limpia la caché del navegador del celular

## 📊 Ver los logs

Los logs se guardan en la carpeta `logs/`:

```bash
# Ver log general
tail -f logs/app-*.log

# Ver solo errores
tail -f logs/error-*.log

# Ver peticiones HTTP
tail -f logs/http-*.log
```

## 🔄 Reiniciar desde cero

Si quieres borrar todo y empezar de nuevo:

```bash
# 1. Borrar la base de datos
psql postgres -c "DROP DATABASE polla_mundial;"
psql postgres -c "CREATE DATABASE polla_mundial;"

# 2. Recrear tablas y datos
npm run setup-db
npm run seed-db

# 3. Reiniciar servidor
npm run dev
```

## 📞 Ayuda

Si tienes problemas, revisa:
1. Los logs en `logs/error-*.log`
2. La consola del navegador (F12)
3. Que PostgreSQL esté corriendo
4. Que el archivo `.env` tenga las credenciales correctas

---

**¡Listo! Ya puedes empezar a usar la Polla Mundial 2026 🏆⚽**

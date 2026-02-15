# VIDA A TUS PIES - Sistema de Gestión Podológica

Este es el código fuente del sistema de gestión "VIDA A TUS PIES".

## 📋 Requisitos Previos

Para ejecutar este sistema, necesitas instalar **Node.js** en tu computadora.

1.  Ve a [nodejs.org](https://nodejs.org/)
2.  Descarga la versión **LTS (Recommended for most users)**.
3.  Instálalo siguiendo los pasos del asistente (Siguiente, Siguiente... Instalar).

## 🚀 Cómo Iniciar el Sistema

Una vez instalado Node.js, sigue estos pasos:

1.  Abre la carpeta `vida-a-tus-pies` en tu escritorio.
2.  Haz clic derecho en un espacio vacío y selecciona **"Abrir en Terminal"** (o PowerShell).
3.  Escribe el siguiente comando y presiona Enter para instalar las librerías necesarias:
    ```bash
    npm install
    ```
4.  Una vez termine, escribe este comando para iniciar el sistema:
    ```bash
    npm run dev
    ```
## 4. Configuración de Base de Datos (Supabase)

Para que el sistema funcione correctamente con la base de datos real:

1.  Crea un proyecto en [Supabase](https://supabase.com).
2.  Ve al **SQL Editor** en tu panel de Supabase.
3.  Copia el contenido del archivo `database_schema.sql` (ubicado en `brain/.../database_schema.sql` o generado por el asistente) y ejecútalo.
4.  Esto creará las tablas `profiles`, `patients`, `services`, `appointments` y `medical_records`, además de configurar las políticas de seguridad (RLS).
5.  Asegúrate de que tus credenciales en `.env.local` sean correctas.

## 5. Scripts Disponibles

-   `npm run dev`: Inicia el servidor de desarrollo.
-   `npm run build`: Construye la aplicación para producción.
-   `npm run preview`: Vista previa de la build de producción.

5.  Aparecerá un enlace local (ej. `http://localhost:5173`). Mantén presionada la tecla `Ctrl` y haz clic en el enlace para abrirlo en tu navegador.

## 🔑 Credenciales de Acceso (Demo)

El sistema cuenta con un modo de demostración con datos de prueba.

*   **Usuario Administrador:** `admin@vidaatuspies.com`
*   **Usuario Podólogo:** `juan@vidaatuspies.com`
*   **Contraseña:** Cualquier texto (ej. `123456`)

## 🛠️ Tecnologías Usadas

*   **Frontend:** React, TypeScript, Vite
*   **Estilos:** Tailwind CSS
*   **Iconos:** Lucide React
*   **Navegación:** React Router DOM

## ☁️ Despliegue en la Nube (Futuro)

Este código está listo para ser conectado a **Supabase** (Base de datos) y desplegado en **Vercel**.
Para pasar a producción, se requiere configurar las variables de entorno en un archivo `.env` con las credenciales de Supabase.

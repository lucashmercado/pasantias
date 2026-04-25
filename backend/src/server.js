/**
 * server.js — Punto de entrada del servidor backend.
 *
 * Se encarga de:
 * 1. Cargar las variables de entorno desde el archivo .env
 * 2. Conectarse a la base de datos PostgreSQL usando Sequelize
 * 3. Sincronizar los modelos con la base de datos (solo en entorno de desarrollo)
 * 4. Iniciar el servidor Express en el puerto configurado
 */

require('dotenv').config();         // Carga las variables de entorno (.env)
const app = require('./app');       // Importa la aplicación Express ya configurada
const { sequelize } = require('./models'); // Importa la instancia de Sequelize

// Puerto donde escucha el servidor (por defecto 5000 si no está en .env)
const PORT = process.env.PORT || 5000;

/**
 * Función principal de arranque del servidor.
 * Usa async/await para manejar la conexión a la DB antes de levantar el server.
 */
async function startServer() {
  try {
    // Verifica que la conexión con PostgreSQL esté funcionando
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida.');

    // En desarrollo se sincronizan los modelos automáticamente (alter: true actualiza la estructura sin borrar datos)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos.');
    }

    // Inicia el servidor HTTP en el puerto definido
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1); // Sale con código de error si algo falla
  }
}

// Ejecuta el arranque
startServer();

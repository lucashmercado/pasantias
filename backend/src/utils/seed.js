require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize, Usuario } = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos.');

    const adminEmail = 'admin@pasantias.com';
    const existe = await Usuario.findOne({ where: { email: adminEmail } });

    if (existe) {
      console.log('ℹ️  El usuario administrador ya existe:', adminEmail);
    } else {
      const hash = await bcrypt.hash('Admin1234!', 12);
      await Usuario.create({
        nombre: 'Admin',
        apellido: 'Sistema',
        email: adminEmail,
        password: hash,
        rol: 'admin',
        habilitado: true,
        activo: true,
      });
      console.log('✅ Usuario admin creado:');
      console.log('   📧 Email:    admin@pasantias.com');
      console.log('   🔑 Password: Admin1234!');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  }
}

seed();

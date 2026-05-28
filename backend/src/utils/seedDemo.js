/**
 * seedDemo.js — Datos demo de desarrollo.
 *
 * Llena la base con empresas, responsables, reclutadores, ofertas,
 * alumnos/egresados y perfiles. También crea algunas postulaciones,
 * notificaciones y mensajes si esos modelos existen en ../models.
 *
 * Uso:
 * node src/utils/seedDemo.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const models = require('../models');
const {
  sequelize,
  Usuario,
  Perfil,
  Empresa,
  EmpresaUsuario,
  Oferta,
} = models;

const Postulacion = models.Postulacion || models.Postulaciones;
const Notificacion = models.Notificacion || models.Notificaciones;
const Mensaje = models.Mensaje || models.Mensajes;

const EMPRESAS = require('../data/empresas.json');
const ALUMNOS = require('../data/alumnos.json');
const CATALOGOS = require('../data/catalogos.json');

const DEFAULT_PASSWORD = 'Admin1234!';
const MODALIDADES = ['presencial', 'remoto', 'hibrido'];
const ESTADOS_POSTULACION = ['en_revision', 'preseleccionado', 'entrevista', 'rechazado'];

const pick = (arr, i) => arr[i % arr.length];

function skillsFor(area, index) {
  const skills = CATALOGOS.habilidadesPorArea[area] || ['Comunicación', 'Trabajo en equipo', 'Responsabilidad'];
  return [skills[index % skills.length], skills[(index + 1) % skills.length]];
}

function normalizeForUrl(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function destroyIfModel(model, options) {
  if (!model) return;
  await model.destroy(options);
}

async function seedDemo() {
  const transaction = await sequelize.transaction();

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos para la carga demo.');

    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    console.log('ℹ️  Limpiando registros demo anteriores...');

    const demoUsers = await Usuario.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.like]: 'empresa.demo.%@itbeltran.com.ar' } },
          { email: { [Op.like]: 'reclutador.demo.%@itbeltran.com.ar' } },
          { email: { [Op.like]: '%@itbeltran.com.ar' }, rol: { [Op.in]: ['alumno', 'egresado'] } },
        ],
      },
      attributes: ['id'],
      transaction,
    });

    const userIds = demoUsers.map((u) => u.id);

    const empresasDemo = await Empresa.findAll({
      where: { razonSocial: { [Op.in]: EMPRESAS.map((e) => e.razonSocial) } },
      attributes: ['id'],
      transaction,
    });

    const empresaIds = empresasDemo.map((e) => e.id);

    if (userIds.length || empresaIds.length) {
      await destroyIfModel(Mensaje, {
        where: {
          [Op.or]: [
            userIds.length ? { emisorId: { [Op.in]: userIds } } : null,
            userIds.length ? { receptorId: { [Op.in]: userIds } } : null,
          ].filter(Boolean),
        },
        transaction,
      });

      await destroyIfModel(Notificacion, {
        where: userIds.length ? { usuarioId: { [Op.in]: userIds } } : {},
        transaction,
      });

      await destroyIfModel(Postulacion, {
        where: userIds.length ? { usuarioId: { [Op.in]: userIds } } : {},
        transaction,
      });

      if (empresaIds.length) {
        await Oferta.destroy({ where: { empresaId: { [Op.in]: empresaIds } }, transaction });
        await EmpresaUsuario.destroy({ where: { empresaId: { [Op.in]: empresaIds } }, transaction });
        await Empresa.destroy({ where: { id: { [Op.in]: empresaIds } }, transaction });
      }

      if (userIds.length) {
        await Perfil.destroy({ where: { usuarioId: { [Op.in]: userIds } }, transaction });
        await EmpresaUsuario.destroy({ where: { usuarioId: { [Op.in]: userIds } }, transaction });
        await Usuario.destroy({ where: { id: { [Op.in]: userIds } }, transaction });
      }
    }

    const createdOfertas = [];
    const createdAlumnos = [];
    const createdReclutadores = [];

    console.log('🚀 Insertando empresas, reclutadores y ofertas...');

    for (let i = 0; i < EMPRESAS.length; i++) {
      const item = EMPRESAS[i];

      const owner = await Usuario.create({
        nombre: `Responsable ${i + 1}`,
        apellido: item.razonSocial.split(' ')[0],
        email: `empresa.demo.${i + 1}@itbeltran.com.ar`,
        password: hash,
        rol: 'empresa',
        habilitado: true,
        activo: true,
        telefono: item.telefono,
        ubicacion: item.ciudad,
      }, { transaction });

      const empresa = await Empresa.create({
        usuarioId: owner.id,
        razonSocial: item.razonSocial,
        cuit: `30-${30500000 + i}-${(i % 9) + 1}`,
        descripcion: `${item.razonSocial} participa del programa institucional de pasantías.`,
        rubro: item.rubro,
        sitioWeb: item.sitioWeb,
        telefono: item.telefono,
        direccion: item.direccion,
        ciudad: item.ciudad,
        estadoAprobacion: 'aprobada',
      }, { transaction });

      await EmpresaUsuario.create({
        empresaId: empresa.id,
        usuarioId: owner.id,
        rolInterno: 'admin_empresa',
        activo: true,
      }, { transaction });

      const recruitersCount = (i % 3) + 1;

      for (let r = 1; r <= recruitersCount; r++) {
        const reclutador = await Usuario.create({
          nombre: `Reclutador ${r}`,
          apellido: item.razonSocial.split(' ')[0],
          email: `reclutador.demo.${i + 1}.${r}@itbeltran.com.ar`,
          password: hash,
          rol: 'empresa',
          habilitado: true,
          activo: true,
          telefono: item.telefono,
          ubicacion: item.ciudad,
        }, { transaction });

        createdReclutadores.push(reclutador);

        await EmpresaUsuario.create({
          empresaId: empresa.id,
          usuarioId: reclutador.id,
          rolInterno: 'reclutador',
          activo: true,
        }, { transaction });
      }

      const ofertasCount = 3 + (i % 3);

      for (let o = 0; o < ofertasCount; o++) {
        const area = pick(CATALOGOS.areas, i + o);
        const habilidades = skillsFor(area, o);
        const modalidad = pick(MODALIDADES, i + o);

        const oferta = await Oferta.create({
          empresaId: empresa.id,
          titulo: `Pasantía en ${area}`,
          descripcion: `Práctica profesional supervisada en ${area}, con acompañamiento de referentes de ${item.razonSocial}.`,
          requisitos: `Conocimientos base en ${habilidades[0]} y ${habilidades[1]}.`,
          area,
          modalidad,
          modalidadExtendida: modalidad === 'hibrido' ? '3 días presencial y 2 días remoto' : null,
          ciudad: item.ciudad,
          remuneracion: 'A convenir',
          salario: 240000 + (o * 25000),
          beneficios: 'Capacitaciones, mentoría, comedor y certificación de experiencia',
          cantidadVacantes: (o % 3) + 1,
          habilidadesRequeridas: habilidades,
          nivelExperiencia: ['sin_experiencia', 'junior', 'semi_senior'][o % 3],
          fechaPublicacion: new Date(),
          fechaLimite: new Date(Date.now() + (30 + (o * 10)) * 24 * 60 * 60 * 1000),
          estado: 'activa',
          moderada: true,
          vistas: 0,
        }, { transaction });

        createdOfertas.push(oferta);
      }
    }

    console.log('🚀 Insertando alumnos/egresados y perfiles...');

    for (let i = 0; i < ALUMNOS.length; i++) {
      const item = ALUMNOS[i];
      const dni = String(item.dni || (37000000 + i)).padStart(8, '0');
      const email = `${dni}@itbeltran.com.ar`;
      const carrera = item.carrera || pick(CATALOGOS.carreras, i);
      const areaInteres = item.areaInteres || pick(CATALOGOS.areas, i);
      const habilidades = skillsFor(areaInteres, i);

      const alumno = await Usuario.create({
        nombre: item.nombre,
        apellido: item.apellido,
        email,
        password: hash,
        rol: item.rol,
        habilitado: true,
        activo: true,
        telefono: `11-55${String(1000 + i).slice(-4)}`,
        ubicacion: i % 2 === 0 ? 'Avellaneda' : 'Lanús',
      }, { transaction });

      createdAlumnos.push(alumno);

      await Perfil.create({
        usuarioId: alumno.id,
        carrera,
        anioEgreso: item.rol === 'egresado' ? 2024 - (i % 3) : null,
        descripcion: `Perfil ${item.rol} orientado a ${areaInteres}.`,
        habilidades,
        idiomas: ['Español nativo', 'Inglés técnico'],
        certificaciones: i % 2 === 0 ? ['Curso introductorio de empleabilidad'] : [],
        linkedin: `https://linkedin.com/in/${normalizeForUrl(item.nombre)}-${normalizeForUrl(item.apellido)}`,
        github: `https://github.com/${normalizeForUrl(item.nombre)}${normalizeForUrl(item.apellido)}`,
        portfolio: `https://${normalizeForUrl(item.nombre)}-${normalizeForUrl(item.apellido)}.example.com`,
        cvPath: `/uploads/cv/demo-${dni}.pdf`,
        areaInteres,
        disponibilidad: ['inmediata', '1_mes', '3_meses'][i % 3],
        experienciaLaboral: i % 2 === 0 ? 'Prácticas académicas y proyectos institucionales.' : 'Sin experiencia laboral formal.',
        proyectos: `Proyecto académico relacionado con ${areaInteres}.`,
        visibilidadPerfil: true,
      }, { transaction });
    }

    if (Postulacion && createdOfertas.length) {
      console.log('🚀 Insertando postulaciones demo...');

      for (let i = 0; i < createdAlumnos.length; i++) {
        const alumno = createdAlumnos[i];
        const postulacionesPorAlumno = i % 3 === 0 ? 2 : 1;

        for (let p = 0; p < postulacionesPorAlumno; p++) {
          const oferta = createdOfertas[(i + p * 7) % createdOfertas.length];

          await Postulacion.findOrCreate({
            where: {
              usuarioId: alumno.id,
              ofertaId: oferta.id,
            },
            defaults: {
              cartaPresentacion: 'Me interesa participar en esta pasantía porque se relaciona con mi formación y mis objetivos profesionales.',
              estado: pick(ESTADOS_POSTULACION, i + p),
              fechaPostulacion: new Date(Date.now() - ((i + p) % 12) * 24 * 60 * 60 * 1000),
              notasEmpresa: p === 0 ? 'Perfil revisado en instancia inicial.' : null,
            },
            transaction,
          });
        }
      }
    }

    if (Notificacion) {
      console.log('🚀 Insertando notificaciones demo...');

      for (let i = 0; i < createdAlumnos.length; i++) {
        await Notificacion.create({
          usuarioId: createdAlumnos[i].id,
          titulo: 'Nueva oferta recomendada',
          mensaje: 'Hay una oferta activa compatible con tu perfil.',
          tipo: 'oferta',
          leida: i % 2 === 0,
          prioridad: 'normal',
          tipoVisual: 'info',
        }, { transaction });
      }
    }

    if (Mensaje && createdReclutadores.length) {
      console.log('🚀 Insertando mensajes demo...');

      for (let i = 0; i < Math.min(createdAlumnos.length, 12); i++) {
        const alumno = createdAlumnos[i];
        const reclutador = createdReclutadores[i % createdReclutadores.length];

        await Mensaje.create({
          emisorId: reclutador.id,
          receptorId: alumno.id,
          mensaje: 'Hola, revisamos tu postulación y nos gustaría coordinar una entrevista.',
          leido: i % 2 === 0,
        }, { transaction });

        await Mensaje.create({
          emisorId: alumno.id,
          receptorId: reclutador.id,
          mensaje: 'Hola, muchas gracias. Quedo atento/a para coordinar día y horario.',
          leido: true,
        }, { transaction });
      }
    }

    await transaction.commit();

    console.log('\n✨ Seed demo finalizado correctamente ✨');
    console.log(`🏢 Empresas creadas: ${EMPRESAS.length}`);
    console.log(`👥 Reclutadores creados: ${createdReclutadores.length}`);
    console.log(`🎓 Alumnos/Egresados creados: ${ALUMNOS.length}`);
    console.log(`📌 Ofertas creadas: ${createdOfertas.length}`);
    console.log(`🔑 Password demo para todos: ${DEFAULT_PASSWORD}`);
    process.exit(0);
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error ejecutando seed demo:', err);
    process.exit(1);
  }
}

seedDemo();

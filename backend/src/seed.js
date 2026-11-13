const { Role, Category, User } = require('./models');
const { hashPassword } = require('./utils/helpers');

const ROLES = ['student_staff', 'officer', 'admin'];
const CATEGORIES = ['Electricity', 'Furniture', 'Plumbing', 'Internet', 'Classroom Equipment', 'Hostel Maintenance'];

// Creates the three roles, six categories and the first administrator if they do not exist yet.
async function seedBase() {
  for (const name of ROLES) await Role.findOrCreate({ where: { name } });
  for (const name of CATEGORIES) await Category.findOrCreate({ where: { name } });

  const email = (process.env.ADMIN_EMAIL || 'admin@campusfix.edu').toLowerCase();
  if (!(await User.findOne({ where: { email } }))) {
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    await User.create({
      name: process.env.ADMIN_NAME || 'System Administrator',
      email,
      passwordHash: await hashPassword(process.env.ADMIN_PASSWORD || 'Admin@12345'),
      roleId: adminRole.id,
    });
  }
}

module.exports = { seedBase, ROLES, CATEGORIES };

// Optional: fills the database with demo users and requests so every screen has data for screenshots.
// Run with: npm run seed:demo   (after the server has started at least once)
require('dotenv').config();
const { sequelize, Role, User, Category, ServiceRequest, Assignment, StatusLog, Notification } = require('./models');
const { seedBase } = require('./seed');
const { hashPassword } = require('./utils/helpers');

async function makeUser(name, email, password, roleName) {
  const role = await Role.findOne({ where: { name: roleName } });
  const [user] = await User.findOrCreate({
    where: { email }, defaults: { name, passwordHash: await hashPassword(password), roleId: role.id },
  });
  return user;
}

(async () => {
  await sequelize.sync();
  await seedBase();
  const admin = await User.findOne({ where: { email: (process.env.ADMIN_EMAIL || 'admin@campusfix.edu').toLowerCase() } });
  const ola = await makeUser('Officer Ola', 'ola@campusfix.edu', 'Officer@123', 'officer');
  const ada = await makeUser('Ada Student', 'ada@campusfix.edu', 'Student@123', 'student_staff');
  const cat = async (n) => (await Category.findOne({ where: { name: n } })).id;

  if ((await ServiceRequest.count()) === 0) {
    const items = [
      ['Flickering lights in Lecture Hall B', 'The ceiling lights keep flickering during lectures.', 'Lecture Hall B', 'High', 'Electricity', 'Pending'],
      ['Broken desk in Room 204', 'The desk top is cracked and unsafe to use.', 'Block C, Room 204', 'Medium', 'Furniture', 'Assigned'],
      ['Leaking pipe in hostel bathroom', 'Water is leaking from the pipe under the sink.', 'Hostel A, Floor 2', 'High', 'Plumbing', 'In Progress'],
      ['Wi-Fi down in the library', 'No internet connection on the second floor.', 'Main Library', 'Medium', 'Internet', 'Completed'],
    ];
    for (const [title, description, location, priority, category, status] of items) {
      const r = await ServiceRequest.create({ title, description, location, priority, categoryId: await cat(category), userId: ada.id, status: 'Pending' });
      await StatusLog.create({ requestId: r.id, changedById: ada.id, newStatus: 'Pending', comment: 'Request submitted' });
      let current = 'Pending';
      const path = ['Assigned', 'In Progress', 'Completed'];
      for (const next of path) {
        if (status === 'Pending' || path.indexOf(next) > path.indexOf(status)) break;
        if (next === 'Assigned') await Assignment.create({ requestId: r.id, officerId: ola.id, assignedById: admin.id });
        await StatusLog.create({
          requestId: r.id, changedById: next === 'Assigned' ? admin.id : ola.id, oldStatus: current, newStatus: next,
          comment: next === 'Assigned' ? 'Assigned to Officer Ola' : next === 'In Progress' ? 'Work has started' : 'Job finished',
        });
        current = next;
      }
      await r.update({ status });
      await Notification.create({ userId: ada.id, message: `Your request #${r.id} is now ${status}` });
    }
  }
  console.log('Demo data ready.\n  Admin:   ' + admin.email + ' / (your ADMIN_PASSWORD)\n  Officer: ola@campusfix.edu / Officer@123\n  Student: ada@campusfix.edu / Student@123');
  await sequelize.close();
})();

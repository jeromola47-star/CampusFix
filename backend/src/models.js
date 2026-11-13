const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Role = sequelize.define('Role', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
});

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
});

const Category = sequelize.define('Category', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
});

const ServiceRequest = sequelize.define('ServiceRequest', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  location: { type: DataTypes.STRING, allowNull: false },
  imageUrl: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Pending' },
  priority: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Medium' },
});

const Assignment = sequelize.define('Assignment', {});

const StatusLog = sequelize.define('StatusLog', {
  oldStatus: { type: DataTypes.STRING },
  newStatus: { type: DataTypes.STRING, allowNull: false },
  comment: { type: DataTypes.STRING },
});

const Notification = sequelize.define('Notification', {
  message: { type: DataTypes.STRING, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
});

const AuditLog = sequelize.define('AuditLog', {
  action: { type: DataTypes.STRING, allowNull: false },
  entity: { type: DataTypes.STRING },
  entityId: { type: DataTypes.INTEGER },
  details: { type: DataTypes.STRING },
});

// Role 1-N User
Role.hasMany(User, { foreignKey: 'roleId' });
User.belongsTo(Role, { foreignKey: 'roleId' });

// User 1-N ServiceRequest (requester)
User.hasMany(ServiceRequest, { foreignKey: 'userId' });
ServiceRequest.belongsTo(User, { as: 'requester', foreignKey: 'userId' });

// Category 1-N ServiceRequest
Category.hasMany(ServiceRequest, { foreignKey: 'categoryId' });
ServiceRequest.belongsTo(Category, { foreignKey: 'categoryId' });

// ServiceRequest 1-1 Assignment, Officer (User) 1-N Assignment
ServiceRequest.hasOne(Assignment, { foreignKey: 'requestId' });
Assignment.belongsTo(ServiceRequest, { foreignKey: 'requestId' });
Assignment.belongsTo(User, { as: 'officer', foreignKey: 'officerId' });
Assignment.belongsTo(User, { as: 'assignedBy', foreignKey: 'assignedById' });
User.hasMany(Assignment, { as: 'jobs', foreignKey: 'officerId' });

// ServiceRequest 1-N StatusLog
ServiceRequest.hasMany(StatusLog, { as: 'logs', foreignKey: 'requestId' });
StatusLog.belongsTo(ServiceRequest, { foreignKey: 'requestId' });
StatusLog.belongsTo(User, { as: 'changedBy', foreignKey: 'changedById' });

// User 1-N Notification
User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// Audit entries keep their history even if the user is deleted
AuditLog.belongsTo(User, { foreignKey: 'userId', constraints: false });

module.exports = {
  sequelize, Role, User, Category, ServiceRequest, Assignment, StatusLog, Notification, AuditLog,
};

const { EventEmitter } = require("events");
const { Op } = require("sequelize");
const { Notification, ParentStudent, User } = require("../models");

const notificationHub = new EventEmitter();
notificationHub.setMaxListeners(0);

const emitNotification = (notification) => {
  notificationHub.emit(`user:${notification.userId}`, notification);
};

const notifyUser = async (userId, type, title, message, metadata = null) => {
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    metadata,
    isRead: false,
  });
  emitNotification(notification);
  return notification;
};

const notifyParentsForStudent = async (
  studentId,
  type,
  title,
  message,
  metadata = null,
) => {
  const links = await ParentStudent.findAll({
    where: { studentId },
    attributes: ["parentId"],
  });

  if (!links.length) {
    return [];
  }

  return Promise.all(
    links.map((link) => notifyUser(link.parentId, type, title, message, metadata)),
  );
};

const notifyAudience = async ({ audience, title, message, metadata = null }) => {
  const audienceRoles = {
    parent: ["parent"],
    teacher: ["teacher"],
    all: ["parent", "teacher"],
  };

  const roles = audienceRoles[audience];
  if (!roles) {
    throw new Error("Invalid announcement audience.");
  }

  const recipients = await User.findAll({
    where: {
      role: { [Op.in]: roles },
      status: "active",
    },
    attributes: ["id"],
  });

  if (!recipients.length) {
    return [];
  }

  const announcementMetadata = {
    ...(metadata || {}),
    kind: "announcement",
    audience,
  };

  return Promise.all(
    recipients.map((recipient) =>
      notifyUser(recipient.id, "system", title, message, announcementMetadata),
    ),
  );
};

module.exports = {
  notificationHub,
  emitNotification,
  notifyUser,
  notifyParentsForStudent,
  notifyAudience,
};

const { Op } = require("sequelize");
const { Notification } = require("../models");
const { notificationHub, notifyAudience } = require("../services/notificationService");
const { ok, fail } = require("../utils/response");

const listMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const sinceMinutes = Number(req.query.sinceMinutes || 0);
    const where = { userId: req.user.id };

    if (Number.isFinite(sinceMinutes) && sinceMinutes > 0) {
      where.createdAt = { [Op.gte]: new Date(Date.now() - sinceMinutes * 60 * 1000) };
    }

    const notifications = await Notification.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
    });
    return ok(res, notifications);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) return fail(res, "Notification not found", 404);

    notification.isRead = true;
    await notification.save();
    return ok(res, notification, "Notification marked as read");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const streamNotifications = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (res.flushHeaders) res.flushHeaders();

  const userId = req.user.id;
  const onNotification = (notification) => {
    res.write("event: notification\n");
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
  };

  notificationHub.on(`user:${userId}`, onNotification);
  res.write("event: ready\n");
  res.write("data: {}\n\n");

  const heartbeat = setInterval(() => {
    res.write("event: ping\n");
    res.write("data: {}\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    notificationHub.off(`user:${userId}`, onNotification);
    res.end();
  });
};

const createAnnouncement = async (req, res) => {
  try {
    const audience = req.body.audience || "all";
    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();

    if (!title || !message) {
      return fail(res, "Title and message are required.", 400);
    }

    const notifications = await notifyAudience({
      audience,
      title,
      message,
      metadata: {
        createdById: req.user.id,
        createdByName: req.user.fullName,
        createdByRole: req.user.role,
      },
    });

    return ok(
      res,
      {
        audience,
        sentCount: notifications.length,
      },
      notifications.length
        ? "Announcement sent successfully."
        : "Announcement saved but no matching recipients were found.",
    );
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

module.exports = { listMyNotifications, markNotificationRead, streamNotifications, createAnnouncement };

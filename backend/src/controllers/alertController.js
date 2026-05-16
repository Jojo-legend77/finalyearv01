const { Op } = require("sequelize");
const { Alert, Student } = require("../models");
const { ok, fail } = require("../utils/response");
const { alertHub, forwardAlertToParents } = require("../services/alertService");

const isSchemaDriftError = (error) => {
  const code = error?.original?.code || error?.parent?.code;
  return code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR";
};

const listMyAlerts = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 200);
    const alerts = await Alert.findAll({
      where: {
        recipientId: req.user.id,
        recipientRole: req.user.role,
      },
      include: [{ model: Student, as: "student" }],
      order: [["createdAt", "DESC"]],
      limit,
    });

    return ok(res, alerts);
  } catch (error) {
    if (isSchemaDriftError(error)) {
      // Keep clients usable when backend code is newer than DB schema.
      return ok(res, []);
    }
    return fail(res, error.message, 500);
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const where = {
      recipientId: req.user.id,
      recipientRole: req.user.role,
    };

    if (req.user.role === "teacher") {
      where.status = "new";
    } else {
      where.isRead = false;
    }

    const total = await Alert.count({ where });
    return ok(res, { total });
  } catch (error) {
    if (isSchemaDriftError(error)) {
      // Avoid breaking dashboard badges when alerts table/migrations are missing.
      return ok(res, { total: 0 });
    }
    return fail(res, error.message, 500);
  }
};

const markAlertRead = async (req, res) => {
  try {
    const alert = await Alert.findOne({
      where: {
        id: req.params.id,
        recipientId: req.user.id,
        recipientRole: req.user.role,
      },
    });

    if (!alert) return fail(res, "Alert not found", 404);

    alert.isRead = true;
    await alert.save();
    return ok(res, alert, "Alert marked as read");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const handleAlert = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return fail(res, "Only teachers can handle alerts", 403);
    }

    const alert = await Alert.findOne({
      where: {
        id: req.params.id,
        recipientId: req.user.id,
        recipientRole: "teacher",
      },
    });

    if (!alert) return fail(res, "Alert not found", 404);

    if (alert.status === "forwarded") {
      return fail(res, "Alert already forwarded", 400);
    }

    alert.status = "handled";
    alert.handledAt = new Date();
    alert.isRead = true;
    await alert.save();

    return ok(res, alert, "Alert marked as handled");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const forwardAlert = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return fail(res, "Only teachers can forward alerts", 403);
    }

    const alert = await Alert.findOne({
      where: {
        id: req.params.id,
        recipientId: req.user.id,
        recipientRole: "teacher",
      },
    });

    if (!alert) return fail(res, "Alert not found", 404);

    if (alert.status === "forwarded") {
      return fail(res, "Alert already forwarded", 400);
    }

    if (alert.status === "handled") {
      return fail(res, "Alert already handled", 400);
    }

    const note = String(req.body?.note || "").trim();
    const forwardedAlerts = await forwardAlertToParents(alert, note);

    if (!forwardedAlerts.length) {
      return fail(res, "No parents linked to this student", 400);
    }

    alert.status = "forwarded";
    alert.forwardedAt = new Date();
    alert.isRead = true;
    await alert.save();

    return ok(res, { forwarded: forwardedAlerts.length }, "Alert forwarded to parents");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const streamAlerts = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (res.flushHeaders) res.flushHeaders();

  const userId = req.user.id;
  const onAlert = (alert) => {
    res.write("event: alert\n");
    res.write(`data: ${JSON.stringify(alert)}\n\n`);
  };

  alertHub.on(`user:${userId}`, onAlert);
  res.write("event: ready\n");
  res.write("data: {}\n\n");

  const heartbeat = setInterval(() => {
    res.write("event: ping\n");
    res.write("data: {}\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    alertHub.off(`user:${userId}`, onAlert);
    res.end();
  });
};

module.exports = {
  listMyAlerts,
  getUnreadCount,
  markAlertRead,
  handleAlert,
  forwardAlert,
  streamAlerts,
};

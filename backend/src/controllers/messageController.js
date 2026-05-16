const { Op } = require("sequelize");
const {
  MessageThread,
  Message,
  User,
  Student,
  ParentStudent,
  TeacherStudent,
} = require("../models");
const { ok, fail } = require("../utils/response");
const { messageHub } = require("../services/messageService");

const buildThreadInclude = () => [
  { model: Student, as: "student", attributes: ["id", "firstName", "lastName", "className", "section"] },
  { model: User, as: "parent", attributes: ["id", "fullName", "email", "role"] },
  { model: User, as: "teacher", attributes: ["id", "fullName", "email", "role"] },
  { model: User, as: "admin", attributes: ["id", "fullName", "email", "role"] },
];

const canAccessThread = (thread, user) =>
  thread.parentId === user.id || thread.teacherId === user.id || thread.adminId === user.id;

const listThreads = async (req, res) => {
  try {
    const threads = await MessageThread.findAll({
      where: {
        [Op.or]: [{ parentId: req.user.id }, { teacherId: req.user.id }, { adminId: req.user.id }],
      },
      include: buildThreadInclude(),
      order: [["lastMessageAt", "DESC"], ["updatedAt", "DESC"]],
    });
    const withUnread = await Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await Message.count({
          where: {
            threadId: thread.id,
            senderId: { [Op.ne]: req.user.id },
            readAt: null,
          },
        });
        return { ...thread.toJSON(), unreadCount };
      }),
    );

    return ok(res, withUnread);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const listThreadMessages = async (req, res) => {
  try {
    const thread = await MessageThread.findByPk(req.params.threadId, {
      include: buildThreadInclude(),
    });
    if (!thread || !canAccessThread(thread, req.user)) {
      return fail(res, "Thread not found", 404);
    }

    const messages = await Message.findAll({
      where: { threadId: thread.id },
      include: [{ model: User, as: "sender", attributes: ["id", "fullName", "role"] }],
      order: [["createdAt", "ASC"]],
    });

    await Message.update(
      { readAt: new Date() },
      {
        where: {
          threadId: thread.id,
          senderId: { [Op.ne]: req.user.id },
          readAt: null,
        },
      },
    );

    return ok(res, { thread, messages });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const ensureStudentThread = async ({ studentId, parentId, teacherId, userId }) => {
  const existing = await MessageThread.findOne({
    where: { type: "student", studentId, parentId, teacherId },
  });
  if (existing) return existing;

  return MessageThread.create({
    type: "student",
    studentId,
    parentId,
    teacherId,
    createdBy: userId,
    lastMessageAt: new Date(),
  });
};

const ensureDirectThread = async ({ teacherId, adminId, userId }) => {
  const existing = await MessageThread.findOne({
    where: { type: "direct", teacherId, adminId },
  });
  if (existing) return existing;

  return MessageThread.create({
    type: "direct",
    teacherId,
    adminId,
    createdBy: userId,
    lastMessageAt: new Date(),
  });
};

const sendMessage = async (req, res) => {
  try {
    const { body, studentId, teacherId, parentId, adminId, threadId } = req.body;
    if (!body || !body.trim()) return fail(res, "Message body is required", 400);

    let thread = null;
    if (threadId) {
      thread = await MessageThread.findByPk(threadId);
      if (!thread || !canAccessThread(thread, req.user)) {
        return fail(res, "Thread not found", 404);
      }
    } else if (studentId) {
      if (!['parent', 'teacher'].includes(req.user.role)) {
        return fail(res, "Only parents and teachers can message in student threads", 403);
      }
      if (!teacherId || !parentId) return fail(res, "teacherId and parentId are required", 400);

      if (req.user.role === "parent" && parentId !== req.user.id) {
        return fail(res, "Invalid parent selection", 403);
      }
      if (req.user.role === "teacher" && teacherId !== req.user.id) {
        return fail(res, "Invalid teacher selection", 403);
      }

      const parentLink = await ParentStudent.findOne({ where: { parentId, studentId } });
      const teacherLink = await TeacherStudent.findOne({ where: { teacherId, studentId } });
      if (!parentLink || !teacherLink) {
        return fail(res, "Parent and teacher must be linked to the student", 403);
      }

      thread = await ensureStudentThread({ studentId, parentId, teacherId, userId: req.user.id });
    } else {
      if (!['teacher', 'admin'].includes(req.user.role)) {
        return fail(res, "Only teachers and admins can message directly", 403);
      }
      if (!teacherId || !adminId) return fail(res, "teacherId and adminId are required", 400);

      if (req.user.role === "teacher" && teacherId !== req.user.id) {
        return fail(res, "Invalid teacher selection", 403);
      }
      if (req.user.role === "admin" && adminId !== req.user.id) {
        return fail(res, "Invalid admin selection", 403);
      }

      thread = await ensureDirectThread({ teacherId, adminId, userId: req.user.id });
    }

    const receiverId =
      req.user.id === thread.parentId
        ? thread.teacherId
        : req.user.id === thread.teacherId
        ? thread.parentId || thread.adminId
        : req.user.id === thread.adminId
        ? thread.teacherId
        : null;

    if (!receiverId) return fail(res, "Unable to resolve recipient", 400);

    const message = await Message.create({
      threadId: thread.id,
      senderId: req.user.id,
      body: body.trim(),
    });

    await thread.update({ lastMessageAt: message.createdAt });

    messageHub.emit(`user:${receiverId}`, {
      id: message.id,
      threadId: thread.id,
      senderId: message.senderId,
      receiverId,
      body: message.body,
      createdAt: message.createdAt,
    });

    return ok(res, { message, threadId: thread.id }, "Message sent");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const streamMessages = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (res.flushHeaders) res.flushHeaders();

  const userId = req.user.id;
  const onMessage = (payload) => {
    res.write("event: message\n");
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  messageHub.on(`user:${userId}`, onMessage);
  res.write("event: ready\n");
  res.write("data: {}\n\n");

  const heartbeat = setInterval(() => {
    res.write("event: ping\n");
    res.write("data: {}\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    messageHub.off(`user:${userId}`, onMessage);
    res.end();
  });
};

const markThreadRead = async (req, res) => {
  try {
    const thread = await MessageThread.findByPk(req.params.threadId);
    if (!thread || !canAccessThread(thread, req.user)) {
      return fail(res, "Thread not found", 404);
    }

    await Message.update(
      { readAt: new Date() },
      {
        where: {
          threadId: thread.id,
          senderId: { [Op.ne]: req.user.id },
          readAt: null,
        },
      },
    );

    return ok(res, null, "Marked as read");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const unreadCount = async (req, res) => {
  try {
    const threads = await MessageThread.findAll({
      where: {
        [Op.or]: [{ parentId: req.user.id }, { teacherId: req.user.id }, { adminId: req.user.id }],
      },
      attributes: ["id"],
    });
    const threadIds = threads.map((thread) => thread.id);
    if (!threadIds.length) return ok(res, { total: 0 });

    const total = await Message.count({
      where: {
        threadId: { [Op.in]: threadIds },
        senderId: { [Op.ne]: req.user.id },
        readAt: null,
      },
    });

    return ok(res, { total });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const listContacts = async (req, res) => {
  try {
    if (req.user.role === "parent") {
      const parentLinks = await ParentStudent.findAll({
        where: { parentId: req.user.id },
        include: [{ model: Student, as: "student" }],
      });
      const studentIds = parentLinks.map((link) => link.studentId);
      const teacherLinks = await TeacherStudent.findAll({
        where: { studentId: { [Op.in]: studentIds } },
        include: [{ model: User, as: "teacher" }],
      });

      const studentThreads = teacherLinks.map((link) => {
        const student = parentLinks.find((item) => item.studentId === link.studentId)?.student;
        return {
          student,
          teacher: link.teacher,
          parent: { id: req.user.id, fullName: req.user.fullName },
        };
      });

      return ok(res, { studentThreads, directThreads: [] });
    }

    if (req.user.role === "teacher") {
      const teacherLinks = await TeacherStudent.findAll({
        where: { teacherId: req.user.id },
        include: [{ model: Student, as: "student" }],
      });
      const studentIds = teacherLinks.map((link) => link.studentId);
      const parentLinks = await ParentStudent.findAll({
        where: { studentId: { [Op.in]: studentIds } },
        include: [{ model: User, as: "parent" }],
      });

      const studentThreads = parentLinks.map((link) => {
        const student = teacherLinks.find((item) => item.studentId === link.studentId)?.student;
        return {
          student,
          parent: link.parent,
          teacher: { id: req.user.id, fullName: req.user.fullName },
        };
      });

      const admins = await User.findAll({ where: { role: "admin" } });
      const directThreads = admins.map((admin) => ({
        teacher: { id: req.user.id, fullName: req.user.fullName },
        admin,
      }));

      return ok(res, { studentThreads, directThreads });
    }

    if (req.user.role === "admin") {
      const teachers = await User.findAll({ where: { role: "teacher" } });
      const directThreads = teachers.map((teacher) => ({
        teacher,
        admin: { id: req.user.id, fullName: req.user.fullName },
      }));
      return ok(res, { studentThreads: [], directThreads });
    }

    return ok(res, { studentThreads: [], directThreads: [] });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

module.exports = {
  listThreads,
  listThreadMessages,
  sendMessage,
  streamMessages,
  listContacts,
  markThreadRead,
  unreadCount,
};

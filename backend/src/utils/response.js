const ok = (res, data = null, message = "OK", status = 200) =>
  res.status(status).json({
    success: true,
    message,
    data,
  });

const created = (res, data = null, message = "Created") => ok(res, data, message, 201);

const fail = (res, message = "Request failed", status = 400, details = null) =>
  res.status(status).json({
    success: false,
    message,
    details,
  });

module.exports = {
  ok,
  created,
  fail,
};

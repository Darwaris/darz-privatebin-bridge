module.exports = function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "darz-privatebin-bridge",
    message: "API is working perfectly 🚀",
    time: new Date().toISOString()
  });
};

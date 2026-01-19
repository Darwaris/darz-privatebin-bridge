module.exports = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Darz PrivateBin bridge is LIVE 🚀",
    time: new Date().toISOString()
  });
};

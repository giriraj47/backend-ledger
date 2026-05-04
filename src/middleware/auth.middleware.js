const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blacklist.model");

async function authMiddleware(req, res, next) {
  const token =
    req.cookies.jwt_token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
      status: "failed",
    });
  }

  const blacklistedToken = await tokenBlacklistModel.findOne({ token });

  if (blacklistedToken) {
    return res.status(401).json({
      message: "Unauthorized, token is blacklisted",
      status: "failed",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.id);

    req.user = user;

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized",
      error: error.message,
      status: "failed",
    });
  }
}

async function authSystemUserMiddleware(req, res, next) {
  const token =
    req.cookies.jwt_token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
      status: "failed",
    });
  }

  const blacklistedToken = await tokenBlacklistModel.findOne({ token });

  if (blacklistedToken) {
    return res.status(401).json({
      message: "Unauthorized, token is blacklisted",
      status: "failed",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id).select("+systemUser");

    if (!user.systemUser) {
      return res.status(403).json({
        message: "Forbidden access not a system user.",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorised access, token is invalid",
      error,
    });
  }
}

module.exports = { authMiddleware, authSystemUserMiddleware };

const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const { sendRegisterationEmail } = require("../services/email.service");
const tokenBlacklistModel = require("../models/blacklist.model");

/**
 * - user register controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
  const { email, password, name } = req.body;

  const userExists = await userModel.findOne({
    email: email,
  });

  if (userExists) {
    return res.status(422).json({
      message: "User alredy exits with this email",
      status: "failed",
    });
  }

  const user = await userModel.create({
    email,
    password,
    name,
  });

  const token = jwt.sign(
    {
      id: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "3d" },
  );

  res.cookie("jwt_token", token);

  res.status(201).json({
    message: "User created successfully",
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
    },
  });

  await sendRegistrationEmail(user.email, user.name);
}

/**
 * - user login controller
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "invalid email",
    });
  }

  const validPassword = await user.comparePassword(password);

  if (!validPassword) {
    return res.status(401).json({
      message: "invalid password",
    });
  }

  const token = jwt.sign(
    {
      id: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "3d" },
  );
  res.cookie("jwt_token", token);

  res.status(200).json({
    message: "User logged-in successfully",
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
    },
  });
}

/**
 * - user logout controller
 * - POST /api/auth/logout
 */

async function userLogoutController(req, res) {
  const token =
    req.cookies.jwt_token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(200).json({
      message: "User logged-out successfully",
    });
  }

  res.cookie("jwt_token", "");

  await tokenBlacklistModel.create({
    token,
  });

  res.status(200).json({
    message: "User logged-out successfully",
  });
}

module.exports = {
  userRegisterController,
  userLoginController,
  userLogoutController,
};

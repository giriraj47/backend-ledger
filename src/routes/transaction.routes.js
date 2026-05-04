const express = require("express");
const {
  authMiddleware,
  authSystemUserMiddleware,
} = require("../middleware/auth.middleware");
const {
  createTransaction,
  createInitialFundsTransaction,
} = require("../controllers/transaction.controller");
const { models } = require("mongoose");

const transactionRoutes = express.Router();

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */
transactionRoutes.post("/", authMiddleware, createTransaction);

/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */

transactionRoutes.post(
  "/system/initial-fund",
  authSystemUserMiddleware,
  createInitialFundsTransaction,
);

module.exports = transactionRoutes;

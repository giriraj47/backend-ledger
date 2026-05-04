const trnsactionModel = require("../models/transaction.model");
const accountModel = require("../models/account.model");
const ledgerModel = require("../models/ledger.model");
const emailService = require("../services/email.service");
const transactionModel = require("../models/transaction.model");
const mongoose = require("mongoose");

async function createTransaction(req, res) {
  /**
   * 1. Validate Request
   */
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount,
  });
  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!fromUserAccount || !toUserAccount) {
    return res.status(400).json({
      message: "Inavalid fromAccount or toAccount",
    });
  }

  /**
   * 2. Validate idempotency key
   */
  const transactionExists = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (transactionExists) {
    if (transactionExists.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: transactionExists,
      });
    }
    if (transactionExists.status === "PENDING") {
      return res.status(202).json({
        message: "Transaction under process",
      });
    }
    if (transactionExists.status === "FAILED") {
      return res.status(500).json({
        message: "Transaction failed",
      });
    }
    if (transactionExists.status === "REVERSED") {
      return res.status(500).json({
        message: "Transaction was reversed",
      });
    }
  }

  /**
   * 3. Check account status
   */

  if (
    fromUserAccount.status !== "ACTIVE" ||
    toUserAccount.status !== "ACTIVE"
  ) {
    return res.status(400).json({
      message: "Both account should be active",
    });
  }

  /**
   * 4. Derive sender blalnce from ledger
   */
  const balance = await fromUserAccount.getBalance();
  console.log(balance);

  if (balance < amount) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`,
    });
  }
  let transaction;
  try {
    /**
     * 5 Create tansaction (PENDING)
     * 6 Create Debit Ledger Entry
     * 7 Create Credit Ledger Entry
     * 8 Mark transaction COMPLETE
     * 9 Complete session
     */

    const session = await mongoose.startSession();
    session.startTransaction();

    transaction = (
      await transactionModel.create(
        [
          {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING",
          },
        ],
        { session },
      )
    )[0];

    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromAccount,
          amount: amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );

    await (() => {
      return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
    })();

    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount: amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session },
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    return res.status(400).json({
      message: "Transaction is already in process with same idempotency key.",
    });
  }
  /**
   * 10 Send email to users
   */

  await emailService.sendRegistrationEmail(
    req.user.email,
    req.user.name,
    amount,
    toUserAccount,
  );

  return res.status(201).json({
    message: "Transaction completed successfully",
    transaction: transaction,
  });
}

async function createInitialFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!toUserAccount) {
    return res.status(400).json({
      message: "Inavalid fromAccount or toAccount",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    user: req.user._id,
  });

  if (!fromUserAccount) {
    return res.status(400).json({
      message: "System user account not found",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const transaction = new transactionModel({
    fromAccount: fromUserAccount._id,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING",
  });

  const debitLedgerEntry = await ledgerModel.create(
    [
      {
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT",
      },
    ],
    { session },
  );

  const creditLedgerEntry = await ledgerModel.create(
    [
      {
        account: toUserAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT",
      },
    ],
    { session },
  );

  transaction.status = "COMPLETED";
  await transaction.save({ session });

  await session.commitTransaction();
  session.endSession();

  return res.status(201).json({
    message: "Initial funds transaction completed successfully",
    transaction: transaction,
  });
}

module.exports = { createTransaction, createInitialFundsTransaction };

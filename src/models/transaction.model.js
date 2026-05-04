const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account",
      required: [true, "Transaction must have a source account"],
      index: true,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account",
      required: [true, "Transaction must have a source account"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
        message: "Status can be either PENDING, COMPLETED or FAILED",
      },
      default: "PENDING",
    },
    amount: {
      type: Number,
      required: [true, "Transaction must have an amount"],
      min: [0.01, "Amount must be greater than 0"],
    },
    idempotencyKey: {
      type: String,
      required: [true, "Transaction must have an idempotency key"],
      index: true,
      unique: true,
    },
  },
  { timestamps: true },
);

const transactionModel = mongoose.model("transaction", transactionSchema);

module.exports = transactionModel;

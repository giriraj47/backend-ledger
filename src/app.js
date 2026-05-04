const express = require("express");
const cookieparser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(cookieparser());
/**
 * - Routes require
 */
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes");
const transactionRoutes = require("./routes/transaction.routes");

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Ledger API",
  });
});

/**
 * -Use Routes
 */
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRoutes);

module.exports = app;

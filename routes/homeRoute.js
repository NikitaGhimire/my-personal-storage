const express = require("express");
const homeRouter = express.Router();

// Define a home route
homeRouter.get("/", (req, res) => {
  res.render("home");
});

module.exports = homeRouter;

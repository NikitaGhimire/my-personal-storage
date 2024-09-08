const express = require("express");
const homeRouter = require("./routes/homeRoute");
const { authRouter } = require("./routes/auth");
const session = require("express-session");
const folderRouter = require("./routes/folderRoute");
const fileRouter = require("./routes/fileRoute");
const app = express();
require("dotenv").config();
const path = require("path");

//set the view  engine to ejs
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//middleware to parse JSON

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your-secret-key", // Replace with a secure secret in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Use 'true' when using HTTPS in production
  })
);
//displaying logged in user status
app.use((req, res, next) => {
  res.locals.userId = req.session.userId || null;
  next();
});
// Middleware to remove or adjust the Permissions-Policy header
app.use((req, res, next) => {
  res.removeHeader("Permissions-Policy");
  next();
});

//using the route
app.use("/", homeRouter);
app.use("/", authRouter);
app.use("/", folderRouter);
app.use("/", fileRouter);

//start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

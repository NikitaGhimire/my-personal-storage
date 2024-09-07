const express = require("express");
const authRouter = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

//Render a create user form page
authRouter.get("/create-user", (req, res) => {
  res.render("createUser");
});

//handle user creation
authRouter.post("/create-user", async (req, res) => {
  const { email, password } = req.body;

  // Log the incoming data for debugging
  console.log("Email:", email);
  console.log("Password:", password);

  if (!email || !password) {
    return res.status(400).send("Email and password are required");
  }

  try {
    //creating user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
      },
    });
    //redirect to home or login page
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating user");
  }
});

// Render login form
authRouter.get("/login", (req, res) => {
  res.render("login");
});

//post handle login logic
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    //find the user
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    //if user not found send an error
    if (!user) {
      return res.status(400).send("Invalid email or password");
    }

    //compare password and hashedpassword
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send("Invalid email or password");
    }

    //if correct and match, create a session and log in the user
    req.session.userId = user.id;
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error logging in");
  }
});

// Handle user logout
authRouter.get("/logout", (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error logging out");
    }

    // Optionally, clear the cookie
    res.clearCookie("connect.sid"); // This is the default session cookie name

    // Redirect to the home or login page after logging out
    res.redirect("/");
  });
});

///////Midlleware to restrict access to logged in users
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

module.exports = { authRouter, requireLogin };

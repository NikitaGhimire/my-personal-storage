const express = require("express");
const authRouter = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const upload = require("../config/upload");

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

module.exports = authRouter;

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
// Render the upload form with folders
authRouter.get("/upload", requireLogin, async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.session.userId },
    });
    res.render("upload", { folders: folders });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching folders");
  }
});

//handle file uploads
authRouter.post(
  "/upload",
  requireLogin,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).send("No file uploaded.");
      }

      // Optionally, store file information in the database, including the user who uploaded it
      await prisma.file.create({
        data: {
          userId: req.session.userId,
          filename: file.filename,
          filePath: file.path,
          mimeType: file.mimetype,
        },
      });

      res.send("File uploaded successfully!");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error uploading file");
    }
  }
);

// Render create folder form
authRouter.get("/create-folder", requireLogin, (req, res) => {
  res.render("createFolder"); // Make sure you have 'createFolder.ejs' in your views folder
});

// Handle folder creation
authRouter.post("/create-folder", requireLogin, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).send("Folder name is required");
  }

  try {
    await prisma.folder.create({
      data: {
        name: name,
        userId: req.session.userId,
      },
    });
    res.redirect("/"); // Redirect to a list of folders or home page
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating folder");
  }
});

authRouter.post(
  "/upload",
  requireLogin,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const { folderId } = req.body;

      if (!file) {
        return res.status(400).send("No file uploaded.");
      }

      await prisma.file.create({
        data: {
          userId: req.session.userId,
          filename: file.filename,
          filePath: file.path,
          mimeType: file.mimetype,
          folderId: folderId || null, // Associate file with a folder if provided
        },
      });

      res.send("File uploaded successfully!");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error uploading file");
    }
  }
);

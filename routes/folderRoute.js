// folderRouter.js
const express = require("express");
const folderRouter = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const requireLogin = require("./auth").requireLogin; // Middleware from authRouter.js

// Render create folder form
folderRouter.get("/create-folder", requireLogin, (req, res) => {
  res.render("createFolder");
});

// Handle folder creation
folderRouter.post("/create-folder", requireLogin, async (req, res) => {
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

// Handle folder rename (Update)
folderRouter.post("/folder/:folderId/edit", requireLogin, async (req, res) => {
  const { folderId } = req.params;
  const { newFolderName } = req.body;

  if (!newFolderName || newFolderName.trim() === "") {
    return res.status(400).send("Folder name cannot be empty.");
  }

  try {
    await prisma.folder.update({
      where: { id: parseInt(folderId) },
      data: { name: newFolderName },
    });
    res.redirect("/");
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).send("Error updating folder.");
  }
});

// Handle folder delete
folderRouter.post(
  "/folder/:folderId/delete",
  requireLogin,
  async (req, res) => {
    const { folderId } = req.params;

    try {
      await prisma.folder.delete({
        where: { id: parseInt(folderId) },
      });
      res.redirect("/");
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).send("Error deleting folder.");
    }
  }
);

// Route to display files in a specific folder
folderRouter.get("/folder/:folderId", requireLogin, async (req, res) => {
  const { folderId } = req.params;

  try {
    // Find the folder and its files
    const folder = await prisma.folder.findUnique({
      where: { id: parseInt(folderId) },
      include: {
        files: true, // Assumes your Prisma schema has a relation between folders and files
      },
    });

    if (!folder) {
      return res.status(404).send("Folder not found");
    }

    // Render a view to show the folder's files
    res.render("folderContents", { folder: folder, files: folder.files });
  } catch (error) {
    console.error("Error fetching folder contents:", error);
    res.status(500).send("Error fetching folder contents");
  }
});

// Route to render a form for sharing a folder
folderRouter.get("/folder/:folderId/share", async (req, res) => {
  try {
    // Fetch the folder to be shared
    const folder = await prisma.folder.findUnique({
      where: {
        id: parseInt(req.params.folderId),
      },
    });

    if (!folder) {
      return res.status(404).send("Folder not found");
    }

    // Fetch all users except the current user (optional)
    const users = await prisma.user.findMany({
      where: {
        NOT: {
          id: req.session.userId, // Exclude the current user from the list
        },
      },
    });
    // Render a form to share the folder (you need to create this form in your views)
    res.render("shareFolderForm", { folder, users });
  } catch (error) {
    console.error("Error fetching folder:", error);
    res.status(500).send("Error fetching folder");
  }
});

// Route to handle the form submission and share the folder
folderRouter.post("/folder/:folderId/share", async (req, res) => {
  const { userIdToShareWith } = req.body; // user ID of the person to share with

  try {
    // Check if the folder exists
    const folder = await prisma.folder.findUnique({
      where: {
        id: parseInt(req.params.folderId),
      },
    });

    if (!folder) {
      return res.status(404).send("Folder not found");
    }

    // Create a new share record
    await prisma.share.create({
      data: {
        folderId: folder.id,
        userId: parseInt(userIdToShareWith),
        // user is implied from userIdToShareWith, no need to explicitly specify
      },
    });

    res.redirect("/"); // Redirect to homepage or wherever appropriate
  } catch (error) {
    console.error("Error sharing folder:", error);
    res.status(500).send("Error sharing folder");
  }
});
// Route to fetch and display shared folders
folderRouter.get("/shared-folders", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    // Fetch the shared folders for the logged-in user
    const sharedFolders = await prisma.share.findMany({
      where: {
        userId: req.session.userId,
      },
      include: {
        folder: true, // Include the folder details
        user: true, // Include user details (who shared the folder)
      },
    });

    res.render("sharedFolder", {
      folders: null, // You might want to fetch user folders as well if needed
      userId: req.session.userId,
      sharedFolders,
    });
  } catch (error) {
    console.error("Error retrieving shared folders:", error);
    res.status(500).send("Error retrieving shared folders");
  }
});

// Route to render a form for sharing a folder
folderRouter.get("/folder/:folderId/share", async (req, res) => {
  try {
    const folder = await prisma.folder.findUnique({
      where: {
        id: parseInt(req.params.folderId),
      },
    });

    if (!folder) {
      return res.status(404).send("Folder not found");
    }

    res.render("shareFolderForm", { folder });
  } catch (error) {
    console.error("Error fetching folder:", error);
    res.status(500).send("Error fetching folder");
  }
});

// Route to handle the form submission and share the folder
folderRouter.post("/folder/:folderId/share", async (req, res) => {
  const { userIdToShareWith } = req.body;

  try {
    const folder = await prisma.folder.findUnique({
      where: {
        id: parseInt(req.params.folderId),
      },
    });

    if (!folder) {
      return res.status(404).send("Folder not found");
    }

    await prisma.share.create({
      data: {
        folderId: folder.id,
        userId: parseInt(userIdToShareWith),
      },
    });

    res.redirect("/"); // Redirect to homepage or wherever appropriate
  } catch (error) {
    console.error("Error sharing folder:", error);
    res.status(500).send("Error sharing folder");
  }
});

module.exports = folderRouter;

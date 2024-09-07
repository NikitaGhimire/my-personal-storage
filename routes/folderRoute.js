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

module.exports = folderRouter;

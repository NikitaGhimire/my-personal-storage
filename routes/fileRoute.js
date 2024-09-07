//file routes

const express = require("express");
const fileRouter = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const upload = require("../config/upload");
const requireLogin = require("./auth").requireLogin;
const path = require("path");
const fs = require("fs");

//render the upload form with folders
fileRouter.get("/upload", requireLogin, async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.session.userId },
    });
    res.render("upload", { folders });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching folders");
  }
});

//handle file uploads
fileRouter.post(
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
          filename: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          folderId: folderId ? parseInt(folderId) : null, // Associate file with a folder if provided
        },
      });

      res.send("File uploaded successfully!");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error uploading file");
    }
  }
);

// Handle file download
fileRouter.get("/file/:fileId/download", requireLogin, async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = await prisma.file.findUnique({
      where: { id: parseInt(fileId) },
    });

    if (!file) {
      return res.status(404).send("File not found");
    }

    // Check if file exists on the server
    const filePath = path.resolve(__dirname, "../", file.filePath); // Adjust path if needed
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found on server");
    }

    res.download(file.filePath, file.filename); // file.filePath is the path to the file, file.filename is the name the file should have when downloaded
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).send("Error downloading file");
  }
});

// Handle file deletion
fileRouter.post("/file/:fileId/delete", async (req, res) => {
  const { fileId } = req.params;

  try {
    // Find the file to delete
    const file = await prisma.file.findUnique({
      where: { id: parseInt(fileId) },
    });

    if (!file) {
      return res.status(404).send("File not found");
    }

    // If using cloud storage, add logic to delete from cloud storage here
    // Example: await cloudinary.uploader.destroy(file.cloudinaryPublicId);

    // Delete the file record from the database
    await prisma.file.delete({
      where: { id: parseInt(fileId) },
    });

    // Redirect back to the folder view or homepage
    res.redirect("back");
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).send("Error deleting file");
  }
});

// Route to display all files for the logged-in user
fileRouter.get("/file/all", requireLogin, async (req, res) => {
  try {
    // Fetch all files for the logged-in user
    const files = await prisma.file.findMany({
      where: {
        userId: req.session.userId, // Assuming each file is associated with a userId
      },
      include: {
        folder: true,
      },
    });

    // Render a view to display all files
    res.render("allFiles", { files, userId: req.session.userId });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).send("Error fetching files");
  }
});

// Display file details
fileRouter.get("/file/:fileId", requireLogin, async (req, res) => {
  const { fileId } = req.params;
  console.log("Fetching details for fileId:", fileId); // Debugging line

  try {
    const file = await prisma.file.findUnique({
      where: { id: parseInt(fileId) },
    });

    if (!file) {
      console.log("File not found"); // Debugging line
      return res.status(404).send("File not found");
    }

    res.render("fileDetails", { file });
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).send("Error fetching file details");
  }
});

module.exports = fileRouter;

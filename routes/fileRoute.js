//file routes

const express = require("express");
const fileRouter = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const upload = require("../config/upload");
const requireLogin = require("./auth").requireLogin;
const path = require("path");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const axios = require("axios");

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
// Handle file uploads
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

      // Upload file to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        folder: folderId
          ? `user_${req.session.userId}/folder_${folderId}`
          : `user_${req.session.userId}`,
      });

      // Check if result.secure_url and result.public_id are valid
      if (!result.secure_url || !result.public_id) {
        return res.status(500).send("Error with Cloudinary upload");
      }

      // Store the file details in the database
      await prisma.file.create({
        data: {
          userId: parseInt(req.session.userId),
          filename: file.originalname || "unknown_filename",
          url: result.secure_url, // Cloudinary URL
          publicId: result.public_id, // Cloudinary public ID
          mimeType: file.mimetype,
          folderId: folderId ? parseInt(folderId) : null,
          // No need to store filePath for Cloudinary files
        },
      });

      res.send("File uploaded successfully to Cloudinary!");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error uploading file to Cloudinary");
    }
  }
);

// Handle file download (only for local files or if applicable)
fileRouter.get("/file/:fileId/download", requireLogin, async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = await prisma.file.findUnique({
      where: { id: parseInt(fileId) },
    });

    if (!file || !file.url) {
      return res.status(404).send("File not found");
    }

    // Download file from Cloudinary
    const response = await axios.get(file.url, { responseType: "stream" });

    // Set appropriate headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`
    );
    res.setHeader("Content-Type", response.headers["content-type"]);

    // Pipe the response data to the client
    response.data.pipe(res);
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

    // Delete from Cloudinary
    if (file.publicId) {
      await cloudinary.uploader.destroy(file.publicId);
    }

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

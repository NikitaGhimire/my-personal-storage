const express = require("express");
const homeRouter = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Define a home route
homeRouter.get("/", async (req, res) => {
  if (!req.session.userId) {
    return res.render("home", { folders: null, userId: null });
  }

  try {
    console.log("Fetching folders for user ID:", req.session.userId); // Debugging line
    // Fetch the folders for the logged-in user
    const folders = await prisma.folder.findMany({
      where: {
        userId: req.session.userId,
      },
      include: {
        files: true, // Also include the files in each folder
      },
    });
    console.log("Folders retrieved:", folders); // Debugging line

    // Pass the folders to the template
    res.render("home", { folders, userId: req.session.userId });
  } catch (error) {
    console.error("Error retrieving folders:", error);
    res.status(500).send("Error retrieving folders");
  }
});

module.exports = homeRouter;

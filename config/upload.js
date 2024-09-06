const multer = require("multer");
const path = require("path");

//set storage option for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

//initialise multer
const upload = multer({ storage: storage });
console.log("Upload object:", upload);

module.exports = upload;

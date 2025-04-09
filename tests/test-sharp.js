const sharp = require("sharp");

const image = sharp("image.png");

image.resize(100, 100).toFile("image2.png");

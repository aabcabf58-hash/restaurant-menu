const QRCode = require("qrcode");
const path = require("path");

const menuUrl =
  "https://restaurant-menu-production-aa8b.up.railway.app/";

const outputPath = path.join(
  __dirname,
  "public",
  "menu-qr.png"
);

QRCode.toFile(
  outputPath,
  menuUrl,
  {
    width: 1000,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  },
  (error) => {
    if (error) {
      console.error(
        "QR Code error:",
        error.message
      );

      return;
    }

    console.log("QR Code created successfully");
    console.log("Saved in public/menu-qr.png");
  }
);
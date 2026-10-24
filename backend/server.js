require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const Url = require("./models/Url");
const urlRoutes = require("./routes/urlRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json());

// API routes.
app.use("/api/urls", urlRoutes);

// Health check.
app.get("/api/health", (req, res) => {
  res.json({
    message: "LinkVault backend is running!",
  });
});

// Redirect route.
// Example: GET /Ab3xYz9
app.get("/:code", async (req, res) => {
  try {
    const url = await Url.findOne({
      shortCode: req.params.code,
    });

    if (!url) {
      return res.status(404).send("Short link not found.");
    }

    // Reject expired links before recording a click.
    if (
      url.expiresAt &&
      url.expiresAt.getTime() <= Date.now()
    ) {
      return res.status(410).send("This short link has expired.");
    }

    // Count the visit only if the link has not expired.
    await Url.updateOne(
      {
        _id: url._id,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } },
        ],
      },
      {
        $inc: { clicks: 1 },
      }
    );

    // Redirect to the original destination.
    return res.redirect(302, url.originalUrl);
  } catch (error) {
    console.error("Redirect error:", error);

    return res.status(500).send("Something went wrong.");
  }
});

// Start only after connecting to MongoDB.
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from the .env file.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB successfully!");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
  console.log(`LinkVault backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();

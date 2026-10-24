const express = require("express");
const { nanoid } = require("nanoid");
const Url = require("../models/Url");

const router = express.Router();

// Validate that a URL uses HTTP or HTTPS.
function isValidUrl(value) {
  try {
    const parsed = new URL(value);

    return (
      (parsed.protocol === "http:" ||
        parsed.protocol === "https:") &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

// POST /api/urls
// Create a new shortened URL.
router.post("/", async (req, res) => {
  try {
    const { originalUrl, expiresAt } = req.body;

    if (
      typeof originalUrl !== "string" ||
      !isValidUrl(originalUrl)
    ) {
      return res.status(400).json({
        error: "Please enter a valid HTTP or HTTPS URL.",
      });
    }

    let expiryDate = null;

    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== "") {
      expiryDate = new Date(expiresAt);

      if (Number.isNaN(expiryDate.getTime())) {
        return res.status(400).json({
          error: "Invalid expiry date.",
        });
      }

      if (expiryDate.getTime() <= Date.now()) {
        return res.status(400).json({
          error: "Expiry date must be in the future.",
        });
      }
    }

    // Try different codes if a collision occurs.
    let savedUrl = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const shortCode = nanoid(7);

      try {
        savedUrl = await Url.create({
          originalUrl,
          shortCode,
          expiresAt: expiryDate,
        });

        break;
      } catch (error) {
        // MongoDB duplicate-key error.
        if (error.code === 11000) {
          continue;
        }

        throw error;
      }
    }

    if (!savedUrl) {
      return res.status(500).json({
        error: "Could not generate a unique short code.",
      });
    }

    return res.status(201).json({
      id: savedUrl._id,
      originalUrl: savedUrl.originalUrl,
      shortCode: savedUrl.shortCode,
      shortUrl: `${process.env.BASE_URL}/${savedUrl.shortCode}`,
      clicks: savedUrl.clicks,
      expiresAt: savedUrl.expiresAt,
      createdAt: savedUrl.createdAt,
    });
  } catch (error) {
    console.error("Create URL error:", error);

    return res.status(500).json({
      error: "Unable to create the short link.",
    });
  }
});

// GET /api/urls
// Retrieve all links for the dashboard.
router.get("/", async (req, res) => {
  try {
    const urls = await Url.find()
      .sort({ createdAt: -1 })
      .lean();

    const result = urls.map((url) => ({
      ...url,
      shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      expired:
        url.expiresAt !== null &&
        url.expiresAt !== undefined &&
        new Date(url.expiresAt).getTime() <= Date.now(),
    }));

    return res.json(result);
  } catch (error) {
    console.error("Fetch URLs error:", error);

    return res.status(500).json({
      error: "Unable to retrieve URLs.",
    });
  }
});

// GET /api/urls/:id/stats
// Retrieve statistics for one URL.
router.get("/:id/stats", async (req, res) => {
  try {
    const url = await Url.findById(req.params.id).lean();

    if (!url) {
      return res.status(404).json({
        error: "Link not found.",
      });
    }

    const expired =
      url.expiresAt !== null &&
      url.expiresAt !== undefined &&
      new Date(url.expiresAt).getTime() <= Date.now();

    return res.json({
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      clicks: url.clicks,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
      expired,
    });
  } catch (error) {
    console.error("Fetch stats error:", error);

    return res.status(500).json({
      error: "Unable to retrieve statistics.",
    });
  }
});

module.exports = router;

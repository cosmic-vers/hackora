const express = require("express");
const { authenticate } = require("../middleware/auth");
const { asyncHandler, badRequest } = require("../middleware/errors");
const { recommend } = require("../services/venueRecommender");

const router = express.Router();

router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const result = await recommend(req.body || {});
      res.json(result);
    } catch (err) {
      throw badRequest(err.message || "Could not generate venue recommendations.");
    }
  })
);

module.exports = router;

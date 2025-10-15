const express = require("express");
const axios = require("axios");
const router = express.Router();

router.post("/", async (req, res) => {
  const { prompt, size = "512x512" } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });
  try {
    const resp = await axios.post(
      "https://api.openai.com/v1/images/generations",
      { model: "gpt-image-1", prompt, n: 1, size },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );
    const url = resp.data?.data?.[0]?.url;
    if (!url) throw new Error("No image URL");
    res.json({ url });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: "Image generation failed" });
  }
});

module.exports = { generateImage: router };

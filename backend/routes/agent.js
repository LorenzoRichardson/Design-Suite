const express = require("express");
const axios = require("axios");
const router = express.Router();

router.post("/", async (req, res) => {
  const { brief } = req.body || {};
  if (!brief) return res.status(400).json({ error: "Missing brief" });
  try {
    const resp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: "You are a layout assistant. Reply ONLY with JSON." },
          { role: "user", content: `For "${brief}", return JSON with {width,height,background,layers:[{id,type,x,y,width,height,text,fontSize,color,prompt}]}` }
        ]
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );
    const content = resp.data?.choices?.[0]?.message?.content || "{}";
    let plan = {};
    try { plan = JSON.parse(content); } catch {}
    if (!plan.width) plan = {
      width: 1000, height: 700, background: "#ffffff",
      layers: [
        { id: "t1", type: "text", x: 60, y: 60, text: "Your Title", fontSize: 48, color: "#111" },
        { id: "i1", type: "image", x: 140, y: 180, width: 500, height: 320, prompt: "abstract geometric background, pastel" }
      ]
    };
    res.json({ plan });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: "Agent failed" });
  }
});

module.exports = { agent: router };

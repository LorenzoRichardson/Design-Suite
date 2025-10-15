require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { generateImage } = require("./routes/images");
const { agent } = require("./routes/agent");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

app.get("/", (_, res) => res.json({ ok: true, v: 2 }));
app.use("/api/image", generateImage);
app.use("/api/agent", agent);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Backend listening on", PORT));

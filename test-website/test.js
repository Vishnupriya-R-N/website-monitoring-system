
const express = require("express");

const app = express();

app.get("/", (req, res) => {
    res.send("My test website is working!");
});

app.listen(3000, () => {
    console.log("Test website running at http://localhost:3000");
});

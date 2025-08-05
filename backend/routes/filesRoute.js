const express = require('express');
const File = require('../models/File');

const router = express.Router();

router.get("/file", async(req, res) => {
    console.log('HElloooo 1');
})

module.exports = router;
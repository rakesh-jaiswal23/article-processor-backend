const express = require("express");
const router = express.Router();
const articleController = require("../controllers/articleController");

router.get("/stats/summary", articleController.getStats);
router.post("/bulk/process", articleController.bulkProcess);
router.post("/scrape/init", articleController.scrapeArticles);

router.get("/", articleController.getAllArticles);
router.get("/:id", articleController.getArticle);
router.post("/", articleController.createArticle);
router.put("/:id", articleController.updateArticle);
router.delete("/:id", articleController.deleteArticle);
router.post("/:id/process", articleController.processArticle);

// Search articles
router.get("/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const articles = await Article.find({
      $or: [
        { originalTitle: { $regex: query, $options: "i" } },
        { originalContent: { $regex: query, $options: "i" } },
      ],
    }).limit(10);

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
router.get("/:id", articleController.getArticle);
module.exports = router;

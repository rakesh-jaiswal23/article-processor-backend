const Article = require('../models/Article');
const scraper = require('../services/scraper');
const googleSearch = require('../services/googleSearch');
const aiService = require('../services/aiService');

class ArticleController {
  // Get all articles
  async getAllArticles(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        sortBy = 'scrapedDate', 
        sortOrder = 'desc' 
      } = req.query;
      
      const query = {};
      if (status) query.status = status;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const skip = (page - 1) * limit;
      
      const [articles, total] = await Promise.all([
        Article.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Article.countDocuments(query)
      ]);
      
      res.status(200).json({
        success: true,
        data: articles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      console.error('Error fetching articles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch articles',
        error: error.message
      });
    }
  }

  // Get single article
  async getArticle(req, res) {
    try {
      const { id } = req.params;
      
      const article = await Article.findById(id).lean();
      
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: article
      });
      
    } catch (error) {
      console.error('Error fetching article:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch article',
        error: error.message
      });
    }
  }

  // Create article manually
  async createArticle(req, res) {
    try {
      const articleData = req.body;
      
      
      const article = new Article(articleData);
      await article.save();
      
      res.status(201).json({
        success: true,
        message: 'Article created successfully',
        data: article
      });
      
    } catch (error) {
      console.error('Error creating article:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create article',
        error: error.message
      });
    }
  }

  // Update article
  async updateArticle(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const article = await Article.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Article updated successfully',
        data: article
      });
      
    } catch (error) {
      console.error('Error updating article:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update article',
        error: error.message
      });
    }
  }

  // Delete article
  async deleteArticle(req, res) {
    try {
      const { id } = req.params;
      
      const article = await Article.findByIdAndDelete(id);
      
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Article deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting article:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete article',
        error: error.message
      });
    }
  }

  // PHASE 1: Scrape and store articles from BeyondChats
  async scrapeArticles(req, res) {
    try {
      console.log(' Starting article scraping from BeyondChats...');
      
      const limit = req.body.limit || 5;
      
      // Scrape articles
      const scrapedArticles = await scraper.scrapeArticles(limit);
      
      if (scrapedArticles.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No articles found to scrape'
        });
      }
      
      // Prepare articles for database
      const articlesToSave = scrapedArticles.map(article => ({
        originalTitle: article.title,
        originalContent: article.content,
        originalUrl: article.url,
        scrapedDate: article.scrapedAt,
        status: 'original'
      }));
      
      // Save to database
      const savedArticles = await Article.insertMany(articlesToSave);
      
      console.log(`✅ Successfully saved ${savedArticles.length} articles to database`);
      
      res.status(201).json({
        success: true,
        message: `Successfully scraped and saved ${savedArticles.length} articles`,
        data: savedArticles
      });
      
    } catch (error) {
      console.error('❌ Error scraping articles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to scrape articles',
        error: error.message
      });
    }
  }

  // PHASE 2: Process article (Google search + AI enhancement)
  async processArticle(req, res) {
    console.log("process")
    let articleId = req.params.id;
    
    try {
      console.log(`🔄 Starting processing for article: ${articleId}`);
      
      // Find article
      const article = await Article.findById(articleId);
      
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }
      
      // Update status to processing
      article.status = 'processing';
      article.processingLogs.push({
        step: 'started',
        status: 'started',
        message: 'Article processing started'
      });
      await article.save();
      
      // Step 1: Google Search
      article.processingLogs.push({
        step: 'google_search',
        status: 'started',
        message: 'Searching Google for similar articles'
      });
      await article.save();
      
      const searchResults = await googleSearch.search(article.originalTitle, 5);
      article.googleSearchResults = searchResults;
      
      article.processingLogs.push({
        step: 'google_search',
        status: 'completed',
        message: `Found ${searchResults.length} search results`
      });
      await article.save();
      
      // Step 2: Scrape reference articles
      article.processingLogs.push({
        step: 'scrape_references',
        status: 'started',
        message: 'Scraping content from reference articles'
      });
      await article.save();
      
      const referenceArticles = [];
      const scrapePromises = searchResults.slice(0, 2).map(async (result) => {
        const scrapedContent = await scraper.scrapeExternalArticle(result.url);
        if (scrapedContent) {
          referenceArticles.push({
            title: scrapedContent.title || result.title,
            url: result.url,
            scrapedContent: scrapedContent.content,
            domain: result.domain
          });
        }
      });
      
      await Promise.allSettled(scrapePromises);
      article.referenceLinks = referenceArticles;
      
      article.processingLogs.push({
        step: 'scrape_references',
        status: 'completed',
        message: `Scraped ${referenceArticles.length} reference articles`
      });
      await article.save();
      
      // Step 3: AI Enhancement
      article.processingLogs.push({
        step: 'ai_enhancement',
        status: 'started',
        message: 'Enhancing article with AI'
      });
      await article.save();
      
      const startTime = Date.now();
      
      const enhancedContent = await aiService.rewriteArticle(
        {
          title: article.originalTitle,
          content: article.originalContent
        },
        referenceArticles
      );
      
      const processingTime = Date.now() - startTime;
      
      // Step 4: Update article with enhanced content
      article.updatedTitle = `Enhanced: ${article.originalTitle}`;
      article.updatedContent = enhancedContent.content || enhancedContent;
      article.status = 'updated';
      article.lastUpdated = new Date();
      article.processingTime = processingTime;
      article.aiModelUsed = enhancedContent.model || 'fallback';
      
      article.processingLogs.push({
        step: 'ai_enhancement',
        status: 'completed',
        message: `Article enhanced using ${article.aiModelUsed} in ${processingTime}ms`
      });
      
      article.processingLogs.push({
        step: 'completed',
        status: 'completed',
        message: 'Article processing completed successfully'
      });
      
      await article.save();
      
      console.log(`✅ Article ${articleId} processed successfully in ${processingTime}ms`);
      
      res.status(200).json({
        success: true,
        message: 'Article processed successfully',
        data: article,
        processingTime: `${processingTime}ms`,
        aiModel: article.aiModelUsed
      });
      
    } catch (error) {
      console.error(`❌ Error processing article ${articleId}:`, error);
      
      // Update article status to failed
      if (articleId) {
        await Article.findByIdAndUpdate(articleId, {
          status: 'failed',
          processingLogs: [{
            step: 'failed',
            status: 'failed',
            message: `Processing failed: ${error.message}`
          }]
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to process article',
        error: error.message
      });
    }
  }

  // Get statistics
  async getStats(req, res) {
    try {
      const stats = await Article.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            original: { $sum: { $cond: [{ $eq: ['$status', 'original'] }, 1, 0] } },
            updated: { $sum: { $cond: [{ $eq: ['$status', 'updated'] }, 1, 0] } },
            processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            avgProcessingTime: { $avg: '$processingTime' },
            totalWords: { $sum: '$wordCount.original' }
          }
        }
      ]);
      
      const recentArticles = await Article.find()
        .sort({ scrapedDate: -1 })
        .limit(5)
        .select('originalTitle status scrapedDate')
        .lean();
      
      res.status(200).json({
        success: true,
        data: {
          summary: stats[0] || {},
          recentArticles
        }
      });
      
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message
      });
    }
  }

  // Bulk process articles
  async bulkProcess(req, res) {
    try {
      const { articleIds } = req.body;
      
      if (!articleIds || !Array.isArray(articleIds)) {
        return res.status(400).json({
          success: false,
          message: 'articleIds array is required'
        });
      }
      
      const results = [];
      
      for (const articleId of articleIds) {
        try {
          // Use setTimeout to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Create a mock request/response for individual processing
          const result = await this.processArticle({
            params: { id: articleId }
          }, {
            status: function(code) {
              return this;
            },
            json: function(data) {
              return data;
            }
          });
          
          results.push({
            articleId,
            success: result.success,
            message: result.message
          });
          
        } catch (error) {
          results.push({
            articleId,
            success: false,
            message: error.message
          });
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Bulk processing completed',
        data: results
      });
      
    } catch (error) {
      console.error('Error in bulk processing:', error);
      res.status(500).json({
        success: false,
        message: 'Bulk processing failed',
        error: error.message
      });
    }
  }
}

module.exports = new ArticleController();
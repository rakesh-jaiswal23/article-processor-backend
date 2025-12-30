const axios = require('axios');
const cheerio = require('cheerio');

class BeyondChatsScraper {
  constructor() {
    this.baseUrl = 'https://beyondchats.com/blogs/';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    };
  }

  async scrapeArticles(limit = 5) {
    try {
      console.log(` Fetching articles from: ${this.baseUrl}`);
      
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const articles = [];

      // Strategy 1: Look for blog posts in common structures
      const selectors = [
        'article', 
        '.blog-post', 
        '.post', 
        '.entry',
        '[class*="blog"]',
        '[class*="post"]',
        '.content-area > div',
        'main > div',
        '.container > div'
      ];

      for (const selector of selectors) {
        const elements = $(selector);
        console.log(` Found ${elements.length} elements with selector: ${selector}`);

        if (elements.length > 0) {
          elements.each((index, element) => {
            if (articles.length >= limit) return false;

            const article = this.extractArticle($, element);
            if (article && article.title && article.content.length > 100) {
              articles.push(article);
            }
          });

          if (articles.length >= limit) break;
        }
      }

      // Strategy 2: If no structured articles found, extract from page content
      if (articles.length === 0) {
        console.log(' No structured articles found, trying content extraction...');
        const fallbackArticle = this.extractFallbackContent($);
        if (fallbackArticle) {
          articles.push(fallbackArticle);
        }
      }

      // Strategy 3: Extract from specific sections (for BeyondChats structure)
      if (articles.length < limit) {
        console.log(' Extracting from specific sections...');
        
        // Try to find blog containers
        const blogContainers = $('[class*="blog"], [class*="post"], [id*="blog"], [id*="post"]');
        
        blogContainers.each((index, container) => {
          if (articles.length >= limit) return false;
          
          // Look for headings and paragraphs within container
          const headings = $(container).find('h1, h2, h3, h4, h5, h6');
          
          headings.each((i, heading) => {
            if (articles.length >= limit) return false;
            
            const title = $(heading).text().trim();
            if (!title || title.length < 10) return;
            
            // Get content after heading
            let content = '';
            let nextElement = $(heading).next();
            
            for (let j = 0; j < 10; j++) { // Get next 10 elements
              if (!nextElement.length) break;
              content += nextElement.text() + '\n\n';
              nextElement = nextElement.next();
            }
            
            if (content.length > 100) {
              articles.push({
                title,
                content: content.trim(),
                url: this.baseUrl,
                scrapedAt: new Date()
              });
            }
          });
        });
      }

      // Get oldest articles (last 5)
      const oldestArticles = articles.slice(-limit);
      
      console.log(` Successfully scraped ${oldestArticles.length} articles`);
      return oldestArticles;

    } catch (error) {
      console.error(' Scraping failed:', error.message);
      throw new Error(`Failed to scrape articles: ${error.message}`);
    }
  }

  extractArticle($, element) {
    try {
      // Extract title
      const titleSelectors = [
        'h1', 'h2', 'h3', '.title', '.entry-title', 
        '.post-title', '.blog-title', '[class*="title"]'
      ];
      
      let title = '';
      for (const selector of titleSelectors) {
        const titleElement = $(element).find(selector).first();
        if (titleElement.length) {
          title = titleElement.text().trim();
          if (title) break;
        }
      }

      // Extract content
      const contentSelectors = [
        '.content', '.entry-content', '.post-content', 
        '.blog-content', '.article-content', 'p'
      ];
      
      let content = '';
      for (const selector of contentSelectors) {
        const contentElements = $(element).find(selector);
        if (contentElements.length) {
          contentElements.each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 20) { // Skip very short paragraphs
              content += text + '\n\n';
            }
          });
          if (content.length > 100) break;
        }
      }

      // If still no content, get all text
      if (content.length < 100) {
        content = $(element).text().trim();
      }

      // Clean content
      content = this.cleanContent(content);

      return {
        title: title || 'Untitled Article',
        content: content,
        url: this.baseUrl,
        scrapedAt: new Date()
      };

    } catch (error) {
      console.error('Error extracting article:', error);
      return null;
    }
  }

  extractFallbackContent($) {
    try {
      // Get all text from main content areas
      const mainSelectors = ['main', '#main', '.main', '#content', '.content', 'body'];
      
      for (const selector of mainSelectors) {
        const element = $(selector).first();
        if (element.length) {
          const text = element.text().trim();
          if (text.length > 500) {
            return {
              title: 'BeyondChats Blog Content',
              content: this.cleanContent(text.substring(0, 5000)),
              url: this.baseUrl,
              scrapedAt: new Date()
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error in fallback extraction:', error);
      return null;
    }
  }

  cleanContent(text) {
    if (!text) return '';
    
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ');
    
    // Remove common unwanted patterns
    const unwantedPatterns = [
      /Read more.*/gi,
      /Continue reading.*/gi,
      /Share this.*/gi,
      /Subscribe.*/gi,
      /Leave a comment.*/gi,
      /\d+\s*min\s*read/gi,
      /Posted on.*/gi,
      /Categories:.*/gi,
      /Tags:.*/gi
    ];
    
    unwantedPatterns.forEach(pattern => {
      text = text.replace(pattern, '');
    });
    
    // Split into paragraphs and filter short ones
    const paragraphs = text.split('\n').filter(p => p.trim().length > 20);
    
    return paragraphs.join('\n\n').trim();
  }

  async scrapeExternalArticle(url) {
    try {
      console.log(` Scraping external article: ${url}`);
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, iframe, form, .sidebar, .comments, .related').remove();
      
      // Extract title
      let title = $('h1').first().text().trim();
      if (!title) {
        title = $('title').text().trim().split('|')[0].trim();
      }
      
      // Extract main content
      let content = '';
      const contentSelectors = [
        'article', 'main', '.post-content', '.article-content',
        '.entry-content', '.content', '[role="main"]', '#content'
      ];
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length) {
          content = element.text().trim();
          if (content.length > 300) break;
        }
      }
      
      // Fallback: Get all paragraphs
      if (content.length < 300) {
        const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
        content = paragraphs.filter(p => p.length > 50).join('\n\n');
      }
      
      // Clean content
      content = this.cleanContent(content);
      
      // Extract domain
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      return {
        title: title || 'External Article',
        content: content.substring(0, 5000), // Limit content length
        url: url,
        domain: domain,
        scrapedAt: new Date()
      };
      
    } catch (error) {
      console.error(` Failed to scrape ${url}:`, error.message);
      return null;
    }
  }
}

module.exports = new BeyondChatsScraper();
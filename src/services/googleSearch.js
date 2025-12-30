const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class GoogleSearchService {
  constructor() {
    this.searchUrl = 'https://www.google.com/search';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  async search(query, limit = 5) {
    let browser = null;
    try {
      console.log(` Searching Google for: "${query}"`);
      
      // Launch browser with stealth mode
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });

      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent(this.userAgent);
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // Navigate to Google
      const searchParams = new URLSearchParams({
        q: query,
        hl: 'en',
        gl: 'us',
        gws_rd: 'cr'
      });

      await page.goto(`${this.searchUrl}?${searchParams.toString()}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for results to load
      await page.waitForSelector('div.g', { timeout: 10000 });

      // Get search results
      const results = await page.evaluate(() => {
        const items = [];
        const resultElements = document.querySelectorAll('div.g');
        
        resultElements.forEach(result => {
          try {
            // Get title
            const titleElement = result.querySelector('h3');
            if (!titleElement) return;
            
            const title = titleElement.innerText;
            
            // Get URL
            const linkElement = result.querySelector('a');
            if (!linkElement || !linkElement.href) return;
            
            let url = linkElement.href;
            
            // Clean Google redirect URL
            if (url.startsWith('/url?')) {
              const urlParams = new URLSearchParams(url);
              url = urlParams.get('q') || urlParams.get('url');
            }
            
            if (!url || !url.startsWith('http')) return;
            
            // Get snippet
            let snippet = '';
            const snippetElement = result.querySelector('[data-sncf="1"], .VwiC3b, .s3v9rd');
            if (snippetElement) {
              snippet = snippetElement.innerText;
            }
            
            // Filter out Google's own pages and non-article pages
            const excludedDomains = [
              'google.com',
              'youtube.com',
              'facebook.com',
              'twitter.com',
              'linkedin.com',
              'instagram.com',
              'pinterest.com',
              'tiktok.com',
              'wikipedia.org',
              'reddit.com',
              'quora.com'
            ];
            
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            
            if (excludedDomains.some(excluded => domain.includes(excluded))) {
              return;
            }
            
            // Check if it's likely an article/blog
            const isArticle = title.length > 10 && 
                             snippet.length > 20 && 
                             !title.includes('Ad ·') &&
                             !snippet.includes('Sponsored');
            
            if (isArticle) {
              items.push({
                title,
                url,
                snippet,
                domain
              });
            }
          } catch (e) {
            console.error('Error parsing result:', e);
          }
        });
        
        return items;
      });

      // Filter and limit results
      const filteredResults = results
        .filter(result => 
          result.url && 
          result.title && 
          result.url.match(/\.(com|org|net|io|co|blog|dev|info|edu|gov)/i)
        )
        .slice(0, limit);

      console.log(` Found ${filteredResults.length} relevant search results`);
      return filteredResults;

    } catch (error) {
      console.error(' Google search failed:', error.message);
      
      // Fallback: Return mock data for development
      return this.getMockResults(query, limit);
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  getMockResults(query, limit) {
    console.log(' Using mock search results for development');
    
    const mockResults = [
      {
        title: `Understanding ${query} - A Comprehensive Guide`,
        url: 'https://example.com/blog/understanding-topic',
        snippet: `Learn everything you need to know about ${query} with our comprehensive guide covering all aspects of this important topic.`,
        domain: 'example.com'
      },
      {
        title: `${query}: Best Practices and Implementation`,
        url: 'https://techblog.org/implementing-topic',
        snippet: `Discover the best practices for implementing ${query} in your projects with real-world examples and code snippets.`,
        domain: 'techblog.org'
      },
      {
        title: `The Future of ${query} in Modern Applications`,
        url: 'https://futuretech.io/future-of-topic',
        snippet: `Explore how ${query} is shaping the future of technology and what trends you should watch in the coming years.`,
        domain: 'futuretech.io'
      },
      {
        title: `${query} Explained: From Basics to Advanced Concepts`,
        url: 'https://learninghub.com/topic-explained',
        snippet: `This complete guide explains ${query} from basic concepts to advanced implementations with practical examples.`,
        domain: 'learninghub.com'
      },
      {
        title: `Why ${query} Matters in Today's Digital World`,
        url: 'https://digitalinsights.net/why-topic-matters',
        snippet: `An in-depth analysis of why ${query} is crucial for modern businesses and how it impacts digital transformation.`,
        domain: 'digitalinsights.net'
      }
    ];
    
    return mockResults.slice(0, limit);
  }
}

module.exports = new GoogleSearchService();
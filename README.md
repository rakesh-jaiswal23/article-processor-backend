# Article Processor Backend

A scalable Node.js backend service for scraping, storing, and processing blog articles.  
This project is built as part of a multi-phase technical assignment focusing on web scraping, API design, and backend engineering best practices.

---

## 🚀 Features

- Scrapes blog articles from external sources
- Stores articles securely in MongoDB Atlas
- RESTful CRUD APIs for managing articles
- Rate limiting & security headers
- Environment-based configuration
- Ready for cloud deployment (Render)

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js  
- **Database:** MongoDB Atlas, Mongoose  
- **Scraping:** Axios, Cheerio, Puppeteer  
- **Security:** Helmet, Express Rate Limit, CORS  
- **Tools:** Nodemon, Jest  

---

## 📂 Project Structure

article-processor-backend/
│
├── src/
│ ├── app.js
│ ├── routes/
│ ├── controllers/
│ ├── models/
│ └── utils/
│
├── package.json
├── .env.example
└── README.md

yaml
Copy code

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI= not iclude due to security risk

# AI Service APIs (Get free API keys from these platforms)
HF_API_KEY=not iclude due to security risk




# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Timeouts (in milliseconds)
REQUEST_TIMEOUT=30000
GOOGLE_SEARCH_TIMEOUT=30000
AI_PROCESSING_TIMEOUT=60000

▶️ Getting Started (Local Setup)
bash
Copy code
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
Server will start at:

arduino
Copy code
http://localhost:5000
📡 API Endpoints (Sample)
Method	Endpoint	Description
GET	/api/articles	Fetch all articles
GET	/api/articles/:id	Fetch article by ID
POST	/api/articles	Create new article
PUT	/api/articles/:id	Update article
DELETE	/api/articles/:id	Delete article

🌐 Deployment
This project is deployed using Render and connected to MongoDB Atlas.

Deployment steps:

Push code to GitHub

Create a Web Service on Render

Add environment variables

Deploy

🔐 Security Notes
API rate limiting enabled

HTTP headers secured using Helmet

CORS configured for controlled access



👨‍💻 Author
Rakesh
Fullstack Developer | Node.js | MongoDB |React js |Next js

📄 License
This project is licensed for educational and evaluation purposes.
const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  // Original Article Details
  originalTitle: {
    type: String,
    required: [true, 'Article title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  originalContent: {
    type: String,
    required: [true, 'Article content is required']
  },
  originalUrl: {
    type: String,
    required: [true, 'Source URL is required'],
    trim: true
  },
  
  // Updated Article Details
  updatedTitle: {
    type: String,
    trim: true,
    maxlength: [500, 'Updated title cannot exceed 500 characters']
  },
  updatedContent: {
    type: String
  },
  
  // Metadata
  scrapedDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date
  },
  status: {
    type: String,
    enum: ['original', 'updated', 'processing', 'failed'],
    default: 'original',
    index: true
  },
  
  // Google Search Results
  googleSearchResults: [{
    title: String,
    url: {
      type: String,
      validate: {
        validator: function(v) {
          return /^(https?:\/\/)/.test(v);
        },
        message: 'URL must start with http:// or https://'
      }
    },
    snippet: String,
    scrapedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reference Articles
  referenceLinks: [{
    title: String,
    url: {
      type: String,
      validate: {
        validator: function(v) {
          return /^(https?:\/\/)/.test(v);
        },
        message: 'URL must start with http:// or https://'
      }
    },
    scrapedContent: String,
    domain: String,
    scrapedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Processing Metadata
  processingLogs: [{
    step: String,
    status: {
      type: String,
      enum: ['started', 'completed', 'failed']
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // SEO Metadata
  keywords: [String],
  wordCount: {
    original: Number,
    updated: Number
  },
  
  // Performance Metrics
  processingTime: Number,
  aiModelUsed: String
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
articleSchema.index({ status: 1, scrapedDate: -1 });
articleSchema.index({ 'originalTitle': 'text', 'originalContent': 'text' });
articleSchema.index({ lastUpdated: -1 });

// Virtual for reading time
articleSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const originalWords = this.originalContent.split(/\s+/).length;
  return Math.ceil(originalWords / wordsPerMinute);
});

// Middleware to update word counts
articleSchema.pre('save', function(next) {
  if (this.originalContent && this.isModified('originalContent')) {
    this.wordCount = {
      original: this.originalContent.split(/\s+/).length,
      updated: this.updatedContent ? this.updatedContent.split(/\s+/).length : null
    };
  }
  next();
});

// Method to add processing log
articleSchema.methods.addLog = function(step, status, message) {
  this.processingLogs.push({ step, status, message });
  return this.save();
};

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
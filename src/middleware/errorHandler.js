const errorHandler = (err, req, res, next) => {
  console.error('🔴 Error:', err.stack);
  
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }
  
  // Axios error
  if (err.isAxiosError) {
    statusCode = err.response?.status || 500;
    message = err.response?.data?.message || err.message;
  }
  
  // Rate limit error
  if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too many requests, please try again later';
  }
  
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
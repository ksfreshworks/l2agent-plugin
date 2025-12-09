require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const llmService = require('./services/llm');

const app = express();
const PORT = config.port || 3000;

// Middleware
app.use(cors({
  origin: config.allowedOrigins || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// LLM connectivity check endpoint
app.get('/health/llm', async (req, res) => {
  try {
    const llmStatus = await llmService.checkConnection();
    res.status(llmStatus.connected ? 200 : 503).json({
      ...llmStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env || 'development',
    version: '1.0.0',
    services: {
      api: 'ok',
      llm: {
        configured: !!config.llm.apiUrl,
        url: config.llm.apiUrl || 'not configured'
      }
    }
  };

  // Test LLM connectivity if configured
  if (config.llm.apiUrl) {
    try {
      const llmStatus = await llmService.checkConnection();
      health.services.llm = {
        ...health.services.llm,
        ...llmStatus
      };
    } catch (error) {
      health.services.llm.status = 'error';
      health.services.llm.error = error.message;
    }
  } else {
    health.services.llm.status = 'not configured';
  }

  res.status(200).json(health);
});

// Serve dashboard for root and non-API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                 L2 Agent Backend Server                  ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  🚀 Server running on port ${PORT}                           ║`);
  console.log(`║  📊 Dashboard: http://localhost:${PORT}/                      ║`);
  console.log(`║  🔌 API Base:  http://localhost:${PORT}/api                   ║`);
  console.log(`║  💚 Health:    http://localhost:${PORT}/health                ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Environment: ${(config.env || 'development').padEnd(40)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});


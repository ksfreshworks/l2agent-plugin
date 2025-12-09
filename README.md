# L2 Agent - Crash Diagnostics System

An automated, intelligent crash-diagnostics system for Freshworks product pages that empowers L2 engineers to instantly identify root causes, trace API failures, and generate report-ready error summaries powered by LLMs.

## 🎯 Vision

Build an automated, intelligent crash-diagnostics system for Freshworks product pages that:
- **Instantly identify root causes** of crashes and errors
- **Trace API failures** with full request/response context
- **Generate report-ready error summaries** powered by LLMs
- **Capture screenshots** automatically on crashes
- **Track trace IDs** for backend correlation

## 📁 Project Structure

```
l2agent-plugin/
├── chrome-extension/          # Chrome extension (Manifest V3)
│   ├── manifest.json          # Extension configuration
│   ├── popup.html/js          # Popup UI dashboard
│   ├── background.js          # Service worker for error storage
│   ├── content.js             # Content script (bridge to injected.js)
│   ├── injected.js            # Main world script for error capture
│   ├── options.html/js        # Settings page
│   ├── apiService.js          # API service for log fetching
│   ├── config.js              # Extension configuration
│   ├── styles.css             # Shared styles
│   ├── test-page.html         # Test page for error simulation
│   └── icons/                 # Extension icons
├── backend/                   # Node.js Express server
│   ├── server.js              # Main Express server
│   ├── routes/api.js          # API routes
│   ├── services/llm.js        # LLM integration service
│   ├── config/config.js       # Configuration management
│   ├── package.json           # Node dependencies
│   └── .env.example           # Environment variables template
└── README.md                  # This file
```

## ✅ Implementation Status

### Phase 0 — Foundations ✅ COMPLETE
- [x] Chrome extension manifest (V3) + popup UI skeleton
- [x] injected.js loaded and verifying page access
- [x] Basic console error interception (console.error, warn, assert)
- [x] Basic window error + promise rejection capture
- [x] Backend skeleton (server.js, routing structure)

### Phase 1 — Core Error Capture ✅ COMPLETE
- [x] Console & Script Error Capture with full stack traces
- [x] XHR interception layer
- [x] Fetch interception layer
- [x] Parse: URL, Method, Status, Request/Response body/headers, Duration
- [x] Crash Detection (ReferenceError, TypeError, Chunk-loading failures)
- [x] Error viewer in popup UI with tabs

### Phase 2 — Smart Context Gathering ✅ COMPLETE
- [x] Sliding window API buffer (3 before + 3 after crash)
- [x] Trace ID extraction (x-trace-id, x-request-id, etc.)
- [x] DOM-based crash detection ("Something Went Wrong" patterns)
- [x] Full "error pack" sent to backend

### Phase 3 — Noise Filtering ✅ COMPLETE
- [x] Ignore HMR logs, React DevTools warnings, ResizeObserver errors
- [x] Configurable ignore patterns

### Phase 4 — Reporting & UX ✅ COMPLETE
- [x] Screenshot capture (manual + automatic on crash)
- [x] Timeline view of events with severity highlighting
- [x] Filters: console / API / crash / screenshots
- [x] Export as JSON

### Phase 5 — LLM Intelligence ✅ COMPLETE
- [x] LLM Analysis Service (services/llm.js)
- [x] Error analysis and root cause identification
- [x] Severity classification
- [x] "Analyze with LLM" button in popup

### Phases 6-8 — Planned
- [ ] Web Dashboard with search and charts
- [ ] Account linking with Freshworks SSO
- [ ] Authentication & security hardening
- [ ] Session replay and AI crash similarity

## 🚀 Quick Start

### Backend Server

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your LLM API settings

# Start server
npm start

# For development with auto-reload
npm run dev
```

The server runs on `http://localhost:3000` by default.

### Chrome Extension

1. **Enable Developer Mode**
   - Open Chrome → `chrome://extensions/`
   - Toggle **"Developer mode"** ON (top-right)

2. **Load the Extension**
   - Click **"Load unpacked"**
   - Select the `chrome-extension/` folder

3. **Enable Tracking**
   - Click the L2 Agent icon in the toolbar
   - Click **"Enable Tracking"** button

4. **Configure Backend** (Optional)
   - Right-click the extension icon → **Options**
   - Enter your backend server URL
   - Click **Save Settings**

## 🧪 Testing the Extension

1. **Start the backend server** (required for API error testing)

2. **Open the Test Page**
   - Go to extension Options → Click "Open Test Page"
   - Or navigate to `chrome-extension://[extension-id]/test-page.html`

3. **Trigger Test Errors**
   - Click buttons to trigger console errors, API errors, etc.
   - Open the L2 Agent popup to see captured errors

4. **API Error Simulation** (requires backend)
   - `GET /api/simulate/400` - Bad Request
   - `GET /api/simulate/401` - Unauthorized
   - `GET /api/simulate/403` - Forbidden
   - `GET /api/simulate/404` - Not Found
   - `GET /api/simulate/500` - Server Error (includes traceId)

## 📡 API Endpoints

### Error Processing

**POST /api/process**
Process errors with LLM analysis
```json
{
  "data": "error data JSON string",
  "context": { "source": "l2-agent-extension" },
  "action": "analyze"
}
```

**POST /api/analyze**
Analyze page content
```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "content": "Page content text",
  "metadata": {}
}
```

### Health & Testing

**GET /health**
Server health check with LLM connection status

**GET /health/llm**
LLM connectivity check

**POST /api/test**
Test endpoint (doesn't call LLM)

## ⚙️ Configuration

### Backend (.env)

```env
# Server
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=chrome-extension://*,http://localhost:*

# LLM Configuration
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=your-api-key
LLM_MODEL=gpt-3.5-turbo
LLM_TIMEOUT=30000
```

### Extension (Options Page)

- **Backend URL**: URL of the L2 Agent backend server
- **Enable Tracking**: Toggle error capture on/off
- **Freshworks Only**: Limit tracking to Freshworks domains
- **Auto Screenshot**: Capture screenshots on crashes
- **Track API/Console**: Enable/disable specific error types

## 🔒 Permissions

Chrome extension permissions:
- `activeTab` - Access to current tab
- `storage` - Store settings and error data
- `scripting` - Inject content scripts
- `tabs` - Tab management for screenshots
- `notifications` - Crash notifications
- `cookies` - Cookie access for API calls

## 🛠️ Development

### Backend Development

```bash
cd backend
npm install
npm run dev  # Uses nodemon for auto-reload
```

### Extension Development

1. Make changes to files in `chrome-extension/`
2. Go to `chrome://extensions/`
3. Click the refresh icon (🔄) on the L2 Agent card
4. Test your changes

### Debug Tips

- **Extension logs**: Click extension icon → Right-click popup → "Inspect"
- **Injected script logs**: Open browser DevTools console (prefix: "🔵 L2 Agent")
- **Background logs**: Extensions page → "service worker" link

## 📚 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Express.js Documentation](https://expressjs.com/)

## 📄 License

ISC License - Freshworks L2 Team

const express = require("express");
const router = express.Router();

// In-memory storage for dashboard data
// In production, this would be a database
let dashboardData = {
  crashes: [],
  apiErrors: [],
  consoleErrors: [],
  pageErrors: [],
  sessions: {},
  lastUpdated: null,
};

// ============================================
// GET /api/dashboard/data - Get all error data
// ============================================
router.get("/data", (req, res) => {
  try {
    const { timeRange } = req.query;
    let filteredData = { ...dashboardData };

    // Apply time range filter
    if (timeRange && timeRange !== "all") {
      const now = new Date();
      let cutoff;

      switch (timeRange) {
        case "1h":
          cutoff = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "24h":
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = null;
      }

      if (cutoff) {
        filteredData = {
          crashes: dashboardData.crashes.filter(
            (e) => new Date(e.timestamp) > cutoff
          ),
          apiErrors: dashboardData.apiErrors.filter(
            (e) => new Date(e.timestamp) > cutoff
          ),
          consoleErrors: dashboardData.consoleErrors.filter(
            (e) => new Date(e.timestamp) > cutoff
          ),
          pageErrors: dashboardData.pageErrors.filter(
            (e) => new Date(e.timestamp) > cutoff
          ),
          sessions: dashboardData.sessions,
        };
      }
    }

    res.json({
      success: true,
      data: filteredData,
      stats: {
        totalCrashes: filteredData.crashes.length,
        totalApiErrors: filteredData.apiErrors.length,
        totalConsoleErrors: filteredData.consoleErrors.length,
        totalPageErrors: filteredData.pageErrors.length,
        totalSessions: Object.keys(filteredData.sessions).length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard data",
      message: error.message,
    });
  }
});

// ============================================
// POST /api/dashboard/ingest - Ingest error data from extension
// ============================================
router.post("/ingest", (req, res) => {
  try {
    const { type, data, sessionId } = req.body;

    if (!type || !data) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: type, data",
      });
    }

    // Add timestamp if not present
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }

    // Add unique ID
    data.id =
      data.id ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    // Store by type
    switch (type) {
      case "crash":
      case "crash_detected":
        dashboardData.crashes.push(data);
        if (dashboardData.crashes.length > 500)
          dashboardData.crashes = dashboardData.crashes.slice(-500);
        break;

      case "api_error":
        dashboardData.apiErrors.push(data);
        if (dashboardData.apiErrors.length > 1000)
          dashboardData.apiErrors = dashboardData.apiErrors.slice(-1000);
        break;

      case "console_error":
      case "console_warn":
        dashboardData.consoleErrors.push(data);
        if (dashboardData.consoleErrors.length > 1000)
          dashboardData.consoleErrors = dashboardData.consoleErrors.slice(
            -1000
          );
        break;

      case "page_error":
      case "promise_rejection":
        dashboardData.pageErrors.push(data);
        if (dashboardData.pageErrors.length > 500)
          dashboardData.pageErrors = dashboardData.pageErrors.slice(-500);
        break;

      default:
        console.log("Unknown error type:", type);
    }

    // Update session tracking
    if (sessionId) {
      if (!dashboardData.sessions[sessionId]) {
        dashboardData.sessions[sessionId] = {
          id: sessionId,
          startTime: new Date().toISOString(),
          pageUrl: data.pageUrl || data.url,
          errorCount: 0,
          apiErrorCount: 0,
          crashCount: 0,
        };
      }

      const session = dashboardData.sessions[sessionId];
      if (type.includes("crash")) session.crashCount++;
      else if (type.includes("api")) session.apiErrorCount++;
      else session.errorCount++;
    }

    dashboardData.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      message: "Error data ingested successfully",
      id: data.id,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to ingest error data",
      message: error.message,
    });
  }
});

// ============================================
// POST /api/dashboard/bulk-ingest - Bulk ingest from extension export
// ============================================
router.post("/bulk-ingest", (req, res) => {
  try {
    const { crashes, apiErrors, consoleErrors, pageErrors, sessions } =
      req.body;

    if (crashes && Array.isArray(crashes)) {
      crashes.forEach((crash) => {
        crash.id =
          crash.id ||
          `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
        dashboardData.crashes.push(crash);
      });
      dashboardData.crashes = dashboardData.crashes.slice(-500);
    }

    if (apiErrors && Array.isArray(apiErrors)) {
      apiErrors.forEach((err) => {
        err.id =
          err.id ||
          `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
        dashboardData.apiErrors.push(err);
      });
      dashboardData.apiErrors = dashboardData.apiErrors.slice(-1000);
    }

    if (consoleErrors && Array.isArray(consoleErrors)) {
      consoleErrors.forEach((err) => {
        err.id =
          err.id ||
          `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
        dashboardData.consoleErrors.push(err);
      });
      dashboardData.consoleErrors = dashboardData.consoleErrors.slice(-1000);
    }

    if (pageErrors && Array.isArray(pageErrors)) {
      pageErrors.forEach((err) => {
        err.id =
          err.id ||
          `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
        dashboardData.pageErrors.push(err);
      });
      dashboardData.pageErrors = dashboardData.pageErrors.slice(-500);
    }

    if (sessions && typeof sessions === "object") {
      Object.assign(dashboardData.sessions, sessions);
    }

    dashboardData.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      message: "Bulk data ingested successfully",
      stats: {
        crashes: dashboardData.crashes.length,
        apiErrors: dashboardData.apiErrors.length,
        consoleErrors: dashboardData.consoleErrors.length,
        pageErrors: dashboardData.pageErrors.length,
        sessions: Object.keys(dashboardData.sessions).length,
      },
    });
  } catch (error) {
    console.error("Bulk ingest error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to bulk ingest data",
      message: error.message,
    });
  }
});

// ============================================
// GET /api/dashboard/stats - Get summary statistics
// ============================================
router.get("/stats", (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = {
      totals: {
        crashes: dashboardData.crashes.length,
        apiErrors: dashboardData.apiErrors.length,
        consoleErrors: dashboardData.consoleErrors.length,
        pageErrors: dashboardData.pageErrors.length,
        sessions: Object.keys(dashboardData.sessions).length,
      },
      lastHour: {
        crashes: dashboardData.crashes.filter(
          (e) => new Date(e.timestamp) > oneHourAgo
        ).length,
        apiErrors: dashboardData.apiErrors.filter(
          (e) => new Date(e.timestamp) > oneHourAgo
        ).length,
        consoleErrors: dashboardData.consoleErrors.filter(
          (e) => new Date(e.timestamp) > oneHourAgo
        ).length,
        pageErrors: dashboardData.pageErrors.filter(
          (e) => new Date(e.timestamp) > oneHourAgo
        ).length,
      },
      lastDay: {
        crashes: dashboardData.crashes.filter(
          (e) => new Date(e.timestamp) > oneDayAgo
        ).length,
        apiErrors: dashboardData.apiErrors.filter(
          (e) => new Date(e.timestamp) > oneDayAgo
        ).length,
        consoleErrors: dashboardData.consoleErrors.filter(
          (e) => new Date(e.timestamp) > oneDayAgo
        ).length,
        pageErrors: dashboardData.pageErrors.filter(
          (e) => new Date(e.timestamp) > oneDayAgo
        ).length,
      },
      topErrors: getTopErrors(),
      topEndpoints: getTopFailedEndpoints(),
      lastUpdated: dashboardData.lastUpdated,
    };

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get stats",
      message: error.message,
    });
  }
});

// ============================================
// GET /api/dashboard/search - Search errors
// ============================================
router.get("/search", (req, res) => {
  try {
    const { q, type, limit = 50 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Missing search query parameter: q",
      });
    }

    const searchLower = q.toLowerCase();
    let results = [];

    // Search function
    const matchesSearch = (item) => {
      const searchable = [
        item.message,
        item.url,
        item.pageUrl,
        item.traceId,
        item.errorType,
        item.stack,
        item.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(searchLower);
    };

    // Search in relevant collections
    if (!type || type === "all" || type === "console") {
      results.push(
        ...dashboardData.consoleErrors
          .filter(matchesSearch)
          .map((e) => ({ ...e, _type: "console" }))
      );
    }

    if (!type || type === "all" || type === "page") {
      results.push(
        ...dashboardData.pageErrors
          .filter(matchesSearch)
          .map((e) => ({ ...e, _type: "page" }))
      );
    }

    if (!type || type === "all" || type === "api") {
      results.push(
        ...dashboardData.apiErrors
          .filter(matchesSearch)
          .map((e) => ({ ...e, _type: "api" }))
      );
    }

    if (!type || type === "all" || type === "crash") {
      results.push(
        ...dashboardData.crashes
          .filter(matchesSearch)
          .map((e) => ({ ...e, _type: "crash" }))
      );
    }

    // Sort by timestamp and limit
    results = results
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      query: q,
      count: results.length,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Search failed",
      message: error.message,
    });
  }
});

// ============================================
// POST /api/dashboard/clear - Clear all data
// ============================================
router.post("/clear", (req, res) => {
  try {
    const { type } = req.body;

    if (type) {
      // Clear specific type
      switch (type) {
        case "crashes":
          dashboardData.crashes = [];
          break;
        case "apiErrors":
          dashboardData.apiErrors = [];
          break;
        case "consoleErrors":
          dashboardData.consoleErrors = [];
          break;
        case "pageErrors":
          dashboardData.pageErrors = [];
          break;
        case "sessions":
          dashboardData.sessions = {};
          break;
      }
    } else {
      // Clear all
      dashboardData = {
        crashes: [],
        apiErrors: [],
        consoleErrors: [],
        pageErrors: [],
        sessions: {},
        lastUpdated: new Date().toISOString(),
      };
    }

    res.json({
      success: true,
      message: type ? `${type} cleared` : "All data cleared",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to clear data",
      message: error.message,
    });
  }
});

// ============================================
// GET /api/dashboard/heatmap - Get error heatmap data
// ============================================
router.get("/heatmap", (req, res) => {
  try {
    const allErrors = [
      ...dashboardData.consoleErrors,
      ...dashboardData.pageErrors,
      ...dashboardData.apiErrors,
    ];

    // Group by URL path
    const urlGroups = {};
    allErrors.forEach((error) => {
      try {
        const url = error.url || error.pageUrl || "";
        if (!url) return;

        const parsed = new URL(url);
        const path = parsed.pathname.split("/").slice(0, 3).join("/") || "/";

        if (!urlGroups[path]) {
          urlGroups[path] = {
            path,
            hostname: parsed.hostname,
            count: 0,
            errorTypes: {},
          };
        }

        urlGroups[path].count++;
        const errorType = error.errorType || error.type || "unknown";
        urlGroups[path].errorTypes[errorType] =
          (urlGroups[path].errorTypes[errorType] || 0) + 1;
      } catch (e) {
        // Invalid URL, skip
      }
    });

    const heatmapData = Object.values(urlGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    res.json({
      success: true,
      heatmap: heatmapData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate heatmap",
      message: error.message,
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function getTopErrors() {
  const errorCounts = {};
  const allErrors = [
    ...dashboardData.consoleErrors,
    ...dashboardData.pageErrors,
  ];

  allErrors.forEach((error) => {
    const key = `${error.errorType || "Error"}: ${(error.message || "")
      .slice(0, 50)
      .replace(/\n/g, " ")}`;
    errorCounts[key] = (errorCounts[key] || 0) + 1;
  });

  return Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));
}

function getTopFailedEndpoints() {
  const endpointCounts = {};

  dashboardData.apiErrors.forEach((error) => {
    const key = `${error.method || "GET"} ${error.url || "unknown"}`;
    endpointCounts[key] = (endpointCounts[key] || 0) + 1;
  });

  return Object.entries(endpointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([endpoint, count]) => ({ endpoint, count }));
}

// ============================================
// POST /api/dashboard/demo - Generate demo data
// ============================================
router.post("/demo", (req, res) => {
  try {
    // Generate realistic demo data
    const now = new Date();
    
    // Generate console errors
    const errorTypes = ['TypeError', 'ReferenceError', 'SyntaxError', 'RangeError'];
    const errorMessages = [
      "Cannot read properties of undefined (reading 'map')",
      "Cannot read properties of null (reading 'length')",
      "someComponent is not defined",
      "Unexpected token '<'",
      "Maximum call stack size exceeded",
      "Cannot set properties of undefined (setting 'value')",
      "this.setState is not a function",
      "Failed to execute 'appendChild' on 'Node'",
    ];
    
    for (let i = 0; i < 25; i++) {
      const hoursAgo = Math.random() * 24;
      dashboardData.consoleErrors.push({
        id: `demo-console-${i}`,
        type: 'console.error',
        errorType: errorTypes[Math.floor(Math.random() * errorTypes.length)],
        message: errorMessages[Math.floor(Math.random() * errorMessages.length)],
        stack: `Error: ${errorMessages[0]}\n    at ComponentName (app.js:${Math.floor(Math.random() * 500)}:${Math.floor(Math.random() * 50)})\n    at renderWithHooks (react-dom.js:14985:18)`,
        url: `https://app.freshdesk.com/a/tickets/${Math.floor(Math.random() * 10000)}`,
        timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
      });
    }
    
    // Generate API errors
    const endpoints = [
      '/api/v2/tickets',
      '/api/v2/contacts',
      '/api/v2/companies',
      '/api/v2/agents',
      '/api/v2/groups',
      '/api/v2/conversations',
    ];
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const statuses = [400, 401, 403, 404, 500, 502, 503];
    
    for (let i = 0; i < 20; i++) {
      const hoursAgo = Math.random() * 24;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      dashboardData.apiErrors.push({
        id: `demo-api-${i}`,
        type: 'fetch',
        method: methods[Math.floor(Math.random() * methods.length)],
        url: `https://freshdesk.freshworks.com${endpoints[Math.floor(Math.random() * endpoints.length)]}`,
        status: status,
        statusText: status >= 500 ? 'Internal Server Error' : 'Bad Request',
        duration: Math.floor(Math.random() * 5000) + 100,
        traceId: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        requestHeaders: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ***' },
        responseBody: JSON.stringify({ error: 'Something went wrong', code: 'ERR_' + status }),
        isError: true,
        timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
      });
    }
    
    // Generate page errors
    for (let i = 0; i < 15; i++) {
      const hoursAgo = Math.random() * 24;
      dashboardData.pageErrors.push({
        id: `demo-page-${i}`,
        type: 'uncaught_error',
        errorType: errorTypes[Math.floor(Math.random() * errorTypes.length)],
        message: errorMessages[Math.floor(Math.random() * errorMessages.length)],
        filename: `https://app.freshdesk.com/assets/main.${Math.random().toString(36).slice(2, 8)}.js`,
        lineno: Math.floor(Math.random() * 10000),
        colno: Math.floor(Math.random() * 100),
        stack: `Error: ${errorMessages[0]}\n    at Object.render (main.js:${Math.floor(Math.random() * 10000)}:${Math.floor(Math.random() * 100)})`,
        url: `https://app.freshdesk.com/a/tickets/${Math.floor(Math.random() * 10000)}`,
        timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
      });
    }
    
    // Generate crashes
    for (let i = 0; i < 5; i++) {
      const hoursAgo = Math.random() * 48;
      dashboardData.crashes.push({
        id: `demo-crash-${i}`,
        type: 'crash',
        reason: 'Error: ReferenceError - TicketComponent is not defined',
        detectionMethod: 'error_based',
        pageUrl: `https://app.freshdesk.com/a/tickets/${Math.floor(Math.random() * 10000)}`,
        primaryError: {
          type: 'ReferenceError',
          message: 'TicketComponent is not defined',
          stack: 'ReferenceError: TicketComponent is not defined\n    at render (app.js:1234:5)',
        },
        recentConsoleErrors: dashboardData.consoleErrors.slice(0, 5),
        recentApiErrors: dashboardData.apiErrors.slice(0, 3),
        recentPageErrors: dashboardData.pageErrors.slice(0, 3),
        timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
      });
    }
    
    // Generate sessions
    for (let i = 0; i < 8; i++) {
      const sessionId = `session-${Date.now()}-${i}`;
      dashboardData.sessions[sessionId] = {
        id: sessionId,
        startTime: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        pageUrl: `https://app.freshdesk.com/a/tickets/${Math.floor(Math.random() * 10000)}`,
        errorCount: Math.floor(Math.random() * 10),
        apiErrorCount: Math.floor(Math.random() * 5),
        crashCount: Math.floor(Math.random() * 2),
      };
    }
    
    dashboardData.lastUpdated = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'Demo data generated successfully',
      stats: {
        crashes: dashboardData.crashes.length,
        apiErrors: dashboardData.apiErrors.length,
        consoleErrors: dashboardData.consoleErrors.length,
        pageErrors: dashboardData.pageErrors.length,
        sessions: Object.keys(dashboardData.sessions).length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate demo data',
      message: error.message,
    });
  }
});

// Export for use in demo data generation
router.getDashboardData = () => dashboardData;
router.setDashboardData = (data) => {
  dashboardData = data;
};

module.exports = router;


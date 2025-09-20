# 📊 Energy Rite Frontend API Guide

Complete API reference for building Energy Rite dashboards and reports frontend.

## 🔧 Base Configuration

```javascript
const API_BASE_URL = "http://64.227.138.235:3000";
// or for local development: "http://localhost:3000"
```

---

## 🎯 Executive Dashboard

### **Monthly Overview with KPIs**

```javascript
// Get current month overview (all companies)
GET /api/energy-rite/reports/executive-dashboard

// Filter by specific company/cost code
GET /api/energy-rite/reports/executive-dashboard?cost_code=KFC-0001-0001-0003

// Specific month and year
GET /api/energy-rite/reports/executive-dashboard?month=9&year=2025&cost_code=KFC-0001-0001-0003
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "month": 9,
    "year": 2025,
    "period": "2025-09",
    "cost_code_filter": "KFC-0001-0001-0003",
    
    "score_card": {
      "total_litres_filled": "68.85",
      "total_litres_used": "100.80",
      "total_operational_hours": "45.50",
      "active_sites": 15,
      "completed_sessions": 25,
      "ongoing_sessions": 2,
      "average_efficiency": "2.21",
      "total_cost": "2016.00",
      "sites_running_over_24h": 3
    },
    
    "current_status": {
      "total_registered_sites": 168,
      "currently_running": 5,
      "active_last_24h": 12,
      "average_fuel_level": "75.9"
    },
    
    "top_10_sites_by_fuel_usage": [
      {
        "branch": "KEYWEST",
        "company": "YUM Equity",
        "cost_code": "KFC-0001-0001-0003",
        "total_fuel_usage": "24.95",
        "total_fuel_filled": "1.50",
        "total_operating_hours": "12.50",
        "total_sessions": 8,
        "average_efficiency": "1.99",
        "total_cost": "499.00"
      }
    ],
    
    "sites_running_over_24h": [
      {
        "branch": "BALLYCLARE",
        "company": "Gunret",
        "total_operating_hours": "48.75",
        "total_fuel_usage": "145.20",
        "session_count": 15,
        "longest_single_session": "8.50",
        "average_session_hours": "3.25"
      }
    ],
    
    "activity_patterns": {
      "daily_breakdown": [
        {
          "date": "2025-09-19",
          "sessions_started": 8,
          "sessions_completed": 6,
          "daily_operating_hours": "18.75",
          "daily_fuel_usage": "42.30"
        }
      ],
      "running_time_distribution": [
        {
          "duration_category": "1-4 hours",
          "session_count": 15,
          "fuel_usage": "85.40",
          "average_efficiency": "2.15"
        }
      ]
    }
  }
}
```

**Frontend Usage:**
```javascript
// Fetch executive dashboard
async function getExecutiveDashboard(costCode = null, month = null, year = null) {
  let url = `${API_BASE_URL}/api/energy-rite/reports/executive-dashboard`;
  const params = new URLSearchParams();
  
  if (costCode) params.append('cost_code', costCode);
  if (month) params.append('month', month);
  if (year) params.append('year', year);
  
  if (params.toString()) url += `?${params}`;
  
  const response = await fetch(url);
  return await response.json();
}

// Display score card
const dashboard = await getExecutiveDashboard('KFC-0001-0001-0003');
const scoreCard = dashboard.data.score_card;

// Use in React/Vue components
<div className="score-card">
  <div className="metric">
    <h3>{scoreCard.total_litres_used}L</h3>
    <p>Total Fuel Used</p>
  </div>
  <div className="metric">
    <h3>{scoreCard.total_operational_hours}h</h3>
    <p>Operating Hours</p>
  </div>
  <div className="metric">
    <h3>R{scoreCard.total_cost}</h3>
    <p>Total Cost</p>
  </div>
</div>
```

---

## 📋 Activity Reports

### **Daily Operational Snapshots**

```javascript
// Get today's activity (all companies)
GET /api/energy-rite/reports/activity-report

// Filter by date
GET /api/energy-rite/reports/activity-report?date=2025-09-19

// Filter by cost code
GET /api/energy-rite/reports/activity-report?cost_code=KFC-0001-0001-0003

// Filter by both date and cost code
GET /api/energy-rite/reports/activity-report?date=2025-09-19&cost_code=KFC-0001-0001-0003
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "date": "2025-09-19",
    "cost_code": "KFC-0001-0001-0003",
    "summary": {
      "total_sites": 54,
      "morning_snapshots": 54,
      "midday_snapshots": 54,
      "evening_snapshots": 54,
      "avg_morning_fuel": "65.30",
      "avg_evening_fuel": "63.80",
      "irregularities_count": 2
    },
    "sites": [
      {
        "branch": "CARLTONVIL",
        "company": "YUM Equity",
        "cost_code": "KFC-0001-0001-0003",
        "snapshots": [
          {
            "time": "2025-09-19T06:00:00.000Z",
            "fuel_level": 100,
            "engine_status": "OFF",
            "snapshot_type": "MORNING"
          },
          {
            "time": "2025-09-19T12:00:00.000Z",
            "fuel_level": 95,
            "engine_status": "ON",
            "snapshot_type": "MIDDAY"
          },
          {
            "time": "2025-09-19T18:00:00.000Z",
            "fuel_level": 88,
            "engine_status": "OFF",
            "snapshot_type": "EVENING"
          }
        ],
        "fuel_level_morning": 100,
        "fuel_level_midday": 95,
        "fuel_level_evening": 88,
        "total_fuel_used": 12,
        "total_fuel_filled": 0,
        "irregularities_count": 0
      }
    ]
  }
}
```

**Frontend Usage:**
```javascript
// Fetch activity report
async function getActivityReport(date = null, costCode = null) {
  let url = `${API_BASE_URL}/api/energy-rite/reports/activity-report`;
  const params = new URLSearchParams();
  
  if (date) params.append('date', date);
  if (costCode) params.append('cost_code', costCode);
  
  if (params.toString()) url += `?${params}`;
  
  const response = await fetch(url);
  return await response.json();
}

// Display activity data
const activity = await getActivityReport('2025-09-19', 'KFC-0001-0001-0003');

// Activity summary cards
<div className="activity-summary">
  <div className="summary-card">
    <h3>{activity.data.summary.total_sites}</h3>
    <p>Total Sites</p>
  </div>
  <div className="summary-card">
    <h3>{activity.data.summary.avg_morning_fuel}%</h3>
    <p>Avg Morning Fuel</p>
  </div>
</div>

// Site breakdown table
<table className="activity-table">
  <thead>
    <tr>
      <th>Site</th>
      <th>Morning</th>
      <th>Midday</th>
      <th>Evening</th>
      <th>Usage</th>
    </tr>
  </thead>
  <tbody>
    {activity.data.sites.map(site => (
      <tr key={site.branch}>
        <td>{site.branch}</td>
        <td>{site.fuel_level_morning}%</td>
        <td>{site.fuel_level_midday}%</td>
        <td>{site.fuel_level_evening}%</td>
        <td>{site.total_fuel_used}L</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 📊 Operating Sessions

### **Detailed Session Data**

```javascript
// Get all operating sessions
GET /api/energy-rite/reports/operating-sessions

// Filter by date range
GET /api/energy-rite/reports/operating-sessions?start_date=2025-09-01&end_date=2025-09-19

// Filter by cost code
GET /api/energy-rite/reports/operating-sessions?cost_code=KFC-0001-0001-0003

// Filter by status
GET /api/energy-rite/reports/operating-sessions?status=COMPLETED

// Combined filters
GET /api/energy-rite/reports/operating-sessions?date=2025-09-19&cost_code=KFC-0001-0001-0003&status=COMPLETED
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 1,
        "branch": "CARLTONVIL",
        "company": "YUM Equity",
        "cost_code": "KFC-0001-0001-0003",
        "session_date": "2025-09-19",
        "session_start_time": "2025-09-19T08:30:00.000Z",
        "session_end_time": "2025-09-19T14:45:00.000Z",
        "operating_hours": 6.25,
        "opening_percentage": 85.5,
        "opening_fuel": 256.5,
        "closing_percentage": 78.2,
        "closing_fuel": 234.8,
        "total_usage": 21.7,
        "total_fill": 0,
        "liter_usage_per_hour": 3.47,
        "cost_for_usage": 434.00,
        "session_status": "COMPLETED"
      }
    ],
    "summary": {
      "total_sessions": 25,
      "completed_sessions": 23,
      "ongoing_sessions": 2,
      "total_operating_hours": 156.75,
      "total_fuel_usage": 485.30,
      "average_efficiency": 3.09
    }
  }
}
```

**Frontend Usage:**
```javascript
// Fetch operating sessions
async function getOperatingSessions(filters = {}) {
  let url = `${API_BASE_URL}/api/energy-rite/reports/operating-sessions`;
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key]) params.append(key, filters[key]);
  });
  
  if (params.toString()) url += `?${params}`;
  
  const response = await fetch(url);
  return await response.json();
}

// Usage tracking table
const sessions = await getOperatingSessions({
  date: '2025-09-19',
  cost_code: 'KFC-0001-0001-0003'
});

<table className="sessions-table">
  <thead>
    <tr>
      <th>Site</th>
      <th>Start Time</th>
      <th>Duration</th>
      <th>Fuel Used</th>
      <th>Efficiency</th>
      <th>Cost</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {sessions.data.sessions.map(session => (
      <tr key={session.id}>
        <td>{session.branch}</td>
        <td>{new Date(session.session_start_time).toLocaleTimeString()}</td>
        <td>{session.operating_hours}h</td>
        <td>{session.total_usage}L</td>
        <td>{session.liter_usage_per_hour} L/h</td>
        <td>R{session.cost_for_usage}</td>
        <td className={`status-${session.session_status.toLowerCase()}`}>
          {session.session_status}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 📈 Excel Report Generation

### **Generate Professional Reports**

```javascript
// Generate daily report
POST /api/energy-rite/reports/generate-excel
Content-Type: application/json
{
  "report_type": "daily",
  "target_date": "2025-09-19",
  "cost_code": "KFC-0001-0001-0003"
}

// Generate weekly report
POST /api/energy-rite/reports/generate-excel
Content-Type: application/json
{
  "report_type": "weekly",
  "cost_code": "KFC-0001-0001-0003"
}

// Generate monthly report
POST /api/energy-rite/reports/generate-excel
Content-Type: application/json
{
  "report_type": "monthly",
  "target_date": "2025-09-01",
  "cost_code": "KFC-0001-0001-0003"
}

// Generate all scheduled reports
POST /api/energy-rite/reports/generate-scheduled
```

**Response Structure:**
```json
{
  "success": true,
  "message": "daily Excel report generated successfully",
  "data": {
    "success": true,
    "report_id": 15,
    "file_name": "Energy_Rite_daily_Report_2025-09-19.xlsx",
    "download_url": "https://jbactgkcijnkjpyqqzxv.supabase.co/storage/v1/object/public/energy-rite-reports/reports/KFC-0001-0001-0003/Energy_Rite_daily_Report_2025-09-19.xlsx",
    "period": "2025-09-19",
    "stats": {
      "total_sites": 15,
      "total_sessions": 28,
      "total_operating_hours": "156.75"
    }
  }
}
```

**Frontend Usage:**
```javascript
// Generate Excel report
async function generateExcelReport(reportType, targetDate = null, costCode = null) {
  const response = await fetch(`${API_BASE_URL}/api/energy-rite/reports/generate-excel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      report_type: reportType,
      target_date: targetDate,
      cost_code: costCode
    })
  });
  
  return await response.json();
}

// Report generation component
<div className="report-generator">
  <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
    <option value="daily">Daily Report</option>
    <option value="weekly">Weekly Report</option>
    <option value="monthly">Monthly Report</option>
  </select>
  
  <input 
    type="date" 
    value={targetDate} 
    onChange={(e) => setTargetDate(e.target.value)}
  />
  
  <select value={costCode} onChange={(e) => setCostCode(e.target.value)}>
    <option value="">All Companies</option>
    <option value="KFC-0001-0001-0003">YUM Equity</option>
    <option value="KFC-0001-0001-0001">Alchemy Foods</option>
    <option value="KFC-0001-0001-0002-0004">Gunret</option>
  </select>
  
  <button onClick={async () => {
    const result = await generateExcelReport(reportType, targetDate, costCode);
    if (result.success) {
      // Direct download
      window.open(result.data.download_url, '_blank');
    }
  }}>
    Generate & Download Report
  </button>
</div>
```

---

## 📋 Report Management

### **List Generated Reports**

```javascript
// Get all reports
GET /api/energy-rite/reports/documents

// Filter by report type
GET /api/energy-rite/reports/documents?report_type=daily

// Filter by cost code
GET /api/energy-rite/reports/documents?cost_code=KFC-0001-0001-0003

// Pagination
GET /api/energy-rite/reports/documents?limit=10&offset=20
```

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "report_type": "daily",
      "period_name": "2025-09-19",
      "start_date": "2025-09-19",
      "end_date": "2025-09-19",
      "cost_code": "KFC-0001-0001-0003",
      "file_name": "Energy_Rite_daily_Report_2025-09-19.xlsx",
      "download_url": "https://jbactgkcijnkjpyqqzxv.supabase.co/storage/v1/object/public/energy-rite-reports/reports/KFC-0001-0001-0003/Energy_Rite_daily_Report_2025-09-19.xlsx",
      "total_sites": 15,
      "total_sessions": 28,
      "total_operating_hours": "156.75",
      "created_at": "2025-09-19T18:30:00.000Z",
      "hours_since_generated": 2.5
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### **Get Specific Report**

```javascript
// Get report details
GET /api/energy-rite/reports/documents/15

// Delete report
DELETE /api/energy-rite/reports/documents/15
```

### **Report Statistics**

```javascript
// Get generation statistics
GET /api/energy-rite/reports/statistics
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "by_type": [
      {
        "report_type": "daily",
        "total_reports": 30,
        "reports_last_7_days": 7,
        "reports_last_30_days": 30,
        "avg_sites_per_report": 15.5,
        "avg_sessions_per_report": 28.2,
        "latest_report_date": "2025-09-19T18:30:00.000Z"
      }
    ],
    "overall": {
      "total_all_reports": 75,
      "unique_cost_codes": 8,
      "first_report_date": "2025-09-01T07:00:00.000Z",
      "latest_report_date": "2025-09-19T18:30:00.000Z"
    }
  }
}
```

**Frontend Usage:**
```javascript
// Report management table
async function getReportsList(filters = {}) {
  let url = `${API_BASE_URL}/api/energy-rite/reports/documents`;
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key]) params.append(key, filters[key]);
  });
  
  if (params.toString()) url += `?${params}`;
  
  const response = await fetch(url);
  return await response.json();
}

// Reports table component
<table className="reports-table">
  <thead>
    <tr>
      <th>Type</th>
      <th>Period</th>
      <th>Company</th>
      <th>Sites</th>
      <th>Generated</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {reports.data.map(report => (
      <tr key={report.id}>
        <td>{report.report_type}</td>
        <td>{report.period_name}</td>
        <td>{report.cost_code || 'All'}</td>
        <td>{report.total_sites}</td>
        <td>{new Date(report.created_at).toLocaleDateString()}</td>
        <td>
          <button onClick={() => window.open(report.download_url, '_blank')}>
            Download
          </button>
          <button onClick={() => deleteReport(report.id)}>
            Delete
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 🕐 Automatic Report Schedule

**Reports are automatically generated:**

- **Daily Reports**: 7:00 AM every day (for previous day)
- **Weekly Reports**: 7:00 AM every Monday (for previous week)
- **Monthly Reports**: 7:00 AM on 1st of month (for previous month)

**All automatic reports are available via the documents endpoint immediately after generation.**

---

## 🏢 Cost Code Reference

```javascript
const COST_CODES = {
  'KFC-0001-0001-0003': 'YUM Equity',
  'KFC-0001-0001-0001': 'Alchemy Foods', 
  'KFC-0001-0001-0002-0004': 'Gunret',
  'KFC-0001-0001-0002-0005': 'Gunret (Alternative)',
  'KFC-0001-0001-0002-0002': 'Gunret (Division 2)',
  'KFC-0001-0001-0002-0001-0002': 'Gunret (Subdivision)'
};
```

---

## 🔗 Complete Frontend Integration

```javascript
// Complete Energy Rite API service
class EnergyRiteAPI {
  constructor(baseURL = 'http://64.227.138.235:3000') {
    this.baseURL = baseURL;
  }
  
  // Executive Dashboard
  async getExecutiveDashboard(costCode, month, year) {
    return this.fetch('/api/energy-rite/reports/executive-dashboard', {
      cost_code: costCode, month, year
    });
  }
  
  // Activity Reports
  async getActivityReport(date, costCode) {
    return this.fetch('/api/energy-rite/reports/activity-report', {
      date, cost_code: costCode
    });
  }
  
  // Operating Sessions
  async getOperatingSessions(filters) {
    return this.fetch('/api/energy-rite/reports/operating-sessions', filters);
  }
  
  // Excel Report Generation
  async generateExcelReport(reportType, targetDate, costCode) {
    return this.post('/api/energy-rite/reports/generate-excel', {
      report_type: reportType,
      target_date: targetDate,
      cost_code: costCode
    });
  }
  
  // Report Management
  async getReportsList(filters) {
    return this.fetch('/api/energy-rite/reports/documents', filters);
  }
  
  async getReportStats() {
    return this.fetch('/api/energy-rite/reports/statistics');
  }
  
  // Helper methods
  async fetch(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key]) url.searchParams.append(key, params[key]);
    });
    
    const response = await fetch(url);
    return await response.json();
  }
  
  async post(endpoint, data) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  }
}

// Usage
const api = new EnergyRiteAPI();

// Get dashboard for YUM Equity
const dashboard = await api.getExecutiveDashboard('KFC-0001-0001-0003');

// Get today's activity for specific company
const activity = await api.getActivityReport('2025-09-19', 'KFC-0001-0001-0003');

// Generate and download report
const report = await api.generateExcelReport('daily', '2025-09-19', 'KFC-0001-0001-0003');
if (report.success) {
  window.open(report.data.download_url, '_blank');
}
```

This complete API guide provides everything needed to build a comprehensive Energy Rite frontend dashboard with executive analytics, activity tracking, usage monitoring, and professional Excel report generation! 🚀📊✨

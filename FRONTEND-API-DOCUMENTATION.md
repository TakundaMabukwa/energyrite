# 🚛 EnergyRite Fuel Management API - Frontend Documentation

## 📡 Primary Activity Report Endpoint

### **GET** `/api/energy-rite/reports/activity`

**Base URL**: `http://your-server:4000`

### 🔧 Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `date` | String (YYYY-MM-DD) | No | Today | Specific date to get reports for |
| `cost_code` | String | No | All | Filter by cost center code |
| `site_id` | String | No | All | Filter by specific site/branch |

### 📝 Example Requests

```bash
# Get today's activity for all sites
GET /api/energy-rite/reports/activity

# Get specific date
GET /api/energy-rite/reports/activity?date=2025-11-07

# Get specific site data
GET /api/energy-rite/reports/activity?site_id=WILLOW&date=2025-11-07

# Filter by cost center
GET /api/energy-rite/reports/activity?cost_code=KFC-0001-0001-0003
```

## 📊 Response Structure

### **Root Response Object**
```json
{
  "success": true,
  "data": {
    "date": "2025-11-07",
    "cost_code": "All",
    "site_id": null,
    "summary": { /* Overall summary */ },
    "time_periods": { /* Time period breakdown */ },
    "fuel_analysis": { /* Fuel consumption analysis */ },
    "sites": [ /* Array of site data */ ]
  }
}
```

### **Summary Object** - Overall Stats
```json
"summary": {
  "total_sites": 34,                    // Number of active sites
  "total_sessions": 45,                 // Total sessions today
  "completed_sessions": 43,             // Completed sessions
  "ongoing_sessions": 2,                // Currently running sessions
  "total_operating_hours": 22.68,      // Total hours across all sites
  "total_fuel_usage": 99.8,            // Total fuel consumed (Liters)
  "total_fuel_filled": 0,               // Total fuel filled (Liters)
  "total_cost": 996                     // Total cost (Currency)
}
```

### **Site Data Object** - Per Site Details
```json
{
  "branch": "WILLOW",                   // Site identifier/name
  "company": "YUM Equity",              // Company name
  "cost_code": "KFC-0001-0001-0003",   // Cost center code
  "sessions": [                         // Array of sessions for this site
    {
      "id": "WILLOW_2025-11-07T09:37:11.547+00:00",
      "start_time": "2025-11-07T09:37:11.547+00:00",    // ISO timestamp
      "end_time": "2025-11-07T10:01:05.04+00:00",       // ISO timestamp (null if ongoing)
      "duration_hours": 0.4,                            // Hours of operation
      "opening_fuel": 177.1,                            // Fuel level at start (Liters)
      "opening_percentage": 0,                          // Fuel percentage at start
      "closing_fuel": 175.7,                           // Fuel level at end (Liters)
      "closing_percentage": 0,                          // Fuel percentage at end
      "fuel_usage": 1.4,                               // Fuel consumed (Liters)
      "fuel_filled": 0,                                // Fuel filled during session (Liters)
      "cost": 28,                                       // Cost for this session
      "efficiency": 0,                                  // Liters per hour
      "status": "COMPLETED",                            // COMPLETED, ONGOING, STOPPED
      "notes": "Engine stopped. Duration: 0.40h..."    // System-generated notes
    }
  ],
  
  // Site Summary Statistics
  "session_count": 3,                   // Number of sessions today
  "has_multiple_sessions": true,        // Boolean: multiple sessions flag
  "expandable": true,                   // Boolean: can expand to show all sessions
  "total_operating_hours": 2.22,       // Total hours for this site
  "total_fuel_usage": 6.5,             // Total fuel consumed (Liters)
  "total_fuel_filled": 0,              // Total fuel filled (Liters)
  "total_cost": 130,                   // Total cost for this site
  
  // Timing Information
  "first_session_start": "2025-11-07T09:37:11.547+00:00",   // First session start time
  "last_session_end": "2025-11-07T14:19:56.084+00:00",      // Last session end time
  
  // Peak Usage Analysis
  "peak_usage_session": "2025-11-07T12:30:42.621+00:00",    // When peak usage occurred
  "peak_usage_amount": 5.1             // Highest fuel consumption session (Liters)
}
```

## 🔍 Data Field Meanings

### **Session Status Values**
- `COMPLETED`: Session finished normally
- `ONGOING`: Currently active session
- `STOPPED`: Session stopped/interrupted

### **Timing Fields**
- All timestamps are in **ISO 8601 format** with UTC timezone
- `duration_hours`: Decimal hours (e.g., 1.5 = 1 hour 30 minutes)
- Peak usage timestamp shows **exactly when** highest consumption occurred

### **Fuel Fields**
- All fuel amounts in **Liters**
- `opening_fuel` / `closing_fuel`: Tank levels at session start/end
- `fuel_usage`: Amount consumed during session
- `fuel_filled`: Amount refueled during session (usually 0)

### **Financial Fields**
- All costs in local currency (based on system config)
- Calculated based on fuel usage and current fuel price

## 🎯 Frontend Implementation Examples

### **JavaScript Fetch Example**
```javascript
// Get today's activity data
async function getActivityData(date = null) {
  const url = date 
    ? `/api/energy-rite/reports/activity?date=${date}`
    : '/api/energy-rite/reports/activity';
    
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  } else {
    throw new Error('Failed to fetch activity data');
  }
}

// Example usage
const activityData = await getActivityData('2025-11-07');
console.log(`Total sites: ${activityData.summary.total_sites}`);
console.log(`Total fuel usage: ${activityData.summary.total_fuel_usage}L`);
```

### **React Component Example**
```jsx
function SiteCard({ site }) {
  const formatTime = (timestamp) => 
    new Date(timestamp).toLocaleTimeString();
  
  return (
    <div className="site-card">
      <h3>{site.branch}</h3>
      <div className="stats">
        <p>Operating Hours: {site.total_operating_hours.toFixed(1)}h</p>
        <p>Fuel Usage: {site.total_fuel_usage.toFixed(1)}L</p>
        <p>Cost: ${site.total_cost}</p>
        {site.peak_usage_amount > 0 && (
          <p>Peak Usage: {site.peak_usage_amount.toFixed(1)}L at {formatTime(site.peak_usage_session)}</p>
        )}
      </div>
      {site.has_multiple_sessions && (
        <div className="sessions">
          <h4>Sessions ({site.session_count})</h4>
          {site.sessions.map(session => (
            <div key={session.id} className="session">
              <span>{formatTime(session.start_time)} - {session.end_time ? formatTime(session.end_time) : 'Ongoing'}</span>
              <span>{session.fuel_usage.toFixed(1)}L</span>
              <span className={`status ${session.status.toLowerCase()}`}>{session.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 📈 Additional Endpoints

### **Alternative Endpoint**
```
GET /api/energy-rite/activity-reports
```
*Same parameters and response structure as primary endpoint*

### **Today's Sessions (Simplified)**
```
GET /api/energy-rite/reports/today-sessions
```
*Returns simplified session data for current day only*

## 🚨 Error Responses

```json
{
  "success": false,
  "error": "Failed to generate activity report",
  "message": "Database connection error"
}
```

## 📱 Mobile/Responsive Considerations

- All timestamps include timezone info for proper local display
- Use `.toFixed(1)` for fuel amounts to show 1 decimal place
- Peak usage data perfect for dashboard highlights
- Session arrays can be collapsed/expanded for mobile views
- Status field ideal for color coding (green=completed, blue=ongoing)

## 🔄 Real-time Updates

- Data updates every 5 minutes automatically
- For real-time monitoring, poll the endpoint every 30-60 seconds
- Check `ongoing_sessions` count to determine if live updates needed
- WebSocket available at `ws://64.227.138.235:8005` for real-time fuel data

---

**📞 Questions?** Contact the backend team for any clarifications or additional endpoints needed.
# Energy Rite Dashboard Guide

## Overview
This guide explains how to use the new **Executive Dashboard** and **Activity Report** endpoints with automatic data generation and cost center filtering.

---

## 🎯 EXECUTIVE DASHBOARD

### **Purpose**
Monthly overview with cumulative data from the 1st of the month up to the current day, showing KPIs, top performers, and long-running sites.

### **Endpoint**
```
GET /api/energy-rite/reports/executive-dashboard
```

### **Query Parameters**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `month` | Integer | No | Month number (1-12) | `9` |
| `year` | Integer | No | Year | `2025` |
| `cost_code` | String | No | Filter by cost center | `KFC-0001-0001-0003` |

### **Example Requests**

#### Get Current Month Data (All Cost Centers)
```bash
curl -X GET "http://localhost:3000/api/energy-rite/reports/executive-dashboard"
```

#### Get Specific Month/Year
```bash
curl -X GET "http://localhost:3000/api/energy-rite/reports/executive-dashboard?month=9&year=2025"
```

#### Filter by Cost Center
```bash
curl -X GET "http://localhost:3000/api/energy-rite/reports/executive-dashboard?month=9&year=2025&cost_code=KFC-0001-0001-0003"
```

### **Response Structure**
```json
{
  "success": true,
  "data": {
    "month": "9",
    "year": "2025",
    "cumulative_up_to_day": 19,
    "score_card": {
      "total_litres_filled": "68.8",
      "total_litres_used": "100.8",
      "total_hours_running": "0.000",
      "total_hours_not_running": "456.000",
      "sites_running_over_day": 0
    },
    "top_10_sites_by_fuel_usage": [
      {
        "branch": "KEYWEST",
        "company": "YUM Equity",
        "cost_code": "KFC-0001-0001-0003",
        "total_fuel_usage": 24.95,
        "total_running_hours": 0,
        "total_fuel_filled": 1.5
      }
    ],
    "sites_running_over_24h": [
      {
        "branch": "EBONY",
        "company": "Gunret",
        "cost_code": "KFC-0001-0001-0002-0005",
        "total_running_hours": 25.5,
        "total_fuel_usage": 23.66
      }
    ]
  }
}
```

### **Key Features**
- **Cumulative Data**: Shows totals from 1st of month up to current day
- **Score Card KPIs**: Total fuel filled/used, running hours, sites over 24h
- **Top 10 Sites**: Ranked by fuel usage with cost center info
- **Long-running Sites**: Sites running over 24 hours
- **Cost Center Filtering**: Filter all data by specific cost center

---

## 📊 ACTIVITY REPORT

### **Purpose**
Daily snapshot of vehicle activity with 3 daily snapshots (6 AM, 12 PM, 6 PM) showing fuel levels, engine status, and irregularities.

### **Endpoint**
```
GET /api/energy-rite/reports/activity-report
```

### **Query Parameters**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `date` | String | No | Date in YYYY-MM-DD format | `2025-09-18` |
| `cost_code` | String | No | Filter by cost center | `KFC-0001-0001-0003` |

### **Example Requests**

#### Get Today's Activity (All Cost Centers)
```bash
curl -X GET "http://localhost:3000/api/energy-rite/reports/activity-report"
```

#### Get Specific Date
```bash
curl -X GET "http://localhost:3000/api/energy-rite/reports/activity-report?date=2025-09-18"
```

#### Filter by Cost Center
```bash
curl -X GET "http://localhost:3000/api/energy-rite/reports/activity-report?date=2025-09-18&cost_code=KFC-0001-0001-0003"
```

### **Response Structure**
```json
{
  "success": true,
  "data": {
    "date": "2025-09-18",
    "cost_code": "KFC-0001-0001-0003",
    "summary": {
      "total_sites": 5,
      "morning_snapshots": 5,
      "midday_snapshots": 5,
      "evening_snapshots": 5,
      "avg_morning_fuel": "85.20",
      "avg_evening_fuel": "78.45",
      "irregularities_count": 2
    },
    "sites": [
      {
        "branch": "EBONY",
        "company": "Gunret",
        "cost_code": "KFC-0001-0001-0002-0005",
        "snapshots": [
          {
            "time": "2025-09-18T06:00:00.000Z",
            "fuel_level": 85.5,
            "engine_status": "ON",
            "snapshot_type": "MORNING",
            "notes": null
          },
          {
            "time": "2025-09-18T12:00:00.000Z",
            "fuel_level": 82.3,
            "engine_status": "ON",
            "snapshot_type": "MIDDAY",
            "notes": null
          },
          {
            "time": "2025-09-18T18:00:00.000Z",
            "fuel_level": 78.9,
            "engine_status": "OFF",
            "snapshot_type": "EVENING",
            "notes": "Irregularities detected: POSSIBLE_FUEL_THEFT (1)"
          }
        ],
        "fuel_level_morning": 85.5,
        "fuel_level_midday": 82.3,
        "fuel_level_evening": 78.9,
        "engine_status_morning": "ON",
        "engine_status_midday": "ON",
        "engine_status_evening": "OFF",
        "total_fuel_used": 6.6,
        "total_fuel_filled": 0,
        "irregularities_count": 1,
        "first_snapshot": "2025-09-18T06:00:00.000Z",
        "last_snapshot": "2025-09-18T18:00:00.000Z"
      }
    ]
  }
}
```

### **Key Features**
- **Daily Snapshots**: 3 snapshots per day (6 AM, 12 PM, 6 PM)
- **Fuel Tracking**: Morning vs evening fuel levels
- **Engine Status**: Status at each snapshot time
- **Irregularities**: Automatic detection of fuel anomalies
- **Cost Center Filtering**: Filter by specific cost center
- **Date Selection**: View activity for any date

---

## ⚡ AUTOMATIC DATA GENERATION

### **Schedule**
| Time | Task | Description |
|------|------|-------------|
| **00:00** | Daily Reports | Generate daily report data for yesterday |
| **03:00** | Executive Dashboard | Update cumulative data up to current day |
| **06:00** | Daily Snapshots | Take snapshots of all vehicles (6 AM, 12 PM, 6 PM) |
| **01:00 (1st of month)** | Monthly Reports | Generate monthly aggregated data |

### **Data Flow**
1. **TCP Data** → Updates vehicle status in real-time
2. **Scheduler** → Generates reports automatically at scheduled times
3. **API Endpoints** → Return pre-generated data instantly
4. **Frontend** → Fetches ready data (no manual generation needed)

---

## 🎯 FRONTEND IMPLEMENTATION

### **JavaScript Examples**

#### Executive Dashboard Component
```javascript
class ExecutiveDashboard {
  async fetchData(month, year, costCode) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (costCode) params.append('cost_code', costCode);
    
    const response = await fetch(`/api/energy-rite/reports/executive-dashboard?${params}`);
    const data = await response.json();
    
    if (data.success) {
      this.displayScoreCard(data.data.score_card);
      this.displayTopSites(data.data.top_10_sites_by_fuel_usage);
      this.displayLongRunningSites(data.data.sites_running_over_24h);
    }
  }
  
  displayScoreCard(scoreCard) {
    document.getElementById('total-fuel-filled').textContent = scoreCard.total_litres_filled;
    document.getElementById('total-fuel-used').textContent = scoreCard.total_litres_used;
    document.getElementById('total-hours-running').textContent = scoreCard.total_hours_running;
    document.getElementById('sites-over-24h').textContent = scoreCard.sites_running_over_day;
  }
}
```

#### Activity Report Component
```javascript
class ActivityReport {
  async fetchData(date, costCode) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (costCode) params.append('cost_code', costCode);
    
    const response = await fetch(`/api/energy-rite/reports/activity-report?${params}`);
    const data = await response.json();
    
    if (data.success) {
      this.displaySummary(data.data.summary);
      this.displaySites(data.data.sites);
    }
  }
  
  displaySummary(summary) {
    document.getElementById('total-sites').textContent = summary.total_sites;
    document.getElementById('avg-morning-fuel').textContent = summary.avg_morning_fuel;
    document.getElementById('avg-evening-fuel').textContent = summary.avg_evening_fuel;
    document.getElementById('irregularities').textContent = summary.irregularities_count;
  }
  
  displaySites(sites) {
    sites.forEach(site => {
      const siteElement = this.createSiteElement(site);
      document.getElementById('sites-list').appendChild(siteElement);
    });
  }
}
```

---

## 🚨 IRREGULARITY DETECTION

### **Automatic Detection**
The system automatically detects these fuel anomalies:

1. **FILLED_WHILE_GENERATOR_ON**
   - **Trigger**: 10-15L increase while engine is ON
   - **Note**: "Filled while generator ON; calculation affected."

2. **POSSIBLE_FUEL_THEFT**
   - **Trigger**: >20% drop, >50L, within 30 minutes
   - **Note**: "Possible fuel theft detected"

3. **POSSIBLE_FUEL_SPILLAGE**
   - **Trigger**: >5L drop, >10L/min rate, within 5 minutes
   - **Note**: "Possible fuel spillage detected"

### **Where to Find Irregularities**
- **Activity Report**: Shows in `notes` field of snapshots
- **Executive Dashboard**: Counted in score card
- **Daily Reports**: Included in operational notes

---

## 📋 COST CENTER INTEGRATION

### **Available Cost Centers**
| Cost Center | Company | Vehicle Count |
|-------------|---------|---------------|
| `KFC-0001-0001-0001` | Alchemy Foods | 1 |
| `KFC-0001-0001-0003` | YUM Equity | 54 |
| `KFC-0001-0001-0002-0004` | Gunret | 13 |
| `KFC-0001-0001-0002-0005` | Gunret | 9 |
| `KFC-0001-0001-0002-0003` | Gunret | 8 |

### **Filtering Usage**
Add `&cost_code=COST_CENTER_CODE` to any endpoint to filter results by that cost center.

---

## 🔧 ERROR HANDLING

### **Standard Error Response**
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

### **Common Error Scenarios**
- **Invalid date format**: Use YYYY-MM-DD format
- **Invalid month/year**: Month 1-12, valid year
- **Invalid cost code**: Use exact cost center codes
- **No data available**: Returns empty arrays/zero values

---

## 📞 SUPPORT

### **Data Refresh**
- **Executive Dashboard**: Updated every morning at 3 AM
- **Activity Report**: Updated every morning at 6 AM
- **Real-time TCP Data**: Updates vehicle status continuously
- **Manual Refresh**: Call endpoints anytime for latest data

### **Performance**
- **Pre-generated Data**: All reports are pre-calculated
- **Fast Response**: Instant data retrieval
- **Cost Center Filtering**: Efficient database queries
- **Indexed Tables**: Optimized for fast lookups

This system provides **automated, real-time insights** into your Energy Rite operations with full cost center support and comprehensive reporting capabilities.

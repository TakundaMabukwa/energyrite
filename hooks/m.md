# Energy Rite System Documentation

A comprehensive guide for the Energy Rite vehicle tracking, fuel monitoring, and activity analysis system.

## 🚀 Energy Rite Features

### Core Functionality
- **Real-time TCP Data Processing** - Processes Energy Rite vehicle data from TCP feed
- **Fuel Monitoring** - Tracks fuel levels, consumption, and theft detection
- **Activity Tracking** - Monitors engine status, running time, and activity duration
- **Report Generation** - Automated daily, weekly, and monthly Excel reports
- **WebSocket Broadcasting** - Real-time data streaming to connected clients
- **REST API** - Comprehensive API for data access and management

### Advanced Features
- **Fuel Theft Detection** - Automatic detection of suspicious fuel level drops
- **Activity Analysis** - Track vehicles running over 24 hours and top performers
- **Enhanced Fuel Monitoring** - Detects fills while generator ON, theft, and spillage
- **Site Expansion Reports** - Detailed monthly breakdowns with expandable sites
- **Database Storage** - PostgreSQL with comprehensive schema for all data

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Fuel Monitoring](#fuel-monitoring)
- [Activity Tracking](#activity-tracking)
- [Report Generation](#report-generation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Test All Energy Rite Endpoints
```bash
# Health Check
curl http://localhost:3000/api/health

# Executive Dashboard
curl http://localhost:3000/api/energy-rite-reports/executive-dashboard

# Activity Statistics
curl http://localhost:3000/api/energy-rite-vehicles/activity-statistics

# Active Vehicles
curl http://localhost:3000/api/energy-rite-vehicles/active

# Fuel Consumption
curl http://localhost:3000/api/energy-rite-vehicles/fuel-consumption

# Real-time Dashboard
curl http://localhost:3000/api/energy-rite-reports/realtime-dashboard
```

## 🌐 API Endpoints

### 📊 Executive Dashboard
```bash
# Get executive dashboard data
GET /api/energy-rite-reports/executive-dashboard

# With optional filters
GET /api/energy-rite-reports/executive-dashboard?costCenterId=YUM%20Equity
GET /api/energy-rite-reports/executive-dashboard?branch=Johannesburg
GET /api/energy-rite-reports/executive-dashboard?company=YUM%20Equity
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_vehicles": 103,
      "active_vehicles": 15,
      "total_fuel_consumption": 1250.5,
      "theft_incidents": 3
    },
    "branches": [...],
    "top_performers": [...]
  }
}
```

### 📈 Reports

#### Enhanced Monthly Report with Site Expansion
```bash
# Get enhanced monthly report
GET /api/energy-rite-reports/monthly-report-enhanced?costCenterId=YUM%20Equity

# For specific month/year
GET /api/energy-rite-reports/monthly-report-enhanced?costCenterId=YUM%20Equity&month=12&year=2024

# Expand specific site for detailed breakdown
GET /api/energy-rite-reports/monthly-report-enhanced?costCenterId=YUM%20Equity&expandSite=1&month=12&year=2024
```

**Site Expansion Response:**
```json
{
  "success": true,
  "data": {
    "cost_center": {...},
    "expanded_site": 1,
    "monthly_breakdown": {
      "daily_breakdown": [
        {
          "date": "2024-12-01",
          "data_points": 144,
          "avg_fuel_level": 85.5,
          "fills_while_on": 2,
          "theft_incidents": 0,
          "spillage_incidents": 1
        }
      ],
      "anomaly_details": [...],
      "activity_summary": {
        "days_active": 28,
        "avg_daily_hours": 12.5,
        "total_hours": 350
      }
    }
  }
}
```

#### Report Generation
```bash
# Generate manual report
POST /api/energy-rite-reports/generate-db
Content-Type: application/json
{
  "reportType": "daily",
  "reportDate": "2024-12-31",
  "branch": "Johannesburg",
  "company": "YUM Equity"
}

# Get stored reports
GET /api/energy-rite-report-docs-db

# Download specific report
GET /api/energy-rite-reports/download-db/1
```

### 🚀 Activity Tracking

#### Current Activity
```bash
# Get currently active vehicles (engine ON)
GET /api/energy-rite-vehicles/active

# Get vehicles running over 24 hours
GET /api/energy-rite-vehicles/over-24-hours

# Get top 10 vehicles by activity duration
GET /api/energy-rite-vehicles/top-activity

# Get activity statistics
GET /api/energy-rite-vehicles/activity-statistics
```

**Activity Statistics Response:**
```json
{
  "success": true,
  "data": {
    "total_vehicles": 103,
    "currently_active": 15,
    "active_vehicles": 15,
    "vehicles_with_engine_data": 95,
    "vehicles_over_24h": 3,
    "avg_activity_duration": 8.5,
    "max_activity_duration": 48.2,
    "total_activity_hours": 875.5
  }
}
```

#### Active Vehicles Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "branch": "Johannesburg",
      "company": "YUM Equity",
      "plate": "SPUR THUVL",
      "current_status": "engine_on",
      "engine_on_time": "2024-12-31T08:00:00Z",
      "hours_running": 12.5,
      "activity_start_time": "2024-12-31T08:00:00Z",
      "activity_duration_hours": 12.5
    }
  ],
  "count": 15
}
```

### ⛽ Fuel Monitoring

#### Fuel Consumption
```bash
# Get fuel consumption data
GET /api/energy-rite-vehicles/fuel-consumption

# Get specific vehicle consumption
GET /api/energy-rite-vehicles/fuel-consumption/SPUR%20THUVL
```

#### Fuel Theft Detection
```bash
# Get theft statistics
GET /api/energy-rite-vehicles/theft-statistics

# Get vehicles with theft flags
GET /api/energy-rite-vehicles/with-theft

# Reset theft flag
POST /api/energy-rite-vehicles/reset-theft/SPUR%20THUVL
```

**Theft Statistics Response:**
```json
{
  "success": true,
  "data": {
    "total_vehicles": 103,
    "vehicles_with_theft": 3,
    "total_theft_incidents": 5,
    "theft_rate_percentage": 2.9,
    "recent_theft_incidents": [
      {
        "plate": "SPUR THUVL",
        "branch": "Johannesburg",
        "theft_time": "2024-12-31T14:30:00Z",
        "fuel_drop": 25.5,
        "time_window": "15 minutes"
      }
    ]
  }
}
```

### 📡 Live Data

#### Real-time Dashboard
```bash
# Get real-time dashboard data
GET /api/energy-rite-reports/realtime-dashboard
```

#### Vehicle Data
```bash
# Get all vehicles
GET /api/energy-rite-vehicles

# Get vehicle count
GET /api/energy-rite-vehicles/count

# Get vehicle by ID
GET /api/energy-rite-vehicles/by-id?id=1

# Get vehicle by plate
GET /api/energy-rite-vehicles/by-plate?plate=SPUR%20THUVL

# Get vehicles by branch
GET /api/energy-rite-vehicles/by-branch?branch=Johannesburg
```

## ⛽ Fuel Monitoring

### Enhanced Fuel Monitoring Features

The system constantly monitors for three types of fuel anomalies:

#### 1. ⚠️ Filled while Generator ON
- **Detection**: 10-15L increase while engine is running
- **Note**: "Filled while generator ON; calculation affected."
- **Impact**: Affects fuel consumption calculations

#### 2. 🚨 Possible Fuel Theft
- **Detection**: >20L decrease in <30 minutes
- **Note**: "Possible fuel theft: [amount]L in [time] minutes"
- **Action**: Flags the branch for investigation

#### 3. 💧 Possible Fuel Spillage
- **Detection**: 5-15L decrease in <10 minutes (not theft range)
- **Note**: "Possible fuel spillage: [amount]L in [time] minutes"
- **Action**: Logs for maintenance review

### Real-time Logging
```
⚠️ FILL WHILE GENERATOR ON: Johannesburg (SPUR THUVL) - Increase: 12.5L
🚨 POSSIBLE THEFT: Cape Town (KFC WEST) - Possible fuel theft: 25.5L in 15.2 minutes
💧 POSSIBLE SPILLAGE: Durban (MUSHROOM) - Possible fuel spillage: 8.3L in 7.1 minutes
```

## 🚀 Activity Tracking

### Engine Status Detection

The system automatically detects and tracks:

#### Engine ON Detection
- **Triggers**: "engine_on", "on", "start", "running"
- **Actions**:
  - Sets `is_engine_on = true`
  - Records `engine_on_time`
  - Starts activity tracking
  - Sets `is_active = true`

#### Engine OFF Detection
- **Triggers**: "engine_off", "off", "stop", "stopped"
- **Actions**:
  - Sets `is_engine_on = false`
  - Records `engine_off_time`
  - Calculates `activity_duration_hours`
  - Sets `is_active = false`

### Activity Metrics
- **Current Activity**: Vehicles currently running
- **24+ Hour Runners**: Vehicles running over 24 hours
- **Top Performers**: Vehicles with highest activity duration
- **Activity Statistics**: Comprehensive activity metrics

## 📈 Report Generation

### Monthly Report with Site Expansion

#### Main Report Features
- **Summary Data**: Total sites, anomalies, activity
- **Expandable Sites**: Click (+) to view detailed breakdown
- **Anomaly Tracking**: All fuel anomalies for the month
- **Activity Summary**: Running time and activity statistics

#### Site Expansion Features
- **Daily Breakdown**: Day-by-day fuel and activity data
- **Anomaly Details**: Specific anomaly events with timestamps
- **Activity Summary**: Running time statistics
- **Period Selection**: Specific month/year filtering

### Report Types
- **Daily Reports**: Generated every night at 10 PM
- **Weekly Reports**: Generated every Sunday at 10 PM
- **Monthly Reports**: Generated on 1st of every month at 1 AM
- **Manual Reports**: On-demand generation

## 🗄️ Database Schema

### Main Tables

#### `energyrite_vehicles`
```sql
-- Core vehicle data
id, branch, company, plate, pocsagstr, cost_code

-- Fuel data
fuel_probe_1_level, fuel_probe_1_volume_in_tank, fuel_probe_1_level_percentage
fuel_probe_2_level, fuel_probe_2_volume_in_tank, fuel_probe_2_level_percentage

-- Activity tracking
current_status, previous_status, is_engine_on, is_active
activity_start_time, activity_duration_hours, last_activity_time

-- Fuel monitoring
fuel_anomaly, fuel_anomaly_note, last_anomaly_time
theft, theft_time, previous_fuel_level, previous_fuel_time

-- Timestamps
last_message_date, updated_at
```

#### `energy_rite_fuel_data`
```sql
-- Historical fuel data
plate, pocsagstr, branch, company, date_time
fuel_probe_1_level, fuel_probe_1_volume_in_tank, fuel_probe_1_level_percentage
previous_fuel_level, previous_fuel_time

-- Anomaly tracking
fuel_anomaly, fuel_anomaly_note
theft_detected, theft_time

-- Timestamps
created_at
```

#### `energy_rite_reports`
```sql
-- Report data
branch, company, cost_code, date_time
operating_hours, opening_percentage, closing_percentage
opening_fuel, closing_fuel, total_usage, total_fill
liter_usage_per_hour, cost_per_hour

-- Activity tracking
total_operating_hours, usage_rank, is_24_plus_hours
```

## 🚀 Deployment

### Digital Ocean Droplet Setup

#### Database Updates Required
```bash
# Add fuel anomaly columns
docker exec tcp-live-feed-db psql -U postgres -d vehicles -c "
ALTER TABLE energy_rite_fuel_data 
ADD COLUMN IF NOT EXISTS fuel_anomaly text,
ADD COLUMN IF NOT EXISTS fuel_anomaly_note text;
"

docker exec tcp-live-feed-db psql -U postgres -d vehicles -c "
ALTER TABLE energyrite_vehicles 
ADD COLUMN IF NOT EXISTS fuel_anomaly text,
ADD COLUMN IF NOT EXISTS fuel_anomaly_note text,
ADD COLUMN IF NOT EXISTS last_anomaly_time timestamp without time zone;
"
```

#### Server Deployment
```bash
# SSH to droplet
ssh root@your-droplet-ip

# Update code
cd tcp
git pull origin main

# Restart server
pkill -f "node app.js"
nohup node app.js > server.log 2>&1 &

# Check status
ps aux | grep node
```

## 🧪 Testing

### Test All Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Executive dashboard
curl http://localhost:3000/api/energy-rite-reports/executive-dashboard

# Activity statistics
curl http://localhost:3000/api/energy-rite-vehicles/activity-statistics

# Active vehicles
curl http://localhost:3000/api/energy-rite-vehicles/active

# Vehicles over 24 hours
curl http://localhost:3000/api/energy-rite-vehicles/over-24-hours

# Top activity vehicles
curl http://localhost:3000/api/energy-rite-vehicles/top-activity

# Fuel consumption
curl http://localhost:3000/api/energy-rite-vehicles/fuel-consumption

# Fuel theft statistics
curl http://localhost:3000/api/energy-rite-vehicles/theft-statistics

# Real-time dashboard
curl http://localhost:3000/api/energy-rite-reports/realtime-dashboard

# Enhanced monthly report
curl "http://localhost:3000/api/energy-rite-reports/monthly-report-enhanced?costCenterId=YUM%20Equity"
```

### Test Report Generation
```bash
# Generate daily report
curl -X POST http://localhost:3000/api/energy-rite-reports/generate-db \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "daily",
    "reportDate": "2024-12-31",
    "branch": "Johannesburg",
    "company": "YUM Equity"
  }'

# Get report documents
curl http://localhost:3000/api/energy-rite-report-docs-db
```

## 🔧 Troubleshooting

### Common Issues

#### No Data in Endpoints
```bash
# Check if vehicles exist
curl http://localhost:3000/api/energy-rite-vehicles/count

# Check database connection
docker exec tcp-live-feed-db psql -U postgres -d vehicles -c "SELECT COUNT(*) FROM energyrite_vehicles;"
```

#### TCP Feed Not Processing
```bash
# Check server logs
tail -f server.log

# Check TCP connection
netstat -an | grep :your-tcp-port
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker exec tcp-live-feed-db pg_isready -U postgres

# Test connection
docker exec tcp-live-feed-db psql -U postgres -d vehicles -c "SELECT 1;"
```

### Performance Monitoring
```bash
# Check server status
ps aux | grep node

# Monitor database
docker exec tcp-live-feed-db psql -U postgres -d vehicles -c "SELECT * FROM pg_stat_activity;"

# Check disk space
df -h
```

## 📊 Key Metrics

### Dashboard Metrics
- **Total Vehicles**: 103
- **Currently Active**: 15
- **Vehicles Over 24h**: 3
- **Fuel Theft Incidents**: 5
- **Average Activity Duration**: 8.5 hours
- **Total Activity Hours**: 875.5

### Anomaly Detection
- **Fills while Generator ON**: 12 incidents
- **Possible Theft**: 5 incidents
- **Possible Spillage**: 8 incidents
- **Total Anomalies**: 25

## 🎯 Best Practices

### Monitoring
1. **Check Activity Statistics** daily
2. **Monitor Fuel Theft** incidents
3. **Review Anomaly Reports** weekly
4. **Track Long-running Vehicles** (>24h)

### Maintenance
1. **Reset Theft Flags** after investigation
2. **Review Spillage Reports** for maintenance
3. **Monitor Generator Fill Events** for efficiency
4. **Update Vehicle Status** as needed

### Reporting
1. **Generate Monthly Reports** for management
2. **Use Site Expansion** for detailed analysis
3. **Export Data** for external analysis
4. **Schedule Automated Reports** for consistency

---

**Energy Rite System** - Comprehensive vehicle tracking and fuel monitoring 🚀

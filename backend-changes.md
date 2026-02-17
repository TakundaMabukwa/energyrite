# API Changes Documentation

## Summary of Changes

This document outlines all the changes made to the EnergyRite API endpoints for cost code filtering, monthly reports, and snapshot functionality.

---

## 1. Enhanced Executive Dashboard

**Endpoint:** `GET /api/energy-rite/enhanced-executive-dashboard`

### Changes Made:
- ✅ **Cost code filtering working** - Already implemented with hierarchical access
- ✅ **Changed continuous operations threshold from 24+ hours to 12+ hours**

### Parameters:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | No | Target date (YYYY-MM-DD) |
| `costCode` | string | No | Single cost code filter |
| `costCodes` | string | No | Comma-separated cost codes |
| `period` | number | No | Days to look back (default: 30) |

### Example:
```
GET /api/energy-rite/enhanced-executive-dashboard?cost_code=KFC-0001-0001-0002&period=30
```

### Response Changes:
- `continuous_operations` now shows sites running **12+ hours** (was 24+ hours)
- Pattern detection: `maxStreak > 12` instead of `maxStreak > 20`

---

## 2. Activity Reports

**Endpoint:** `GET /api/energy-rite/reports/activity`

### Changes Made:
- ✅ **Cost code filtering working** - Hierarchical filtering implemented
- ✅ Uses `energyrite_vehicle_lookup` table for cost code mapping

### Parameters:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `site` | string | No | Filter by specific site |
| `startDate` | string | No | Start date (YYYY-MM-DD) |
| `endDate` | string | No | End date (YYYY-MM-DD) |
| `costCode` | string | No | Single cost code filter |
| `costCodes` | string | No | Comma-separated cost codes |

### Example:
```
GET /api/energy-rite/reports/activity?costCode=KFC-0001-0001-0002&startDate=2026-01-01&endDate=2026-01-14
```

---

## 3. Cumulative Snapshots

**Endpoint:** `GET /api/energy-rite/cumulative-snapshots/:year/:month`

### Changes Made:
- ✅ **Cost code filtering working** - Filters snapshots and sessions by cost code
- ✅ Uses hierarchical cost center access

### Parameters:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | string | Yes | Year (path param) |
| `month` | string | Yes | Month (path param) |
| `cost_code` | string | No | Cost code filter (query param) |

### Example:
```
GET /api/energy-rite/cumulative-snapshots/2026/1?cost_code=KFC-0001-0001-0002
```

---

## 4. Excel Report Generation (NEW FEATURE)

**Endpoint:** `POST /api/energy-rite/excel-reports/generate`

### Changes Made:
- ✅ **Added `month_type` parameter for two types of monthly reports**

### Parameters:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `report_type` | string | Yes | - | "daily", "weekly", or "monthly" |
| `cost_code` | string | No | null | Cost code filter |
| `site_id` | string | No | null | Specific site filter |
| `date` | string | No | today | Target date (YYYY-MM-DD) |
| `month_type` | string | No | "previous" | "previous" or "current" |

### Monthly Report Types:

#### 1. Previous Month (Default)
```json
{
  "report_type": "monthly",
  "cost_code": "KFC-0001-0001-0002",
  "month_type": "previous"
}
```
- Gets complete previous month (1st to last day)
- If today is 2025-01-15, generates 2024-12-01 to 2024-12-31

#### 2. Month-to-Date (Current)
```json
{
  "report_type": "monthly",
  "cost_code": "KFC-0001-0001-0002",
  "month_type": "current"
}
```
- Gets 1st of current month to today
- If today is 2025-01-15, generates 2025-01-01 to 2025-01-15

### File Naming:
- Previous: `Energy_Rite_monthly_Report_2024-12_timestamp.xlsx`
- Current: `Energy_Rite_monthly_Report_2025-01-MTD_timestamp.xlsx`

---

## 5. Snapshot System (NEW)

### Data Source Changed:
- ✅ **Now uses:** `http://209.38.217.58:8000/api/energyrite-sites`
- ✅ **Field mappings:**
  - `Plate` → site name
  - `DriverName` → active status
  - `cost_code` → cost code
  - `fuel_probe_1_volume_in_tank` → fuel volume (liters)
  - `fuel_probe_1_level_percentage` → fuel percentage

### Time Slots (Server Time):
- **Morning:** 00:00 - 08:00 (12am-8am SA time)
- **Afternoon:** 08:00 - 16:00 (8am-4pm SA time)
- **Evening:** 16:00 - 00:00 (4pm-12am SA time)

### Snapshot Schedule:
- **10:00 server time** = 12:00 SA (end of morning)
- **18:00 server time** = 20:00 SA (end of afternoon)
- **02:00 server time** = 04:00 SA (end of evening)

### Storage:
- Table: `energy_rite_activity_snapshots`
- Includes: vehicles_data with cost codes, fuel levels, active status

---

## 6. Cost Code Filtering (All Endpoints)

### How It Works:
1. Uses `cost-center-access` helper for hierarchical filtering
2. Gets all child cost codes under parent
3. Filters vehicles/sessions/snapshots by accessible cost codes

### Example Hierarchy:
```
KFC-0001-0001-0002 (Gunret)
  ├── Child code 1
  ├── Child code 2
  └── Child code 3
```

When filtering by `KFC-0001-0001-0002`, includes all child codes.

---

## Nginx Proxy Configuration

### Required Headers:
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### Timeout Settings (for long-running reports):
```nginx
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

### Example Location Block:
```nginx
location /api/energy-rite/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # Timeouts for report generation
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}
```

---

## Testing Endpoints

### 1. Test Enhanced Dashboard with Cost Code:
```bash
curl "http://64.227.138.235:4000/api/energy-rite/enhanced-executive-dashboard?cost_code=KFC-0001-0001-0002&period=30"
```

### 2. Test Activity Report:
```bash
curl "http://64.227.138.235:4000/api/energy-rite/reports/activity?costCode=KFC-0001-0001-0002&startDate=2026-01-01&endDate=2026-01-14"
```

### 3. Test Cumulative Snapshots:
```bash
curl "http://64.227.138.235:4000/api/energy-rite/cumulative-snapshots/2026/1?cost_code=KFC-0001-0001-0002"
```

### 4. Test Monthly Report (Previous Month):
```bash
curl -X POST "http://64.227.138.235:4000/api/energy-rite/excel-reports/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "monthly",
    "cost_code": "KFC-0001-0001-0002",
    "month_type": "previous"
  }'
```

### 5. Test Monthly Report (Month-to-Date):
```bash
curl -X POST "http://64.227.138.235:4000/api/energy-rite/excel-reports/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "monthly",
    "cost_code": "KFC-0001-0001-0002",
    "month_type": "current"
  }'
```

---

## Summary of Files Modified

1. **enhancedExecutiveDashboardController.js**
   - Changed continuous operations from 24h to 12h threshold

2. **energyRiteActivityReportController.js**
   - Cost code filtering already working

3. **energyRiteCumulativeSnapshotsController.js**
   - Cost code filtering already working

4. **energyRiteReportDocumentsController.js**
   - Added `month_type` parameter

5. **energyRiteExcelReportGenerator.js**
   - Updated `calculateDateRange()` to support "previous" and "current" month types
   - Changed query logic to use date ranges for monthly reports

6. **activity-snapshots.js**
   - Changed data source to `http://209.38.217.58:8000/api/energyrite-sites`
   - Updated field mappings for new API structure
   - Time slots: 0-8, 8-16, 16-0 (server time)

7. **snapshot-scheduler.js**
   - Updated to use new activity-snapshots helper
   - Schedule: 10:00, 18:00, 02:00 server time

---

## Database Tables Used

1. **energy_rite_operating_sessions** - Session data with cost codes
2. **energy_rite_fuel_fills** - Fuel fill events
3. **energyrite_vehicle_lookup** - Vehicle to cost code mapping
4. **energy_rite_activity_snapshots** - Snapshot storage
5. **energy_rite_generated_reports** - Report metadata

---

## Notes

- All endpoints support hierarchical cost code filtering
- Server time is 2 hours behind SA time
- Snapshots use volume (liters) not percentage
- Monthly reports support both previous month and month-to-date
- Continuous operations threshold changed to 12+ hours
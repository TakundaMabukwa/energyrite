# Reports Tab API Changes

## Summary
Modified the Reports tab to remove Weekly Report and add Month-to-Date functionality with proper date range calculations.

---

## Frontend Changes

### Reports Tab (`components/views/FuelReportsView.tsx`)

**Changes Made:**
1. ✅ Removed "Weekly Report" card
2. ✅ Added "Month to Date" report card
3. ✅ Updated "Monthly Report" to fetch previous complete month
4. ✅ Updated date calculation logic

**New Report Types:**

| Report Type | Description | Date Range |
|-------------|-------------|------------|
| **Daily** | Yesterday's report | Yesterday only |
| **Month to Date** | Current month up to yesterday | 1st of current month → Yesterday |
| **Monthly** | Previous complete month | 1st of previous month → Last day of previous month |

---

## API Endpoint Requirements

### Endpoint: `POST /api/energy-rite/excel-reports/generate`

**Location:** Backend server (needs to be updated)

### Request Body Changes:

#### 1. Daily Report (No Change)
```json
{
  "report_type": "daily",
  "start_date": "2026-01-13",
  "end_date": "2026-01-13",
  "cost_code": "KFC-0001-0001-0001"
}
```

#### 2. Month to Date (NEW)
```json
{
  "report_type": "monthly",
  "start_date": "2026-01-01",
  "end_date": "2026-01-13",
  "cost_code": "KFC-0001-0001-0001"
}
```
- `start_date`: 1st of current month
- `end_date`: Yesterday's date

#### 3. Monthly Report (MODIFIED)
```json
{
  "report_type": "monthly",
  "start_date": "2025-12-01",
  "end_date": "2025-12-31",
  "cost_code": "KFC-0001-0001-0001"
}
```
- `start_date`: 1st of previous month
- `end_date`: Last day of previous month (handles 28/29/30/31 days)

---

## Backend Changes Required

### File: `energyRiteExcelReportGenerator.js` (or similar)

You need to update the backend to:

1. **Accept `start_date` and `end_date` parameters** for all report types
2. **Use date range** instead of calculating dates on backend
3. **Handle monthly reports** with custom date ranges

### Example Backend Logic:

```javascript
// In your report generator
async function generateReport(req, res) {
  const { report_type, start_date, end_date, cost_code, site_id } = req.body;
  
  // Use the provided date range
  const startDate = start_date;
  const endDate = end_date;
  
  // Query sessions between start_date and end_date
  const sessions = await db.query(`
    SELECT * FROM energy_rite_operating_sessions
    WHERE date >= $1 AND date <= $2
    ${cost_code ? 'AND cost_code = $3' : ''}
    ORDER BY date, start_time
  `, [startDate, endDate, cost_code]);
  
  // Generate Excel file...
}
```

---

## Date Calculation Examples

### If today is 2026-01-14:

| Report Type | Start Date | End Date | Description |
|-------------|------------|----------|-------------|
| Daily | 2026-01-13 | 2026-01-13 | Yesterday |
| Month to Date | 2026-01-01 | 2026-01-13 | 1st of Jan to yesterday |
| Monthly | 2025-12-01 | 2025-12-31 | Complete December |

### If today is 2026-03-15:

| Report Type | Start Date | End Date | Description |
|-------------|------------|----------|-------------|
| Daily | 2026-03-14 | 2026-03-14 | Yesterday |
| Month to Date | 2026-03-01 | 2026-03-14 | 1st of Mar to yesterday |
| Monthly | 2026-02-01 | 2026-02-28 | Complete February (28 days) |

### If today is 2024-03-15 (Leap Year):

| Report Type | Start Date | End Date | Description |
|-------------|------------|----------|-------------|
| Daily | 2024-03-14 | 2024-03-14 | Yesterday |
| Month to Date | 2024-03-01 | 2024-03-14 | 1st of Mar to yesterday |
| Monthly | 2024-02-01 | 2024-02-29 | Complete February (29 days - leap year) |

---

## Nginx Configuration

### No Changes Required

The endpoint `/api/energy-rite/excel-reports/generate` already exists. Just ensure your nginx configuration has proper timeouts for report generation:

```nginx
location /api/energy-rite/ {
    proxy_pass http://localhost:4000;  # Your backend port
    proxy_http_version 1.1;
    
    # Important: Increase timeouts for report generation
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

---

## Testing

### Test Daily Report:
```bash
curl -X POST "http://YOUR_SERVER/api/energy-rite/excel-reports/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "daily",
    "start_date": "2026-01-13",
    "end_date": "2026-01-13",
    "cost_code": "KFC-0001-0001-0001"
  }'
```

### Test Month to Date:
```bash
curl -X POST "http://YOUR_SERVER/api/energy-rite/excel-reports/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "monthly",
    "start_date": "2026-01-01",
    "end_date": "2026-01-13",
    "cost_code": "KFC-0001-0001-0001"
  }'
```

### Test Monthly Report (Previous Month):
```bash
curl -X POST "http://YOUR_SERVER/api/energy-rite/excel-reports/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "monthly",
    "start_date": "2025-12-01",
    "end_date": "2025-12-31",
    "cost_code": "KFC-0001-0001-0001"
  }'
```

---

## Backend Implementation Guide

### What You Need to Update:

1. **Accept `start_date` and `end_date` parameters** in the request body
2. **Query sessions using the date range** provided by frontend
3. **Remove any backend date calculation logic** - frontend now handles all date calculations
4. **Handle cost_code filtering** as before

### Pseudo-code:

```javascript
// Backend endpoint handler
app.post('/api/energy-rite/excel-reports/generate', async (req, res) => {
  const { report_type, start_date, end_date, cost_code, site_id } = req.body;
  
  // Validate dates
  if (!start_date || !end_date) {
    return res.status(400).json({ 
      success: false, 
      error: 'start_date and end_date are required' 
    });
  }
  
  // Build query with date range
  let query = `
    SELECT * FROM energy_rite_operating_sessions
    WHERE date >= ? AND date <= ?
  `;
  
  const params = [start_date, end_date];
  
  // Add cost code filter if provided
  if (cost_code) {
    query += ` AND cost_code = ?`;
    params.push(cost_code);
  }
  
  // Add site filter if provided
  if (site_id) {
    query += ` AND site_id = ?`;
    params.push(site_id);
  }
  
  // Execute query and generate Excel
  const sessions = await db.query(query, params);
  const excelFile = await generateExcelFromSessions(sessions, start_date, end_date);
  
  // Return download URL
  res.json({
    success: true,
    data: {
      file_name: excelFile.name,
      download_url: excelFile.url,
      date_range: `${start_date} to ${end_date}`
    }
  });
});
```

---

## Summary of Changes

### Frontend (This Server):
1. ✅ Removed Weekly Report card
2. ✅ Added Month to Date card
3. ✅ Updated Monthly Report description to "Previous complete month"
4. ✅ Frontend now calculates all dates and sends `start_date` and `end_date`
5. ✅ Handles leap years automatically (Feb 28/29)
6. ✅ Handles months with 30/31 days automatically

### Backend (Your Server - Needs Update):
1. ⚠️ Must accept `start_date` and `end_date` parameters
2. ⚠️ Must query sessions using provided date range
3. ⚠️ Remove any backend date calculation logic
4. ⚠️ Keep cost_code filtering as-is

### Nginx:
- ✅ No changes required (endpoint already exists)
- ✅ Ensure timeouts are set to 300s for long reports

---

## File Modified

- `components/views/FuelReportsView.tsx` - Reports tab UI and logic

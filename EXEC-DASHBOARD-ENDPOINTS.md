# Executive Dashboard - API Endpoints Analysis

## Nginx Routes vs ExecutiveDashboardView Endpoints

### **MATCHED ROUTES (Used by Executive Dashboard)**

#### 1. **Enhanced Executive Dashboard API** ✅
- **Nginx Route:**
  ```nginx
  location /api/energy-rite/enhanced-executive-dashboard {
      proxy_pass http://178.128.204.68:4000/api/energy-rite/enhanced-executive-dashboard;
  }
  ```
- **Usage in Code:** [ExecutiveDashboardView.tsx:184](components/views/ExecutiveDashboardView.tsx#L184)
  ```typescript
  const dashboardRes = await fetch(`${baseUrl}/api/energy-rite/enhanced-executive-dashboard${enhancedQueryString}`);
  ```
- **Purpose:** Fetches key metrics, fleet status, top performing sites, continuous operations data
- **Parameters:** `start_date`, `end_date`, `cost_code`

---

#### 2. **Reports/Activity API** ✅
- **Nginx Route:**
  ```nginx
  location /api/energy-rite/reports/ {
      proxy_pass http://178.128.204.68:4000/api/energy-rite/reports/;
  }
  ```
- **Usage in Code:** [ExecutiveDashboardView.tsx:293](components/views/ExecutiveDashboardView.tsx#L293)
  ```typescript
  const activityRes = await fetch(`${baseUrl}/api/energy-rite/reports/activity?${activityParams.toString()}`);
  ```
- **Endpoint:** `/api/energy-rite/reports/activity`
- **Purpose:** Fetches activity report with fuel analysis, period breakdown (morning/afternoon), site usage data
- **Parameters:** `start_date`, `end_date`, `site_id` OR `cost_code`

---

#### 3. **Reports/Snapshots API** ✅
- **Nginx Route:**
  ```nginx
  location /api/energy-rite/reports/ {
      proxy_pass http://178.128.204.68:4000/api/energy-rite/reports/;
  }
  ```
- **Usage in Code:** [ExecutiveDashboardView.tsx:336](components/views/ExecutiveDashboardView.tsx#L336)
  ```typescript
  const snapshotRes = await fetch(`${baseUrl}/api/energy-rite/reports/snapshots?${snapshotParams.toString()}`);
  ```
- **Endpoint:** `/api/energy-rite/reports/snapshots`
- **Purpose:** Fetches fuel period analysis, hierarchical snapshot data
- **Parameters:** `start_date`, `end_date`, `include_hierarchy=true`, `site_id` OR `cost_code`

---

#### 4. **Cumulative Snapshots API** ✅ (Referenced but partially used)
- **Nginx Route:**
  ```nginx
  location /api/energy-rite/cumulative-snapshots/ {
      proxy_pass http://178.128.204.68:4000/api/energy-rite/cumulative-snapshots/;
  }
  ```
- **Usage in Code:** [ExecutiveDashboardView.tsx:387+](components/views/ExecutiveDashboardView.tsx#L387)
  ```typescript
  // Mentioned in fetchPreviousDayFuelConsumption function
  // Used for cumulative fuel consumption data for current month
  ```
- **Purpose:** Fetches cumulative fuel consumption data
- **Status:** Set up in function but may need verification on actual endpoint calls

---

### **NOT USED by Executive Dashboard**

#### Routes that are NOT used:
- ❌ **Excel Reports API** - `/api/energy-rite/excel-reports/`
- ❌ **Vehicles API** - `/api/energy-rite/vehicles`
- ❌ **Energy-Rite Reports API** - `/api/energy-rite-reports/`
- ❌ **Admin API** - `/api/admin/`

---

## Summary

**Primary Data Flow for Executive Dashboard:**
```
Executive Dashboard
    ↓
    ├─→ /api/energy-rite/enhanced-executive-dashboard (KEY METRICS)
    │   - Fleet status
    │   - Top performing sites
    │   - Continuous operations
    │
    ├─→ /api/energy-rite/reports/activity (ACTIVITY & FUEL ANALYSIS)
    │   - Morning/Afternoon breakdown
    │   - Site usage data
    │
    ├─→ /api/energy-rite/reports/snapshots (PERIOD ANALYSIS)
    │   - 3-period fuel usage
    │   - Hierarchical data
    │
    └─→ /api/energy-rite/cumulative-snapshots (CUMULATIVE CONSUMPTION)
        - Current month fuel data
```

**All these routes are proxied through:**
- Primary Backend: `http://178.128.204.68:4000/` (Reports & Enhanced Dashboard)

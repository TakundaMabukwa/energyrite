# Database Tables Used in Energyrite System

## Supabase Tables

### 1. **users**
- User authentication and profile data
- Fields: id, email, role (energyrite, energyrite_admin), created_at, first_login
- Used in: User management, authentication, admin panel

### 2. **cost_centers** (Legacy)
- Cost center hierarchy data
- Fields: id, created_at, cost_code, company, branch, sub_branch, cost_codes, new_account_number, parent_cost_code
- Used in: Cost center navigation (legacy support)

### 3. **level_3_cost_centers**
- Level 3 cost center hierarchy
- Fields: id, created_at, cost_code, company, branch, sub_branch, cost_codes, new_account_number, parent_cost_code
- Used in: Cost center hierarchy building

### 4. **level_4_cost_centers**
- Level 4 cost center hierarchy
- Fields: id, created_at, cost_code, company, branch, sub_branch, cost_codes, new_account_number, parent_cost_code
- Used in: Cost center hierarchy building

### 5. **level_5_cost_centers**
- Level 5 cost center hierarchy
- Fields: id, created_at, cost_code, company, branch, sub_branch, cost_codes, new_account_number, parent_cost_code
- Used in: Cost center hierarchy building

### 6. **energyrite_vehicle_lookup**
- Vehicle to cost code mapping
- Fields: plate, cost_code
- Used in: Vehicle cost center assignment

### 7. **vehicle_settings**
- Vehicle tank capacity settings
- Fields: vehicle_id, tank_size
- Used in: Fuel gauge display, equipment management

### 8. **note_logs**
- Vehicle notes history (internal and external)
- Fields: vehicle_id, user_id, user_email, old_note, new_note, action, note_type (internal/external), created_at
- Used in: Fuel gauges (client notes), Equipment tab (internal notes), note history tracking

### 9. **fuel_gauge_settings**
- User-specific fuel gauge color preferences
- Fields: user_id, color_high, color_medium, color_low
- Used in: Fuel gauge color customization

## External API Data Sources

### 1. **Energy Rite API - Vehicle/Sites Data**
- Endpoint: `http://209.38.217.58:8000/api/energyrite-sites`
- Real-time vehicle/generator data
- Fields: Id, Plate, Speed, Latitude, Longitude, Geozone, DriverName, fuel_probe_1_level, fuel_probe_1_volume_in_tank, fuel_probe_1_temperature, fuel_probe_1_level_percentage, LocTime, company, cost_code, color_codes, client_notes
- Used in: Dashboard, real-time monitoring, vehicle tracking, fuel gauges

### 2. **Energy Rite API - Activity Reports**
- Endpoint: `http://localhost:4000/api/energy-rite/activity-reports`
- Daily activity and fuel usage reports
- Fields: date, site_reports (branch/generator, total_operating_hours, total_fuel_usage, total_fuel_filled, total_sessions, peak_time_slot, peak_usage_session), summary (total_fuel_usage, total_operating_hours, total_fuel_filled, total_sessions, total_sites), overall_peak_time_slot, time_slot_totals (morning_to_afternoon, afternoon_to_evening)
- Used in: Activity reports, fuel usage analysis, time slot analysis, fuel fill detection

### 3. **Energy Rite API - Realtime Dashboard**
- Endpoint: `http://localhost:4000/api/energy-rite-reports/realtime-dashboard`
- Real-time dashboard metrics
- Fields: companyBreakdown, branchBreakdown
- Used in: Dashboard overview, company/branch statistics

### 4. **Equipment API**
- Endpoint: `http://64.227.138.235:3000`
- Equipment and generator data
- Used in: Equipment monitoring

## Summary

**Total Supabase Tables: 9**
- users
- cost_centers (legacy)
- level_3_cost_centers
- level_4_cost_centers
- level_5_cost_centers
- energyrite_vehicle_lookup
- vehicle_settings
- note_logs
- fuel_gauge_settings

**External APIs: 4**
- Energy Rite Sites API (vehicle/generator data)
- Energy Rite Activity Reports API
- Energy Rite Realtime Dashboard API
- Equipment API

## Data Flow

1. **Authentication**: Supabase `users` table
2. **Cost Center Hierarchy**: Supabase `level_3/4/5_cost_centers` tables
3. **Vehicle Data**: External Energy Rite Sites API
4. **Activity Reports**: External Energy Rite Activity Reports API
5. **Real-time Monitoring**: External Energy Rite Sites API + Equipment API
6. **Fuel Gauges**: External API + Supabase `vehicle_settings` + `note_logs` + `fuel_gauge_settings`
7. **Equipment Management**: External API + Supabase `vehicle_settings` + `note_logs`
8. **Notes System**: Supabase `note_logs` (internal notes in Equipment tab, external/client notes in Fuel Gauges)

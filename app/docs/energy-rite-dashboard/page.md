---
title: Energy Rite Dashboard Guide
---

## Energy Rite Dashboard Guide

This page documents how the Executive Dashboard and Activity Report endpoints are consumed in the app, including cost center filtering and data refresh behavior.

### Executive Dashboard

- Endpoint: `GET /api/energy-rite/reports/executive-dashboard`
- Optional query: `month`, `year`, `cost_code`
- Used for: score card, top 10 sites, sites running over 24h

### Activity Report

- Endpoint: `GET /api/energy-rite/reports/activity-report`
- Optional query: `date`, `cost_code`
- Used for: daily snapshot summary and per-site activity

### Equipment (Realtime)

- Endpoint: `GET /api/energy-rite/realtime`
- Used for: branch, IP address, and `fuel_probe_1_volume_in_tank`

### Notes

- All requests go through `/api/energy-rite-proxy?endpoint=...` in the app.
- Add `&cost_code=COST_CENTER_CODE` to filter by a cost center when available.











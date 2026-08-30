---
description: "Rules for JavaScript scoping and Dashboard rendering in app.js"
---

# JavaScript Scoping & Rendering Rules

When modifying or maintaining `app.js` in the WeQuote project, follow these architectural rules to prevent UI rendering bugs:

1. **Global Rendering Functions:**
   Important UI rendering functions such as `renderDashboard`, `updateFleetStats`, `initDashboardMap`, `updateMapMarkers`, and `renderRecentQuotesFeed` must remain attached to the `window` object (e.g., `window.renderDashboard = () => { ... }`). 
   - **Reason:** This ensures they can be accessed globally by asynchronous functions (like Supabase data fetches) that are defined outside the `DOMContentLoaded` block.

2. **Supabase Data Initialization (`initSupabaseData`):**
   When data is fetched asynchronously from Supabase, the fetching function must explicitly call the global render functions to update the UI once the data arrives:
   ```javascript
   if (typeof window.renderHistory === 'function') window.renderHistory();
   if (typeof window.renderDashboard === 'function') window.renderDashboard();
   if (typeof window.updateFleetStats === 'function') window.updateFleetStats();
   if (typeof window.updateMapMarkers === 'function') window.updateMapMarkers();
   if (typeof window.initDashboardMap === 'function') window.initDashboardMap();
   if (typeof window.renderRecentQuotesFeed === 'function') window.renderRecentQuotesFeed();
   ```
   - **Reason:** If these are not called, the dashboard will remain empty or display stale data until the user manually triggers a tab switch.

3. **Avoid Local Constants for Shared Logic:**
   Do not define these shared rendering functions as local `const` inside `document.addEventListener('DOMContentLoaded', ...)` if they need to be triggered by network requests or external modules.

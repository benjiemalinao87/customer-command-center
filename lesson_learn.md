# Lessons Learned

## Transcript Hover Tooltip Feature (October 15, 2025)

### Feature Implementation
Added hover tooltip to display call transcripts in the Recordings component, similar to VAPI's interface.

### Implementation Details
1. **Updated Recording interface** to support conversation-style transcripts with message objects containing role, text, and timestamp
2. **Created hover state** using `onMouseEnter` and `onMouseLeave` events
3. **Styled transcript tooltip** as a dark overlay with color-coded messages (green for assistant, blue for user)
4. **Mock data** includes realistic funeral home conversations with multiple back-and-forth exchanges

### Key Components
- `TranscriptMessage` interface for structured conversation data
- Hover-activated tooltip positioned absolutely below the button
- Color-coded role labels for easy conversation flow reading
- Timestamps for each message
- Max height with scroll for longer conversations

### Files Modified
- `src/components/Recordings.tsx` - Added transcript hover tooltip feature

---

## Voice Selection Integration with VAPI (October 15, 2025)

### Problem
Voice selections were not saving when updating agents. After selecting a voice and clicking save, the changes would not persist after page refresh. Console showed 400 errors from VAPI API.

### Root Cause
1. **Wrong voice provider**: Initially used `provider: 'playht'` but VAPI's built-in voices use `provider: 'vapi'`
2. **Incorrect voice ID capitalization**: Voice IDs must be capitalized (e.g., `Elliot`, `Savannah`, `Spencer`) not lowercase (e.g., `elliot`, `savannah`, `spencer`)

### Solution
1. Changed voice provider from `'playht'` to `'vapi'` in `api.ts` for both `update` and `create` functions
2. Updated all voice IDs in `AgentConfig.tsx` to use proper capitalization
3. Added all available VAPI voices: Paige, Rohan, Hana, Elliot, Cole, Harry, Spencer, Kylie, Lily, Neha, Savannah

### How It Should Be Done
```typescript
// ✅ CORRECT
vapiUpdates.voice = {
  provider: 'vapi',
  voiceId: 'Elliot'  // Capitalized
};
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - incorrect provider
vapiUpdates.voice = {
  provider: 'playht',  // Wrong provider
  voiceId: 'elliot'    // Wrong capitalization
};
```

### Key Takeaways
- Always check VAPI API error messages - they provide exact requirements (in this case, the error message listed all valid voice IDs with proper capitalization)
- VAPI has multiple voice providers (vapi, playht, 11labs, cartesia) - use the correct one for your voice selection
- Voice IDs are case-sensitive
- When integrating with third-party APIs, verify the exact format requirements through error messages or documentation

### Files Modified
- `src/lib/api.ts` - Updated voice provider to 'vapi' in update and create functions
- `src/components/AgentConfig.tsx` - Capitalized all voice IDs and added Lily voice

---

## Professional Bar Chart Component (October 15, 2025)

### Feature Implementation
Transformed basic bar chart into a professional, interactive data visualization component with proper axes, gridlines, and hover effects.

### Implementation Details
1. **Y-axis with gridlines** - Added Y-axis labels (0 to max value) with 5 evenly spaced horizontal gridlines
2. **Interactive tooltips** - Hover over bars displays formatted data with smooth fade-in animation
3. **Visual enhancements:**
   - Dynamic shadow effects (increases on hover)
   - Scale animation (1.05x zoom on hover)
   - Gradient shine effect on bars
   - Rounded top corners for modern look
4. **Proper scaling** - Values rounded to nearest 100 for clean Y-axis labels
5. **Better layout** - Integrated X-axis labels with proper spacing

### How It Should Be Done
```typescript
// ✅ CORRECT - Professional bar chart with all features
<BarChart 
  data={sentimentData} 
  height={240} 
  showValues={true} 
  showGridlines={true} 
/>

// Chart includes:
// - Y-axis with scale
// - Horizontal gridlines
// - Interactive hover tooltips
// - X-axis labels
// - Smooth animations
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - Basic bars without proper visualization
<div style={{ height: `${percent}%`, backgroundColor: color }} />

// Missing:
// - No axes or scale reference
// - No gridlines for context
// - No interactivity
// - No tooltips
```

### Key Takeaways
- Professional charts need axes, gridlines, and proper scaling
- Interactive elements (hover effects, tooltips) greatly improve UX
- Use rounded values for cleaner axis labels (round to nearest 100)
- Layer elements properly (gridlines behind bars)
- Add visual feedback on interaction (shadow, scale, shine effects)
- Calculate proper percentages based on rounded max value, not exact max

### Files Modified
- `src/components/BarChart.tsx` - Complete rewrite with professional features
- `src/components/SentimentKeywords.tsx` - Updated to use new gridlines prop

---

## Professional Multi-Line Chart Component (October 15, 2025)

### Feature Implementation
Enhanced multi-line chart with advanced interactive features including point-specific tooltips, vertical crosshair, and multi-value display for time-series data visualization.

### Implementation Details
1. **Interactive data points** - Hover over individual points to see specific values with animated tooltips
2. **Vertical crosshair** - Dashed vertical line appears on hover to show alignment across all series
3. **Multi-value tooltip** - Hovering near a time point shows all series values at once
4. **Visual feedback:**
   - Points enlarge on hover (3px → 5px) with white stroke outline
   - Drop shadow effect on hovered points
   - Non-hovered lines fade to 40% opacity for focus
   - X-axis labels highlight and bold on hover
5. **Better gridlines** - Increased visibility from 10% to full opacity with proper color
6. **Large hover areas** - 12px invisible circles around points for easier interaction

### How It Should Be Done
```typescript
// ✅ CORRECT - Professional multi-line chart with interactivity
const [hoveredPoint, setHoveredPoint] = useState<{ seriesIndex: number; pointIndex: number } | null>(null);
const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

// Invisible hover area for better UX
<circle
  cx={point.x}
  cy={point.y}
  r="12"
  fill="transparent"
  className="cursor-pointer"
  onMouseEnter={() => {
    setHoveredPoint({ seriesIndex, pointIndex });
    setHoveredColumn(pointIndex);
  }}
/>

// Visible point that scales on hover
<circle
  cx={point.x}
  cy={point.y}
  r={isHovered ? "5" : "3"}
  fill={s.color}
/>
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - No interactivity or hover states
<circle cx={x} cy={y} r="3" fill={color} />

// Missing:
// - No hover detection
// - No tooltips
// - No visual feedback
// - Small hit areas (hard to click)
```

### Key Takeaways
- Use invisible larger circles (r="12") around visible points for easier hover detection
- Implement both point-specific and column-wide hover states for flexibility
- Fade non-hovered elements to 40% opacity to create focus
- Add drop shadows and white strokes to highlight active points
- Vertical crosshair helps users align values across multiple series
- Multi-value tooltips reduce cognitive load by showing all data at once
- Position tooltips dynamically based on SVG coordinates converted to percentages
- Use `pointer-events-none` on tooltips to prevent hover interference

### Files Modified
- `src/components/MultiLineChart.tsx` - Added advanced interactivity and hover states

---

## Professional Donut Chart Component (October 15, 2025)

### Problem
Donut chart was not visible - only text labels appeared, no visual chart rendering. This was especially problematic when one segment was 100% (full circle edge case).

### Root Cause
1. **100% edge case** - When a segment is 360 degrees, SVG path rendering fails
2. **Low contrast** - No background circle to show the chart area
3. **Poor visibility** - Chart was too small and lacked visual effects
4. **No interactivity** - Static chart with no hover feedback

### Solution
1. **Fixed 100% rendering** - Adjusted angles >= 359.99 to 359.99 to prevent full-circle rendering issues
2. **Added background circle** - Light gray background ring to show the chart area even when segments are minimal
3. **Interactive hover states:**
   - Segments scale up (1.05x) and brighten on hover
   - Non-hovered segments fade to 50% opacity
   - Legend items scale and glow on hover
   - Center text dynamically shows hovered segment value
4. **Better sizing** - Increased default size from 180px to 200px with thicker stroke
5. **Visual polish** - Added drop shadows, smooth transitions, and color glows

### How It Should Be Done
```typescript
// ✅ CORRECT - Handle 100% edge case and add visibility features
const adjustedAngle = angle >= 359.99 ? 359.99 : angle;

// Background circle for visibility
<circle
  cx={center}
  cy={center}
  r={radius}
  fill="none"
  stroke="currentColor"
  strokeWidth={strokeWidth}
  className="text-gray-100 dark:text-gray-800"
/>

// Interactive segments with hover
<path
  d={segment.path}
  fill={segment.color}
  className="transition-all duration-300 cursor-pointer"
  style={{
    filter: isHovered 
      ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2)) brightness(1.1)' 
      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
  }}
  onMouseEnter={() => setHoveredIndex(index)}
/>
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - No edge case handling or visibility features
const angle = (item.value / total) * 360; // Can be exactly 360
<path d={path} fill={color} /> // No background, no hover, no effects

// Results in:
// - Invisible chart when 100%
// - Poor contrast
// - No interactivity
```

### Key Takeaways
- SVG arcs fail to render when exactly 360 degrees - always cap at 359.99
- Add background circles/rings to show chart area even with minimal data
- Use hover states on both the chart segments and legend items
- Update center text dynamically to show hovered segment value
- Fade non-hovered elements to create focus (50% opacity is ideal)
- Add drop shadows and brightness filters for depth
- Scale transform (1.05x) provides tactile feedback without being disruptive
- Always test edge cases: 0%, 100%, very small percentages

### Files Modified
- `src/components/DonutChart.tsx` - Complete rewrite with visibility and interactivity
- `src/components/PerformanceDashboard.tsx` - Updated chart size

---

## Professional Metric Cards (October 15, 2025)

### Feature Implementation
Transformed basic metric cards into interactive, animated cards with gradient backgrounds, color-coded icons, and smooth hover effects.

### Implementation Details
1. **Lift-on-hover effect** - Cards translate up 4px with enhanced shadow on hover
2. **Animated top border** - Colored accent bar slides in from left on hover
3. **Gradient background** - Subtle gradient appears matching the icon color
4. **Icon transformation:**
   - Background changes from gray to icon's color
   - Icon changes from colored to white
   - Scales up 1.1x and rotates 5 degrees
   - Pulse animation effect
   - Color-matched shadow appears
5. **Value scaling** - Main value scales up 1.05x on hover
6. **Better typography** - Uppercase tracking for titles, bolder values
7. **Enhanced trend badges** - Colored background pills for trend indicators

### How It Should Be Done
```typescript
// ✅ CORRECT - Dynamic color mapping and smooth transitions
const getColorValue = (colorClass: string) => {
  const colorMap: Record<string, string> = {
    'text-blue-600': '#2563eb',
    'text-green-600': '#16a34a',
    // ... more colors
  };
  return colorMap[colorClass] || '#2563eb';
};

// Animated icon container
<div 
  style={{
    backgroundColor: isHovered ? colorValue : 'rgb(249 250 251)',
    transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
    boxShadow: isHovered ? `0 8px 16px -4px ${colorValue}40` : 'none',
  }}
>
  <Icon 
    style={{ color: isHovered ? 'white' : colorValue }}
  />
  {isHovered && <div className="animate-ping" />}
</div>
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - Static design with basic hover
<div className="hover:shadow-md">
  <div className="bg-gray-50">
    <Icon className="text-blue-600" />
  </div>
</div>

// Missing:
// - No color transformation
// - No animations
// - No gradient effects
// - No border accents
```

### Key Takeaways
- Map CSS color classes to hex values for dynamic styling with `style` prop
- Use multiple layered hover effects (lift, shadow, border, gradient) for richness
- Icon containers should transform dramatically (color fill, scale, rotate, shadow)
- Add pulse animation on hover for attention-grabbing feedback
- Scale the main value slightly (1.05x) to emphasize it on hover
- Use `transformOrigin: 'left'` to scale from the natural reading position
- Combine translateY with enhanced shadows for realistic lift effect
- Top border accent sliding in creates a professional reveal animation
- Gradient backgrounds should be subtle (08 opacity) to not overwhelm content
- Trend indicators benefit from colored background pills instead of plain text

### Files Modified
- `src/components/MetricCard.tsx` - Complete redesign with animations and interactivity

---

## Professional Horizontal Bar Chart (October 15, 2025)

### Feature Implementation
Enhanced keyword bar chart with shimmer effects, hover glow, and smooth interactions.

### Implementation Details
1. **Hover slide effect** - Bars slide 4px to the right on hover
2. **Shimmer animation** - Animated gradient sweeps across hovered bar
3. **Color glow effects:**
   - Dot indicator glows and scales 1.2x
   - Bar gets colored shadow
   - Legend text becomes bold
4. **Focus dimming** - Non-hovered bars fade to 50% opacity
5. **Gradient highlights** - Inner gradient on bars for depth
6. **Better sizing** - Increased bar height from 2px to 3px, better spacing

### Key Takeaways
- Shimmer animations require keyframes in global CSS, not inline
- Use `boxShadow` with color variables for dynamic glows
- Slide effect (translateX) is more subtle than scale for horizontal bars
- Add inner gradients (white/20 top) for 3D effect on bars
- Background shimmer should only show on hover to avoid visual noise
- 50% opacity for non-hovered items creates good focus without hiding content

### Files Modified
- `src/components/SentimentKeywords.tsx` - Added hover states and animations
- `src/index.css` - Added shimmer keyframes animation

---

## Fixed Header with Scrollable Content (October 15, 2025)

### Problem
When scrolling through dashboard content, the navigation header would scroll away, making it difficult to switch views or change settings without scrolling back to the top.

### Solution
Restructured the app layout to use flexbox with a fixed header and scrollable content area.

### Implementation Details
1. **Flexbox container** - Changed root div from `min-h-screen` to `h-screen flex flex-col`
2. **Fixed header** - Added `flex-shrink-0` to prevent nav from shrinking
3. **Scrollable main** - Added `flex-1 overflow-y-auto` to main content area
4. **Prevent page scroll** - Added `overflow-hidden` to root container
5. **Z-index management** - Ensured header stays above content with z-10, dark mode button at z-50

### How It Should Be Done
```typescript
// ✅ CORRECT - Flexbox layout with fixed header
<div className="h-screen flex flex-col overflow-hidden">
  {/* Fixed Header */}
  <nav className="flex-shrink-0 ... z-10">
    {/* Navigation content */}
  </nav>
  
  {/* Scrollable Content */}
  <main className="flex-1 overflow-y-auto">
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page content */}
    </div>
  </main>
  
  {/* Fixed buttons need higher z-index */}
  <button className="fixed ... z-50" />
</div>
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - Everything scrolls together
<div className="min-h-screen">
  <nav>...</nav>
  <main>...</main>
</div>

// Issues:
// - Header scrolls away
// - Users must scroll to top to change views
// - Poor UX for navigation
```

### Key Takeaways
- Use `h-screen` (not `min-h-screen`) on root when you need fixed height
- Flexbox with `flex-col` is perfect for fixed header + scrollable content layouts
- `flex-shrink-0` prevents header from shrinking
- `flex-1` makes content take remaining space
- `overflow-y-auto` enables scrolling in content area only
- `overflow-hidden` on root prevents double scrollbars
- Always manage z-index: fixed elements need higher values than scrollable content
- Shadow on fixed header (`shadow-sm`) provides depth separation

### Files Modified
- `src/App.tsx` - Restructured layout with fixed header and scrollable content

---

## Comprehensive Visitor Visualization System (October 16, 2025)

### Feature Implementation
Created a complete visitor tracking and visualization system with multiple components showing real-time visitor data, engagement metrics, geographic distribution, and detailed visitor information.

### Implementation Details
Created 6 new focused components, each handling a specific aspect of visitor visualization:

1. **VisitorStatsCards** - Overview metrics dashboard
   - Total visitors with active count
   - Total page views with average per visitor
   - Engagement rate (visitors with >1 page view)
   - Average time on site per visitor
   - Color-coded gradient cards with icons

2. **VisitorActivityChart** - Time-based activity tracking
   - Bar chart showing visitors by hour
   - Last 7 hours of activity
   - Uses shared BarChart component
   - Real-time activity visualization

3. **TopCompaniesWidget** - Most engaged visitors ranking
   - Engagement score = (pageViews × 10) + timeSpent
   - Top 5 visitors with medal badges (gold, silver, bronze)
   - Shows page views and time spent
   - Real-time status indicators

4. **VisitorMapWidget** - Geographic distribution
   - Groups visitors by location
   - Progress bars showing relative distribution
   - Top 8 locations displayed
   - Total location count summary

5. **VisitorTable** - Comprehensive visitor list
   - Sortable by recent, page views, or location
   - Status indicators (active, video_invited, in_call)
   - Role-based color-coded badges
   - Quick actions (call, view details)
   - Click row to view details

6. **VisitorDetailsModal** - Deep dive into single visitor
   - Quick stats cards (page views, time on site, location, role)
   - Visitor information section
   - Technical details
   - Activity timeline
   - Action buttons (start video call, view history)

### How It Should Be Done
```typescript
// ✅ CORRECT - Modular component structure
// Main Visitors component orchestrates child components
<div className="space-y-6">
  <VisitorStatsCards visitors={visitors} />
  
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <VisitorActivityChart visitors={visitors} />
    <TopCompaniesWidget visitors={visitors} />
  </div>
  
  <VisitorMapWidget visitors={visitors} />
  
  <VisitorTable 
    visitors={visitors}
    onViewDetails={setSelectedVisitor}
    onStartCall={handleStartCall}
  />
  
  {selectedVisitor && (
    <VisitorDetailsModal
      visitor={selectedVisitor}
      onClose={() => setSelectedVisitor(null)}
    />
  )}
</div>

// Handle undefined values safely
const getRoleBadgeColor = (role: string | undefined): string => {
  if (!role) return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  const roleLower = role.toLowerCase();
  // ... rest of logic
};

// Always add keys to lists, with fallback
const visitorKey = visitor.visitorId || visitor.id || `visitor-${index}`;
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - Everything in one massive component
export function Visitors() {
  return (
    <div>
      {/* 500+ lines of mixed logic and UI */}
      <table>...</table>
      <div>stats...</div>
      <div>charts...</div>
    </div>
  );
}

// ❌ WRONG - No undefined handling
const getRoleBadgeColor = (role: string) => {
  const roleLower = role.toLowerCase(); // Crashes if role is undefined
};

// ❌ WRONG - Missing keys in lists
visitors.map((visitor) => (
  <div>{visitor.company}</div> // Warning: Each child should have unique key
))
```

### Key Takeaways
- **Separation of concerns**: Each visualization component handles one specific aspect
- **File size**: Keep components under 200 lines by splitting into focused files
- **Null safety**: Always handle undefined/null values before calling methods like `.toLowerCase()`
- **Keys in lists**: Always provide unique keys, with fallbacks like `${prefix}-${index}`
- **Reusability**: Use shared components (BarChart, DonutChart) across features
- **Props interface**: Pass only what's needed (visitors array and callbacks)
- **Engagement metrics**: Calculate meaningful scores (pageViews × weight + timeSpent)
- **Interactive elements**: Click rows, hover effects, modal details
- **Status indicators**: Visual feedback for real-time states (active, in call, etc.)
- **Responsive design**: Grid layouts that adapt (1 col mobile, 2 cols desktop)
- **Color coding**: Consistent color schemes for roles, status, metrics
- **Progressive disclosure**: Summary → Table → Details modal for information hierarchy

### Common Errors Fixed
1. **"Cannot read properties of undefined (reading 'toLowerCase')"**
   - Added undefined check before calling string methods
   - Provided default return value for undefined cases
   - Used fallback values in display (`visitor.lastRole || 'Unknown'`)

2. **"Each child in a list should have a unique key prop"**
   - Added key prop to mapped elements
   - Used robust key selection with fallbacks: `visitor.visitorId || visitor.id || \`visitor-${index}\``
   - Wrapped map return in block to properly structure JSX

### Files Created
- `src/features/visitors/components/VisitorDetailsModal.tsx` - Detailed visitor information modal
- `src/features/visitors/components/VisitorStatsCards.tsx` - Overview metric cards
- `src/features/visitors/components/VisitorActivityChart.tsx` - Time-based activity visualization
- `src/features/visitors/components/TopCompaniesWidget.tsx` - Top engaged visitors widget
- `src/features/visitors/components/VisitorMapWidget.tsx` - Geographic distribution visualization
- `src/features/visitors/components/VisitorTable.tsx` - Comprehensive visitor table
- `src/features/visitors/components/index.ts` - Component exports

### Files Modified
- `src/features/visitors/components/Visitors.tsx` - Refactored to use new components

---

## Toggle Switch Restoration and Badge Styling (October 16, 2025)

### Change Requested
User wanted to restore the toggle switch (on/off) for video calls instead of separate action buttons, and improve role badge styling to match a cleaner, pill-style design.

### Implementation Details

1. **Toggle Switch Restoration:**
   - Changed from action buttons (Phone + More) back to toggle switch
   - Toggle now shows ON state when call is active
   - Added `activeCall` and `onToggleCall` props to VisitorTable
   - Toggle integrates with existing video call system

2. **Enhanced Badge Styling:**
   - Changed from rounded-md to rounded-full for pill shape
   - Added subtle borders for better definition
   - Used lighter, more translucent backgrounds (50/80 opacity)
   - Increased padding for better visual balance (px-3 py-1.5)
   - Applied consistent styling across all role types:
     * Purple: CEO, CTO, CFO, VP, Chief
     * Green: Engineer, Developer, Tech, Scientist
     * Blue: Product, Manager
     * Orange: Sales, Marketing, Director
     * Pink: Design, Creative
     * Amber: Founder, Owner
     * Gray: Default/Unknown

### How It Should Be Done
```typescript
// ✅ CORRECT - Toggle switch with proper state management
<button
  onClick={(e) => {
    e.stopPropagation();
    onToggleCall(visitorId, !isActiveCall);
  }}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
    isActiveCall
      ? 'bg-blue-600 dark:bg-blue-500'
      : 'bg-gray-200 dark:bg-gray-700'
  }`}
>
  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
    isActiveCall ? 'translate-x-6' : 'translate-x-1'
  }`} />
</button>

// ✅ CORRECT - Modern pill-style badges with borders
const getRoleBadgeColor = (role: string | undefined): string => {
  if (!role) return 'bg-gray-50/80 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
  // ... more conditions
  return 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700';
};

<span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}>
  {role}
</span>
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - Separate action buttons without toggle
<button onClick={() => onStartCall(visitor)}>
  <Phone />
</button>
<button onClick={() => onViewDetails(visitor)}>
  <MoreVertical />
</button>

// ❌ WRONG - Heavy solid background badges
<span className="bg-purple-600 text-white px-2 py-1 rounded-md">
  {role}
</span>
```

### Key Takeaways
- **Toggle switches** provide instant visual feedback for binary states (on/off)
- **Pill-style badges** (rounded-full) look more modern than rounded rectangles
- **Translucent backgrounds** (50/80 opacity) are softer than solid colors
- **Subtle borders** add definition without being heavy
- **Proper padding** (px-3 py-1.5) creates balanced pill shapes
- **Stop propagation** on toggle clicks prevents triggering row click events
- **Consistent color mapping** helps users quickly identify role types
- Dark mode requires separate color classes for optimal visibility

### Files Modified
- `src/features/visitors/components/VisitorTable.tsx` - Restored toggle switch, updated badge styling
- `src/features/visitors/components/VisitorDetailsModal.tsx` - Updated badge styling to match
- `src/features/visitors/components/Visitors.tsx` - Added toggle handler props

---

## Real-Time Active Sessions Implementation (October 19, 2025)

### Feature Implementation
Replaced mock active session data with real-time data from Supabase database, creating a live session tracking system that shows actual user sessions, their status, and activity.

### Implementation Details
1. **Real Database Integration:**
   - Created `getActiveSessions()` function in `supabaseAdmin.ts`
   - Queries `auth.sessions` table for recent sessions (last 24 hours)
   - Joins with `auth.users` to get user information
   - Fetches workspace and role data for complete session context

2. **Session Status Detection:**
   - Active: Last activity within 5 minutes
   - Idle: Last activity more than 5 minutes ago
   - Calculates session duration and last activity time
   - Real-time status updates every 30 seconds

3. **Enhanced Session Data:**
   - User name derived from email (formatted properly)
   - Workspace name from database
   - User role from user_workspaces table
   - Location derived from IP address
   - Most used feature assigned based on email hash
   - Session duration and last activity calculations

4. **Auto-Refresh System:**
   - Fetches real data on component mount
   - Auto-refreshes every 30 seconds
   - Manual refresh button with loading state
   - Empty state when no active sessions

### How It Should Be Done
```typescript
// ✅ CORRECT - Real-time session tracking
export const getActiveSessions = async () => {
  const { data: sessions, error } = await supabase
    .from('auth.sessions')
    .select(`
      id, user_id, created_at, updated_at, refreshed_at,
      user_agent, ip,
      auth.users!inner(id, email, last_sign_in_at, created_at)
    `)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  // Process sessions with real calculations
  const activeSessions = sessions.map((session) => {
    const user = session.auth.users;
    const sessionStart = new Date(session.created_at);
    const now = new Date();
    const durationMs = now.getTime() - sessionStart.getTime();
    const minutesSinceActivity = Math.floor((now.getTime() - new Date(session.refreshed_at || session.updated_at).getTime()) / (1000 * 60));
    
    return {
      id: session.id,
      userId: session.user_id,
      userName: user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      userEmail: user.email,
      status: minutesSinceActivity <= 5 ? 'active' : 'idle',
      sessionDuration: formatDuration(durationMs),
      lastActivity: formatLastActivity(minutesSinceActivity)
    };
  });

  return activeSessions;
};

// Auto-refresh in component
useEffect(() => {
  loadSessions();
  const interval = setInterval(loadSessions, 30000);
  return () => clearInterval(interval);
}, []);
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - Using mock data
const mockActiveSessions = [
  { id: '1', userName: 'Sarah Johnson', status: 'active' }
];

// ❌ WRONG - No real-time updates
const [sessions] = useState<ActiveSession[]>(mockActiveSessions);

// ❌ WRONG - Incorrect import path
import { getActiveSessions } from '../../../../lib/supabaseAdmin';
```

### Key Takeaways
- **Real data integration**: Always query actual database instead of using mock data
- **Session status logic**: Use time-based calculations (5 minutes = active threshold)
- **Auto-refresh**: Set up intervals for real-time updates (30 seconds is good balance)
- **Import paths**: Count directory levels carefully - from `src/features/visitors/components/` to `src/lib/` is `../../../lib/`
- **Error handling**: Provide fallbacks and empty states for when no data exists
- **User experience**: Show loading states and provide manual refresh options
- **Data processing**: Calculate derived values (duration, status) from raw timestamps
- **Database queries**: Use joins to get related data (users, workspaces) in single queries

### Common Errors Fixed
1. **"Failed to resolve import" error**
   - Fixed incorrect import path from `../../../../lib/supabaseAdmin` to `../../../lib/supabaseAdmin`
   - Count directory levels: `src/features/visitors/components/` → `src/lib/` = 3 levels up

2. **"relation 'public.auth.sessions' does not exist" error**
   - Cannot query `auth.sessions` directly from client due to security restrictions
   - Created RPC function `get_active_sessions()` with `SECURITY DEFINER` to safely access auth schema
   - RPC function runs with elevated privileges and returns session data

3. **"structure of query does not match function result type" error**
   - Type mismatch: `auth.users.email` is `varchar(255)`, not `text`
   - Fixed RPC function return type from `text` to `varchar` for email column
   - Always match exact PostgreSQL data types in function definitions

4. **"relation 'public.user_workspaces' does not exist" error**
   - Table name was incorrect - actual table is `workspace_members`
   - Updated query to use correct table name
   - Fixed workspace lookup logic to use `workspace_id` from `workspace_members` table

### Files Modified
- `src/lib/supabaseAdmin.ts` - Added `getActiveSessions()` function with RPC call and proper table names
- `src/features/visitors/components/Visitors.tsx` - Replaced mock data with real-time session tracking
- **Database Migration:** Created `get_active_sessions()` RPC function to securely access auth.sessions

---

## User Allowlist Access Control (January 14, 2026)

### Feature Implementation
Added frontend access control to restrict which users can access the application. Uses an environment variable containing a comma-separated list of allowed email addresses.

### Implementation Details
1. **Environment Variable Configuration:**
   - `VITE_ALLOWED_USER_EMAILS` - comma-separated list of allowed email addresses
   - Case-insensitive email matching
   - If empty or not set, all authenticated users are allowed (backwards compatible)

2. **New Files Created:**
   - `src/lib/allowedUsers.ts` - Utility functions for checking user access
   - `src/components/AccessDenied.tsx` - Component shown when user is not allowed

3. **App.tsx Modifications:**
   - Added `isAllowed` state to track user authorization
   - Updated `checkAuth()` and `onAuthStateChange` to check allowlist
   - Added conditional rendering for `AccessDenied` component

### How It Should Be Done
```typescript
// ✅ CORRECT - Check allowlist after authentication
const checkAuth = async () => {
  const user = await getCurrentUser();
  setIsAuthenticated(!!user);
  const email = user?.email || null;
  setUserEmail(email);
  
  // Check if user is in the allowed list
  setIsAllowed(isUserAllowed(email));
};

// ✅ CORRECT - Utility function with case-insensitive matching
export const isUserAllowed = (email: string | null | undefined): boolean => {
  if (!email) return false;
  
  const allowedEmails = getAllowedUserEmails();
  if (allowedEmails.length === 0) return true; // No restriction
  
  return allowedEmails.includes(email.trim().toLowerCase());
};

// ✅ CORRECT - Conditional rendering order
if (!isAuthenticated) return <Login />;
if (!isAllowed) return <AccessDenied userEmail={userEmail} />;
return <MainApp />;
```

### How It Should NOT Be Done
```typescript
// ❌ WRONG - Checking allowlist before authentication
if (!isAllowed) return <AccessDenied />;
if (!isAuthenticated) return <Login />;

// ❌ WRONG - Case-sensitive matching
const isAllowed = allowedEmails.includes(email);

// ❌ WRONG - Blocking all users when env var is missing
if (allowedEmails.length === 0) return false;
```

### Cloudflare Pages Configuration
1. Go to Workers & Pages → your project → Settings → Variables and Secrets
2. Click "+ Add" to add a new secret
3. Set Name: `VITE_ALLOWED_USER_EMAILS`
4. Set Value: `user1@example.com,user2@example.com,admin@company.com`
5. Type: Secret (encrypted)
6. Redeploy the application for changes to take effect

### Key Takeaways
- Environment variables with `VITE_` prefix are exposed to the frontend in Vite apps
- Always use case-insensitive email matching
- Make the feature backwards compatible (empty list = allow all)
- Show a helpful Access Denied page with logout option
- Log access control decisions for debugging
- Check allowlist AFTER authentication, not before

### Files Created
- `src/lib/allowedUsers.ts` - Allowlist utility functions
- `src/components/AccessDenied.tsx` - Access denied UI component

### Files Modified
- `src/App.tsx` - Added allowlist checking to auth flow

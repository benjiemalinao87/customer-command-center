# Edge Notes Feature

## Overview
Add visual sticky notes to connections (edges) between nodes in the Flow Builder for better workflow documentation and annotations.

## How to Use

### Adding a Note
1. **Click on the "+ Add note" placeholder** on any connection
2. A text area appears for typing
3. Type your note (supports multiple lines with Shift+Enter)
4. Press **Enter** to save or click outside to save

### Editing a Note
1. **Click on the existing note badge** (yellow sticky note)
2. The text area appears with current content
3. Edit the text as needed
4. Press **Enter** to save or **Escape** to cancel

### Removing a Note
1. **Click on the note badge**
2. Delete all text
3. Press **Enter** or click outside to save (note disappears)

## Visual Features

### Note Styling (Yellow Sticky Note)
- **Background**: Yellow gradient (#fef3c7 to #fde68a)
- **Border**: 2px solid orange (#f59e0b)
- **Text**: Brown (#78350f), 12px, bold
- **Icon**: 📝 emoji prefix
- **Max Width**: 200px
- **Border Radius**: 8px rounded corners

### Placeholder Styling
- **Background**: White with transparency
- **Border**: 2px dashed gray (#d1d5db)
- **Text**: "+ Add note" in light gray
- **On Hover**: Blue border and blue text

### Interactive Hover Effects
- **Note scales up** to 1.05x size
- **Shadow appears** with orange glow
- **Border darkens** to deeper orange
- **Smooth transitions** (0.2s ease)

### Use Cases

1. **Conditional Branches**
   - Label "Yes" / "No" paths from condition nodes
   - Show different decision outcomes

2. **Status Indicators**
   - "Success" / "Error" / "Retry"
   - Flow routing based on results

3. **Descriptive Labels**
   - "After 24 hours"
   - "High priority"
   - "Follow-up needed"

4. **Action Outcomes**
   - "Approved" / "Rejected"
   - "Payment received"
   - "Email sent"

## Technical Implementation

### New Component
- **`EdgeNote.js`** - Standalone visual note component
  - Uses `EdgeLabelRenderer` from ReactFlow
  - Positioned at edge center using calculated coordinates
  - Inline editing with textarea
  - Auto-saves on blur or Enter key

### Edge Components Updated
- `AnimatedEdge.js` - Bezier curves with visual notes
- `SmoothStepEdge.js` - Angular steps with visual notes
- `StraightEdge.js` - Direct lines with visual notes

### Data Structure
Notes are stored in the edge's `data` object:
```javascript
{
  id: "edge-abc-xyz",
  source: "node-abc",
  target: "node-xyz",
  type: "smoothstep",
  data: {
    note: "This is a note",  // The note text
    color: "#3b82f6",
    strokeWidth: 2.5,
    animated: true
  }
}
```

### Key Features
- **Inline Editing**: Click to edit, no modal/prompt
- **Multi-line Support**: Shift+Enter for new lines
- **Auto-position**: Always centered on edge
- **Keyboard Shortcuts**: 
  - Enter = Save
  - Escape = Cancel
  - Shift+Enter = New line

## Benefits

1. **Better Documentation** - Clear workflow understanding
2. **Easier Debugging** - Identify flow paths quickly
3. **Professional Look** - Polished workflow diagrams
4. **No Code Required** - Simple click-to-edit interface
5. **Persistent** - Labels save with the flow

## Future Enhancements (Optional)

- [ ] Custom note colors (yellow, blue, pink, green)
- [ ] Different note icons (✓, ✗, ⚠️, ℹ️)
- [ ] Note positioning options (start, middle, end of edge)
- [ ] Rich text formatting (bold, italic, links)
- [ ] Note attachments (images, files)
- [ ] Note priority levels (info, warning, critical)
- [ ] Note timestamps ("Added 2 hours ago")
- [ ] Multiple notes per edge


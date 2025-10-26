# Contacts & Live Chat Shared State Issue

## Issue Description

**Date:** October 25, 2025  
**Reporter:** User  
**Status:** ⚠️ Temporary Fix Applied (Long-term solution needed)

### Problem
The **Contacts** window and **Live Chat** window were sharing the same state through a global Zustand store (`useContactV2Store`). When Live Chat filtered conversations to show only "Open" status, the Contacts window would also show only those 3 filtered contacts instead of displaying all contacts.

### Root Cause
Both components use the same global store defined in `frontend/src/services/contactV2State.js`:

```javascript
// ContactList.js (Live Chat)
const { setFilters, loadContacts, ... } = useContactV2Store();

// ContactsPageV2.js (Contacts Page)
const { contacts, isLoading, loadContacts, ... } = useContactV2Store();
```

When `ContactList.js` sets filters:
```javascript
setFilters({ 
  conversationStatus: 'Open',
  assignmentFilter: null
}, currentWorkspace.id);
```

This modifies the **global store state**, affecting all components using that store, including `ContactsPageV2.js`.

---

## Temporary Fix (Applied)

**File:** `frontend/src/components/contactV2/ContactsPageV2.js`  
**Lines:** 592-614

### Solution
Reset all filters to default "All" state when ContactsPageV2 initializes:

```javascript
useContactV2Store.setState({ 
  contacts: [],
  totalContacts: 0,
  nextCursor: null,
  hasNextPage: true,
  filters: {
    status: 'All',
    conversationStatus: 'All', // ✅ Reset conversation status filter
    source: 'All',
    tags: [],
    // ... all other filters reset to default
  }
});
```

### What This Fixes
✅ Contacts page now shows **all contacts** by default  
✅ Independent initialization from LiveChat filter state  
✅ Minimal code changes (non-invasive)

### Limitations
⚠️ **This is a band-aid solution**. The windows can still interfere with each other if both are open simultaneously:

1. User opens **LiveChat** → filters to "Open" (3 contacts shown)
2. User opens **Contacts** → resets to "All" (all contacts shown)
3. **LiveChat now also shows "All"** instead of "Open" because they share the same store

---

## Long-term Solution (Recommended)

### Option 1: Separate Stores (Recommended)
Create two independent stores:
- `useLiveChatContactStore` → For LiveChat component
- `useContactsPageStore` → For Contacts page

**Pros:**
- Complete isolation
- No interference between components
- Clear separation of concerns

**Cons:**
- Need to refactor existing code
- Duplicate some store logic
- More memory usage (two stores in memory)

---

### Option 2: Store with Scoped State
Modify `useContactV2Store` to support multiple contexts:

```javascript
const useContactV2Store = create((set, get) => ({
  contexts: {
    livechat: { contacts: [], filters: { ... }, ... },
    contactsPage: { contacts: [], filters: { ... }, ... }
  },
  
  loadContacts: (context, ...) => { /* use context */ },
  setFilters: (context, filters) => { /* use context */ }
}));

// Usage:
const { contacts, setFilters } = useContactV2Store(state => state.contexts.livechat);
```

**Pros:**
- Single source of truth
- Shared utilities and functions
- Isolated state per component

**Cons:**
- More complex store architecture
- Requires significant refactoring
- Higher learning curve for team

---

### Option 3: Local State for ContactsPageV2
Make ContactsPageV2 manage its own state without using the global store:

```javascript
const ContactsPageV2 = () => {
  const [contacts, setContacts] = useState([]);
  const [filters, setFilters] = useState({ status: 'All', ... });
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom fetch logic without store
  const loadContacts = async () => { ... };
  
  // ... rest of component
};
```

**Pros:**
- Simple and straightforward
- No store conflicts
- Easy to understand and maintain

**Cons:**
- Loss of real-time synchronization between windows
- Duplicate data fetching logic
- No shared cache benefits

---

## Recommendation

**For immediate stability:** Option 3 (Local State) is the quickest and cleanest solution.

**For long-term architecture:** Option 1 (Separate Stores) provides the best balance of isolation and maintainability.

**If performance is critical:** Option 2 (Scoped State) maximizes cache sharing and memory efficiency.

---

## Related Files

### Affected Components
- `frontend/src/components/livechat/ContactList.js` (Live Chat)
- `frontend/src/components/contactV2/ContactsPageV2.js` (Contacts Page)

### Shared Dependencies
- `frontend/src/services/contactV2State.js` (Global Zustand Store)
- `frontend/src/components/livechat2/LiveChat2.js` (Alternative LiveChat implementation)

---

## Testing Checklist

When implementing the long-term solution, verify:

- [ ] Open LiveChat, filter to "Open" → only open conversations shown
- [ ] Open Contacts page → all contacts shown (not filtered)
- [ ] Keep both windows open:
  - [ ] Change LiveChat filter → Contacts page unaffected
  - [ ] Search in Contacts page → LiveChat unaffected
- [ ] Close and reopen windows → each maintains correct state
- [ ] Verify real-time updates work in both windows independently
- [ ] Check performance with 10,000+ contacts loaded

---

## Additional Notes

### Why This Matters
This issue reflects a common architectural challenge in React applications: **shared global state vs. component-local state**. 

As the application grows:
- More windows/components will need contact data
- Each may require different filters, sorts, or views
- Global state becomes harder to reason about
- Bugs emerge from unexpected state mutations

### Best Practices Moving Forward
1. **Document state ownership** clearly in each component
2. **Use local state by default**, global state when truly needed
3. **Consider component composition** over shared state
4. **Test multi-window scenarios** during development
5. **Add state isolation tests** to catch regressions early

---

## History

| Date | Action | Author |
|------|--------|--------|
| 2025-10-25 | Issue identified and temporary fix applied | Claude (AI Assistant) |
| 2025-10-25 | Documentation created | Claude (AI Assistant) |

---

**Next Steps:**
1. Review this document with the team
2. Decide on long-term solution approach
3. Create implementation ticket
4. Schedule refactoring sprint
5. Update this document with final implementation details


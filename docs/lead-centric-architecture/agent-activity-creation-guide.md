# Agent Activity Creation Guide

## 🎯 **How Daily Agents Can Create Rich Lead Activities**

This guide shows agents how to manually create detailed lead activities like the "Quote Sent" example using the new user-friendly interface.

---

## 📍 **Where to Create Activities**

### **Option 1: From Lead Cards (Primary Method)**

1. **Navigate to contact** (e.g., Mike Chen in workspace 41608)
2. **Open the "Details" tab**
3. **Scroll to "Leads Overview" section**
4. **Click "Add Activity"** button on any lead card

### **Option 2: From Activity History** (Coming Soon)

1. **Navigate to "Leads History" tab**
2. **Click "Add Activity"** button at the top

---

## 🚀 **Creating an Activity: Step-by-Step**

### **Step 1: Choose Activity Type**

The interface provides **7 activity types**:

- 📞 **Phone Call** - Track calls with duration and outcomes
- 📧 **Email** - Record email communications and types
- 💬 **SMS/Text** - Log text message interactions
- 📅 **Meeting** - Document in-person or virtual meetings
- 📝 **Note/Update** - General notes and updates
- 💰 **Quote/Proposal** - Track quotes, proposals, and pricing
- 📈 **Stage Change** - Document pipeline movement

### **Step 2: Fill Basic Information**

**Required Fields**:
- **Activity Title**: e.g., "Quote Sent", "Follow-up Call", "Site Visit"
- **Description**: Detailed explanation of what happened
- **Outcome**: Positive, Neutral, Negative, Pending, Completed, Cancelled
- **Sentiment**: Positive, Neutral, Negative
- **Priority**: Low, Medium, High, Urgent

### **Step 3: Add Activity-Specific Details**

**For Phone Calls**:
- Duration (minutes)
- Call outcome (Interested, Not interested, Voicemail, etc.)

**For Emails**:
- Email type (Quote, Follow-up, Information, Contract, etc.)

**For Meetings**:
- Duration and meeting type (Consultation, Demo, Site visit, etc.)

**For Quotes**:
- Budget discussed (e.g., "$15,000-$22,000")
- Email type (if sent via email)

### **Step 4: Add Rich Context** (Optional but Recommended)

**Next Steps**:
- Add multiple next steps (e.g., "Send contract", "Schedule installation")
- Each step appears as a bullet point

**Products Discussed**:
- Add specific products (e.g., "Double-pane windows", "Installation", "Warranty")
- Shows as tags on the activity

**Tags**:
- Add custom tags for organization and filtering
- Examples: "hot-lead", "price-sensitive", "referral"

**Additional Information**:
- Follow-up date for scheduling
- Additional notes for context

---

## 💡 **Example: Creating a "Quote Sent" Activity**

Here's how an agent would recreate the rich "Quote Sent" activity:

### **Basic Information**:
- **Type**: Quote/Proposal 💰
- **Title**: "Quote Sent"
- **Description**: "Emailed detailed quote for energy-efficient window replacement package"
- **Outcome**: Completed
- **Sentiment**: Neutral
- **Priority**: Medium

### **Specific Details**:
- **Email Type**: Quote
- **Budget Discussed**: "$15,000-$22,000"

### **Rich Context**:
- **Products Discussed**: 
  - "Double-pane windows"
  - "Installation" 
  - "Warranty"
- **Next Steps**:
  - "Follow up in 3 days"
  - "Schedule site visit if interested"
- **Follow-up Date**: 2025-09-16
- **Tags**: "quote-sent", "windows", "energy-efficient"

### **Result**:
The system automatically creates structured data like:
```json
{
  "email_type": "quote",
  "quote_amount": 18500,
  "products": ["Double-pane windows", "Installation", "Warranty"],
  "follow_up_scheduled": "2025-09-16"
}
```

---

## 🎨 **Visual Features for Agents**

### **Activity Type Icons & Colors**:
- 📞 **Calls**: Blue phone icon
- 📧 **Emails**: Green mail icon  
- 💬 **SMS**: Purple message icon
- 📅 **Meetings**: Orange calendar icon
- 📝 **Notes**: Gray document icon
- 💰 **Quotes**: Teal dollar icon
- 📈 **Stage Changes**: Cyan trending icon

### **Smart Defaults**:
- **Auto-titles**: Selecting "Phone Call" pre-fills "Phone Call" as title
- **Context-aware fields**: Different activity types show relevant fields
- **Quick entry**: Add multiple items with Enter key or + button

### **Visual Feedback**:
- **Badge colors** match activity types
- **Progress indicators** for form completion
- **Toast notifications** confirm successful creation
- **Real-time updates** refresh activity lists

---

## 📋 **Best Practices for Agents**

### **1. Be Descriptive**
- ✅ **Good**: "Discussed budget of $18k for energy-efficient window replacement, customer interested in scheduling site visit"
- ❌ **Poor**: "Called customer"

### **2. Use Outcomes & Sentiment**
- **Positive outcome + Positive sentiment**: Customer excited, ready to move forward
- **Positive outcome + Neutral sentiment**: Customer interested but needs time
- **Negative outcome + Negative sentiment**: Customer not interested

### **3. Add Next Steps**
- Always include what happens next
- Be specific with dates when possible
- Examples: "Send contract by Friday", "Call back Tuesday", "Schedule installation"

### **4. Track Products & Budget**
- Add all products discussed for better lead insights
- Include budget ranges even if rough estimates
- Help with reporting and pipeline analysis

### **5. Use Tags Consistently**
- Develop team-wide tagging conventions
- Examples: "hot-lead", "price-sensitive", "decision-maker", "referral"
- Makes filtering and reporting more effective

---

## 🔄 **After Creating an Activity**

### **Immediate Updates**:
1. **Activity appears** in both activity history sections
2. **Lead card updates** with new activity count
3. **Lead score may adjust** based on activity type and outcome
4. **Timeline updates** with new entry

### **Follow-up Actions**:
1. **Set reminders** for follow-up dates
2. **Update lead stage** if needed
3. **Notify team members** if collaboration required
4. **Schedule next activities** to maintain momentum

---

## 🚀 **Available Now**

✅ **Fully functional** activity creation interface
✅ **7 activity types** with rich data capture
✅ **Smart forms** with context-aware fields  
✅ **Real-time updates** across all views
✅ **Mobile-responsive** design for field use

### **Test It Now**:
1. Open Mike Chen's contact in workspace 41608
2. Go to Details tab → Leads Overview
3. Click "Add Activity" on the Windows lead
4. Try creating a "Follow-up Call" activity!

---

## 🔮 **Coming Soon**

- 📱 **Mobile app** integration
- 🤖 **AI-suggested** next steps based on activity patterns
- 📊 **Activity analytics** and performance insights
- 🔗 **Calendar integration** for automatic meeting logging
- 📧 **Email sync** for automatic email activity creation
- 📞 **Call logging integration** with Twilio

**The new lead activity system gives agents powerful tools to capture rich, meaningful interactions that drive better lead management and conversion!** 🎯

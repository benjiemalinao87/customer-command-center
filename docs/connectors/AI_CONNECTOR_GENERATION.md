# AI-Powered Connector Generation

## Overview

The AI Connector Builder uses artificial intelligence to automatically generate connector configurations based on your goal and API details. Simply describe what you want to achieve, provide the API endpoint, and our AI will create 2-3 different connector options for you to choose from.

---

## How to Use

### Step 1: Access AI Builder

1. Navigate to the **Connectors** page
2. Click the **"AI Builder ✨"** button (purple button next to "Create Connector")
3. The AI Builder modal will open

### Step 2: Provide Your Goal

**Required Fields:**
- **What do you want to achieve?** - Describe your goal in plain English
  - Example: "I want to enrich phone numbers with carrier information and location data"
  - Be specific about what data you want to retrieve or what action you want to perform

- **API Endpoint URL** - The base URL of the API endpoint
  - Example: `https://api.example.com/v1/lookup`
  - Must be a valid HTTP/HTTPS URL

**Optional Fields (Tabs):**

1. **Documentation Tab**
   - Paste API documentation, endpoint descriptions, or authentication requirements
   - Providing documentation helps AI generate more accurate configurations

2. **OpenAPI/Swagger Tab**
   - Upload an OpenAPI or Swagger specification file (JSON or YAML)
   - This gives the AI the most accurate information about the API structure

3. **Preferences Tab**
   - **Prefer GET methods** - When possible, use GET instead of POST
   - **Include authentication** - Detect and include auth if mentioned in documentation

### Step 3: Generate Options

1. Click **"Generate Connectors"**
2. Wait 10-15 seconds while the AI analyzes your input
3. You'll see progress messages:
   - "Analyzing API documentation..."
   - "Generating connector configurations..."
   - "Optimizing field mappings..."

### Step 4: Select an Option

The AI will present 2-3 different connector configurations. Each option shows:
- **Name** - Descriptive connector name
- **Description** - What the connector does
- **Method** - HTTP method (GET, POST, etc.)
- **Authentication** - Auth type detected
- **Parameters** - Number of query parameters
- **Headers** - Number of custom headers

Click **"Select This"** on the option that best fits your needs.

### Step 5: Review and Edit

After selecting an option:
1. The Connector Builder opens with the AI-generated configuration pre-filled
2. You'll see an **"AI-Generated Connector"** banner at the top
3. **Review all fields** across all 3 steps:
   - **Basic Info** - Name, description, icon, category
   - **API Config** - URL, headers, parameters, body, authentication
   - **Advanced** - Timeout, retries, error handling
4. **Test the connector** using the Test button in the API Config step
5. Make any necessary edits
6. Click **"Save Connector"** when ready

---

## Best Practices

### Writing Effective Goals

✅ **Good Examples:**
- "I want to validate email addresses and get deliverability scores"
- "Enrich company data using domain name as input"
- "Send SMS messages to phone numbers via Twilio API"
- "Get weather forecast data for a specific location"

❌ **Poor Examples:**
- "API integration" (too vague)
- "Connect to API" (no specific goal)
- "Make it work" (not actionable)

**Tips:**
- Be specific about the data you want to retrieve
- Mention the input you'll provide (phone number, email, domain, etc.)
- Describe the output you expect (enrichment data, validation results, etc.)

### Providing API Documentation

**What to Include:**
- Endpoint descriptions
- Authentication requirements (Bearer token, API key, etc.)
- Required parameters
- Request/response examples
- Error codes and handling

**Where to Find It:**
- API provider's documentation website
- Developer portal
- API reference guides
- Postman collections

### Using OpenAPI/Swagger Specs

**Benefits:**
- Most accurate configuration generation
- Automatic parameter detection
- Proper request/response structure
- Authentication method detection

**How to Get:**
- Many APIs provide OpenAPI specs at `/openapi.json` or `/swagger.json`
- Check the API provider's documentation
- Export from Postman or other API tools

---

## Troubleshooting

### AI Generation Fails

**Problem:** "Generation Failed" error message

**Solutions:**
1. **Check your API URL** - Ensure it's a valid HTTP/HTTPS URL
2. **Provide more documentation** - Add API docs or OpenAPI spec
3. **Simplify your goal** - Make it more specific and clear
4. **Try again** - Click "Regenerate Options" to retry

### Generated Config Doesn't Work

**Problem:** Connector executes but returns errors

**Solutions:**
1. **Review authentication** - Check if API key or token is correct
2. **Verify parameters** - Ensure all required parameters are included
3. **Test the endpoint** - Use the Test button in API Config step
4. **Check API documentation** - Compare with actual API requirements
5. **Edit manually** - You can always edit any field after AI generation

### No Options Generated

**Problem:** AI returns empty or invalid options

**Solutions:**
1. **Add more context** - Provide API documentation or OpenAPI spec
2. **Clarify your goal** - Be more specific about what you want
3. **Check API URL** - Ensure it's accessible and valid
4. **Contact support** - If issue persists, reach out for help

---

## Limitations

### What AI Can Do
- ✅ Generate connector configurations from goals and API docs
- ✅ Detect authentication methods
- ✅ Identify parameters and headers
- ✅ Suggest appropriate HTTP methods
- ✅ Create request body templates

### What AI Cannot Do
- ❌ Generate field mappings (you must map response fields manually)
- ❌ Test the connector (you must test manually)
- ❌ Handle complex multi-step workflows (use manual builder)
- ❌ Guarantee 100% accuracy (always review and test)

### When to Use Manual Builder

Use the manual **"Create Connector"** button when:
- You need multi-step connectors
- You have very specific requirements
- The API has complex authentication flows
- You want full control over every detail

---

## Tips for Success

1. **Start with documentation** - Providing API docs significantly improves accuracy
2. **Test immediately** - Always test AI-generated connectors before saving
3. **Review everything** - Don't assume AI got everything right
4. **Iterate if needed** - You can regenerate options or edit manually
5. **Combine approaches** - Use AI to get started, then refine manually

---

## Examples

### Example 1: Phone Number Enrichment

**Goal:** "I want to enrich phone numbers with carrier information and location data"

**API URL:** `https://api.example.com/v1/lookup`

**Documentation:** "The API requires a phone number parameter and returns carrier, location, and line type information. Authentication via Bearer token in Authorization header."

**Result:** AI generates a GET connector with:
- Phone number as user input parameter
- Bearer token authentication
- Proper field mappings for carrier and location data

### Example 2: Email Validation

**Goal:** "Validate email addresses and get deliverability scores"

**API URL:** `https://api.validator.com/v1/validate`

**OpenAPI Spec:** Uploaded `openapi.json` file

**Result:** AI generates a POST connector with:
- Email address in request body
- API key authentication
- Response structure mapped correctly

---

## Support

If you encounter issues or have questions:
1. Check this documentation
2. Review the troubleshooting section
3. Test with the manual builder for comparison
4. Contact support with specific error messages

---

## Future Enhancements

Coming soon:
- AI-powered field mapping suggestions
- Multi-step connector generation
- Iterative refinement with follow-up prompts
- Natural language testing commands


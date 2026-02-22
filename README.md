# JobTrackfy Admin Dashboard

This is the administrative dashboard for JobTrackfy, providing tools to manage and test system integrations.

## Features

### Blog CRUD Editor
Create, edit, publish, unpublish, and delete blog posts directly from the Admin Dashboard.

Blog APIs:
- `GET /api/admin/blogs`
- `POST /api/admin/blogs`
- `GET /api/admin/blogs/:id`
- `PUT /api/admin/blogs/:id`
- `DELETE /api/admin/blogs/:id`

Database setup:
1. Open Supabase SQL Editor.
2. Run `admin/sql/20260221_create_blog_posts.sql`.
3. Ensure `SUPABASE_SERVICE_ROLE_KEY` is present in `admin/.env.local`.

### Webhook Tester
Test the n8n webhook integration that processes job posting URLs.

**How it works:**
1. Enter a job posting URL in the input field
2. Click "Test Webhook" to fetch the HTML content
3. The system sends the HTML and URL to the n8n webhook endpoint
4. View the response and test results

**Webhook Endpoint:** `https://n8n.jobtrackfy.com/webhook-test/aa31c57d-cfe1-41c1-a1f8-6e70eca003f6`

**Request Format:**
```json
{
  "html": "<html>Job posting content...</html>",
  "url": "https://company.com/job/123"
}
```

**Response:** The webhook processes the job posting data and returns structured information.

## Getting Started

1. Start the admin server:
   ```bash
   cd admin
   npm run dev
   ```

2. Open http://localhost:3003 in your browser

3. Use the Webhook Tester to test job posting URLs

## API Endpoints

### POST /api/fetch-html
Fetches HTML content from a given URL.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "html": "<html>...</html>",
  "url": "https://example.com",
  "status": 200,
  "contentType": "text/html",
  "fetchedAt": "2024-01-01T00:00:00.000Z"
}
```

## Security Notes

- The HTML fetching API includes proper headers and user-agent strings
- Requests have a 10-second timeout to prevent hanging
- CORS is handled appropriately for admin use

## Development

The admin dashboard is built with:
- Next.js 16
- TypeScript
- Tailwind CSS
- Modern React patterns

# Image Upload Feature for Sequence Builder

This document describes the image upload functionality for sequence messages using Cloudflare R2 storage.

## Overview

The sequence builder now supports image attachments for SMS messages. Images are uploaded to Cloudflare R2 storage and sent as MMS attachments via Twilio.

## Features

- **Drag & Drop Upload**: Users can drag and drop images directly into the upload area
- **File Validation**: Supports JPEG, PNG, GIF, and WebP formats up to 10MB
- **Image Preview**: Shows uploaded images in both the editor and phone simulator
- **Secure Storage**: Images are stored in Cloudflare R2 with workspace-based organization
- **MMS Integration**: Images are automatically included in SMS messages as media URLs

## Architecture

### Backend Components

1. **Cloudflare R2 Service** (`backend/src/services/cloudflareR2Service.js`)
   - Handles image uploads to Cloudflare R2
   - Validates file types and sizes
   - Generates unique file names with workspace organization
   - Provides delete functionality

2. **Media Routes** (`backend/src/routes/mediaRoutes.js`)
   - `/api/media/upload` - Upload image endpoint
   - `/api/media/delete` - Delete image endpoint
   - Includes file validation and security checks

3. **Database Schema**
   - Added `media_url` column to `flow_sequence_messages` table
   - Stores the public URL of uploaded images

4. **Sequence Service Updates**
   - Updated to handle media URLs in message creation and updates
   - Passes media URLs to Trigger.dev for SMS sending

### Frontend Components

1. **ImageUpload Component** (`frontend/src/components/sequence/ImageUpload.js`)
   - Drag and drop interface
   - File validation and upload progress
   - Image preview and removal
   - Toast notifications for user feedback

2. **Sequence Builder Integration**
   - Added image upload section for SMS messages only
   - Integrated with existing merge field and subflow functionality

3. **Phone Simulator Updates**
   - Displays uploaded images in SMS preview
   - Shows how images will appear to recipients

## Environment Variables

Add these environment variables to your backend configuration:

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=livechat-media
CLOUDFLARE_R2_PUBLIC_URL=https://your-custom-domain.com
```

## Cloudflare R2 Setup

### 1. Create R2 Bucket

1. Log into Cloudflare Dashboard
2. Go to R2 Object Storage
3. Create a new bucket named `livechat-media` (or your preferred name)
4. Configure public access if needed

### 2. Generate API Tokens

1. Go to Cloudflare Dashboard > My Profile > API Tokens
2. Create a custom token with these permissions:
   - Zone:Zone Settings:Read
   - Zone:Zone:Read
   - Account:Cloudflare R2:Edit

### 3. Configure Custom Domain (Optional)

For better performance and branding, set up a custom domain:

1. Go to R2 > Settings > Custom Domains
2. Add your domain (e.g., `media.yourdomain.com`)
3. Update `CLOUDFLARE_R2_PUBLIC_URL` environment variable

## File Organization

Images are organized in R2 with the following structure:

```
sequences/
  ├── workspace-id-1/
  │   ├── uuid-1.jpg
  │   ├── uuid-2.png
  │   └── ...
  ├── workspace-id-2/
  │   ├── uuid-3.gif
  │   └── ...
  └── ...
```

This ensures:
- Workspace isolation
- Unique file names to prevent conflicts
- Easy cleanup and management

## Security Features

1. **File Type Validation**: Only image files are accepted
2. **Size Limits**: Maximum 10MB per image
3. **Workspace Isolation**: Files are organized by workspace ID
4. **Access Control**: Delete operations verify workspace ownership
5. **Unique Naming**: UUIDs prevent filename conflicts

## Usage

### For Users

1. Create or edit a sequence
2. Select an SMS message step
3. Scroll to "Image Attachment (Optional)" section
4. Drag and drop an image or click to browse
5. Preview the image in the phone simulator
6. Save the sequence

### For Developers

```javascript
// Upload an image
const formData = new FormData();
formData.append('image', file);
formData.append('workspaceId', workspaceId);

const response = await fetch('/api/media/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
// result.url contains the public image URL
```

## Limitations

1. **SMS Only**: Image attachments are only available for SMS messages, not emails
2. **File Size**: Maximum 10MB per image (Twilio MMS limit)
3. **File Types**: Only JPEG, PNG, GIF, and WebP formats supported
4. **Single Image**: One image per message (can be extended for multiple images)

## Troubleshooting

### Upload Failures

1. **Check file size**: Ensure image is under 10MB
2. **Verify file type**: Only image formats are supported
3. **Check R2 credentials**: Verify environment variables are correct
4. **Network issues**: Check if backend can reach Cloudflare R2

### Images Not Displaying

1. **Check public URL**: Verify `CLOUDFLARE_R2_PUBLIC_URL` is correct
2. **CORS settings**: Ensure R2 bucket allows cross-origin requests
3. **Custom domain**: If using custom domain, verify DNS configuration

### Common Error Messages

- `"Invalid file type"`: File is not a supported image format
- `"File size too large"`: Image exceeds 10MB limit
- `"Workspace ID is required"`: Missing workspace context
- `"Upload failed"`: Check R2 credentials and connectivity

## Future Enhancements

1. **Multiple Images**: Support for multiple images per message
2. **Image Editing**: Basic crop/resize functionality
3. **Video Support**: Extend to support video attachments
4. **CDN Integration**: Automatic image optimization and resizing
5. **Analytics**: Track image engagement and delivery rates

## Dependencies

### Backend
- `@aws-sdk/client-s3`: S3-compatible client for R2
- `@aws-sdk/s3-request-presigner`: For generating presigned URLs
- `multer`: File upload handling

### Frontend
- `react-icons/fi`: Icons for upload interface
- Existing Chakra UI components for styling

## Testing

Test the image upload functionality:

1. **Unit Tests**: Validate file upload service
2. **Integration Tests**: Test complete upload flow
3. **UI Tests**: Verify drag and drop functionality
4. **Performance Tests**: Test with various file sizes
5. **Security Tests**: Verify file type validation

## Monitoring

Monitor image upload performance:

1. **Upload Success Rate**: Track successful vs failed uploads
2. **File Sizes**: Monitor average file sizes
3. **Storage Usage**: Track R2 storage consumption
4. **Response Times**: Monitor upload and retrieval speeds

This feature enhances the sequence builder by allowing rich media content in SMS messages, improving engagement and communication effectiveness. 
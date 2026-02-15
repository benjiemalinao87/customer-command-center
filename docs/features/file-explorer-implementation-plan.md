# File Explorer Implementation Plan

## Overview

A unified file explorer that allows users to:
1. Browse files from notes, sequences, and any uploaded files
2. Upload, save, and get public links
3. Create and manage folders

## Current State Analysis

### Existing File Storage Systems

1. **Sequence Images** (R2 via Backend)
   - Location: `sequences/{workspaceId}/{uuid}.{ext}`
   - Service: `backend/src/services/cloudflareR2Service.js`
   - Bucket: `sequence-image-upload` or `livechat-media`

2. **Notes Media** (R2 via Cloudflare Worker)
   - Location: `{workspaceId}/{timestamp}-{randomId}.{ext}`
   - Service: `cloudflare-workers/notes-image-storage/`
   - Bucket: `notes-images-storage`

3. **Chat Attachments** (Supabase Storage)
   - Location: `{workspaceId}/{contactId}/{messageType}/{fileName}`
   - Service: `frontend/src/services/mediaService.js`
   - Bucket: `livechat_media`

### Current Limitations

- ❌ No unified file browsing
- ❌ No folder structure
- ❌ No file metadata tracking
- ❌ Files scattered across multiple storage systems
- ❌ No public link management
- ❌ No file search capability

## Implementation Complexity Assessment

### Size: **Medium** (2-3 weeks)

**Why it's not huge:**
- R2 storage already exists and works
- File upload infrastructure is in place
- Database schema is straightforward

**Why it's not trivial:**
- Need to unify multiple storage systems
- R2 doesn't have native folders (key-based storage)
- Need efficient file listing (R2 list operations can be slow)
- Database schema and migration required
- UI component needs to be built from scratch

## Performance Considerations

### Potential Performance Issues

1. **R2 List Operations**
   - Listing files in R2 can be slow with many files (1000+)
   - **Solution**: Cache file listings in database, paginate results

2. **Database Queries**
   - Need efficient queries for folder navigation
   - **Solution**: Proper indexing, limit result sets

3. **File Metadata Sync**
   - Need to sync R2 files with database
   - **Solution**: Background job to sync, real-time updates on upload

4. **Memory Usage**
   - Large file listings could consume memory
   - **Solution**: Virtual scrolling, pagination, lazy loading

### Performance Mitigation Strategies

✅ **Database-First Approach**
- Store file metadata in database for fast queries
- Use R2 only for actual file storage
- Cache folder structure in database

✅ **Lazy Loading**
- Load files on-demand when folder is opened
- Paginate file listings (50-100 files per page)

✅ **Background Sync**
- Sync R2 files to database in background
- Real-time updates only for new uploads

✅ **Caching**
- Cache folder structure in memory
- Use React Query for client-side caching

## Database Schema Design

```sql
-- File Folders Table
CREATE TABLE file_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL, -- Full path like "notes/images" or "sequences/media"
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, parent_folder_id, name)
);

-- Files Metadata Table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL,
    
    -- File Information
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- R2 key or storage path
    storage_provider VARCHAR(50) NOT NULL, -- 'r2', 'supabase', 's3'
    bucket_name VARCHAR(100),
    
    -- File Metadata
    file_type VARCHAR(100), -- MIME type
    file_size BIGINT, -- bytes
    file_extension VARCHAR(10),
    
    -- Source Context
    source_type VARCHAR(50), -- 'notes', 'sequence', 'chat', 'upload'
    source_id UUID, -- Reference to source (note_id, sequence_id, etc.)
    
    -- Public Access
    is_public BOOLEAN DEFAULT false,
    public_url TEXT,
    public_link_token UUID UNIQUE, -- For secure public links
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete
    last_accessed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_files_workspace_id ON files(workspace_id);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_source ON files(source_type, source_id);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
CREATE INDEX idx_files_public_token ON files(public_link_token) WHERE is_public = true;
CREATE INDEX idx_folders_workspace_parent ON file_folders(workspace_id, parent_folder_id);

-- RLS Policies
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policies for file_folders
CREATE POLICY "Users can view folders in their workspace"
    ON file_folders FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create folders in their workspace"
    ON file_folders FOR INSERT
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    ));

-- Policies for files
CREATE POLICY "Users can view files in their workspace"
    ON files FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    ) AND deleted_at IS NULL);

CREATE POLICY "Users can upload files in their workspace"
    ON files FOR INSERT
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    ));
```

## Architecture Design

### Backend Services

1. **Unified File Service** (`backend/src/services/fileService.js`)
   - Upload files to R2
   - Create/update file metadata in database
   - Generate public links
   - List files with pagination

2. **Folder Service** (`backend/src/services/folderService.js`)
   - Create/delete folders
   - List folder structure
   - Validate folder paths

3. **R2 List Service** (`backend/src/services/r2ListService.js`)
   - List files from R2 buckets
   - Sync R2 files to database
   - Handle pagination

### API Endpoints

```
GET    /api/files                    # List files (with pagination, filters)
POST   /api/files                    # Upload file
GET    /api/files/:id                # Get file details
DELETE /api/files/:id                # Delete file
GET    /api/files/:id/public-link    # Generate public link
POST   /api/files/:id/move           # Move file to folder

GET    /api/folders                  # List folders
POST   /api/folders                  # Create folder
DELETE /api/folders/:id              # Delete folder
POST   /api/folders/:id/move         # Move folder

POST   /api/files/sync               # Sync R2 files to database (admin)
```

### Frontend Components

1. **FileExplorer Component** (`frontend/src/components/file-explorer/FileExplorer.js`)
   - Main file browser UI
   - Folder navigation
   - File grid/list view

2. **FileUpload Component** (`frontend/src/components/file-explorer/FileUpload.js`)
   - Drag & drop upload
   - Progress tracking
   - Folder selection

3. **FileItem Component** (`frontend/src/components/file-explorer/FileItem.js`)
   - File preview
   - Actions (download, share, delete)
   - Public link generation

4. **FolderTree Component** (`frontend/src/components/file-explorer/FolderTree.js`)
   - Folder hierarchy
   - Create/delete folders
   - Navigation

## Implementation Phases

### Phase 1: Database & Backend Foundation (Week 1)
- [ ] Create database schema
- [ ] Create file service
- [ ] Create folder service
- [ ] Create API endpoints
- [ ] Add R2 list functionality
- [ ] Write tests

### Phase 2: File Sync & Migration (Week 1-2)
- [ ] Create sync job to migrate existing files
- [ ] Add file metadata to existing uploads
- [ ] Create default folders (Notes, Sequences, Chat)
- [ ] Test sync process

### Phase 3: Frontend UI (Week 2)
- [ ] Create FileExplorer component
- [ ] Create FileUpload component
- [ ] Create FolderTree component
- [ ] Add file preview
- [ ] Add public link generation UI

### Phase 4: Integration & Polish (Week 2-3)
- [ ] Integrate with existing upload flows
- [ ] Add file search
- [ ] Add file filters (by type, date, source)
- [ ] Performance optimization
- [ ] Add loading states and error handling

## Performance Optimization Strategies

### 1. Database Caching
- Store all file metadata in database
- Only query R2 when necessary (new uploads, sync)
- Use database for all file listings

### 2. Pagination
- Limit file listings to 50-100 per page
- Implement infinite scroll or "Load More"

### 3. Lazy Loading
- Load folder contents on-demand
- Load file previews on-demand
- Use React.lazy for components

### 4. Virtual Scrolling
- Use react-window for large file lists
- Only render visible items

### 5. Background Sync
- Sync R2 files to database in background
- Use queue system for large syncs
- Real-time updates for new uploads only

## Cost Considerations

### R2 Storage Costs
- **Storage**: $0.015/GB/month (very cheap)
- **Operations**: $4.50 per million Class A operations (list, write)
- **Egress**: Free (served via Cloudflare CDN)

### Database Costs
- Minimal - just metadata storage
- Indexes for fast queries

### Estimated Monthly Cost
- **Small workspace** (1000 files, 10GB): ~$0.15/month
- **Medium workspace** (10,000 files, 100GB): ~$1.50/month
- **Large workspace** (100,000 files, 1TB): ~$15/month

## Risk Assessment

### Low Risk ✅
- File upload already works
- R2 storage is reliable
- Database schema is straightforward

### Medium Risk ⚠️
- **R2 List Performance**: Mitigated by database caching
- **Sync Complexity**: Mitigated by background jobs
- **UI Performance**: Mitigated by pagination and virtual scrolling

### Mitigation Strategies
- Start with database-first approach
- Implement pagination from day 1
- Use background sync for existing files
- Monitor performance metrics

## Success Metrics

- ✅ Users can browse all files in one place
- ✅ File uploads are < 2 seconds for files < 10MB
- ✅ Folder navigation is < 500ms
- ✅ File listing loads < 1 second for 100 files
- ✅ Public links work reliably

## Conclusion

**This is a medium-sized implementation that won't cause engine issues if done correctly.**

**Key Success Factors:**
1. Database-first approach (don't rely on R2 listing)
2. Proper pagination and lazy loading
3. Background sync for existing files
4. Efficient database queries with proper indexes

**Timeline**: 2-3 weeks
**Complexity**: Medium
**Performance Impact**: Low (with proper implementation)
**Cost Impact**: Very Low (~$1-15/month per workspace)

/**
 * Google Drive Service
 * Handles file upload, retrieval, and management for NextGen Materials
 * Using Google Drive API v3 with pre-configured OAuth tokens
 */

const GOOGLE_DRIVE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID,
  clientSecret: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_SECRET,
  redirectUri: import.meta.env.VITE_GOOGLE_DRIVE_REDIRECT_URI || 
               (import.meta.env.MODE === 'production' 
                 ? 'https://nextgen-ccf.org' 
                 : 'http://localhost:3002/nextgen'),
  refreshToken: import.meta.env.VITE_GOOGLE_DRIVE_REFRESH_TOKEN,
  folderId: import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID
};

// Token storage keys
const TOKEN_KEY = 'gdrive_access_token';
const TOKEN_EXPIRY_KEY = 'gdrive_token_expiry';

class GoogleDriveService {
  constructor() {
    this.accessToken = localStorage.getItem(TOKEN_KEY);
    this.tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    this.refreshToken = GOOGLE_DRIVE_CONFIG.refreshToken;
    this.folderId = GOOGLE_DRIVE_CONFIG.folderId;
  }

  /**
   * Get access token (refresh if needed)
   */
  async getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry) {
        const expiryTime = parseInt(this.tokenExpiry);
        const now = Date.now();
        
        // Token still valid (with 5 min buffer)
        if (now < expiryTime - (5 * 60 * 1000)) {
          return this.accessToken;
        }
      }
      
      // Refresh the token
      return await this.refreshAccessToken();
    } catch (error) {
      console.error('Token error:', error);
      throw new Error('Failed to get access token. Please contact administrator.');
    }
  }

  /**
   * Refresh access token using the permanent refresh token
   */
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token configured. Please contact administrator.');
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: this.refreshToken,
          client_id: GOOGLE_DRIVE_CONFIG.clientId,
          client_secret: GOOGLE_DRIVE_CONFIG.clientSecret,
          grant_type: 'refresh_token'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token refresh failed: ${error.error_description || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update access token
      this.accessToken = data.access_token;
      const expiryTime = Date.now() + (data.expires_in * 1000);
      this.tokenExpiry = expiryTime.toString();
      
      localStorage.setItem(TOKEN_KEY, this.accessToken);
      localStorage.setItem(TOKEN_EXPIRY_KEY, this.tokenExpiry);
      
      return this.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Create or get folder in Google Drive
   */
  async createFolder(folderName, parentFolderId = null) {
    try {
      const token = await this.getAccessToken();
      const parent = parentFolderId || this.folderId;
      
      // First, check if folder already exists
      const searchParams = new URLSearchParams({
        q: `name='${folderName.replace(/'/g, "\\'")}'  and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)'
      });
      
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?${searchParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.files && searchResult.files.length > 0) {
          // Folder exists, return it
          return searchResult.files[0];
        }
      }
      
      // Create new folder
      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parent]
      };
      
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create folder: ${error.error?.message || response.statusText}`);
      }
      
      const folder = await response.json();
      
      // Make folder accessible
      await this.setFilePermissions(folder.id);
      
      return folder;
    } catch (error) {
      console.error('Create folder error:', error);
      throw error;
    }
  }

  /**
   * Upload file to Google Drive (optionally in a specific folder)
   */
  async uploadFile(file, metadata = {}) {
    try {
      const token = await this.getAccessToken();
      
      // Determine parent folder
      let parentId = this.folderId;
      
      // If parentFolderId is provided directly, use it (for batch uploads to same folder)
      if (metadata.parentFolderId) {
        parentId = metadata.parentFolderId;
      } 
      // If folderName is provided, create/get the folder first (for single file uploads)
      else if (metadata.folderName) {
        const folder = await this.createFolder(metadata.folderName);
        parentId = folder.id;
      }
      
      // Create metadata
      const fileMetadata = {
        name: metadata.name || file.name,
        parents: [parentId],
        description: metadata.description || ''
      };
      
      // Create multipart request body
      const delimiter = '-------314159265358979323846';
      const closeDelimiter = `\r\n--${delimiter}--`;
      
      const metadataBody = JSON.stringify(fileMetadata);
      const fileBody = await file.arrayBuffer();
      
      const multipartBody = new Blob([
        `--${delimiter}\r\n`,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        metadataBody,
        `\r\n--${delimiter}\r\n`,
        `Content-Type: ${file.type}\r\n\r\n`,
        fileBody,
        closeDelimiter
      ]);
      
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${delimiter}`
        },
        body: multipartBody
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Upload failed: ${error.error?.message || response.statusText}`);
      }
      
      const result = await response.json();
      
      // Make file publicly accessible
      await this.setFilePermissions(result.id);
      
      // Get shareable link
      const fileUrl = `https://drive.google.com/file/d/${result.id}/view`;
      
      return {
        id: result.id,
        url: fileUrl,
        name: result.name,
        mimeType: result.mimeType,
        size: result.size,
        folderId: parentId
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Set file permissions to make it publicly accessible
   */
  async setFilePermissions(fileId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to set file permissions:', response.statusText);
      }
    } catch (error) {
      console.warn('Permission setting error:', error);
    }
  }

  /**
   * Extract file or folder ID from Google Drive URL
   */
  extractFileId(url) {
    if (!url) return null;
    
    // Match file URLs: https://drive.google.com/file/d/FILE_ID/view
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];
    
    // Match folder URLs: https://drive.google.com/drive/folders/FOLDER_ID
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];
    
    // Match search URLs: ...?q=FolderName
    // These don't have IDs, return null
    return null;
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  /**
   * List all files in a folder
   */
  async listFilesInFolder(folderId) {
    try {
      const token = await this.getAccessToken();
      
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType)'
      });
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('List files error:', error);
      throw error;
    }
  }

  /**
   * Delete folder and all its contents
   */
  async deleteFolder(folderId) {
    try {
      // List all files in the folder
      const files = await this.listFilesInFolder(folderId);
      
      // Delete all files first
      for (const file of files) {
        await this.deleteFile(file.id);
      }
      
      // Then delete the folder itself
      await this.deleteFile(folderId);
      
      return true;
    } catch (error) {
      console.error('Delete folder error:', error);
      throw error;
    }
  }

  /**
   * Delete material files (handles both single files and folders)
   */
  async deleteMaterialFiles(fileUrl) {
    try {
      if (!fileUrl) return true;
      
      const fileId = this.extractFileId(fileUrl);
      if (!fileId) {
        console.warn('Could not extract file ID from URL:', fileUrl);
        return true;
      }
      
      // Check if it's a folder or file
      const token = await this.getAccessToken();
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('File not found, may have been already deleted');
          return true;
        }
        throw new Error(`Failed to get file info: ${response.statusText}`);
      }
      
      const fileInfo = await response.json();
      
      // If it's a folder, delete folder and contents
      if (fileInfo.mimeType === 'application/vnd.google-apps.folder') {
        await this.deleteFolder(fileId);
      } else {
        // Otherwise just delete the file
        await this.deleteFile(fileId);
      }
      
      return true;
    } catch (error) {
      console.error('Delete material files error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFile(fileId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get file: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get file error:', error);
      throw error;
    }
  }

  /**
   * List files in NXTGen Materials folder
   */
  async listFiles(pageSize = 100, pageToken = null) {
    try {
      const token = await this.getAccessToken();
      
      const params = new URLSearchParams({
        q: `'${this.folderId}' in parents and trashed=false`,
        pageSize: pageSize.toString(),
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink)',
        orderBy: 'modifiedTime desc'
      });
      
      if (pageToken) {
        params.append('pageToken', pageToken);
      }
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('List files error:', error);
      throw error;
    }
  }

  /**
   * One-time setup to get refresh token (for admin use only)
   */
  async setupRefreshToken() {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_DRIVE_CONFIG.clientId);
    authUrl.searchParams.append('redirect_uri', GOOGLE_DRIVE_CONFIG.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/drive.file');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    console.log('Open this URL in your browser:');
    console.log(authUrl.toString());
    console.log('\nAfter authorizing, copy the code from the URL and call exchangeCodeForRefreshToken(code)');
  }

  /**
   * Exchange auth code for refresh token (for admin use only)
   */
  async exchangeCodeForRefreshToken(code) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: GOOGLE_DRIVE_CONFIG.clientId,
          client_secret: GOOGLE_DRIVE_CONFIG.clientSecret,
          redirect_uri: GOOGLE_DRIVE_CONFIG.redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }
      
      const data = await response.json();
      
      console.log('\n=== ADD THIS TO YOUR .env FILE ===');
      console.log(`VITE_GOOGLE_DRIVE_REFRESH_TOKEN="${data.refresh_token}"`);
      console.log('===================================\n');
      
      return data.refresh_token;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new GoogleDriveService();

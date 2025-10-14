const { google } = require('googleapis');

// Test YouTube API configuration
async function testYouTubeAPI() {
  try {
    console.log('Testing YouTube API...');
    
    // Set environment variables (replace with your actual credentials)
    process.env.YOUTUBE_CLIENT_ID = 'YOUR_YOUTUBE_CLIENT_ID';
    process.env.YOUTUBE_CLIENT_SECRET = 'YOUR_YOUTUBE_CLIENT_SECRET';
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    
    console.log('OAuth2 client created successfully');
    console.log('Client ID:', process.env.YOUTUBE_CLIENT_ID);
    console.log('Client Secret:', process.env.YOUTUBE_CLIENT_SECRET ? 'Set' : 'Not set');
    
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });
    
    console.log('YouTube API client created successfully');
    
    // Test API access (this will fail without tokens, but we can see if the client is created)
    console.log('YouTube API test completed successfully');
    
  } catch (error) {
    console.error('YouTube API test failed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testYouTubeAPI();

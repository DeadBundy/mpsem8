# Mental Health Monitoring System

## Overview
An AI-driven mental health monitoring application that uses real-time facial emotion recognition to detect emotions and provides adaptive, supportive therapy responses based on the user's emotional state. The system prioritizes user privacy by processing all emotion detection locally on the client-side.

## Purpose & Goals
- Provide accessible mental health support without the intimidation and cost barriers of traditional therapy
- Detect real-time emotions through facial expressions using advanced CNN-based models
- Deliver personalized, emotion-aware therapeutic guidance through AI
- Ensure complete user privacy with local emotion processing

## Recent Changes (October 5, 2025)
- Initial project implementation completed
- Integrated TensorFlow.js with @vladmandic/face-api for real-time emotion detection
- Built OpenAI GPT-5 therapy agent with emotion-aware context
- Created calming, accessible UI with dark mode support
- Implemented complete therapy session flow with chat interface
- Fixed schema type mismatches for emotion confidence values
- All core features functional and tested

## Project Architecture

### Technology Stack
**Frontend:**
- React with TypeScript
- Tailwind CSS + shadcn UI components
- TensorFlow.js (@vladmandic/face-api) for emotion detection
- React Query (TanStack Query v5) for state management
- Wouter for routing

**Backend:**
- Express.js server
- OpenAI GPT-5 API for therapy responses
- In-memory storage (MemStorage) for session data

### Key Features
1. **Real-time Emotion Detection**: Uses webcam to detect 7 emotions (happy, sad, angry, fearful, disgusted, surprised, neutral) with confidence scores
2. **AI Therapy Agent**: GPT-5-powered therapist that adapts responses based on detected emotions
3. **Privacy-First Design**: All emotion processing happens client-side; no emotion data sent to servers
4. **Session Management**: Track therapy sessions with message history and emotion timelines
5. **Responsive Design**: Beautiful, calming UI that works on all devices
6. **Dark Mode**: Full light/dark theme support with smooth transitions

### Data Models
- **TherapySession**: Session tracking with start/end times and duration
- **Message**: Chat messages with role (user/assistant), content, and optional emotion context
- **EmotionRecord**: Historical emotion detections with confidence scores
- **EmotionDetection**: Real-time emotion state with timestamp

### API Endpoints
- `POST /api/sessions/start` - Create new therapy session
- `POST /api/sessions/end` - End active session
- `POST /api/messages` - Send message and get AI therapy response
- `POST /api/emotions` - Record emotion detection
- `GET /api/sessions/:sessionId/emotions` - Retrieve session emotion history

## User Preferences
None specified yet.

## Development Notes

### Design System
- **Colors**: Soft blues (210 25% 45%), teals (180 30% 40%), sage greens (140 20% 50%)
- **Typography**: Inter for body, Poppins for headings
- **Spacing**: Consistent 4px-based scale (2, 4, 6, 8, 12, 16)
- **Components**: Leverages shadcn UI library for consistent, accessible components

### Emotion Detection
- Models loaded from CDN: tinyFaceDetector + faceExpressionNet
- Detection runs every 2 seconds during active session
- Confidence values: 0-1 floats, stored as strings for consistency
- Face bounding boxes drawn on canvas overlay

### OpenAI Integration
- Uses GPT-5 model (latest as of August 2025)
- System prompts include emotion-aware context for adaptive responses
- Maintains last 10 messages for conversation continuity
- Emotion-specific guidance (e.g., extra compassion for sadness)

### Privacy & Security
- Webcam feed processed entirely in browser
- No video/image data sent to backend
- Only emotion labels and confidence sent with messages
- Session data stored in-memory (not persisted)
- Camera permissions required and clearly communicated

## File Structure
```
client/
  src/
    components/
      ChatInterface.tsx - Therapy chat display
      EmotionIndicator.tsx - Current emotion badge/card
      EmotionTimeline.tsx - 60-second emotion graph
      MessageInput.tsx - User message input
      PrivacyBadge.tsx - Privacy indicators
      ThemeProvider.tsx - Dark mode context
      ThemeToggle.tsx - Theme switcher
      WebcamView.tsx - Camera feed display
    lib/
      emotionDetection.ts - TensorFlow.js integration
      queryClient.ts - React Query configuration
    pages/
      home.tsx - Main application page
server/
  openai.ts - GPT-5 therapy agent
  routes.ts - API endpoints
  storage.ts - In-memory data storage
shared/
  schema.ts - Type definitions and Zod schemas
```

## Known Limitations
- Requires camera permissions for emotion detection
- In-memory storage (sessions lost on server restart)
- Face detection requires good lighting conditions
- Single-user sessions (no authentication)

## Future Enhancements (Not Implemented)
- Persistent database for session history
- User authentication and multi-user support
- Emotion trend analytics with daily/weekly tracking
- Coping strategy recommendations based on patterns
- Crisis detection with resource recommendations
- Session notes export and progress tracking
- Offline support with service workers

# Mental Health Monitoring System - Design Guidelines

## Design Approach

**Hybrid Approach**: Drawing inspiration from leading wellness applications (Calm, Headspace, BetterHelp) combined with Material Design principles for accessibility and trust-building in sensitive mental health contexts.

**Core Principles**:
- Calm and nurturing visual environment
- Clear emotional feedback without clinical coldness
- Privacy-first visual language
- Accessible and inclusive design for all users
- Soft, human-centered interactions

---

## Core Design Elements

### A. Color Palette

**Primary Colors** (Calming Foundation):
- Soft Blue: 210 25% 45% - Primary actions, trust indicators
- Deep Teal: 180 30% 40% - Secondary elements, stability
- Sage Green: 140 20% 50% - Success states, positive emotions

**Emotion-Specific Colors**:
- Happiness: 50 75% 60% (warm yellow-orange)
- Sadness: 220 30% 50% (muted blue)
- Stress/Anger: 15 50% 55% (subdued orange-red)
- Neutral: 220 10% 50% (soft gray-blue)

**Background & Surface**:
- Dark Mode Primary: 220 15% 12%
- Dark Mode Surface: 220 12% 18%
- Light Mode Primary: 210 20% 98%
- Light Mode Surface: 0 0% 100%

**Accent (Use sparingly)**:
- Lavender: 260 35% 65% - Special highlights, premium features

### B. Typography

**Font Families**:
- Primary: 'Inter' - UI elements, buttons, labels (via Google Fonts)
- Headings: 'Poppins' - Warm, approachable headers (via Google Fonts)
- Body/Chat: 'Inter' - Optimal readability for therapeutic conversations

**Type Scale**:
- Hero/Page Titles: text-4xl to text-5xl, font-semibold
- Section Headers: text-2xl to text-3xl, font-medium
- Body Text: text-base to text-lg, font-normal
- Chat Messages: text-base, leading-relaxed
- Labels/Captions: text-sm, font-medium

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm
- Tight spacing: p-2, gap-2 (compact elements)
- Standard spacing: p-4, gap-4, m-6 (most components)
- Generous spacing: p-8, gap-8, m-12 (section breathing room)
- Section spacing: py-16 (vertical section separation)

**Grid System**:
- Main app container: max-w-7xl mx-auto
- Two-column layout for main interface: Webcam/Emotion Display (left) + Chat Interface (right)
- Responsive breakpoint: Stack to single column on mobile (md:grid-cols-2)

### D. Component Library

**Navigation**:
- Top navigation bar with logo, session controls, settings icon
- Height: h-16, backdrop-blur effect
- Sticky positioning for constant access

**Webcam & Emotion Display Card**:
- Rounded-2xl card with soft shadow
- Live webcam feed with rounded-xl corners
- Emotion indicator: Large badge showing detected emotion with confidence percentage
- Color-coded emotion states matching emotion-specific palette
- Real-time emotion graph showing emotion timeline (last 60 seconds)

**Therapy Chat Interface**:
- WhatsApp/iMessage inspired chat bubbles
- User messages: Align right, soft blue background (210 30% 40%)
- AI responses: Align left, surface color with subtle border
- Rounded-3xl message bubbles for warmth
- Generous padding (px-6 py-4) for comfortable reading
- Timestamp in text-xs text-gray-400

**Session History Panel**:
- Accordion-style expandable sessions
- Each session shows: Date, duration, emotion summary, key insights
- Mini emotion timeline visualization (sparkline chart)
- Accessible expand/collapse icons

**Privacy Indicators**:
- Always-visible indicator showing "Processing locally - No data stored"
- Lock icon with text-sm reassurance
- Subtle green dot for "active session" status

**Buttons**:
- Primary: Rounded-xl, py-3 px-6, soft blue background
- Secondary: Rounded-xl, py-3 px-6, border-2 with transparent background
- Start Session: Prominent, rounded-2xl, py-4 px-8
- Stop Session: Subtle red accent (0 50% 55%)

**Forms**:
- Input fields: Rounded-lg, p-4, focus ring matching primary color
- Dark mode: Inputs with subtle lighter background (220 12% 22%)
- Labels: text-sm font-medium mb-2

**Emotion Visualization Cards**:
- Grid of small cards showing emotion distribution
- Each card: Icon + Emotion name + Percentage
- Color-coded backgrounds at 10% opacity
- Rounded-xl, p-4

### E. Images

**Hero Image**: No large hero image. This is a functional application interface, not a marketing page.

**Supporting Visuals**:
- Subtle background gradient on welcome screen before session starts
- Abstract, calming patterns (waves, organic shapes) at very low opacity (5-10%) in empty states
- Privacy illustration: Simple icon showing local processing (brain + shield icon)

**Icon Library**: Use Heroicons (outline style for calm, minimal aesthetic)

---

## Specific Component Guidance

**Main Application Layout**:
- Two-column split: 40% webcam/emotion display, 60% chat interface on desktop
- Mobile: Stack with webcam/emotion at top, chat below
- Persistent header with session timer
- Bottom text input bar for chat (sticky)

**Emotion Detection Feedback**:
- Large, clear emotion label with icon
- Confidence score as progress ring or percentage
- Smooth color transitions between emotion states (300ms ease)
- Pulsing subtle animation when high confidence detected

**Chat Message Patterns**:
- AI messages include typing indicator (3 animated dots)
- Messages fade in gently (200ms)
- Scrollable container with auto-scroll to latest message
- Maximum message width: max-w-2xl for readability

**Empty States**:
- Welcoming message before starting session
- Clear "Start Session" CTA button
- Brief explanation of how it works (3-4 bullet points)
- Reassuring privacy statement

**Accessibility**:
- All interactive elements minimum 44x44px touch targets
- ARIA labels for emotion states and chat messages
- Keyboard navigation for all controls
- Screen reader announcements for emotion changes
- High contrast mode support

**Animations**: Minimal and purposeful
- Emotion state transitions: 300ms ease-in-out color changes
- Message appearance: 200ms fade-in
- Button hover: Subtle scale (scale-105)
- NO complex scroll animations or distracting motion

This design creates a trustworthy, calming environment that prioritizes user comfort while providing clear, actionable emotional feedback and therapeutic support.
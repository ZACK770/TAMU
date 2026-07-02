# Admin Page UX Documentation

## Overview
The admin page has been reorganized to provide a cleaner, more intuitive interface for managing exams. Each exam now has three dedicated sub-tabs that organize related functionality.

## Main Navigation
The admin page has four main tabs at the top level:
- **מבחנים** (Exams) - Manage exams, tokens, and scores
- **שיעורים** (Lessons) - Manage lessons and materials
- **הטבות** (Benefits) - Manage global benefits
- **מימושים** (Redemptions) - Manage benefit redemptions

## Exam Management Structure

When an exam is selected, it displays with three sub-tabs:

### 1. ניהול מבחן (Exam Management)
This tab contains all exam configuration and content management.

**Features:**
- **Exam Settings**
  - Toggle "מעורבב" (Randomized) checkbox
  - Assign to study program via dropdown
  
- **Score Rules (מדרגות ניקוד)**
  - Add/remove score thresholds
  - Set minimum score required and points awarded
  - Save changes with "שמור ניקוד" button
  
- **Allowed Benefits (הטבות מותרות למימוש)**
  - Search field to filter benefits by name
  - Checkbox list of all global benefits
  - Select which benefits can be redeemed from this exam
  - If left empty, all benefits are allowed
  - Shows benefit cost in points
  
- **Questions Management**
  - Add new questions with text and 4 answer options
  - Mark correct answer by clicking the circle icon
  - View all questions with correct answers highlighted in green
  - Delete questions with trash icon

### 2. ניהול טוקנים (Token Management)
This tab focuses on token generation, tracking, and QR code management.

**Features:**
- **Token Generation**
  - Input field for quantity (1-100)
  - "צור טוקנים" button to generate bulk tokens
  - "הורד הכל" button to download all QR codes as ZIP
  
- **Token Filters**
  - "הכל" (All) - Show all tokens
  - "נוצלו" (Used) - Show only used tokens
  - "זמינים" (Available) - Show only unused tokens
  - Sort dropdown: "מיון לפי יצירה" (Sort by creation) or "מיון לפי ניצול" (Sort by usage)
  
- **Cost Statistics**
  - **עלות פוטנציאלית** (Potential Cost) - Total points if all issued tokens are used
    - Calculated as: (number of tokens) × (maximum points from reward rules)
  - **עלות בפועל** (Actual Cost) - Points actually awarded
    - Calculated from completed exam sessions
  
- **Token List**
  - Each token shows:
    - QR code (60px)
    - Token code (monospace font)
    - Usage status with timestamp
    - Status badge: "נוצל" (Used) in red or "זמין" (Available) in green
    - Download QR button

### 3. ניהול ניקוד (Score Management)
This tab provides analytics and detailed session information.

**Features:**
- **Score Statistics**
  - **סה"כ ניסיונות** (Total Attempts) - Number of exam sessions
  - **ציון ממוצע** (Average Score) - Mean score of completed exams
  - **סה"כ נקודות שניתנו** (Total Points Awarded) - Sum of all earned points
  
- **Sessions List**
  - Each session shows:
    - User name or phone number
    - Start and completion timestamps
    - Score achieved
    - Points earned (highlighted in green)
    - Status badge: "הושלם" (Completed) in green or "בתהליך" (In Progress) in yellow

## User Flow

### Creating a New Exam
1. Click "+" button in exams list
2. Enter exam title
3. Optionally assign to study program
4. Click "צור מבחן חדש"

### Managing an Existing Exam
1. Click on exam in the list to select it
2. Use sub-tabs to navigate between Management, Tokens, and Scores
3. Make changes in each tab as needed
4. Changes are saved immediately (questions, benefits) or via save buttons (score rules)

### Generating Tokens
1. Select exam
2. Navigate to "ניהול טוקנים" tab
3. Enter quantity (1-100)
4. Click "צור טוקנים"
5. Download individual QR codes or all at once

### Restricting Benefits
1. Select exam
2. Navigate to "ניהול מבחן" tab
3. Scroll to "הטבות מותרות למימוש" section
4. Use search to find specific benefits
5. Check/uncheck benefits to allow/restrict
6. Selection saves automatically

### Viewing Exam Performance
1. Select exam
2. Navigate to "ניהול ניקוד" tab
3. Review statistics cards at top
4. Scroll to sessions list for detailed attempt information

## Visual Design

### Color Coding
- **Blue** - Potential cost statistics
- **Green** - Actual cost, completed status, available tokens
- **Red** - Used tokens
- **Yellow** - In-progress status
- **Purple** - Total attempts
- **Slate/Gray** - Primary UI elements and active states

### Typography
- **Bold** - Headings, important numbers, token codes
- **Monospace** - Token codes for readability
- **Small/Gray** - Secondary information, timestamps

### Layout
- **3-column grid** - Main content area with sidebar for exam list
- **Card-based** - Each section in a rounded card with padding
- **Responsive** - Adapts to different screen sizes

## Data Flow

### Backend Endpoints
- `GET /api/admin/exams` - Fetch all exams with relations
- `PATCH /api/admin/exams/:id` - Update exam settings
- `PATCH /api/admin/exams/:id/allowed-benefits` - Update allowed benefits
- `POST /api/admin/tokens/bulk` - Create bulk tokens
- `GET /api/admin/tokens/:tokenId/qr` - Download single QR
- `GET /api/admin/exams/:examId/qrs` - Download all QRs as ZIP

### Database Schema
- `Exam` - Main exam entity
- `ExamToken` - Individual tokens with usage tracking
- `ExamSession` - Exam attempts with scores and points
- `ExamAllowedBenefit` - Junction table linking exams to global benefits
- `Benefit` - Global benefits (managed separately)
- `ExamRewardRule` - Score thresholds and point awards

## Best Practices

### For Administrators
1. **Always review cost statistics** before generating large batches of tokens
2. **Use benefit restrictions** to limit redemption options for specific exams
3. **Monitor actual vs potential costs** to understand exam engagement
4. **Review session data** to identify patterns in user performance
5. **Download QR codes** immediately after generation for offline distribution

### For Developers
1. The 3-tab structure is implemented as conditional rendering based on `examSubTab` state
2. Token filtering and sorting is done client-side for better performance
3. Cost calculations use the maximum reward rule points for potential cost
4. Sessions are ordered by start date (newest first)
5. All API calls include proper error handling with user feedback

## Future Enhancements

Potential improvements for future iterations:
- Export session data to CSV/Excel
- More detailed analytics (time spent, question-level performance)
- Token expiration dates
- Bulk token deletion
- Advanced filtering on sessions (date range, score range)
- Real-time updates when tokens are used

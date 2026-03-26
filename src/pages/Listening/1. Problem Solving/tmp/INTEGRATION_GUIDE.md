# Integration Guide: Adding Practice Test to userHome.tsx

## Overview
When a user clicks a scenario card (like "Swimming_Lessons_Registration"), it should navigate to the ListeningPracticeTest component instead of 'question-intro'.

---

## STEP 1: Add Import Statement

**Location:** Top of `userHome.tsx` (around line 1-10)

**Add this line after your existing imports:**

```tsx
import ListeningPracticeTest from './Problem Solving/ListeningPracticeTest';
```

---

## STEP 2: Add New State Variable

**Location:** Around line 18-19 (where other useState declarations are)

**Find this section:**
```tsx
const [selectedScenario, setSelectedScenario] = useState(null);
const [currentQuestion, setCurrentQuestion] = useState(0);
```

**Add this line after `selectedScenario`:**
```tsx
const [practiceTestData, setPracticeTestData] = useState(null);
```

**Result should look like:**
```tsx
const [selectedScenario, setSelectedScenario] = useState(null);
const [practiceTestData, setPracticeTestData] = useState(null);  // ADD THIS LINE
const [currentQuestion, setCurrentQuestion] = useState(0);
```

---

## STEP 3: Modify the Scenario Click Handler

**Location:** Lines 798-803 in `ScenariosView`

**Find this code:**
```tsx
<button
  key={material.id}
  onClick={() => {
    setSelectedScenario(material);
    setCurrentView('question-intro');
  }}
```

**Replace with:**
```tsx
<button
  key={material.id}
  onClick={() => {
    setSelectedScenario(material);
    // Transform material data to practice test format
    setPracticeTestData({
      id: material.id,
      title: material.title,
      skill: material.skill,
      taskName: selectedTask.name,
      taskType: selectedTask.id,
      totalTime: 90, // 1:30 in seconds - adjust based on your data
      instructions: 'You will hear a conversation in 3 sections. You will hear each section only once.',
      // The sections/questions would come from material.uploadedFiles or a separate API call
      sections: material.uploadedFiles?.sections || []
    });
    setCurrentView('practice-test');
  }}
```

---

## STEP 4: Update the handleBack Function

**Location:** Around lines 187-199

**Find this code:**
```tsx
const handleBack = () => {
  if (currentView === 'question-active' || currentView === 'question-intro') {
    setCurrentView('scenarios');
    setSelectedScenario(null);
    setCurrentQuestion(0);
  } else if (currentView === 'scenarios') {
```

**Replace with:**
```tsx
const handleBack = () => {
  if (currentView === 'practice-test') {
    setCurrentView('scenarios');
    setSelectedScenario(null);
    setPracticeTestData(null);
  } else if (currentView === 'question-active' || currentView === 'question-intro') {
    setCurrentView('scenarios');
    setSelectedScenario(null);
    setCurrentQuestion(0);
  } else if (currentView === 'scenarios') {
```

---

## STEP 5: Add Practice Test View to Main Render

**Location:** Around lines 1111-1117 (in the main return, inside `<main>` tag)

**Find this section:**
```tsx
<main className="p-8">
  {currentView === 'dashboard' && activeTab === 'dashboard' && <DashboardView />}
  {activeTab === 'mock-exams' && <MockExamsView />}
  {activeTab === 'results' && <ResultsView />}
  {currentView === 'skill-tasks' && <SkillTasksView />}
  {currentView === 'scenarios' && <ScenariosView />}
  {currentView === 'question-intro' && <QuestionIntroView />}
</main>
```

**Add this line before `</main>`:**
```tsx
<main className="p-8">
  {currentView === 'dashboard' && activeTab === 'dashboard' && <DashboardView />}
  {activeTab === 'mock-exams' && <MockExamsView />}
  {activeTab === 'results' && <ResultsView />}
  {currentView === 'skill-tasks' && <SkillTasksView />}
  {currentView === 'scenarios' && <ScenariosView />}
  {currentView === 'question-intro' && <QuestionIntroView />}
  
  {/* ADD THIS: Practice Test View */}
  {currentView === 'practice-test' && practiceTestData && (
    <ListeningPracticeTest
      scenario={practiceTestData}
      onBack={() => {
        setCurrentView('scenarios');
        setPracticeTestData(null);
      }}
      onComplete={(results) => {
        console.log('Test completed:', results);
        // Handle completion - save results, show summary, etc.
        setCurrentView('scenarios');
        setPracticeTestData(null);
      }}
    />
  )}
</main>
```

---

## STEP 6: Make Practice Test Full Screen (Optional but Recommended)

**Location:** Around lines 1119-1126

**Find this section:**
```tsx
{/* Question Active View - Full Screen */}
{currentView === 'question-active' && (
  <div className="fixed inset-0 top-[73px] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 z-50">
```

**Add similar full-screen wrapper for practice test (add AFTER the question-active section):**
```tsx
{/* Practice Test View - Full Screen */}
{currentView === 'practice-test' && practiceTestData && (
  <div className="fixed inset-0 top-[73px] bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 z-50 overflow-y-auto">
    <ListeningPracticeTest
      scenario={practiceTestData}
      onBack={() => {
        setCurrentView('scenarios');
        setPracticeTestData(null);
      }}
      onComplete={(results) => {
        console.log('Test completed:', results);
        setCurrentView('scenarios');
        setPracticeTestData(null);
      }}
    />
  </div>
)}
```

**Note:** If you use the full-screen version (Step 6), you can remove the one from Step 5 inside `<main>`.

---

## COMPLETE SUMMARY OF CHANGES

| Step | Line(s) | Action |
|------|---------|--------|
| 1 | ~Line 11 | Add import statement |
| 2 | ~Line 19 | Add `practiceTestData` state |
| 3 | Lines 800-803 | Change onClick handler in ScenariosView |
| 4 | Lines 187-199 | Update handleBack function |
| 5 | Lines 1111-1117 | Add practice test render in main |
| 6 | Lines 1119+ | (Optional) Add full-screen wrapper |

---

## IMPORTANT: Database Structure

For the practice test to work with real data from your database, your `material` object should have this structure or you need to fetch additional data:

```typescript
interface Material {
  id: string;
  title: string;           // "Swimming_Lessons_Registration"
  skill: string;           // "listening"
  task: string;            // "Problem Solving"
  taskId: string;          // "part1"
  type: string;
  status: string;          // "Published"
  questions: number;       // 8
  uploadedFiles: {
    audio?: string;        // URL to audio file
    transcript?: string;   // Transcript text
    contextImage?: string; // URL to context image
    sections?: Section[];  // Array of sections with questions
  }
}
```

If your database doesn't have `sections` data yet, you'll need to either:
1. Add sections/questions data to your Appwrite database
2. Create a separate API call to fetch question data
3. Use the sample data I provided temporarily for testing

---

## Quick Test

After making these changes:
1. Go to Dashboard
2. Click on "Listening" → "Problem Solving"
3. Click on "Swimming_Lessons_Registration" scenario
4. You should see the practice test start with the instructions screen

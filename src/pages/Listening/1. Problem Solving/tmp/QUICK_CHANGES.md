# EXACT CHANGES FOR userHome.tsx

## Change 1: Add Import (Line ~11)
Add after existing imports:
```tsx
import ListeningPracticeTest from './Problem Solving/ListeningPracticeTest';
```

---

## Change 2: Add State Variable (Line ~19)
Find:
```tsx
const [selectedScenario, setSelectedScenario] = useState(null);
```

Add below it:
```tsx
const [practiceTestData, setPracticeTestData] = useState(null);
```

---

## Change 3: Update handleBack Function (Lines 187-199)
REPLACE the entire handleBack function with:

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
    setCurrentView('skill-tasks');
    setSelectedTask(null);
  } else if (currentView === 'skill-tasks') {
    setCurrentView('dashboard');
    setSelectedSkill(null);
  }
};
```

---

## Change 4: Update Scenario Click Handler (Lines 798-803)
Find this code in ScenariosView:
```tsx
onClick={() => {
  setSelectedScenario(material);
  setCurrentView('question-intro');
}}
```

REPLACE with:
```tsx
onClick={() => {
  setSelectedScenario(material);
  setPracticeTestData({
    id: material.id,
    title: material.title,
    skill: material.skill,
    taskName: selectedTask.name,
    taskType: selectedTask.id,
    totalTime: 90,
    sections: [] // Will use default sample data
  });
  setCurrentView('practice-test');
}}
```

---

## Change 5: Add Practice Test Render (After Line 1126)
Find this closing section:
```tsx
{/* Question Active View - Full Screen */}
{currentView === 'question-active' && (
  ...
)}
```

ADD after it (before `{/* Settings Modal */}`):
```tsx
{/* Practice Test View - Full Screen */}
{currentView === 'practice-test' && practiceTestData && (
  <div className="fixed inset-0 top-[73px] bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 z-50 overflow-y-auto">
    <ListeningPracticeTest
      scenario={practiceTestData}
      onBack={() => {
        setCurrentView('scenarios');
        setPracticeTestData(null);
        setSelectedScenario(null);
      }}
      onComplete={(results) => {
        console.log('Test completed:', results);
        // TODO: Save results to database
        setCurrentView('scenarios');
        setPracticeTestData(null);
        setSelectedScenario(null);
      }}
    />
  </div>
)}
```

---

# SUMMARY OF ALL CHANGES

| Location | What to Change |
|----------|----------------|
| Line ~11 | Add import for ListeningPracticeTest |
| Line ~19 | Add `practiceTestData` state |
| Lines 187-199 | Update handleBack function |
| Lines 798-803 | Update scenario onClick handler |
| After Line 1126 | Add practice test full-screen render |

---

# IMPORTANT NOTE

The `ListeningPracticeTest.tsx` file you already have in your `Problem Solving` folder includes DEFAULT SAMPLE DATA. This means:

1. When you click a scenario, the practice test will work immediately with sample questions
2. The sample data has 8 questions across 3 sections (matching the CELPIP format)
3. Later, you can connect it to your database to load real questions

To test: Click Dashboard → Problem Solving task → Swimming_Lessons_Registration → You should see the practice test!

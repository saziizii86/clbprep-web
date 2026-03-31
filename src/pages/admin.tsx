import { account, storage, BUCKET_ID, databases, DATABASE_ID, USERS_COLLECTION_ID } from "../appwrite";
import { Query, ID } from "appwrite";
import { 
  getAPISettings, 
  saveAPISettings as saveAPISettingsToDB, 
  disconnectAPI as disconnectAPIFromDB,
  testAPIKey 
} from "../services/settingsService";

import { createAdminUser } from "../services/adminUserService";

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Upload, BookOpen, FileText, Mic, Headphones, 
  Users, Settings, LogOut, Plus, Search, Filter, Edit, Trash2,
  BarChart3, TrendingUp, Award, X, Save, Eye, ChevronDown, ChevronUp, CheckCircle,
  Play, Clock, AlertCircle, ToggleLeft, ToggleRight, Pause, Volume2,
  VolumeX, ChevronLeft, ChevronRight, List, SkipBack, SkipForward,
  FileCheck, ArrowLeft, Send, Zap  // <-- ADD Zap HERE
} from 'lucide-react';


import { 
  getMaterials, 
  getMaterialById,   // ← ADD THIS
  createMaterial, 
  updateMaterial, 
  deleteMaterial 
} from "../services/materialsService";

// ============== IndexedDB Storage (supports large files) ==============
const DB_NAME = 'celpip_admin_db';
const DB_VERSION = 1;
const STORE_NAME = 'materials';
const MOCK_SET_MAX = 100;


const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const handleLogout = async () => {
  try {
    await account.deleteSession('current');
    window.location.href = '/';  // Redirect to HOME page
  } catch (error) {
    console.error('Logout failed:', error);
    window.location.href = '/';
  }
};

const saveToIndexedDB = async (materials) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Clear existing data and save new
    store.clear();
    for (const material of materials) {
      store.put(material);
    }
    
    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        console.log('✓ Saved to IndexedDB:', materials.length, 'materials');
        resolve(true);
      };
      transaction.onerror = () => {
        console.error('IndexedDB save error:', transaction.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('IndexedDB error:', error);
    return false;
  }
};

const loadFromIndexedDB = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        console.log('✓ Loaded from IndexedDB:', request.result?.length || 0, 'materials');
        resolve(request.result || []);
      };
      request.onerror = () => {
        console.error('IndexedDB load error:', request.error);
        resolve([]);
      };
    });
  } catch (error) {
    console.error('IndexedDB error:', error);
    return [];
  }
};

const clearIndexedDB = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (error) {
    return false;
  }
};

// Default materials (used when IndexedDB is empty)
const getDefaultMaterials = () => [
  { 
    id: 1, 
    title: 'Problem Solving Practice', 
    skill: 'listening', 
    task: 'Part 1: Problem Solving',
    taskId: 'part1',
    type: 'Complete Test', 
    status: 'Published', 
    date: '2024-12-20', 
    downloads: 1234, 
    sections: 3, 
    audioFiles: 3, 
    questions: 8, 
    description: 'Sample listening practice material',
    uploadedFiles: {}
  },
  { 
    id: 2, 
    title: 'Daily Life Conversation', 
    skill: 'listening', 
    task: 'Part 2: Daily Life Conversation',
    taskId: 'part2',
    type: 'Complete Test', 
    status: 'Published', 
    date: '2024-12-16', 
    downloads: 1567, 
    sections: 1, 
    audioFiles: 1, 
    questions: 5, 
    description: 'Sample conversation practice',
    uploadedFiles: {}
  }
];

// For initial render (IndexedDB is async)
const getInitialMaterials = () => getDefaultMaterials();

export default function CelpipAdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPreviewPage, setShowPreviewPage] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [previewViewMode, setPreviewViewMode] = useState('sections'); // Moved to parent to prevent reset
  const [selectedWritingOption, setSelectedWritingOption] = useState(null); // For Writing Part 2 option A/B
const [expandedSections, setExpandedSections] = useState({ 
  listening: false, 
  speaking: false,
  reading: false,
  writing: false,
  mock: false,
  mockListening: false,
  practiceExam: false
});
  const [activeSubTab, setActiveSubTab] = useState(null); // e.g., 'part1', 'part2', etc.
  
  // Writing evaluation state
  const [writingResponse, setWritingResponse] = useState('');
  const [writingEvaluation, setWritingEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [openAIKey, setOpenAIKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(''); // Separate input state
  const [isAPIConnected, setIsAPIConnected] = useState(false); // Explicit connection state
  const [showAPIKeyInput, setShowAPIKeyInput] = useState(false);
  // expandedSample and showPromptEditor moved to PreviewPage to prevent full re-renders
  // API Settings state
	const [apiSettings, setApiSettings] = useState({
	  provider: 'openai' as 'openai' | 'gemini' | 'claude' | 'deepseek' | 'groq' | 'openrouter',
	  openAIKey: '',
	  geminiKey: '',
	  claudeKey: '',
	  deepseekKey: '',
	  groqKey: '',
	  openrouterKey: '',
	  isConnected: false,
	  modelName: 'gpt-5-nano',
	  maxTokens: 1000
	});
	const [isSavingAPI, setIsSavingAPI] = useState(false);
  
  // Speaking evaluation state
  const [speakingTranscript, setSpeakingTranscript] = useState('');
  const [speakingEvaluation, setSpeakingEvaluation] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  // selectedComparisonOption and speakingStage moved to PreviewPage local state
  
  // Default system prompt for Writing AI evaluation
  const defaultSystemPrompt = `You are a CELPIP Writing examiner. Evaluate the response based on CELPIP scoring criteria (0-12 scale).

CELPIP Writing Scoring Criteria:
- Content/Coherence (Task fulfillment, organization, coherence)
- Vocabulary (Range, accuracy, appropriateness)
- Readability (Grammar, sentence structure)
- Task Fulfillment (Following instructions, word count)

Score Levels:
- 10-12: Advanced proficiency, native-like fluency
- 7-9: Adequate to good proficiency
- 4-6: Developing proficiency
- 0-3: Minimal proficiency

Provide your evaluation in JSON format:
{
  "overallScore": <number 0-12>,
  "breakdown": {
    "contentCoherence": <number 0-12>,
    "vocabulary": <number 0-12>,
    "readability": <number 0-12>,
    "taskFulfillment": <number 0-12>
  },
  "wordCount": <number>,
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"],
  "detailedFeedback": "<2-3 sentences of specific feedback>"
}`;
  
  const [formData, setFormData] = useState({
    title: '', description: '', skill: '', task: '', file: null, audioFile: null,
    materialType: 'complete',
    sections: [],
    transcripts: [],
    contextImage: null,
	  // ✅ ADD THIS
    instructions: '',
    videoFile: null,
    videoTranscript: null,
    answerKey: null,
    speakingImages: [],
    sectionAudios: [],
    sectionTranscripts: [],
    questionAudios: [],
    questionTranscripts: [],
	
	  // ✅ ADD THESE
  isMock: false,
  mockSet: 1,
  mockOrder: null
  
  
  
  });

  const skillTasks = {

    listening: [
      { id: 'part1', name: 'Part 1: Problem Solving', sections: 3, questions: 8, duration: '8-10 min', questionType: 'audio' },
      { id: 'part2', name: 'Part 2: Daily Life Conversation', sections: 1, questions: 5, duration: '5-7 min', questionType: 'audio' },
      { id: 'part3', name: 'Part 3: Information', sections: 1, questions: 6, duration: '6-8 min', questionType: 'audio' },
      { id: 'part4', name: 'Part 4: News Item', sections: 1, questions: 5, duration: '5-7 min', questionType: 'dropdown' },
      { id: 'part5', name: 'Part 5: Discussion', sections: 1, questions: 8, duration: '8-10 min', questionType: 'dropdown' },
      { id: 'part6', name: 'Part 6: View Points', sections: 1, questions: 6, duration: '6-8 min', questionType: 'dropdown' }
    ],
    reading: [
      { 
        id: 'part1', 
        name: 'Part 1: Reading Correspondence', 
        duration: '10 min',
        questions: 11,
        questionType: 'reading-mixed',
        // Q1-Q6: dropdown questions, Q7-Q11: paragraph fill-in-the-blank
        dropdownQuestions: 6,
        paragraphQuestions: 5
      },
      { 
        id: 'part2', 
        name: 'Part 2: Reading to Apply a Diagram', 
        duration: '8 min',
        questions: 8,
        questionType: 'reading-mixed',
        // Q1-Q5: paragraph fill-in-the-blank, Q6-Q8: dropdown questions
        paragraphQuestionsFirst: true,
        paragraphQuestions: 5,
        dropdownQuestions: 3
      },
      { 
        id: 'part3', 
        name: 'Part 3: Reading for Information', 
        duration: '9 min',
        questions: 9,
        questionType: 'reading-abcde',
        // All questions are paragraph blanks with fixed A, B, C, D, E options
        paragraphWithFixedOptions: true,
        fixedOptions: ['A', 'B', 'C', 'D', 'E']
      },
      { 
        id: 'part4', 
        name: 'Part 4: Reading for Viewpoints', 
        duration: '12 min',
        questions: 10,
        questionType: 'reading-mixed',
        // Q1-Q5: dropdown questions, Q6-Q10: paragraph fill-in-the-blank
        dropdownQuestions: 5,
        paragraphQuestions: 5
      }
    ],
    speaking: [
      { id: 'part1', name: 'Part 1: Giving Advice', hasImage: false },
      { id: 'part2', name: 'Part 2: Personal Experience', hasImage: false },
      { id: 'part3', name: 'Part 3: Describing a Scene', hasImage: true, imageCount: 1 },
      { id: 'part4', name: 'Part 4: Making Predictions', hasImage: true, imageCount: 1 },
      { id: 'part5', name: 'Part 5: Comparing and Persuading', hasImage: true, imageCount: 3 },
      { id: 'part6', name: 'Part 6: Difficult Situations', hasImage: false },
      { id: 'part7', name: 'Part 7: Expressing Opinions', hasImage: false },
      { id: 'part8', name: 'Part 8: Unusual Situation', hasImage: true, imageCount: 1 }
    ],
    writing: [
      { id: 'part1', name: 'Part 1: Writing an Email', questionType: 'writing', wordCount: '150-200' },
      { id: 'part2', name: 'Part 2: Survey Questions', questionType: 'writing', wordCount: '150-200' }
    ]
  };
  
  const speakingParts = [
  { id: 'part1', name: 'Part 1: Giving Advice' },
  { id: 'part2', name: 'Part 2: Personal Experience' },
  { id: 'part3', name: 'Part 3: Describing a Scene' },
  { id: 'part4', name: 'Part 4: Making Predictions' },
  { id: 'part5', name: 'Part 5: Comparing & Persuading' },
  { id: 'part6', name: 'Part 6: Difficult Situation' },
  { id: 'part7', name: 'Part 7: Expressing Opinions' },
  { id: 'part8', name: 'Part 8: Unusual Situation' }
];


  //const [materials, setMaterials] = useState(getInitialMaterials);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);



const [students, setStudents] = useState<any[]>([]);
const [studentsLoading, setStudentsLoading] = useState(false);
const [studentSearchQuery, setStudentSearchQuery] = useState("");

type StudentPlan = "basic" | "weekly" | "monthly" | "bimonthly" | "quarterly";
type TransactionStatus = "inactive" | "active" | "cancelled" | "expired" | "refunded";
type TransactionSource = "admin" | "stripe";

type StudentTransaction = {
  id: string;
  plan: StudentPlan;
  amount: string;
  paidAt: string;
  startAt: string;
  endAt: string;
  status: TransactionStatus;
  source: TransactionSource;
  note: string;
};

const PLAN_DAYS: Record<string, number> = {
  basic: 0,
  weekly: 7,
  monthly: 30,
  bimonthly: 60,
  quarterly: 90,
};

const PLAN_LABELS: Record<StudentPlan, string> = {
  basic: "Basic",
  monthly: "30 Days",
  bimonthly: "60 Days",
  quarterly: "90 Days",
};

const normalizePlan = (plan?: string | null): StudentPlan => {
  const p = (plan || "basic").toLowerCase();

  // temporary fallback for old saved data
  if (p === "weekly") return "weekly";
  if (p === "monthly") return "monthly";
  if (p === "bimonthly") return "bimonthly";
  if (p === "quarterly") return "quarterly";

  return "basic";
};

const [showStudentEditModal, setShowStudentEditModal] = useState(false);
const [editingStudent, setEditingStudent] = useState<any | null>(null);

const [showCreateUserModal, setShowCreateUserModal] = useState(false);
const [createUserForm, setCreateUserForm] = useState({
  name: "",
  email: "",
  password: "",
  role: "user",
  accountStatus: "active",
  emailVerified: true,
});
const [isCreatingUser, setIsCreatingUser] = useState(false);


const [studentForm, setStudentForm] = useState<{
  name: string;
  role: string;
  accountStatus: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionPaidAt: string;
  subscriptionStartAt: string;
  subscriptionEndAt: string;
  transactionHistory: StudentTransaction[];
}>({
  name: "",
  role: "user",
  accountStatus: "active",
  subscriptionPlan: "basic",
  subscriptionStatus: "inactive",
  subscriptionPaidAt: "",
  subscriptionStartAt: "",
  subscriptionEndAt: "",
  transactionHistory: [],
});


const normalizeTaskId = (skill: string, rawTaskId: any, title?: string) => {
  const skillKey = String(skill || "").trim().toLowerCase();
  const raw = String(rawTaskId || "").trim().toLowerCase();
  const titleText = String(title || "").trim().toLowerCase();

  const compact = raw.replace(/\s+/g, "");

  // direct task/part forms
  if (/^part\d+$/.test(compact)) return compact;
  if (/^task\d+$/.test(compact)) return compact.replace(/^task/, "part");

  // mock style ids like l_t1, r_t2, w_t1, s_t3
  const shortMatch = compact.match(/^[lrws]_t(\d+)$/i);
  if (shortMatch) return `part${shortMatch[1]}`;

  const text = `${compact} ${titleText}`;

  if (skillKey === "listening") {
    if (text.includes("problem")) return "part1";
    if (text.includes("daily") || text.includes("conversation")) return "part2";
    if (text.includes("information")) return "part3";
    if (text.includes("news")) return "part4";
    if (text.includes("discussion")) return "part5";
    if (text.includes("view")) return "part6";
  }

  if (skillKey === "reading") {
    if (text.includes("correspondence")) return "part1";
    if (text.includes("diagram")) return "part2";
    if (text.includes("information")) return "part3";
    if (text.includes("view")) return "part4";
  }

  if (skillKey === "writing") {
    if (text.includes("email")) return "part1";
    if (text.includes("survey")) return "part2";
  }

  if (skillKey === "speaking") {
    const partMatch = text.match(/\b(?:part|task)\s*(\d+)\b/);
    if (partMatch) return `part${partMatch[1]}`;
  }

  return compact || raw;
};

  // Load materials from IndexedDB on mount
// Load materials from Appwrite on mount
useEffect(() => {
  const loadMaterials = async () => {
    setIsLoading(true);

    try {
      console.log("Loading materials from Appwrite...");
      const data = await getMaterials();

      if (data.length > 0) {
const formattedMaterials = data.map((doc: any) => {
  const skill = String(doc.skill || "").trim().toLowerCase();

  let parsedUploadedFiles = {};
  try {
    parsedUploadedFiles =
      typeof doc.uploadedFiles === "string"
        ? JSON.parse(doc.uploadedFiles)
        : (doc.uploadedFiles || {});
  } catch (e) {
    console.error("uploadedFiles parse error for doc:", doc.$id, e);
    parsedUploadedFiles = {};
  }

  return {
    id: doc.$id,
    title: doc.title,
    skill,
    task: doc.task,
    taskId: normalizeTaskId(
      skill,
      doc.taskId ?? doc.task ?? doc.taskID ?? doc.task_id,
      doc.title
    ),
    type: doc.type,
    status: String(doc.status || "").trim(),
    date: doc.date,
    questions: Number(doc.questions || 0),
    description: doc.description || "",
    isMock:
      doc.isMock === true ||
      doc.isMock === "true" ||
      doc.isMock === 1 ||
      doc.isMock === "1",
    mockSet: doc.mockSet ?? null,
    mockOrder: doc.mockOrder ?? null,
    uploadedFiles: parsedUploadedFiles,
  };
});

        setMaterials(formattedMaterials);
      } else {
        setMaterials([]);
      }
    } catch (error) {
      console.error("Failed to load materials:", error);
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  };

  loadMaterials();
}, []);

// REPLACE lines 563-579 with this:
const loadStudents = async () => {
  setStudentsLoading(true);
  try {
    const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
      Query.limit(500),
      Query.orderDesc("$createdAt"),
    ]);

    setStudents(res.documents);
  } catch (error) {
    console.error("Failed to load students:", error);
    setStudents([]);
  } finally {
    setStudentsLoading(false);
  }
};
// ADD THIS ENTIRE BLOCK after line 579
const syncAuthUsers = async () => {
  if (!confirm("Sync Appwrite Auth users missing from the database?")) return;
  setStudentsLoading(true);
  try {
    // For each student already in DB, collect known IDs
    const knownIds = new Set(students.map((s: any) => s.$id));

    // You must have an Appwrite Function deployed that returns Auth users list
    // OR manually create DB docs here for known missing users
    alert("To fully sync, deploy the Appwrite Function described in the setup guide.\n\nFor now, use the Refresh button after creating users via this admin panel.");
    await loadStudents();
  } catch (err: any) {
    alert("Sync failed: " + err.message);
  } finally {
    setStudentsLoading(false);
  }
};

const handleCreateUser = async () => {
  if (!createUserForm.name.trim() || !createUserForm.email.trim() || !createUserForm.password.trim()) {
    alert("Name, email, and password are required.");
    return;
  }

  if (createUserForm.password.trim().length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  setIsCreatingUser(true);

  try {
const result = await createAdminUser({
      name: createUserForm.name.trim(),
      email: createUserForm.email.trim(),
      password: createUserForm.password.trim(),
      role: createUserForm.role,
      accountStatus: createUserForm.accountStatus,
      emailVerified: createUserForm.emailVerified,
    });

    alert(`User "${result.name}" created successfully!`);

    setShowCreateUserModal(false);
    setCreateUserForm({
      name: "", email: "", password: "",
      role: "user", accountStatus: "active", emailVerified: true,
    });

    // ✅ ADD THIS BLOCK — optimistic insert so the user shows up immediately
    setStudents(prev => [
      {
        $id: result.$id || result.userId || `temp-${Date.now()}`,
        $createdAt: new Date().toISOString(),
        name: createUserForm.name.trim(),
        email: createUserForm.email.trim(),
        role: createUserForm.role,
        accountStatus: createUserForm.accountStatus || "active",
        subscriptionPlan: "basic",
        subscriptionStatus: "inactive",
        subscriptionPaidAt: null,
        subscriptionStartAt: null,
        subscriptionEndAt: null,
        transactionHistory: "[]",
        presenceStatus: "offline",
        lastActivityAt: null,
        lastSeenAt: null,
      },
      ...prev,
    ]);

    // Wait briefly for Appwrite to propagate, then re-sync
    await new Promise(resolve => setTimeout(resolve, 800));
    await loadStudents();
  } catch (error: any) {
    console.error("Failed to create user:", error);
    alert("Failed to create user: " + (error?.message || "Unknown error"));
  } finally {
    setIsCreatingUser(false);
  }
};


  useEffect(() => {
    loadStudents();
  }, []);

const formatDateTime = (value?: string | null) => {
  if (!value) return <span>-</span>;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return <span>-</span>;

  return (
    <div className="leading-5">
      <div>{d.toLocaleDateString()}</div>
      <div className="text-xs text-gray-500">{d.toLocaleTimeString()}</div>
    </div>
  );
};

const prettifyPlan = (plan?: string | null) => {
  return PLAN_LABELS[normalizePlan(plan)];
};

const isProActive = (student: any) => {
  const plan = normalizePlan(student.subscriptionPlan);
  const endAtMs = student.subscriptionEndAt
    ? new Date(student.subscriptionEndAt).getTime()
    : null;

  return (
    plan !== "basic" &&
    student.subscriptionStatus === "active" &&
    (!endAtMs || endAtMs > Date.now())
  );
};

  const getSubscriptionState = (student: any) => {
    const endAtMs = student.subscriptionEndAt
      ? new Date(student.subscriptionEndAt).getTime()
      : null;

    if (student.subscriptionStatus === "active") {
      if (endAtMs && endAtMs <= Date.now()) return "Expired";
      return "Active";
    }

    return "Inactive";
  };
  
  
  
  
  const getPresenceState = (student: any) => {
  const explicitStatus = (student.presenceStatus || "offline").toLowerCase();
  const lastActivityMs = student.lastActivityAt
    ? new Date(student.lastActivityAt).getTime()
    : 0;

  if (!lastActivityMs) return "Offline";
  if (explicitStatus === "offline") return "Offline";

  const ageMs = Date.now() - lastActivityMs;

  if (ageMs <= 2 * 60 * 1000) return "Online";
  if (ageMs <= 10 * 60 * 1000) return "Away";

  return "Offline";
};

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const toIsoOrNull = (value?: string) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const createTransactionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const buildEndAtFromStart = (startAt: string, plan: StudentPlan) => {
  if (!startAt || plan === "basic") return "";
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + PLAN_DAYS[plan]);
  return toDateTimeLocal(d.toISOString());
};

const getUiSubscriptionStatusFromTransaction = (status: TransactionStatus) => {
  if (status === "active") return "active";
  if (status === "cancelled") return "cancelled";
  return "inactive";
};

const safeParseTransactionHistory = (value: any): StudentTransaction[] => {
  try {
    const raw = Array.isArray(value) ? value : typeof value === "string" ? JSON.parse(value) : [];
    if (!Array.isArray(raw)) return [];

    return raw.map((tx: any) => ({
      id: tx.id || createTransactionId(),
      plan: normalizePlan(tx.plan),
      amount: tx.amount || "",
      paidAt: tx.paidAt || "",
      startAt: tx.startAt || "",
      endAt: tx.endAt || "",
      status: (tx.status || "active") as TransactionStatus,
      source: tx.source === "stripe" ? "stripe" : "admin",
      note: tx.note || "",
    }));
  } catch {
    return [];
  }
};

const getLegacyTransactionFromStudent = (student: any): StudentTransaction[] => {
  const plan = normalizePlan(student.subscriptionPlan);

  if (
    plan === "basic" &&
    !student.subscriptionPaidAt &&
    !student.subscriptionStartAt &&
    !student.subscriptionEndAt
  ) {
    return [];
  }

  const paidAt = toDateTimeLocal(student.subscriptionPaidAt) || toDateTimeLocal(student.subscriptionStartAt) || "";
  const startAt = toDateTimeLocal(student.subscriptionStartAt) || paidAt;
  const endAt = toDateTimeLocal(student.subscriptionEndAt) || buildEndAtFromStart(startAt, plan);

  return [
    {
      id: createTransactionId(),
      plan,
      amount: "",
      paidAt,
      startAt,
      endAt,
      status: (student.subscriptionStatus || "inactive") as TransactionStatus,
      source: "admin",
      note: "Imported from old subscription fields",
    },
  ];
};

const getStudentTransactions = (student: any): StudentTransaction[] => {
  const parsed = safeParseTransactionHistory(student.transactionHistory);
  if (parsed.length > 0) return parsed;
  return getLegacyTransactionFromStudent(student);
};

const sortTransactionsNewestFirst = (transactions: StudentTransaction[]) => {
  return [...transactions].sort((a, b) => {
    const aTime = new Date(a.paidAt || a.startAt || 0).getTime();
    const bTime = new Date(b.paidAt || b.startAt || 0).getTime();
    return bTime - aTime;
  });
};

const getPrimaryTransaction = (transactions: StudentTransaction[]) => {
  const sorted = sortTransactionsNewestFirst(transactions);
  return sorted.find((tx) => tx.status === "active") || sorted[0] || null;
};

const applyTransactionsToForm = (
  transactions: StudentTransaction[],
  prev: typeof studentForm
) => {
  const ordered = sortTransactionsNewestFirst(transactions);
  const primary = getPrimaryTransaction(ordered);

  if (!primary) {
    return {
      ...prev,
      subscriptionPlan: "basic",
      subscriptionStatus: "inactive",
      subscriptionPaidAt: "",
      subscriptionStartAt: "",
      subscriptionEndAt: "",
      transactionHistory: [],
    };
  }

  return {
    ...prev,
    subscriptionPlan: primary.plan,
    subscriptionStatus: getUiSubscriptionStatusFromTransaction(primary.status),
    subscriptionPaidAt: primary.paidAt,
    subscriptionStartAt: primary.startAt,
    subscriptionEndAt: primary.endAt,
    transactionHistory: ordered,
  };
};

const createNewTransaction = (): StudentTransaction => {
  const now = toDateTimeLocal(new Date().toISOString());

  return {
    id: createTransactionId(),
    plan: "monthly",
    amount: "",
    paidAt: now,
    startAt: now,
    endAt: buildEndAtFromStart(now, "monthly"),
    status: "active",
    source: "admin",
    note: "",
  };
};

const openStudentEditor = (student: any) => {
  const transactions = getStudentTransactions(student);
  const primary = getPrimaryTransaction(transactions);

  setEditingStudent(student);
  setStudentForm({
    name: student.name || "",
    role: student.role || "user",
    accountStatus: student.accountStatus || "active",
    subscriptionPlan: primary?.plan || normalizePlan(student.subscriptionPlan),
    subscriptionStatus:
      primary?.status
        ? getUiSubscriptionStatusFromTransaction(primary.status)
        : student.subscriptionStatus || "inactive",
    subscriptionPaidAt: primary?.paidAt || toDateTimeLocal(student.subscriptionPaidAt),
    subscriptionStartAt: primary?.startAt || toDateTimeLocal(student.subscriptionStartAt),
    subscriptionEndAt: primary?.endAt || toDateTimeLocal(student.subscriptionEndAt),
    transactionHistory: sortTransactionsNewestFirst(transactions),
  });

  setShowStudentEditModal(true);
};

const addTransactionRow = () => {
  setStudentForm((prev) =>
    applyTransactionsToForm([...prev.transactionHistory, createNewTransaction()], prev)
  );
};

const updateTransactionRow = (
  transactionId: string,
  field: keyof StudentTransaction,
  value: string
) => {
  setStudentForm((prev) => {
    const updated = prev.transactionHistory.map((tx) => {
      if (tx.id !== transactionId) return tx;

      const next: StudentTransaction = {
        ...tx,
        [field]: value,
      } as StudentTransaction;

      if (field === "plan") {
        next.plan = normalizePlan(value);

        if (next.plan === "basic") {
          next.endAt = "";
        } else {
          const baseStart = next.startAt || next.paidAt || toDateTimeLocal(new Date().toISOString());
          next.startAt = baseStart;
          next.endAt = buildEndAtFromStart(baseStart, next.plan);
        }
      }

      if (field === "paidAt" && !next.startAt) {
        next.startAt = value;
      }

      if ((field === "paidAt" || field === "startAt") && next.plan !== "basic") {
        const baseStart = field === "startAt" ? value : next.startAt || value;
        next.startAt = baseStart;
        next.endAt = buildEndAtFromStart(baseStart, next.plan);
      }

      return next;
    });

    return applyTransactionsToForm(updated, prev);
  });
};

const removeTransactionRow = (transactionId: string) => {
  setStudentForm((prev) =>
    applyTransactionsToForm(
      prev.transactionHistory.filter((tx) => tx.id !== transactionId),
      prev
    )
  );
};

const saveStudentChanges = async () => {
  if (!editingStudent) return;

  try {
const originalTransactions = sortTransactionsNewestFirst(studentForm.transactionHistory || []);
const originalPrimary = getPrimaryTransaction(originalTransactions);

// Sync the top form values into the current primary transaction
const transactions = originalPrimary
  ? originalTransactions.map((tx) => {
      if (tx.id !== originalPrimary.id) return tx;

      return {
        ...tx,
        plan: normalizePlan(studentForm.subscriptionPlan),
        status: (studentForm.subscriptionStatus || "inactive") as TransactionStatus,
        paidAt: studentForm.subscriptionPaidAt || tx.paidAt,
        startAt: studentForm.subscriptionStartAt || tx.startAt,
        endAt: studentForm.subscriptionEndAt || tx.endAt,
      };
    })
  : originalTransactions;

const primary = getPrimaryTransaction(transactions);

const resolvedPlan = normalizePlan(primary?.plan || studentForm.subscriptionPlan);
const resolvedStatus = primary
  ? getUiSubscriptionStatusFromTransaction(primary.status)
  : studentForm.subscriptionStatus;

// Auto-fill missing dates when subscription is active but dates are empty
const nowIso = new Date().toISOString();
const resolvedStartAt =
  toIsoOrNull(studentForm.subscriptionStartAt || primary?.startAt) ||
  (resolvedStatus === "active" ? nowIso : null);

const resolvedPaidAt =
  toIsoOrNull(studentForm.subscriptionPaidAt || primary?.paidAt) ||
  resolvedStartAt;

const resolvedEndAt =
  toIsoOrNull(studentForm.subscriptionEndAt || primary?.endAt) ||
  (resolvedStartAt && resolvedPlan !== "basic"
    ? (() => {
        const d = new Date(resolvedStartAt);
        d.setDate(d.getDate() + PLAN_DAYS[resolvedPlan]);
        return d.toISOString();
      })()
    : null);

await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, editingStudent.$id, {
      name: studentForm.name.trim(),
      role: studentForm.role,
      accountStatus: studentForm.accountStatus,
      subscriptionPlan: resolvedPlan,
      subscriptionStatus: resolvedStatus,
      subscriptionPaidAt: resolvedPaidAt,
      subscriptionStartAt: resolvedStartAt,
      subscriptionEndAt: resolvedEndAt,
      transactionHistory: JSON.stringify(transactions),
    });

    // ✅ ADD THIS BLOCK — optimistic local update
    setStudents(prev =>
      prev.map(s =>
        s.$id === editingStudent.$id
          ? {
              ...s,
              name: studentForm.name.trim(),
              role: studentForm.role,
              accountStatus: studentForm.accountStatus,
              subscriptionPlan: resolvedPlan,
              subscriptionStatus: resolvedStatus,
              subscriptionPaidAt: resolvedPaidAt,
              subscriptionStartAt: resolvedStartAt,
              subscriptionEndAt: resolvedEndAt,
              transactionHistory: JSON.stringify(transactions),
            }
          : s
      )
    );

setShowStudentEditModal(false);
    setEditingStudent(null);
  } catch (error) {
    console.error("Failed to update student:", error);
    alert("Failed to update student. Make sure transactionHistory exists in Appwrite.");
  }
};

const handleDeleteStudent = async (student: any) => {
  if (!confirm(`Delete "${student.name}" (${student.email})? This cannot be undone.`)) return;
  try {
    // Delete DB document
    await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION_ID, student.$id);

    // Also delete from Appwrite Auth so email can be reused
    await fetch(
      `${import.meta.env.VITE_APPWRITE_ENDPOINT}/users/${student.$id}`,
      {
        method: "DELETE",
        headers: {
          "X-Appwrite-Project": import.meta.env.VITE_APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": import.meta.env.VITE_APPWRITE_API_KEY,
        },
      }
    );

    setStudents(prev => prev.filter(s => s.$id !== student.$id));
} catch (error: any) {
    console.error("Delete error:", error);
    alert("Failed to delete student: " + (error?.message || "Unknown error"));
  }
};
  
const dashboardStats = [
  {
    label: "Total Students",
    value: studentsLoading
      ? "..."
      : students.filter(
          (student: any) => (student.role || "user").toLowerCase() !== "admin"
        ).length,
    icon: Users,
  },
  {
    label: "Practice Tests",
    value: materials.length,
    icon: FileText,
  },
  {
    label: "Active Pro Members",
    value: studentsLoading
      ? "..."
      : students.filter(
          (student: any) =>
            (student.role || "user").toLowerCase() !== "admin" && isProActive(student)
        ).length,
    icon: Award,
  },
  {
    label: "Online Users",
    value: studentsLoading
      ? "..."
      : students.filter(
          (student: any) =>
            (student.role || "user").toLowerCase() !== "admin" &&
            getPresenceState(student) === "Online"
        ).length,
    icon: TrendingUp,
  },
];
  // Save materials to IndexedDB whenever they change (after initial load)
  //useEffect(() => {
    //if (!dbInitialized) return; // Don't save during initial load
    
   // const saveMaterials = async () => {
    //  const success = await saveToIndexedDB(materials);
    //  if (success) {
    //    console.log('✓ Auto-saved to IndexedDB');
   //   }
   // };
//    saveMaterials();
 // }, [materials, dbInitialized]);
// Helper function for speaking part count
const getSpeakingPartCount = (partId, isMock = false) => {
  return materials.filter(m => 
    m.skill === 'speaking' && 
    m.taskId === partId && 
    (isMock ? m.isMock === true : m.isMock !== true)
  ).length;
};

// Get total speaking practice count
const getSpeakingPracticeCount = () => {
  return materials.filter(m => m.skill === 'speaking' && m.isMock !== true).length;
};

  const resetFormData = () => {
    setFormData({
      title: '', description: '', skill: '', task: '', file: null, audioFile: null,
      materialType: 'complete',
      sections: [],
      transcripts: [],
      contextImage: null,
	  // ✅ ADD THIS
	  instructions: '',
	  isMock: false,
	mockSet: 1,
	mockOrder: null,


      videoFile: null,
      videoTranscript: null,
      answerKey: null,
      speakingImages: [],
      sectionAudios: [],
      sectionTranscripts: [],
      questionAudios: [],
      questionTranscripts: [],
      questionAnswers: [],
    });
  };

// Load API settings from localStorage on mount
// Load API settings from database on mount
useEffect(() => {
  const loadAPISettings = async () => {
    try {
      const settings = await getAPISettings();
      setApiSettings(settings);
      if (settings.isConnected) {
        const activeKey = settings.provider === 'gemini' ? settings.geminiKey
          : settings.provider === 'claude' ? settings.claudeKey
          : settings.provider === 'deepseek' ? settings.deepseekKey
          : settings.provider === 'groq' ? settings.groqKey
          : settings.provider === 'openrouter' ? settings.openrouterKey
          : settings.openAIKey;
        setOpenAIKey(activeKey || '');
        setIsAPIConnected(true);
      }
    } catch (e) {
      console.error('Error loading API settings:', e);
    }
  };
  loadAPISettings();
}, []);

// Save API settings function
// Save API settings function - saves to database
const saveAPISettings = async (newSettings) => {
  setIsSavingAPI(true);
  try {
    // Pick the active key based on selected provider
    const activeKey =
      newSettings.provider === 'gemini' ? newSettings.geminiKey
      : newSettings.provider === 'claude' ? newSettings.claudeKey
      : newSettings.provider === 'deepseek' ? newSettings.deepseekKey
      : newSettings.provider === 'groq' ? newSettings.groqKey
      : newSettings.provider === 'openrouter' ? newSettings.openrouterKey
      : newSettings.openAIKey;

    if (!activeKey) throw new Error('Please enter an API key');

    const isValid = await testAPIKey(activeKey, newSettings.provider, newSettings.modelName);
    if (!isValid) throw new Error(`Invalid ${newSettings.provider} API key`);

    const settingsToSave = { ...newSettings, isConnected: true };
    const success = await saveAPISettingsToDB(settingsToSave);
    if (!success) throw new Error('Failed to save to database');

    setApiSettings(settingsToSave);
    setOpenAIKey(activeKey);
    setIsAPIConnected(true);

    alert('API settings saved! All users can now use Speaking scoring.');
    return true;
  } catch (error) {
    console.error('API save error:', error);
    alert('Failed to save API settings: ' + error.message);
    return false;
  } finally {
    setIsSavingAPI(false);
  }
};

// Disconnect API
// Disconnect API - updates database
const disconnectAPI = async () => {
  if (window.confirm('Are you sure you want to disconnect the API? Users will not be able to score their Speaking tests.')) {
    try {
      const success = await disconnectAPIFromDB();
      if (success) {
        setApiSettings({
          provider: 'openai',
          openAIKey: '',
          geminiKey: '',
          claudeKey: '',
          deepseekKey: '',
          groqKey: '',
          openrouterKey: '',
          isConnected: false,
          modelName: 'gpt-4o-mini',
          maxTokens: 1000
        });
        setOpenAIKey('');
        setIsAPIConnected(false);
        alert('API disconnected.');
      } else {
        alert('Failed to disconnect API. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting API:', error);
      alert('Error disconnecting API.');
    }
  }
};

// ✅ Next Mock number = (max mockSet) + 1
const getNextMockSet = () => {
  const used = materials
    .filter((m) => m.isMock === true)
    .map((m) => Number(m.mockSet) || 0);

  const maxUsed = used.length ? Math.max(...used) : 0;
  return Math.min(maxUsed + 1, MOCK_SET_MAX);
};

const openUploadModal = (
  skill = '',
  taskId = '',
  isMock = false,
  mockSet?: number
) => {
  resetFormData();

  const resolvedMockSet = isMock ? (mockSet ?? getNextMockSet()) : 1;

  setFormData((prev) => ({
    ...prev,
    skill,
    task: taskId,
    isMock,
    mockSet: resolvedMockSet,
    mockOrder: null,
  }));

  setEditingMaterial(null);
  setShowUploadModal(true);
};




const openEditModal = async (material) => {
  setEditingMaterial(material);

  // Fetch full material (includes uploadedFiles) before opening modal
  const fullMaterial = await getMaterialById(material.id);
  const files = fullMaterial?.uploadedFiles
    ? (typeof fullMaterial.uploadedFiles === 'string'
        ? JSON.parse(fullMaterial.uploadedFiles)
        : fullMaterial.uploadedFiles)
    : {};

  setFormData({
    title: material.title,
    description: material.description || '',
    skill: material.skill,
    task: material.taskId || '',
    file: files.file || null,
    audioFile: null,
    materialType: 'complete',
    sections: [],
    transcripts: [],
    contextImage: files.contextImage || null,
    instructions: files.instructions || '',
    isMock: material.isMock === true,
    mockSet: material.mockSet ?? 1,
    mockOrder: material.mockOrder ?? null,
    videoFile: files.videoFile || null,
    videoTranscript: files.videoTranscript || null,
    answerKey: files.answerKey || null,
    speakingImages: files.speakingImages || [],
    sectionAudios: files.sectionAudios || [],
    sectionTranscripts: files.sectionTranscripts || [],
    questionAudios: files.questionAudios || [],
    questionTranscripts: files.questionTranscripts || [],
    questionAnswers: files.questionAnswers || [],
    paragraphText: files.paragraphText || '',
    writingPrompt: files.writingPrompt || '',
    sampleBasic: files.sampleBasic || '',
    sampleGood: files.sampleGood || '',
    sampleExcellent: files.sampleExcellent || '',
    speakingPrompt: files.speakingPrompt || '',
    recordingTime: files.recordingTime || '90',
    speakingSampleBasic: files.speakingSampleBasic || '',
    speakingSampleGood: files.speakingSampleGood || '',
    speakingSampleExcellent: files.speakingSampleExcellent || '',
    optionATitle: files.optionATitle || '',
    optionADetails: files.optionADetails || '',
    optionBTitle: files.optionBTitle || '',
    optionBDetails: files.optionBDetails || '',
    optionCTitle: files.optionCTitle || '',
    optionCDetails: files.optionCDetails || '',
    optionCLabel: files.optionCLabel || 'Your Family',
    selectionPrompt: files.selectionPrompt || '',
    comparisonPrompt: files.comparisonPrompt || ''
  });
  setShowUploadModal(true);
};

 const openViewModal = async (material) => {
  const fullMaterial = await getMaterialById(material.id);
  const files = fullMaterial?.uploadedFiles
    ? (typeof fullMaterial.uploadedFiles === 'string'
        ? JSON.parse(fullMaterial.uploadedFiles)
        : fullMaterial.uploadedFiles)
    : {};
  setViewingMaterial({ ...material, uploadedFiles: files });
  setShowViewModal(true);
};

// AFTER:
const openPreviewPage = async (material) => {
  const fullMaterial = await getMaterialById(material.id);
  const files = fullMaterial?.uploadedFiles
    ? (typeof fullMaterial.uploadedFiles === 'string'
        ? JSON.parse(fullMaterial.uploadedFiles)
        : fullMaterial.uploadedFiles)
    : {};
  setPreviewMaterial({ ...material, uploadedFiles: files });
  setShowPreviewPage(true);
  setPreviewViewMode('sections');
  setWritingResponse('');
  setWritingEvaluation(null);
  setSelectedWritingOption(null);
  setSpeakingTranscript('');
  setSpeakingEvaluation(null);
  setAudioBlob(null);
  setRemainingAttempts(3);
  setRecordingTime(0);
};

  const togglePublishStatus = async (materialId) => {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    const newStatus = material.status === 'Published' ? 'Draft' : 'Published';
    
    try {
      await updateMaterial(materialId, { status: newStatus });
      
      setMaterials(materials.map(m => {
        if (m.id === materialId) {
          return { ...m, status: newStatus };
        }
        return m;
      }));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  // ── Universal AI chat helper (routes to correct provider) ──────────────────
  const callAIChat = async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const provider = apiSettings?.provider || 'openai';
    const model = apiSettings?.modelName || 'gpt-5-nano';
    const key = openAIKey;

    if (provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
          })
        }
      );
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Gemini API error'); }
      const d = await res.json();
      return d.candidates[0].content.parts[0].text;
    }

    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Claude API error'); }
      const d = await res.json();
      return d.content[0].text;
    }

    // Groq — OpenAI-compatible format
    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          temperature: 0.3,
          max_tokens: 1000
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Groq API error'); }
      const d = await res.json();
      return d.choices[0].message.content;
    }

    // OpenRouter — OpenAI-compatible format
    if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'CELPIP Admin'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          temperature: 0.3,
          max_tokens: 1000
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'OpenRouter API error'); }
      const d = await res.json();
      return d.choices[0].message.content;
    }

    // OpenAI or DeepSeek (same format)
    const endpoint = provider === 'deepseek'
      ? 'https://api.deepseek.com/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API request failed'); }
    const d = await res.json();
    return d.choices[0].message.content;
  };

  // ── Universal transcription helper ──────────────────────────────────────────
  const transcribeWithProvider = async (blob: Blob, mimeType: string): Promise<string | null> => {
    const provider = apiSettings?.provider || 'openai';

    if (provider === 'gemini') {
      // Gemini multimodal audio transcription
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      const audioMime = mimeType.includes('webm') ? 'audio/webm' : 'audio/mp4';
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${openAIKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Transcribe this audio recording accurately. Return only the transcription text, nothing else.' },
                { inline_data: { mime_type: audioMime, data: base64 } }
              ]
            }]
          })
        }
      );
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Gemini transcription failed'); }
      const d = await res.json();
      return d.candidates[0].content.parts[0].text;
    }

    if (provider === 'claude' || provider === 'deepseek' || provider === 'openrouter') {
      alert('Audio transcription is only supported with OpenAI, Groq, or Google Gemini. Please switch your provider in API Settings.');
      return null;
    }

    // Groq Whisper (same API as OpenAI)
    if (provider === 'groq') {
      const formData = new FormData();
      const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
      formData.append('file', blob, `recording.${ext}`);
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'en');
      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openAIKey}` },
        body: formData
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Groq transcription failed'); }
      const d = await res.json();
      return d.text;
    }

    // OpenAI Whisper
    const formData = new FormData();
    const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
    formData.append('file', blob, `recording.${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAIKey}` },
      body: formData
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Transcription failed'); }
    const d = await res.json();
    return d.text;
  };

  // Writing Evaluation Function
  const evaluateWriting = async (prompt, response, sampleAnswers, customPrompt = '', selectedOption = null) => {
    if (!isAPIConnected || !openAIKey) {
      alert('Please connect an AI provider API key first in API Settings');
      return;
    }

    setIsEvaluating(true);
    setWritingEvaluation(null);

    try {
      // Use custom prompt if provided, otherwise use default
      const systemPrompt = customPrompt || defaultSystemPrompt;

      // Build user prompt with optional selected option for Part 2
      let userPrompt = `Writing Task:
${prompt}

Student's Response (${response.split(/\s+/).filter(w => w).length} words):
${response}`;

      // Add selected option context for Survey Questions (Part 2)
      if (selectedOption) {
        userPrompt += `

Note: This is a survey-style question where the student chose to support Option ${selectedOption}. 
Evaluate whether the student:
1. Clearly stated their chosen option (Option ${selectedOption})
2. Provided relevant reasons to support their choice
3. Used appropriate examples or explanations
4. Maintained a clear position throughout the response`;
      }

      userPrompt += `

${sampleAnswers ? `Reference Sample Answers for context:
Basic Level: ${sampleAnswers.basic || 'N/A'}
Good Level: ${sampleAnswers.good || 'N/A'}
Excellent Level: ${sampleAnswers.excellent || 'N/A'}` : ''}

Please evaluate the student's response and provide scores and feedback in JSON format.`;

      const content = await callAIChat(systemPrompt, userPrompt);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        setWritingEvaluation(evaluation);
      } else {
        throw new Error('Could not parse evaluation response');
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      setWritingEvaluation({
        error: true,
        message: error.message || 'Failed to evaluate writing. Please check your API key and try again.'
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Default system prompt for Speaking AI evaluation
  const defaultSpeakingSystemPrompt = `You are a CELPIP Speaking examiner. Evaluate the spoken response transcript based on CELPIP scoring criteria (0-12 scale).

CELPIP Speaking Scoring Criteria:
- Content/Coherence (Task fulfillment, organization, coherence, relevance)
- Vocabulary (Range, accuracy, appropriateness for the context)
- Listenability (Grammar, sentence structure, clarity of expression)
- Task Fulfillment (Following instructions, addressing all aspects of the task)

Score Levels:
- 10-12: Advanced proficiency, native-like fluency
- 7-9: Adequate to good proficiency
- 4-6: Developing proficiency
- 0-3: Minimal proficiency

Provide your evaluation in JSON format:
{
  "overallScore": <number 0-12>,
  "breakdown": {
    "contentCoherence": <number 0-12>,
    "vocabulary": <number 0-12>,
    "listenability": <number 0-12>,
    "taskFulfillment": <number 0-12>
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<area 1>", "<area 2>"],
  "detailedFeedback": "<2-3 sentences of specific feedback>"
}`;

  // Speaking Evaluation Function
  const evaluateSpeaking = async (prompt, transcript, sampleAnswers, customPrompt = '') => {
    if (!isAPIConnected || !openAIKey) {
      alert('Please connect an AI provider API key first in API Settings');
      return;
    }

    setIsEvaluating(true);
    setSpeakingEvaluation(null);

    try {
      const systemPrompt = customPrompt || defaultSpeakingSystemPrompt;

      const userPrompt = `Speaking Task:
${prompt}

Student's Spoken Response (Transcript):
${transcript}

${sampleAnswers ? `Reference Sample Answers for context:
Basic Level: ${sampleAnswers.basic || 'N/A'}
Good Level: ${sampleAnswers.good || 'N/A'}
Excellent Level: ${sampleAnswers.excellent || 'N/A'}` : ''}

Please evaluate the student's spoken response and provide scores and feedback in JSON format.`;

      const content = await callAIChat(systemPrompt, userPrompt);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        setSpeakingEvaluation(evaluation);
      } else {
        throw new Error('Could not parse evaluation response');
      }
    } catch (error) {
      console.error('Speaking evaluation error:', error);
      setSpeakingEvaluation({
        error: true,
        message: error.message || 'Failed to evaluate speaking. Please check your API key and try again.'
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Transcribe audio using provider-aware transcription
  const transcribeAudio = async (audioBlob) => {
    if (!isAPIConnected || !openAIKey) {
      alert('Please connect an AI provider API key first in API Settings');
      return null;
    }

    setIsTranscribing(true);
    try {
      const mimeType = audioBlob.type || 'audio/webm';
      return await transcribeWithProvider(audioBlob, mimeType);
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio: ' + error.message);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  // Helper function to convert File object to serializable format with data

const serializeFile = async (file) => {
  if (!file) return null;
  
  // If already serialized (has name and size as strings), return as is
// If already serialized (has name and size as strings) AND has data or storageUrl, return as is
  // If data is null/missing, we need to re-upload
  if (file.name && typeof file.size === 'string' && !file.type) {
    // Only return as-is if it actually has data or storageUrl
    if (file.data || file.storageUrl) {
      return file;
    }
    // Otherwise, data is missing - return null so user knows to re-upload
    console.warn('File missing data, needs re-upload:', file.name);
    return file; // Still return metadata so user sees the filename
  }
  
  // If it's a File object
  if (file instanceof File) {
    const fileSizeInMB = file.size / (1024 * 1024);
    const fileSizeInKB = file.size / 1024;
    
    // Determine if this is an audio/video file that should ALWAYS go to storage
    const isAudioOrVideo = file.type?.startsWith('audio/') || file.type?.startsWith('video/');
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type?.startsWith('image/');
    
    // Upload to Appwrite Storage if:
    // - ANY audio/video file (regardless of size) - these are too large for document storage
    // - Any file larger than 500KB (Appwrite document limit is ~1MB, but JSON encoding adds overhead)
    // - Images larger than 200KB
    const shouldUseStorage = isAudioOrVideo || isPDF || isImage || fileSizeInKB > 500;

    
    if (shouldUseStorage && BUCKET_ID) {
      try {
        console.log(`Uploading file to storage: ${file.name} (${fileSizeInMB > 1 ? fileSizeInMB.toFixed(1) + ' MB' : fileSizeInKB.toFixed(1) + ' KB'})`);
        
        const uploadedFile = await storage.createFile(
          BUCKET_ID,
          'unique()', // Auto-generate ID
          file
        );
        
        // Get the file URL
        //const fileUrl = storage.getFileView(BUCKET_ID, uploadedFile.$id);
		const fileUrl = `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${uploadedFile.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
        
        console.log(`✓ File uploaded successfully: ${file.name} -> ${uploadedFile.$id}`);
        
        return {
          name: file.name,
          size: fileSizeInMB > 1 
            ? `${fileSizeInMB.toFixed(1)} MB`
            : `${fileSizeInKB.toFixed(1)} KB`,
          type: file.type,
          storageId: uploadedFile.$id, // Store the file ID
          //storageUrl: fileUrl.href,     // Store the URL for playback
		  storageUrl: fileUrl,     // Store the URL for playback
          data: null // No base64 data - file is in storage
        };
      } catch (error) {
        console.error('Failed to upload to storage:', error);
        // Fall through to base64 method as fallback for very small files
      }
    }
    
    // For very small files only (< 500KB non-audio), use base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      const timeout = setTimeout(() => {
        reader.abort();
        console.error('File read timeout for:', file.name);
        resolve({
          name: file.name,
          size: fileSizeInMB > 1 
            ? `${fileSizeInMB.toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type,
          data: null
        });
      }, 30000);
      
      reader.onload = () => {
        clearTimeout(timeout);
        resolve({
          name: file.name,
          size: fileSizeInMB > 1 
            ? `${fileSizeInMB.toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type,
          data: reader.result
        });
      };
      reader.onerror = () => {
        clearTimeout(timeout);
        console.error('Error reading file:', file.name, reader.error);
        resolve({
          name: file.name,
          size: fileSizeInMB > 1 
            ? `${fileSizeInMB.toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type,
          data: null
        });
      };
      reader.readAsDataURL(file);
    });
  }
  
  return file;
};

  const serializeFiles = async (files) => {
    if (!files || !Array.isArray(files)) return [];
    const serialized = await Promise.all(
      files.filter(f => f).map(f => serializeFile(f))
    );
    return serialized.filter(f => f);
  };

  const handleUploadWithFiles = async (localFiles = {}) => {
    if (!formData.skill || !formData.task || !formData.title) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedTask = skillTasks[formData.skill].find(t => t.id === formData.task);
	if (
  formData.skill === "reading" &&
  formData.task === "part1" &&
  formData.file &&
  formData.file.type !== "text/plain"
) {
  alert("For Reading Part 1: Reading Correspondence, please upload a .txt file only.");
  return;
}

    // Use localFiles passed from the modal, falling back to formData
    const sectionAudios = localFiles.sectionAudios || formData.sectionAudios || [];
    let sectionTranscripts = localFiles.sectionTranscripts || formData.sectionTranscripts || [];
    const questionAudios = localFiles.questionAudios || formData.questionAudios || [];
    const questionTranscripts = localFiles.questionTranscripts || formData.questionTranscripts || [];
    const speakingImages = localFiles.speakingImages || formData.speakingImages || [];
    const questionAnswers = localFiles.questionAnswers || formData.questionAnswers || [];
    const paragraphText = localFiles.paragraphText || formData.paragraphText || '';
    // Writing fields
    const writingPrompt = localFiles.writingPrompt || formData.writingPrompt || '';
    const sampleBasic = localFiles.sampleBasic || formData.sampleBasic || '';
    const sampleGood = localFiles.sampleGood || formData.sampleGood || '';
    const sampleExcellent = localFiles.sampleExcellent || formData.sampleExcellent || '';
    // Speaking fields
    const speakingPrompt = localFiles.speakingPrompt || formData.speakingPrompt || '';
    const recordingTime = localFiles.recordingTime || formData.recordingTime || '90';
    const speakingSampleBasic = localFiles.speakingSampleBasic || formData.speakingSampleBasic || '';
    const speakingSampleGood = localFiles.speakingSampleGood || formData.speakingSampleGood || '';
    const speakingSampleExcellent = localFiles.speakingSampleExcellent || formData.speakingSampleExcellent || '';
    // Speaking Part 5 fields
    const optionATitle = localFiles.optionATitle || formData.optionATitle || '';
    const optionADetails = localFiles.optionADetails || formData.optionADetails || '';
    const optionBTitle = localFiles.optionBTitle || formData.optionBTitle || '';
    const optionBDetails = localFiles.optionBDetails || formData.optionBDetails || '';
    const optionCTitle = localFiles.optionCTitle || formData.optionCTitle || '';
    const optionCDetails = localFiles.optionCDetails || formData.optionCDetails || '';
    const optionCLabel = localFiles.optionCLabel || formData.optionCLabel || 'Your Family';
    const selectionPrompt = localFiles.selectionPrompt || formData.selectionPrompt || '';
    const comparisonPrompt = localFiles.comparisonPrompt || formData.comparisonPrompt || '';
	
	// ✅ ADD THIS LINE HERE
	const instructions = localFiles.instructions || formData.instructions || '';
	const contextImage = localFiles.contextImage ?? formData.contextImage ?? null;

if (
  formData.skill === "reading" &&
  formData.task === "part1" &&
  (!sectionTranscripts || sectionTranscripts.length === 0) &&
  (localFiles.file || formData.file)
) {
  sectionTranscripts = [localFiles.file || formData.file];
}

    console.log('=== FILES TO SERIALIZE ===');
    console.log('Section Audios:', sectionAudios.length, sectionAudios);
    console.log('Question Audios:', questionAudios.length, questionAudios);
    console.log('Question Answers:', questionAnswers.length, questionAnswers);
    console.log('Paragraph Text:', paragraphText ? 'Present' : 'Empty');
    console.log('Writing Prompt:', writingPrompt ? 'Present' : 'Empty');
    console.log('Speaking Prompt:', speakingPrompt ? 'Present' : 'Empty');

    // Serialize file data (with actual file content)
    const serializedUploadedFiles = {
      file: await serializeFile(formData.file),
	  
	  // ✅ ADD THIS
      instructions: instructions || '',
  
      contextImage: await serializeFile(contextImage),

      videoFile: await serializeFile(formData.videoFile),
      videoTranscript: await serializeFile(formData.videoTranscript),
      answerKey: await serializeFile(formData.answerKey),
      speakingImages: await serializeFiles(speakingImages),
      sectionAudios: await serializeFiles(sectionAudios),
      sectionTranscripts: await serializeFiles(sectionTranscripts),
      questionAudios: await serializeFiles(questionAudios),
      questionTranscripts: await serializeFiles(questionTranscripts),
      // Keep question answers - filter to only include arrays that have at least one non-empty option
      questionAnswers: questionAnswers.map((arr, idx) => {
        if (arr && Array.isArray(arr) && arr.some(opt => opt && opt.trim())) {
          console.log(`Question ${idx + 1} answers:`, arr);
          return arr;
        }
        return null;
      }).filter(arr => arr !== null),
      // Store paragraph text for fill-in-the-blank questions
      paragraphText: paragraphText || '',
      // Writing fields
      writingPrompt: writingPrompt || '',
      sampleBasic: sampleBasic || '',
      sampleGood: sampleGood || '',
      sampleExcellent: sampleExcellent || '',
      // Speaking fields
      speakingPrompt: speakingPrompt || '',
      recordingTime: recordingTime || '90',
      speakingSampleBasic: speakingSampleBasic || '',
      speakingSampleGood: speakingSampleGood || '',
      speakingSampleExcellent: speakingSampleExcellent || '',
      // Speaking Part 5 fields
      optionATitle: optionATitle || '',
      optionADetails: optionADetails || '',
      optionBTitle: optionBTitle || '',
      optionBDetails: optionBDetails || '',
      optionCTitle: optionCTitle || '',
      optionCDetails: optionCDetails || '',
      optionCLabel: optionCLabel || 'Your Family',
	  selectionPrompt: selectionPrompt || '',
	  comparisonPrompt: comparisonPrompt || '',
	  instructions: instructions || ''

    };

    // Remove null/empty values (but be careful with questionAnswers)
    Object.keys(serializedUploadedFiles).forEach(key => {
      const value = serializedUploadedFiles[key];
      if (value === null || value === undefined) {
        delete serializedUploadedFiles[key];
      } else if (Array.isArray(value) && value.length === 0) {
        delete serializedUploadedFiles[key];
      }
    });
    
    // Debug log
    console.log('Serialized uploadedFiles:', serializedUploadedFiles);
    console.log('Question Audios serialized:', serializedUploadedFiles.questionAudios?.length || 0);
    console.log('Question Answers saved:', serializedUploadedFiles.questionAnswers);
    
    // Estimate storage size (just for logging)
    const testSize = JSON.stringify(serializedUploadedFiles).length;
    console.log(`File data size: ${(testSize / 1024 / 1024).toFixed(2)} MB`);

if (editingMaterial) {
  // UPDATE existing material in Appwrite
  try {
    const dataToUpdate = {
      title: formData.title,
      description: formData.description || '',
      task: selectedTask?.name || formData.task,
      taskId: formData.task,
      uploadedFiles: JSON.stringify(serializedUploadedFiles),
	    // ✅ ADD THESE
  isMock: !!formData.isMock,
  mockSet: formData.isMock ? (formData.mockSet ?? 1) : null,
  mockOrder: formData.isMock ? (formData.mockOrder ?? null) : null,
    };
    
    // Check size before sending
    const dataSize = JSON.stringify(dataToUpdate).length;
    const dataSizeMB = dataSize / (1024 * 1024);
    console.log(`Data size to save: ${dataSizeMB.toFixed(2)} MB`);
    
    if (dataSizeMB > 15) {
      alert(`Error: Data size (${dataSizeMB.toFixed(1)} MB) exceeds Appwrite limit. Large video files must use Appwrite Storage. Please use a smaller video or contact support.`);
      return;
    }
    
    await updateMaterial(editingMaterial.id, dataToUpdate);
    
    // Update local state
    const updatedMaterials = materials.map(m => 
      m.id === editingMaterial.id 
        ? {
            ...m,
            title: formData.title,
            description: formData.description,
            task: selectedTask?.name || formData.task,
            taskId: formData.task,
            uploadedFiles: serializedUploadedFiles,
			isMock: !!formData.isMock,
mockSet: formData.isMock ? (formData.mockSet ?? 1) : null,
mockOrder: formData.isMock ? (formData.mockOrder ?? null) : null,
          }
        : m
    );
    setMaterials(updatedMaterials);
    alert('Material updated successfully!');
  } catch (error) {
    console.error('Error updating material:', error);
    alert(`Failed to update material: ${error.message || 'Unknown error. Check console.'}`);
    return;
  }
} else {
      // CREATE new material in Appwrite
      try {
        const dataToCreate = {
          title: formData.title,
          description: formData.description || '',
          skill: formData.skill,
          task: selectedTask?.name || formData.task,
          taskId: formData.task,
          type: 'Complete Test',
          status: 'Draft',
          date: new Date().toISOString().split('T')[0],
          downloads: 0,
          sections: selectedTask?.sections || 1,
          audioFiles: selectedTask?.sections || 1,
          questions: selectedTask?.questions || 0,
          uploadedFiles: JSON.stringify(serializedUploadedFiles),
		  
		    // ✅ ADD THESE
  isMock: !!formData.isMock,
  mockSet: formData.isMock ? (formData.mockSet ?? 1) : null,
  mockOrder: formData.isMock ? (formData.mockOrder ?? null) : null,
        };
        
        const created = await createMaterial(dataToCreate);
        
        if (created) {
          // Add to local state with Appwrite ID
          const newMaterial = {
            id: created.$id,
            ...dataToCreate,
            uploadedFiles: serializedUploadedFiles // Keep as object for local use
          };
          setMaterials([newMaterial, ...materials]);
          alert('Material uploaded as Draft! Review and publish when ready.');
        }
      } catch (error) {
        console.error('Error creating material:', error);
        alert('Failed to create material. Check console for details.');
        return;
      }
    }
    
    setShowUploadModal(false);
    setEditingMaterial(null);
    resetFormData();
  };

  // Wrapper for backward compatibility
  const handleUpload = () => handleUploadWithFiles({});

	const handleDelete = async (id) => {
	  if (window.confirm("Are you sure you want to delete this material?")) {
		const success = await deleteMaterial(id);
		if (success) {
		  setMaterials(prev => prev.filter(m => m.id !== id));
		}
	  }
	};

  // Function to reset all data (useful for testing)
  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear ALL materials? This cannot be undone.')) {
      await clearIndexedDB();
      setMaterials(getDefaultMaterials());
      alert('All data has been reset to defaults.');
    }
  };

  // Full Preview Page Component - Shows all content like a real test
  const PreviewPage = () => {
    if (!previewMaterial) return null;
    
    // Ref for scroll container to preserve scroll position
    const scrollContainerRef = useRef(null);
    
    // Get fresh data from materials array to ensure we have the latest
    const material = previewMaterial;
    const files = material.uploadedFiles || {};
	
    const isListening = material.skill === 'listening';
    const isSpeaking = material.skill === 'speaking';
    const isReading = material.skill === 'reading';
    const isWriting = material.skill === 'writing';
	
	// ------------------------------
	const getImageSrc = (img: any) => {
  if (!img) return "";

  // If saved directly as a string (base64 or URL)
  if (typeof img === "string") return img;

  // If saved as an object (your serializeFile output)
  if (typeof img === "object") {
    if (img.data) return img.data;                 // base64
    if (img.storageUrl) return img.storageUrl;     // Appwrite view url
    if (img.storageId) {
      // Optional fallback if storageUrl missing
      try {
        return storage.getFileView(BUCKET_ID, img.storageId).toString();
      } catch {
        return "";
      }
    }
  }

  return "";
};

    
    // Determine question type from task
    const taskInfo = skillTasks[material.skill]?.find(t => t.id === material.taskId);
    const isDropdownFormat = taskInfo?.questionType === 'dropdown' || 
                             taskInfo?.questionType === 'reading-mixed' || 
                             taskInfo?.questionType === 'reading-abcde';
    const isReadingFormat = taskInfo?.questionType === 'reading-mixed' || taskInfo?.questionType === 'reading-abcde';
    
    const [currentSection, setCurrentSection] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [showTranscript, setShowTranscript] = useState({});
    const [showAnswerKey, setShowAnswerKey] = useState(false);
    // viewMode is now from parent: previewViewMode, setPreviewViewMode
    const viewMode = previewViewMode;
    const setViewMode = setPreviewViewMode;
    const [selectedAnswers, setSelectedAnswers] = useState({});
    
    // Writing-specific local states (kept local to prevent parent re-renders)
    const [expandedSample, setExpandedSample] = useState(null);
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [customSystemPrompt, setCustomSystemPrompt] = useState('');
    // selectedOption uses parent state to persist across re-renders
    const selectedOption = selectedWritingOption;
    const setSelectedOption = setSelectedWritingOption;
    
    // Speaking Part 5 local states (kept local to prevent scroll jumps)
    const [localSelectedComparisonOption, setLocalSelectedComparisonOption] = useState(null);
    const [localSpeakingStage, setLocalSpeakingStage] = useState(1);
    const [localIsRecording, setLocalIsRecording] = useState(false);
    const [localRecordingTime, setLocalRecordingTime] = useState(0);
    const [localAudioBlob, setLocalAudioBlob] = useState(null);
    const [localSpeakingTranscript, setLocalSpeakingTranscript] = useState('');
    const [localSpeakingEvaluation, setLocalSpeakingEvaluation] = useState(null);
    const [localRemainingAttempts, setLocalRemainingAttempts] = useState(3);
    const [localIsTranscribing, setLocalIsTranscribing] = useState(false);
    
    // Check if this is Writing Part 2 (Survey Questions) which requires option selection
    const isWritingPart2 = isWriting && (material.taskId === 'part2' || material.task?.toLowerCase().includes('survey'));
    
    // Audio player state
    const [isPlaying, setIsPlaying] = useState({});
    const [audioProgress, setAudioProgress] = useState({});
    const [audioDuration, setAudioDuration] = useState({});
    
    const sectionAudios = files.sectionAudios || [];
    const sectionTranscripts = files.sectionTranscripts || [];
    const questionAudios = files.questionAudios || [];
    const questionTranscripts = files.questionTranscripts || [];
    const questionAnswers = files.questionAnswers || [];
    
    // Calculate total questions based on what's uploaded or the task definition
    // Use the max of question audios and question answers arrays
    const uploadedQuestionCount = Math.max(questionAudios.length, questionAnswers.length);
    const totalQuestions = uploadedQuestionCount > 0 ? uploadedQuestionCount : (material.questions || 8);
    
    // Debug log to help troubleshoot
    console.log('=== PREVIEW PAGE DEBUG ===');
    console.log('Material:', material.title);
    console.log('Task Info:', taskInfo);
    console.log('Is Dropdown Format:', isDropdownFormat);
    console.log('All files:', files);
    console.log('Section Audios:', sectionAudios.length, sectionAudios);
    console.log('Question Audios:', questionAudios.length, questionAudios);
    console.log('Question Answers:', questionAnswers.length, questionAnswers);
    console.log('Total Questions:', totalQuestions);
    console.log('Has question data:', questionAudios.length > 0 || questionAnswers.length > 0);
    
    // Default answer options if none provided
    const getAnswerOptions = (questionIdx) => {
      console.log(`Getting answers for question ${questionIdx}:`, questionAnswers[questionIdx]);
      if (questionAnswers[questionIdx] && Array.isArray(questionAnswers[questionIdx]) && questionAnswers[questionIdx].some(opt => opt && opt.trim())) {
        // Only return first 4 elements (options A, B, C, D) - not the 5th element (answer key)
        return questionAnswers[questionIdx].slice(0, 4);
      }
      return [
        "Option A - No answer provided",
        "Option B - No answer provided", 
        "Option C - No answer provided",
        "Option D - No answer provided"
      ];
    };
    
    // Check if we have any question data at all
    const hasQuestionData = questionAudios.length > 0 || questionAnswers.length > 0;
    console.log('hasQuestionData:', hasQuestionData, 'qAudios:', questionAudios.length, 'qAnswers:', questionAnswers.length);

    // Helper to handle clicks without scroll issues
    // Since expandedSample, showPromptEditor, customSystemPrompt are now local states,
    // clicking them won't cause parent re-renders and scroll should be preserved naturally
    const handleClick = (e, callback) => {
      e.preventDefault();
      e.stopPropagation();
      callback();
    };

    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper to decode base64 text content
const decodeTextContent = (dataUrl) => {
  if (!dataUrl) return null;
  try {
    const base64Content = dataUrl.split(',')[1];
    if (base64Content) {
      // ✅ Proper UTF-8 decode — handles em dash, curly quotes, etc.
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch (e) {
    console.error('Error decoding text:', e);
  }
  return null;
};

    // Real Audio Player component with HTML5 audio
    const AudioPlayer = ({ audioFile, audioId, label, showTranscriptToggle, transcript }) => {
      const audioRef = useRef(null);
      const [isPlaying, setIsPlaying] = useState(false);
      const [currentTime, setCurrentTime] = useState(0);
      const [duration, setDuration] = useState(0);
      const [showTranscriptContent, setShowTranscriptContent] = useState(false);
      const [transcriptText, setTranscriptText] = useState('');

      // Helper to get audio source - prefer storageUrl for files in Appwrite Storage, fallback to data
      const getAudioSrc = () => {
        if (audioFile?.storageUrl) return audioFile.storageUrl;
        if (audioFile?.data) return audioFile.data;
        return null;
      };
      
      const hasAudioSource = !!getAudioSrc();

      // Load transcript text if available
      useEffect(() => {
        if (transcript?.data && showTranscriptContent) {
          console.log('Transcript data type:', transcript.type);
          console.log('Transcript data preview:', transcript.data?.substring(0, 100));
          
          const text = decodeTextContent(transcript.data);
          if (text) {
            console.log('Decoded transcript:', text.substring(0, 200));
            setTranscriptText(text);
          } else {
            console.log('Failed to decode transcript');
          }
        }
      }, [transcript, showTranscriptContent]);

      const togglePlay = () => {
        if (audioRef.current) {
          if (isPlaying) {
            audioRef.current.pause();
          } else {
            audioRef.current.play();
          }
          setIsPlaying(!isPlaying);
        }
      };

      const handleTimeUpdate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      };

      const handleLoadedMetadata = () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      };

      const handleSeek = (e) => {
        const newTime = (e.target.value / 100) * duration;
        if (audioRef.current) {
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

      // Compact mode for questions view
      if (label === null && showTranscriptToggle) {
        return (
          <div className="space-y-3">
            {/* Hidden audio element */}
            {hasAudioSource && (
              <audio
                ref={audioRef}
                src={getAudioSrc()}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
              />
            )}
            
            {/* Compact Audio Player UI */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={togglePlay}
                  disabled={!hasAudioSource}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                    hasAudioSource 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-600">{formatTime(currentTime)}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 relative">
                      <div 
                        className="absolute left-0 top-0 h-full bg-blue-600 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleSeek}
                        disabled={!hasAudioSource}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-600">{formatTime(duration)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-1">{audioFile?.name || 'No audio'}</p>
                </div>
              </div>
            </div>
            
            {/* Transcript Toggle */}
            <button 
              onClick={() => setShowTranscriptContent(!showTranscriptContent)}
              className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 flex items-center gap-2"
            >
              <FileText className="w-3 h-3" />
              {showTranscriptContent ? 'Hide' : 'Show'} Transcript
            </button>
            
            {showTranscriptContent && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 max-h-40 overflow-y-auto">
                {transcriptText ? (
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{transcriptText}</pre>
                ) : transcript?.data ? (
                  <p className="text-xs text-gray-600">Transcript: {transcript.name}</p>
                ) : (
                  <p className="text-xs text-gray-500">No transcript available</p>
                )}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4">
            {label && (
              <h4 className="font-medium text-gray-700 mb-3">{label}</h4>
            )}
            
            {/* Hidden audio element */}
            {hasAudioSource && (
              <audio
                ref={audioRef}
                src={getAudioSrc()}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
              />
            )}
            
            {/* Audio Player UI */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={togglePlay}
                  disabled={!hasAudioSource}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg ${
                    hasAudioSource 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-mono text-gray-600 w-12">
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                      <div 
                        className="absolute left-0 top-0 h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleSeek}
                        disabled={!hasAudioSource}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-sm font-mono text-gray-600 w-12">
                      {formatTime(duration)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{audioFile?.name || 'No audio file'}</p>
                </div>
                
                <button className="p-2 hover:bg-gray-200 rounded-lg">
                  <Volume2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              {!hasAudioSource && audioFile?.name && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Audio file metadata saved, but file data not available. Please re-upload the file.
                </p>
              )}
            </div>
            
            {/* Transcript Toggle */}
            {showTranscriptToggle && (
              <div className="mt-3">
                <button 
                  onClick={() => setShowTranscriptContent(!showTranscriptContent)}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {showTranscriptContent ? 'Hide' : 'Show'} Transcript
                </button>
                
                {showTranscriptContent && (
                  <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200 max-h-64 overflow-y-auto">
                    {transcriptText ? (
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {transcriptText}
                      </pre>
                    ) : transcript?.data ? (
                      <p className="text-sm text-gray-600">
                        <span className="flex items-center gap-2 mb-2">
                          <FileCheck className="w-4 h-4 text-green-600" />
                          <strong>{transcript.name}</strong>
                        </span>
                        {transcript.type?.includes('text') ? (
                          <span className="text-orange-600">Loading transcript...</span>
                        ) : (
                          <a 
                            href={transcript.data} 
                            download={transcript.name}
                            className="text-blue-600 hover:underline"
                          >
                            Download transcript file
                          </a>
                        )}
                      </p>
                    ) : transcript?.name ? (
                      <p className="text-sm text-gray-600">
                        <span className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-green-600" />
                          Transcript: <strong>{transcript.name}</strong>
                        </span>
                        <span className="text-xs text-orange-600 block mt-1">
                          File data not available. Please re-upload to view content.
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No transcript uploaded for this section.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    };

    // Image display component
    const ImageDisplay = ({ imageFile, title }) => {
      if (!imageFile) return null;
      
// Get image source - prefer data, fallback to storageUrl
    // Get image source - prefer data, fallback to storageUrl, fallback to storageId
const imageSrc =
  imageFile.data ||
  imageFile.storageUrl ||
  (imageFile.storageId && BUCKET_ID
    ? storage.getFileView(BUCKET_ID, imageFile.storageId).toString()
    : "");

    
    return (
      <div className="bg-gray-100 rounded-lg p-4 flex flex-col items-center justify-center">
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={title || imageFile.name}
            className="max-w-full max-h-96 rounded-lg shadow-lg"
          />
        ) : (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-orange-600">Image data not available. Please re-upload.</p>
          </div>
        )}
          <p className="text-sm text-gray-600 mt-3">{imageFile.name}</p>
          <p className="text-xs text-gray-400">{imageFile.size}</p>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 bg-gray-100 z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowPreviewPage(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      material.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {material.status}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">
                      {material.skill}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold mt-1">{material.title}</h1>
                  <p className="text-sm text-gray-500">{material.task}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View Mode Tabs */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('sections')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      viewMode === 'sections' ? 'bg-white shadow' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Headphones className="w-4 h-4 inline mr-2" />
                    Sections
                  </button>
                  <button
                    onClick={() => setViewMode('questions')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      viewMode === 'questions' ? 'bg-white shadow' : 'hover:bg-gray-200'
                    }`}
                  >
                    <List className="w-4 h-4 inline mr-2" />
                    Questions
                  </button>
                  <button
                    onClick={() => setViewMode('answers')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      viewMode === 'answers' ? 'bg-white shadow' : 'hover:bg-gray-200'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Answer Key
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setShowPreviewPage(false);
                    openEditModal(material);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto" 
          style={{ overflowAnchor: 'auto' }}
        >
          <div className="max-w-6xl mx-auto p-6">
            
            {/* Sections View */}
            {viewMode === 'sections' && (
              <div className="space-y-6">
			  
			  {/* ✅ Instructions (if provided) */}
				{files.instructions && (
				  <div className="bg-white rounded-xl border shadow-sm p-6">
					<h3 className="font-semibold mb-2 flex items-center gap-2">
					  <AlertCircle className="w-5 h-5 text-purple-600" />
					  Instructions
					</h3>
					<p className="text-sm text-gray-700 whitespace-pre-line">
					  {files.instructions}
					</p>
				  </div>
				)}


                {/* Context Image (if exists) */}
                {files.contextImage && (
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {isReading ? 'Diagram' : 'Context Image'}
                    </h3>
                    <ImageDisplay imageFile={files.contextImage} title={isReading ? 'Diagram' : 'Context Image'} />
                  </div>
                )}

                {/* Reading Passage Display */}
                {isReading && sectionTranscripts.length > 0 && (
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Read the following message
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-6 border">
                      {sectionTranscripts[0]?.data ? (
                        <div className="prose max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-gray-800 text-base leading-relaxed">
{(() => {
  try {
    const base64Content = sectionTranscripts[0].data.split(',')[1];
    // ✅ Proper UTF-8 decode
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return 'Unable to display passage content';
  }
})()}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-gray-600">
                          {sectionTranscripts[0]?.name || 'Reading passage uploaded'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Video (Part 5) */}
					{/* Video (Part 5) */}
{/* Video (Part 5) */}
{files.videoFile && (
  <div className="bg-white rounded-xl border shadow-sm p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Play className="w-5 h-5 text-red-600" />
      Discussion Video
    </h3>
    <div className="bg-black rounded-lg overflow-hidden">
      {(files.videoFile.data || files.videoFile.storageUrl) ? (
        <video
          controls
          className="w-full aspect-video"
          src={files.videoFile.storageUrl || files.videoFile.data}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="aspect-video flex items-center justify-center">
          <div className="text-center text-white">
            <AlertCircle className="w-16 h-16 mx-auto mb-3 opacity-50 text-yellow-500" />
            <p className="font-medium">{files.videoFile.name}</p>
            <p className="text-sm text-gray-400">{files.videoFile.size}</p>
            <p className="text-xs text-yellow-400 mt-2">Video data not available - please re-upload</p>
          </div>
        </div>
      )}
    </div>
    <p className="text-sm text-gray-500 mt-2">{files.videoFile.name} • {files.videoFile.size}</p>
  </div>
)}



                {/* Section Audios - Only for Listening */}
                {isListening && (
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-blue-600" />
                    Listen to the Conversation
                    {sectionAudios.length > 1 && (
                      <span className="text-sm font-normal text-gray-500">
                        ({sectionAudios.length} sections)
                      </span>
                    )}
                  </h3>
                  
                  {sectionAudios.length > 0 ? (
                    <div className="space-y-4">
                      {sectionAudios.map((audio, idx) => (
                        <AudioPlayer 
                          key={idx}
                          audioFile={audio}
                          audioId={`section-${idx}`}
                          label={sectionAudios.length > 1 ? `Section ${idx + 1}` : null}
                          showTranscriptToggle={true}
                          transcript={sectionTranscripts[idx]}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                      <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                      <p className="text-yellow-800 font-medium">No section audio files uploaded</p>
                      <p className="text-yellow-600 text-sm mt-1">Click Edit to add audio files</p>
                    </div>
                  )}
                </div>
                )}

                {/* No Passage Message for Reading */}
                {isReading && sectionTranscripts.length === 0 && (
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                      <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                      <p className="text-yellow-800 font-medium">No reading passage uploaded</p>
                      <p className="text-yellow-600 text-sm mt-1">Click Edit to add reading passage</p>
                    </div>
                  </div>
                )}

                {/* Writing Task Display in Sections */}
                {isWriting && (
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Edit className="w-5 h-5 text-blue-600" />
                      Writing Task
                    </h3>
                    {files.writingPrompt ? (
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {files.writingPrompt}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                        <p className="text-yellow-800 font-medium">No writing prompt uploaded</p>
                        <p className="text-yellow-600 text-sm mt-1">Click Edit to add writing task</p>
                      </div>
                    )}
                    
                    {/* Sample responses summary */}
                    {(files.sampleBasic || files.sampleGood || files.sampleExcellent) && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-2">Sample Responses Available:</h4>
                        <div className="flex gap-2">
                          {files.sampleBasic && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Basic</span>
                          )}
                          {files.sampleGood && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Good</span>
                          )}
                          {files.sampleExcellent && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Excellent</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Go to "Questions" tab to view sample responses and write your answer
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Questions View - Not for Writing or Speaking (they have their own sections) */}
            {viewMode === 'questions' && !isWriting && !isSpeaking && (
              <div className="space-y-6">
                {!hasQuestionData ? (
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <div className="text-center py-12">
                      <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No Question Data Uploaded</h3>
                      <p className="text-gray-500 mb-4">You haven't uploaded any question audios or answer options yet.</p>
                      <button
                        onClick={() => {
                          setShowPreviewPage(false);
                          openEditModal(material);
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                      >
                        <Edit className="w-5 h-5" />
                        Add Questions
                      </button>
                    </div>
                  </div>
                ) : isDropdownFormat ? (
                /* Dropdown Format Questions (Part 4, 5, 6 Listening, or Reading) */
                <div className="space-y-6">
                  {/* Section 1: Regular Dropdown Questions */}
                  {(() => {
                    const paragraphText = files.paragraphText || '';
                    const paragraphQuestionsFirst = taskInfo?.paragraphQuestionsFirst || false;
                    const hasFixedOptions = taskInfo?.paragraphWithFixedOptions || false;
                    const fixedOptions = taskInfo?.fixedOptions || ['A', 'B', 'C', 'D', 'E'];
                    
                    // Special handling for Part 3 - Fixed A-E options
                    if (hasFixedOptions && paragraphText) {
                      return (
                        <div className="bg-white rounded-xl border shadow-sm p-6">
                          <div className="mb-6">
                            <h3 className="font-semibold flex items-center gap-2 mb-2">
                              <FileText className="w-5 h-5 text-green-600" />
                              Read the passage and select the best option (A, B, C, D, or E) for each blank:
                            </h3>
                          </div>

                          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                            <div className="text-gray-800 leading-relaxed">
                              {paragraphText.split(/(\{[0-9]+\})/).map((part, partIdx) => {
                                const match = part.match(/\{([0-9]+)\}/);
                                if (match) {
                                  const blankNum = parseInt(match[1]);
                                  const questionIdx = blankNum - 1;
                                  
                                  return (
                                    <select
                                      key={partIdx}
                                      className="inline-block border-2 border-green-300 rounded px-2 py-1 mx-1 text-sm bg-white min-w-[60px] focus:ring-2 focus:ring-green-500"
                                      value={selectedAnswers[questionIdx] ?? ''}
                                      onChange={(e) => setSelectedAnswers({
                                        ...selectedAnswers,
                                        [questionIdx]: e.target.value
                                      })}
                                    >
                                      <option value="" disabled hidden>......</option>
                                      {fixedOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  );
                                }
                                return <span key={partIdx}>{part}</span>;
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Extract which question numbers are in the paragraph (e.g., {7}, {8}, etc.)
                    const paragraphQuestionNums = new Set();
                    if (paragraphText) {
                      const matches = paragraphText.matchAll(/\{([0-9]+)\}/g);
                      for (const match of matches) {
                        paragraphQuestionNums.add(parseInt(match[1]));
                      }
                    }
                    
                    // Filter questions: dropdown questions are those with question text AND not in paragraph
                    const dropdownQuestions = questionAnswers
                      .map((q, idx) => ({ q, idx }))
                      .filter(({ q, idx }) => {
                        const questionNum = idx + 1;
                        // Include if has question text AND not in paragraph
                        return q && q[0] && q[0].trim() && !paragraphQuestionNums.has(questionNum);
                      });
                    
                    // Blank questions are those in the paragraph (or those without question text if no paragraph)
                    const blankQuestions = questionAnswers
                      .map((q, idx) => ({ q, idx }))
                      .filter(({ q, idx }) => {
                        const questionNum = idx + 1;
                        if (paragraphText) {
                          // If there's paragraph text, only include questions that are in the paragraph
                          return paragraphQuestionNums.has(questionNum);
                        } else {
                          // Fallback: include questions without question text
                          return q && (!q[0] || !q[0].trim()) && (q[1] || q[2] || q[3] || q[4]);
                        }
                      });
                    
                    // Dropdown Questions Component
                    const DropdownQuestionsSection = () => dropdownQuestions.length > 0 && (
                      <div className="bg-white rounded-xl border shadow-sm p-6">
                        <div className="mb-6">
                          <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <List className="w-5 h-5 text-purple-600" />
                            {isReading ? 'Using the drop-down menu, choose the best option:' : 'Choose the best way to complete each statement:'}
                          </h3>
                        </div>

                        <div className="space-y-4">
                          {dropdownQuestions.map(({ q, idx: originalIdx }) => (
                            <div key={originalIdx} className="p-4 bg-gray-50 rounded-lg border">
                              <div className="flex items-start gap-4">
                                <span className="text-sm text-gray-500 font-medium mt-1">{originalIdx + 1}.</span>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800 mb-3">{q[0]}</p>
                                  <select
                                    className="w-full border rounded-lg px-4 py-3 text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={selectedAnswers[originalIdx] ?? ''}
                                    onChange={(e) => setSelectedAnswers({
                                      ...selectedAnswers,
                                      [originalIdx]: e.target.value
                                    })}
                                  >
                                    <option value="">Select Answer</option>
                                    {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                                      <option key={letter} value={letter}>
                                        {letter}. {q[optIdx + 1] || `Option ${letter}`}
                                      </option>
                                    ))}
                                    {taskInfo?.questionType === 'reading-abcde' && q[5] && (
                                      <option value="E">E. {q[5] || 'Option E'}</option>
                                    )}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );

                    // Paragraph Fill-in-the-Blank Component
                    const ParagraphSection = () => (paragraphText || blankQuestions.length > 0) && (
                      <div className="bg-white rounded-xl border shadow-sm p-6">
                        <div className="mb-6">
                          <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-orange-600" />
                            Complete the response by filling in the blanks:
                          </h3>
                        </div>

                            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                              <div className="text-gray-800 leading-relaxed">
                                {paragraphText ? (
                                  // Render paragraph with embedded dropdowns
                                  paragraphText.split(/(\{[0-9]+\})/).map((part, partIdx) => {
                                    const match = part.match(/\{([0-9]+)\}/);
                                    if (match) {
                                      const blankNum = parseInt(match[1]);
                                      const questionIdx = blankNum - 1;
                                      const q = questionAnswers[questionIdx];
                                      
                                      return (
                                        <select
                                          key={partIdx}
                                          className="inline-block border-2 border-blue-300 rounded px-2 py-1 mx-1 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-blue-500"
                                          value={selectedAnswers[questionIdx] ?? ''}
                                          onChange={(e) => setSelectedAnswers({
                                            ...selectedAnswers,
                                            [questionIdx]: e.target.value
                                          })}
                                        >
                                          <option value="" disabled hidden>......</option>
                                          {q && ['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                                            q[optIdx + 1] && (
                                              <option key={letter} value={letter}>
                                                {q[optIdx + 1]}
                                              </option>
                                            )
                                          ))}
                                        </select>
                                      );
                                    }
                                    return <span key={partIdx}>{part}</span>;
                                  })
                                ) : (
                                  // Fallback: show blanks as list if no paragraph text
                                  <div className="space-y-4">
                                    {blankQuestions.map(({ q, idx: originalIdx }) => (
                                      <div key={originalIdx} className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-600">{originalIdx + 1}.</span>
                                        <select
                                          className="flex-1 border rounded-lg px-4 py-2 text-gray-700 bg-white"
                                          value={selectedAnswers[originalIdx] ?? ''}
                                          onChange={(e) => setSelectedAnswers({
                                            ...selectedAnswers,
                                            [originalIdx]: e.target.value
                                          })}
                                        >
                                          <option value="">Select Answer</option>
                                          {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                                            q[optIdx + 1] && (
                                              <option key={letter} value={letter}>
                                                {q[optIdx + 1]}
                                              </option>
                                            )
                                          ))}
                                        </select>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                    
                    // Render in correct order based on paragraphQuestionsFirst
                    return (
                      <>
                        {paragraphQuestionsFirst ? (
                          <>
                            <ParagraphSection />
                            <DropdownQuestionsSection />
                          </>
                        ) : (
                          <>
                            <DropdownQuestionsSection />
                            <ParagraphSection />
                          </>
                        )}
                      </>
                    );
                  })()}
                  
                  {questionAnswers.length === 0 && (
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                        <p>No questions uploaded yet. Click Edit to add questions.</p>
                      </div>
                    </div>
                  )}
                </div>
                ) : (
                /* Audio Format Questions (Part 1, 2, 3) */
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold flex items-center gap-2">
                      <List className="w-5 h-5 text-purple-600" />
                      Questions ({totalQuestions} total)
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                        disabled={currentQuestion === 0}
                        className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium">
                        Question {currentQuestion + 1} of {totalQuestions}
                      </span>
                      <button 
                        onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
                        disabled={currentQuestion === totalQuestions - 1}
                        className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Navigation Dots */}
                  <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
                    {Array.from({ length: totalQuestions }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentQuestion(idx)}
                        className={`w-10 h-10 rounded-lg font-medium text-sm transition ${
                          currentQuestion === idx
                            ? 'bg-blue-600 text-white'
                            : selectedAnswers[idx] !== undefined
                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                            : 'bg-white border hover:bg-gray-100'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Current Question */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left side - Audio */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Listen to the question</h4>
                      <p className="text-sm text-gray-500">You will hear it only once.</p>
                      
                      {questionAudios[currentQuestion] ? (
                        <AudioPlayer 
                          audioFile={questionAudios[currentQuestion]}
                          audioId={`question-${currentQuestion}`}
                          label={null}
                          showTranscriptToggle={true}
                          transcript={questionTranscripts[currentQuestion]}
                        />
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                          <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                          <p className="text-yellow-800 text-xs font-medium">
                            No audio for Question {currentQuestion + 1}
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800">
                        <p className="font-medium">⚠️ Official Test Note:</p>
                        <p>In the official test, you can't rewind or replay the audio, and there's no transcript.</p>
                      </div>
                    </div>

                    {/* Right side - Answer Options */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="mb-3">
                        <p className="text-xs text-blue-600 font-medium">Question {currentQuestion + 1} of {totalQuestions}</p>
                        <h4 className="font-semibold">Choose the best answer to the question.</h4>
                      </div>
                      
                      <div className="space-y-2">
                        {getAnswerOptions(currentQuestion).map((option, idx) => (
                          <label 
                            key={idx}
                            className={`flex items-center gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer transition ${
                              selectedAnswers[currentQuestion] === idx
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-transparent hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion}`}
                              checked={selectedAnswers[currentQuestion] === idx}
                              onChange={() => setSelectedAnswers({
                                ...selectedAnswers,
                                [currentQuestion]: idx
                              })}
                              className="w-5 h-5 text-blue-600"
                            />
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-gray-700">{option || `Option ${String.fromCharCode(65 + idx)} - Not provided`}</span>
                          </label>
                        ))}
                      </div>
                      
                      {(!questionAnswers[currentQuestion] || !questionAnswers[currentQuestion].some(opt => opt)) && (
                        <p className="text-xs text-orange-600 mt-3 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          No answer options uploaded for this question. Click Edit to add them.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-6 pt-6 border-t">
                    <button
                      onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                      disabled={currentQuestion === 0}
                      className="px-6 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                    >
                      <SkipBack className="w-4 h-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
                      disabled={currentQuestion === totalQuestions - 1}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      Next
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                )}
              </div>
            )}

            {/* Writing Preview */}
            {viewMode === 'questions' && isWriting && (
              <div key="writing-preview-container" className="space-y-6" onClick={(e) => e.stopPropagation()}>
                {/* OpenAI API Connection Box */}
                <div className={`rounded-xl border shadow-sm p-4 ${isAPIConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAPIConnected ? 'bg-green-100' : 'bg-gray-200'}`}>
                        <Settings className={`w-5 h-5 ${isAPIConnected ? 'text-green-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <h4 className={`font-medium ${isAPIConnected ? 'text-green-800' : 'text-gray-700'}`}>
                          {isAPIConnected ? `${(apiSettings?.provider || 'openai').charAt(0).toUpperCase() + (apiSettings?.provider || 'openai').slice(1)} API Connected` : 'AI API Connection'}
                        </h4>
                        <p className={`text-sm ${isAPIConnected ? 'text-green-600' : 'text-gray-500'}`}>
                          {isAPIConnected ? `Connected with key: ${openAIKey.substring(0, 7)}...${openAIKey.substring(openAIKey.length - 4)}` : 'Enter your API key and click Connect'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isAPIConnected && (
                        <input
                          type="password"
                          placeholder="sk-..."
                          className="w-48 border rounded-lg px-3 py-2 text-sm"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                        />
                      )}
                      {isAPIConnected ? (
                        <button
                          type="button"
                          onClick={(e) => handleClick(e, () => {
                            setIsAPIConnected(false);
                            setOpenAIKey('');
                            setApiKeyInput('');
                          })}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleClick(e, () => {
                            if (apiKeyInput && apiKeyInput.startsWith('sk-')) {
                              setOpenAIKey(apiKeyInput);
                              setIsAPIConnected(true);
                            } else {
                              alert('Please enter a valid OpenAI API key starting with sk-');
                            }
                          })}
                          disabled={!apiKeyInput}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI System Prompt Editor */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={(e) => handleClick(e, () => {
                      setShowPromptEditor(!showPromptEditor);
                    })}
                    className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Edit className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-purple-800">AI Evaluation Prompt</span>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                        {customSystemPrompt ? 'Custom' : 'Default'}
                      </span>
                    </div>
                    {showPromptEditor ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
                  </button>
                  {showPromptEditor && (
                    <div className="p-4 border-t">
                      <p className="text-sm text-gray-600 mb-2">
                        Customize the system prompt sent to OpenAI for evaluation. Leave empty to use default.
                      </p>
                      <textarea
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 min-h-[200px] font-mono"
                        placeholder={defaultSystemPrompt}
                        value={customSystemPrompt}
                        onChange={(e) => setCustomSystemPrompt(e.target.value)}
                      />
                      <div className="flex justify-between mt-2">
                        <button
                          type="button"
                          onClick={(e) => handleClick(e, () => {
                            setCustomSystemPrompt('');
                          })}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Reset to Default
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleClick(e, () => {
                            setCustomSystemPrompt(defaultSystemPrompt);
                          })}
                          className="text-sm text-purple-600 hover:text-purple-800"
                        >
                          Load Default Template
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Left side - Writing Prompt */}
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Read the following information.
                    </h3>
                    
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-6">
                      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {files.writingPrompt || 'No writing prompt uploaded. Click Edit to add the writing task.'}
                      </div>
                    </div>

                    {/* Sample Responses Accordion */}
                    {(files.sampleBasic || files.sampleGood || files.sampleExcellent) && (
                      <div className="space-y-2">
                        {files.sampleBasic && (
                          <div className="border rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={(e) => handleClick(e, () => {
                                setExpandedSample(expandedSample === 'basic' ? null : 'basic');
                              })}
                              className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 transition text-left"
                            >
                              <span className="font-medium text-yellow-800">Sample Response (Basic)</span>
                              {expandedSample === 'basic' ? <ChevronUp className="w-4 h-4 text-yellow-600" /> : <ChevronDown className="w-4 h-4 text-yellow-600" />}
                            </button>
                            {expandedSample === 'basic' && (
                              <div className="p-4 bg-yellow-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                                {files.sampleBasic}
                              </div>
                            )}
                          </div>
                        )}
                        {files.sampleGood && (
                          <div className="border rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={(e) => handleClick(e, () => {
                                setExpandedSample(expandedSample === 'good' ? null : 'good');
                              })}
                              className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition text-left"
                            >
                              <span className="font-medium text-blue-800">Sample Response (Good)</span>
                              {expandedSample === 'good' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                            </button>
                            {expandedSample === 'good' && (
                              <div className="p-4 bg-blue-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                                {files.sampleGood}
                              </div>
                            )}
                          </div>
                        )}
                        {files.sampleExcellent && (
                          <div className="border rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={(e) => handleClick(e, () => {
                                setExpandedSample(expandedSample === 'excellent' ? null : 'excellent');
                              })}
                              className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition text-left"
                            >
                              <span className="font-medium text-green-800">Sample Response (Excellent)</span>
                              {expandedSample === 'excellent' ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
                            </button>
                            {expandedSample === 'excellent' && (
                              <div className="p-4 bg-green-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                                {files.sampleExcellent}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right side - Writing Area & Evaluation */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Write to see your score</h3>
                        <span className="text-sm text-gray-500">
                          {writingResponse.split(/\s+/).filter(w => w).length} words
                        </span>
                      </div>
                      
                      {/* Option Selection for Part 2 (Survey Questions) */}
                      {isWritingPart2 && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-blue-800 mb-3">Select the option you want to support:</p>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={(e) => handleClick(e, () => setSelectedOption('A'))}
                              className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition ${
                                selectedOption === 'A' 
                                  ? 'border-blue-600 bg-blue-100 text-blue-800' 
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                              }`}
                            >
                              <span className="block text-lg mb-1">Option A</span>
                              <span className="text-xs opacity-75">Support this choice</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleClick(e, () => setSelectedOption('B'))}
                              className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition ${
                                selectedOption === 'B' 
                                  ? 'border-blue-600 bg-blue-100 text-blue-800' 
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                              }`}
                            >
                              <span className="block text-lg mb-1">Option B</span>
                              <span className="text-xs opacity-75">Support this choice</span>
                            </button>
                          </div>
                          {selectedOption && (
                            <p className="text-xs text-blue-600 mt-2">
                              You selected <strong>Option {selectedOption}</strong>. Write your response explaining why you prefer this option.
                            </p>
                          )}
                        </div>
                      )}
                      
                      <textarea
                        className="w-full border rounded-lg px-4 py-3 text-sm bg-gray-50 min-h-[250px] focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        placeholder={isWritingPart2 && !selectedOption 
                          ? "Please select Option A or Option B above before writing..." 
                          : "Type your response here..."}
                        value={writingResponse}
                        onChange={(e) => setWritingResponse(e.target.value)}
                        disabled={isWritingPart2 && !selectedOption}
                      />

                      <button
                        type="button"
                        onClick={(e) => handleClick(e, () => {
                          // For Part 2, include the selected option in the evaluation
                          const promptWithOption = isWritingPart2 && selectedOption
                            ? `${files.writingPrompt}\n\n[Student chose to support: Option ${selectedOption}]`
                            : files.writingPrompt;
                          evaluateWriting(
                            promptWithOption,
                            writingResponse,
                            { basic: files.sampleBasic, good: files.sampleGood, excellent: files.sampleExcellent },
                            customSystemPrompt,
                            selectedOption
                          );
                        })}
                        disabled={isEvaluating || writingResponse.trim().length < 50 || !isAPIConnected || (isWritingPart2 && !selectedOption)}
                        className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                      >
                        {isEvaluating ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Evaluating...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Submit for evaluation
                          </>
                        )}
                      </button>
                      
                      {!isAPIConnected && (
                        <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Please connect to OpenAI API above to enable evaluation
                        </p>
                      )}
                      
                      {isWritingPart2 && !selectedOption && isAPIConnected && (
                        <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Please select Option A or Option B above before submitting
                        </p>
                      )}
                      
                      {writingResponse.trim().length < 50 && writingResponse.trim().length > 0 && isAPIConnected && (!isWritingPart2 || selectedOption) && (
                        <p className="text-xs text-orange-600 mt-2">
                          Please write at least 50 words for evaluation (currently {writingResponse.split(/\s+/).filter(w => w).length} words)
                        </p>
                      )}
                    </div>

                    {/* Evaluation Result */}
                    {writingEvaluation && !writingEvaluation.error && (
                      <div className="bg-white rounded-xl border shadow-sm p-6">
                        <div className="text-center mb-6">
                          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-3">
                            <span className="text-3xl font-bold">{writingEvaluation.overallScore}</span>
                            <span className="text-lg">/12</span>
                          </div>
                          <h4 className="font-semibold text-lg">CELPIP Writing Score</h4>
                          <p className="text-sm text-gray-500">{writingEvaluation.wordCount} words</p>
                        </div>

                        {/* Score Breakdown */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          {Object.entries(writingEvaluation.breakdown || {}).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="font-bold text-blue-600">{value}/12</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${(value / 12) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Strengths */}
                        {writingEvaluation.strengths?.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Strengths
                            </h5>
                            <ul className="space-y-1">
                              {writingEvaluation.strengths.map((s, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                  <span className="text-green-500">•</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Improvements */}
                        {writingEvaluation.improvements?.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-medium text-orange-700 mb-2 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              Areas for Improvement
                            </h5>
                            <ul className="space-y-1">
                              {writingEvaluation.improvements.map((s, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                  <span className="text-orange-500">•</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Detailed Feedback */}
                        {writingEvaluation.detailedFeedback && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h5 className="font-medium text-blue-800 mb-2">Detailed Feedback</h5>
                            <p className="text-sm text-gray-700">{writingEvaluation.detailedFeedback}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Evaluation Error */}
                    {writingEvaluation?.error && (
                      <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                        <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Evaluation Error
                        </h4>
                        <p className="text-sm text-red-700">{writingEvaluation.message}</p>
                        <button
                          onClick={() => {
                            setWritingEvaluation(null);
                            setShowAPIKeyInput(true);
                          }}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                        >
                          Try again with different API key
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Speaking Preview */}
            {viewMode === 'questions' && isSpeaking && (
              <div key="speaking-preview-container" className="space-y-6" onClick={(e) => e.stopPropagation()}>
                {/* Check if this is Part 5 (Comparing and Persuading) */}
                {(() => {
                  const isSpeakingPart5 = material.taskId === 'part5';
                  
                  return (
                    <>
                      {/* OpenAI API Connection Box */}
                      <div className={`rounded-xl border shadow-sm p-4 ${isAPIConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAPIConnected ? 'bg-green-100' : 'bg-gray-200'}`}>
                              <Settings className={`w-5 h-5 ${isAPIConnected ? 'text-green-600' : 'text-gray-500'}`} />
                            </div>
                            <div>
                              <h4 className={`font-medium ${isAPIConnected ? 'text-green-800' : 'text-gray-700'}`}>
                                {isAPIConnected ? `${(apiSettings?.provider || 'openai').charAt(0).toUpperCase() + (apiSettings?.provider || 'openai').slice(1)} API Connected` : 'AI API Connection'}
                              </h4>
                              <p className={`text-sm ${isAPIConnected ? 'text-green-600' : 'text-gray-500'}`}>
                                {isAPIConnected ? `Connected with key: ${openAIKey.substring(0, 7)}...${openAIKey.substring(openAIKey.length - 4)}` : 'Enter your API key and click Connect'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isAPIConnected && (
                              <input
                                type="password"
                                placeholder="sk-..."
                                className="w-48 border rounded-lg px-3 py-2 text-sm"
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                              />
                            )}
                            {isAPIConnected ? (
                              <button
                                type="button"
                                onClick={(e) => handleClick(e, () => {
                                  setIsAPIConnected(false);
                                  setOpenAIKey('');
                                  setApiKeyInput('');
                                })}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                              >
                                Disconnect
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleClick(e, () => {
                                  if (apiKeyInput && apiKeyInput.startsWith('sk-')) {
                                    setOpenAIKey(apiKeyInput);
                                    setIsAPIConnected(true);
                                  } else {
                                    alert('Please enter a valid OpenAI API key starting with sk-');
                                  }
                                })}
                                disabled={!apiKeyInput}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Part 5: Comparing and Persuading - Two Stage Flow */}
                      {isSpeakingPart5 ? (
                        <>
                          {/* Stage indicator */}
                          <div className="flex items-center justify-center gap-4 mb-4">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${localSpeakingStage === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">1</span>
                              <span className="font-medium">Selection</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${localSpeakingStage === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">2</span>
                              <span className="font-medium">Speaking</span>
                            </div>
                          </div>

                          {localSpeakingStage === 1 ? (
                            /* Stage 1: Selection (No Speaking) */
                            <div className="bg-white rounded-xl border shadow-sm p-6">
                              <h3 className="font-bold text-lg mb-4 text-center">Speaking Task 5: Comparing and Persuading</h3>
                              
                              {/* Selection Instructions */}
                              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-700 whitespace-pre-wrap">
                                {files.selectionPrompt || 'Your family is relocating to another area, and you are looking for a new home there. You found two suitable options. Using the pictures and information below, choose the option that you prefer.\n\nIn the next section, you will need to persuade a family member that your choice is the better choice.\n\nIf you do not choose an option, the computer will choose one for you. You do not need to speak for this part.'}
                              </div>

                              {/* Two Options Side by Side */}
                              <div className="grid grid-cols-2 gap-6">
                                {/* Option A */}
                                <div 
                                  className={`rounded-xl border-2 cursor-pointer transition-all ${
                                    localSelectedComparisonOption === 'A' 
                                      ? 'border-blue-500 bg-blue-50 shadow-lg' 
                                      : 'border-gray-200 hover:border-blue-300'
                                  }`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setLocalSelectedComparisonOption('A');
                                  }}
                                >
                                  {files.speakingImages?.[0] && (
                                    <img 
                                      src={getImageSrc(files.speakingImages[0])} 
                                      alt="Option A"
                                      className="w-full h-48 object-cover rounded-t-lg"
                                    />
                                  )}
                                  <div className="p-4">
                                    <h4 className="font-bold text-lg mb-2">{files.optionATitle || 'Option A'}</h4>
                                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                      {files.optionADetails || '- Details not provided'}
                                    </div>
                                  </div>
                                  {localSelectedComparisonOption === 'A' && (
                                    <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
                                      ✓ Selected
                                    </div>
                                  )}
                                </div>

                                {/* Option B */}
                                <div 
                                  className={`rounded-xl border-2 cursor-pointer transition-all ${
                                    localSelectedComparisonOption === 'B' 
                                      ? 'border-green-500 bg-green-50 shadow-lg' 
                                      : 'border-gray-200 hover:border-green-300'
                                  }`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setLocalSelectedComparisonOption('B');
                                  }}
                                >
                                  {files.speakingImages?.[1] && (
                                    <img 
                                      src={getImageSrc(files.speakingImages[1])}

                                      alt="Option B"
                                      className="w-full h-48 object-cover rounded-t-lg"
                                    />
                                  )}
                                  <div className="p-4">
                                    <h4 className="font-bold text-lg mb-2">{files.optionBTitle || 'Option B'}</h4>
                                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                      {files.optionBDetails || '- Details not provided'}
                                    </div>
                                  </div>
                                  {localSelectedComparisonOption === 'B' && (
                                    <div className="bg-green-500 text-white text-center py-2 text-sm font-medium">
                                      ✓ Selected
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Continue Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!localSelectedComparisonOption) {
                                    // Auto-select Option A if nothing selected
                                    setLocalSelectedComparisonOption('A');
                                  }
                                  setLocalSpeakingStage(2);
                                }}
                                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
                              >
                                Continue to Speaking →
                              </button>
                            </div>
                          ) : (
                            /* Stage 2: Comparison/Speaking */
                            <div className="space-y-6">
                              {/* Comparison Prompt */}
                              <div className="bg-white rounded-xl border shadow-sm p-6">
                                <div className="text-gray-700 mb-4 whitespace-pre-wrap">
                                  {files.comparisonPrompt || 'Your family is suggesting another house. Persuade your family member that what you chose is more suitable by comparing the two.'}
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>Recording time: <strong>{files.recordingTime || 90}s</strong></span>
                                </div>
                              </div>

                              {/* Side by Side Comparison View */}
                              <div className="grid grid-cols-2 gap-6">
                                {/* Other Person's Choice (Image C - the third image) */}
                                <div className="bg-yellow-50 rounded-xl border border-yellow-200 overflow-hidden">
                                  <div className="bg-yellow-100 px-4 py-2 text-center">
                                    <span className="font-medium text-yellow-800">{files.optionCLabel || "Your Family"}'s Choice</span>
                                  </div>
                                  {files.speakingImages?.[2] && (
                                    <img 
                                      src={getImageSrc(files.speakingImages[2])}

                                      alt="Their Choice"
                                      className="w-full h-40 object-cover"
                                    />
                                  )}
                                  <div className="p-4">
                                    <h4 className="font-bold mb-2">
                                      {files.optionCTitle || "Their Choice"}
                                    </h4>
                                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                      {files.optionCDetails || '- Details not provided'}
                                    </div>
                                  </div>
                                </div>

                                {/* Your Choice (the selected option - A or B) */}
                                <div className="bg-green-50 rounded-xl border border-green-200 overflow-hidden">
                                  <div className="bg-green-100 px-4 py-2 text-center">
                                    <span className="font-medium text-green-800">Your Choice</span>
                                  </div>
                                  {files.speakingImages?.[localSelectedComparisonOption === 'A' ? 0 : 1] && (
                                    <img 
                                      src={getImageSrc(files.speakingImages[localSelectedComparisonOption === 'A' ? 0 : 1])}
 
                                      alt="Your Choice"
                                      className="w-full h-40 object-cover"
                                    />
                                  )}
                                  <div className="p-4">
                                    <h4 className="font-bold mb-2">
                                      {localSelectedComparisonOption === 'A' ? files.optionATitle : files.optionBTitle}
                                    </h4>
                                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                      {localSelectedComparisonOption === 'A' ? files.optionADetails : files.optionBDetails}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Recording Area */}
                              <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-6">
                                <h3 className="font-bold text-xl text-center mb-6">Record to Get Score!</h3>
                                
                                {/* Recording Button */}
                                <div className="flex flex-col items-center mb-6">
                                  {!localSpeakingTranscript ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          
                                          if (localIsRecording) {
                                            // Stop recording
                                            if (window.currentMediaRecorder && window.currentMediaRecorder.state === 'recording') {
                                              window.currentMediaRecorder.stop();
                                            }
                                            if (window.recordingTimerInterval) {
                                              clearInterval(window.recordingTimerInterval);
                                            }
                                          } else if (localRemainingAttempts > 0) {
                                            try {
                                              const stream = await navigator.mediaDevices.getUserMedia({ 
                                                audio: {
                                                  echoCancellation: true,
                                                  noiseSuppression: true,
                                                  sampleRate: 44100
                                                } 
                                              });
                                              
                                              // Try to use a more compatible mime type
                                              const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                                                ? 'audio/webm;codecs=opus' 
                                                : MediaRecorder.isTypeSupported('audio/webm') 
                                                  ? 'audio/webm'
                                                  : 'audio/mp4';
                                              
                                              const mediaRecorder = new MediaRecorder(stream, { mimeType });
                                              const chunks = [];
                                              
                                              mediaRecorder.ondataavailable = (ev) => {
                                                if (ev.data && ev.data.size > 0) {
                                                  chunks.push(ev.data);
                                                }
                                              };
                                              
                                              mediaRecorder.onstop = async () => {
                                                // Clear timer
                                                if (window.recordingTimerInterval) {
                                                  clearInterval(window.recordingTimerInterval);
                                                }
                                                
                                                stream.getTracks().forEach(track => track.stop());
                                                
                                                if (chunks.length === 0) {
                                                  alert('No audio was recorded. Please try again.');
                                                  setLocalIsRecording(false);
                                                  return;
                                                }
                                                
                                                const blob = new Blob(chunks, { type: mimeType });
                                                console.log('Recording blob size:', blob.size, 'bytes');
                                                
                                                if (blob.size < 1000) {
                                                  alert('Recording too short. Please speak longer.');
                                                  setLocalIsRecording(false);
                                                  return;
                                                }
                                                
                                                setLocalAudioBlob(blob);
                                                setLocalIsRecording(false);
                                                setLocalRemainingAttempts(prev => prev - 1);
                                                
                                                // Do inline transcription using provider-aware helper
                                                if (isAPIConnected && openAIKey) {
                                                  setLocalIsTranscribing(true);
                                                  try {
                                                    const text = await transcribeWithProvider(blob, mimeType);
                                                    if (text) {
                                                      setLocalSpeakingTranscript(text);
                                                    } else {
                                                      alert('No speech detected in recording. Please try again.');
                                                    }
                                                  } catch (error) {
                                                    console.error('Transcription error:', error);
                                                    alert('Failed to transcribe audio: ' + error.message);
                                                  } finally {
                                                    setLocalIsTranscribing(false);
                                                  }
                                                }
                                              };
                                              
                                              window.currentMediaRecorder = mediaRecorder;
                                              // Start recording with timeslice to capture data every 1 second
                                              mediaRecorder.start(1000);
                                              setLocalIsRecording(true);
                                              setLocalRecordingTime(0);
                                              
                                              const maxTime = parseInt(files.recordingTime) || 90;
                                              const timerInterval = setInterval(() => {
                                                setLocalRecordingTime(prev => {
                                                  if (prev >= maxTime - 1) {
                                                    clearInterval(timerInterval);
                                                    if (window.currentMediaRecorder?.state === 'recording') {
                                                      window.currentMediaRecorder.stop();
                                                    }
                                                    return maxTime;
                                                  }
                                                  return prev + 1;
                                                });
                                              }, 1000);
                                              window.recordingTimerInterval = timerInterval;
                                            } catch (err) {
                                              console.error('Microphone error:', err);
                                              alert('Could not access microphone. Please allow microphone access and try again.');
                                            }
                                          }
                                        }}
                                        disabled={localRemainingAttempts === 0 || localIsTranscribing}
                                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                                          localIsRecording 
                                            ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                                            : localRemainingAttempts > 0 
                                              ? 'bg-red-500 hover:bg-red-600' 
                                              : 'bg-gray-400 cursor-not-allowed'
                                        }`}
                                      >
                                        {localIsTranscribing ? (
                                          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Mic className="w-10 h-10 text-white" />
                                        )}
                                      </button>
                                      <p className="text-blue-700 font-medium mt-3">
                                        {localIsTranscribing ? 'Transcribing...' : localIsRecording ? `Recording... ${localRecordingTime}s` : 'Click to Record'}
                                      </p>
                                    </>
                                  ) : (
                                    <div className="w-full">
                                      <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                      </div>
                                      <p className="text-green-700 font-medium text-center">Recording Complete!</p>
                                    </div>
                                  )}
                                </div>

                                <p className="text-center text-gray-600 mb-4">
                                  You have <strong>{localRemainingAttempts} free attempts</strong> remaining.
                                </p>

                                {/* Transcript Display */}
                                {localSpeakingTranscript && (
                                  <div className="bg-white rounded-lg border p-4 mb-4">
                                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                      <FileText className="w-4 h-4" />
                                      Your Transcript:
                                    </h4>
                                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{localSpeakingTranscript}</p>
                                    
                                    <div className="flex gap-2 mt-3">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setLocalSpeakingTranscript('');
                                          setLocalAudioBlob(null);
                                          setLocalSpeakingEvaluation(null);
                                        }}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                      >
                                        Re-record
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Submit Button */}
                                {localSpeakingTranscript && (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Use local evaluation
                                      if (!isAPIConnected || !openAIKey) {
                                        alert('Please connect an AI provider API key first in API Settings');
                                        return;
                                      }
                                      setLocalSpeakingEvaluation({ loading: true });
                                      try {
                                        const systemPrompt = defaultSpeakingSystemPrompt;
                                        const userPrompt = `Speaking Task:
${files.comparisonPrompt || 'Persuade that your choice is better.'}

User chose: ${localSelectedComparisonOption === 'A' ? files.optionATitle : files.optionBTitle}

Student's Spoken Response (Transcript):
${localSpeakingTranscript}

${files.speakingSampleBasic || files.speakingSampleGood || files.speakingSampleExcellent ? `Reference Sample Answers for context:
Basic Level: ${files.speakingSampleBasic || 'N/A'}
Good Level: ${files.speakingSampleGood || 'N/A'}
Excellent Level: ${files.speakingSampleExcellent || 'N/A'}` : ''}

Please evaluate the student's spoken response and provide scores and feedback in JSON format.`;

                                        const content = await callAIChat(systemPrompt, userPrompt);
                                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                                        if (jsonMatch) {
                                          const evaluation = JSON.parse(jsonMatch[0]);
                                          setLocalSpeakingEvaluation(evaluation);
                                        } else {
                                          throw new Error('Could not parse evaluation response');
                                        }
                                      } catch (error) {
                                        console.error('Speaking evaluation error:', error);
                                        setLocalSpeakingEvaluation({
                                          error: true,
                                          message: error.message || 'Failed to evaluate speaking.'
                                        });
                                      }
                                    }}
                                    disabled={localSpeakingEvaluation?.loading || !isAPIConnected}
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                                  >
                                    {localSpeakingEvaluation?.loading ? (
                                      <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Evaluating...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="w-5 h-5" />
                                        Submit for evaluation
                                      </>
                                    )}
                                  </button>
                                )}

                                {!isAPIConnected && (
                                  <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1 justify-center">
                                    <AlertCircle className="w-3 h-3" />
                                    Please connect to OpenAI API above to enable recording and evaluation
                                  </p>
                                )}
                              </div>

                              {/* Back to Selection Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setLocalSpeakingStage(1);
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                Back to selection
                              </button>

                              {/* Evaluation Result */}
                              {localSpeakingEvaluation && !localSpeakingEvaluation.error && !localSpeakingEvaluation.loading && (
                                <div className="bg-white rounded-xl border shadow-sm p-6">
                                  <div className="text-center mb-6">
                                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white mb-3">
                                      <span className="text-3xl font-bold">{localSpeakingEvaluation.overallScore}</span>
                                      <span className="text-lg">/12</span>
                                    </div>
                                    <h4 className="font-semibold text-lg">CELPIP Speaking Score</h4>
                                  </div>

                                  {/* Score Breakdown */}
                                  <div className="grid grid-cols-2 gap-4 mb-6">
                                    {localSpeakingEvaluation.breakdown && Object.entries(localSpeakingEvaluation.breakdown).map(([key, value]) => (
                                      <div key={key} className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-sm text-gray-600 capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                          </span>
                                          <span className="font-semibold text-orange-600">{value}/12</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-orange-500 rounded-full transition-all"
                                            style={{ width: `${(value / 12) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Strengths */}
                                  {localSpeakingEvaluation.strengths && localSpeakingEvaluation.strengths.length > 0 && (
                                    <div className="mb-4">
                                      <h5 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Strengths
                                      </h5>
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {localSpeakingEvaluation.strengths.map((s, i) => (
                                          <li key={i}>• {s}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Areas for Improvement */}
                                  {localSpeakingEvaluation.improvements && localSpeakingEvaluation.improvements.length > 0 && (
                                    <div className="mb-4">
                                      <h5 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Areas for Improvement
                                      </h5>
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {localSpeakingEvaluation.improvements.map((s, i) => (
                                          <li key={i}>• {s}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Detailed Feedback */}
                                  {localSpeakingEvaluation.detailedFeedback && (
                                    <div className="bg-orange-50 rounded-lg p-4">
                                      <h5 className="font-medium text-orange-800 mb-2">Detailed Feedback</h5>
                                      <p className="text-sm text-gray-700">{localSpeakingEvaluation.detailedFeedback}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Error Display */}
                              {localSpeakingEvaluation && localSpeakingEvaluation.error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Evaluation Error
                                  </h4>
                                  <p className="text-sm text-red-700">{localSpeakingEvaluation.message}</p>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setLocalSpeakingEvaluation(null);
                                    }}
                                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                                  >
                                    Try again
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Regular Speaking Tasks (not Part 5) */
                        <div className="grid grid-cols-2 gap-6">
                  {/* Left side - Speaking Prompt & Samples */}
                  <div className="space-y-4">
                    {/* Speaking Prompt */}
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Mic className="w-5 h-5 text-orange-600" />
                        Speaking Task
                      </h3>
                      
                      <div className="bg-orange-50 rounded-lg p-6 border border-orange-200 mb-4">
                        <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {files.speakingPrompt || 'No speaking prompt uploaded. Click Edit to add the speaking task.'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Clock className="w-4 h-4" />
                        <span>Recording time: <strong>{files.recordingTime || 90}s</strong></span>
                      </div>

                      {/* Sample Responses Accordion */}
                      {(files.speakingSampleBasic || files.speakingSampleGood || files.speakingSampleExcellent) && (
                        <div className="space-y-2">
                          {files.speakingSampleBasic && (
                            <div className="border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={(e) => handleClick(e, () => {
                                  setExpandedSample(expandedSample === 'basic' ? null : 'basic');
                                })}
                                className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 transition text-left"
                              >
                                <span className="font-medium text-yellow-800">Sample Response (Basic)</span>
                                {expandedSample === 'basic' ? <ChevronUp className="w-4 h-4 text-yellow-600" /> : <ChevronDown className="w-4 h-4 text-yellow-600" />}
                              </button>
                              {expandedSample === 'basic' && (
                                <div className="p-4 bg-yellow-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                                  {files.speakingSampleBasic}
                                </div>
                              )}
                            </div>
                          )}
                          {files.speakingSampleGood && (
                            <div className="border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={(e) => handleClick(e, () => {
                                  setExpandedSample(expandedSample === 'good' ? null : 'good');
                                })}
                                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition text-left"
                              >
                                <span className="font-medium text-blue-800">Sample Response (Good)</span>
                                {expandedSample === 'good' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                              </button>
                              {expandedSample === 'good' && (
                                <div className="p-4 bg-blue-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                                  {files.speakingSampleGood}
                                </div>
                              )}
                            </div>
                          )}
                          {files.speakingSampleExcellent && (
                            <div className="border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={(e) => handleClick(e, () => {
                                  setExpandedSample(expandedSample === 'excellent' ? null : 'excellent');
                                })}
                                className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition text-left"
                              >
                                <span className="font-medium text-green-800">Sample Response (Excellent)</span>
                                {expandedSample === 'excellent' ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
                              </button>
                              {expandedSample === 'excellent' && (
                                <div className="p-4 bg-green-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                                  {files.speakingSampleExcellent}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Context Image for Speaking (if applicable) */}
                    {files.speakingImages && files.speakingImages.length > 0 && (
                      <div className="bg-white rounded-xl border shadow-sm p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Context Image{files.speakingImages.length > 1 ? 's' : ''}
                        </h3>
                        <div className={`grid gap-4 ${files.speakingImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
{files.speakingImages.map((img, idx) => (
  <img
    key={idx}
    src={getImageSrc(img)}   // ✅ supports data, storageUrl, storageId
    alt={`Context ${idx + 1}`}
    className="w-full rounded-lg border"
  />
))}

                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right side - Recording Area & Evaluation */}
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-6">
                      <h3 className="font-bold text-xl text-center mb-6">Record to Get Score!</h3>
                      
                      {/* Recording Button */}
                      <div className="flex flex-col items-center mb-6">
                        {!speakingTranscript ? (
                          <>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                if (isRecording) {
                                  // Stop recording
                                  if (window.currentMediaRecorder && window.currentMediaRecorder.state === 'recording') {
                                    window.currentMediaRecorder.stop();
                                  }
                                  if (window.recordingTimerInterval) {
                                    clearInterval(window.recordingTimerInterval);
                                  }
                                } else if (remainingAttempts > 0) {
                                  // Start recording
                                  try {
                                    const stream = await navigator.mediaDevices.getUserMedia({ 
                                      audio: {
                                        echoCancellation: true,
                                        noiseSuppression: true,
                                        sampleRate: 44100
                                      } 
                                    });
                                    
                                    // Try to use a more compatible mime type
                                    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                                      ? 'audio/webm;codecs=opus' 
                                      : MediaRecorder.isTypeSupported('audio/webm') 
                                        ? 'audio/webm'
                                        : 'audio/mp4';
                                    
                                    const mediaRecorder = new MediaRecorder(stream, { mimeType });
                                    const chunks = [];
                                    
                                    mediaRecorder.ondataavailable = (ev) => {
                                      if (ev.data && ev.data.size > 0) {
                                        chunks.push(ev.data);
                                      }
                                    };
                                    
                                    mediaRecorder.onstop = async () => {
                                      // Clear timer
                                      if (window.recordingTimerInterval) {
                                        clearInterval(window.recordingTimerInterval);
                                      }
                                      
                                      stream.getTracks().forEach(track => track.stop());
                                      
                                      if (chunks.length === 0) {
                                        alert('No audio was recorded. Please try again.');
                                        setIsRecording(false);
                                        return;
                                      }
                                      
                                      const blob = new Blob(chunks, { type: mimeType });
                                      console.log('Recording blob size:', blob.size, 'bytes');
                                      
                                      if (blob.size < 1000) {
                                        alert('Recording too short. Please speak longer.');
                                        setIsRecording(false);
                                        return;
                                      }
                                      
                                      setAudioBlob(blob);
                                      setIsRecording(false);
                                      setRemainingAttempts(prev => prev - 1);
                                      
                                      // Auto-transcribe
                                      if (isAPIConnected) {
                                        const transcript = await transcribeAudio(blob);
                                        if (transcript) {
                                          setSpeakingTranscript(transcript);
                                        }
                                      }
                                    };
                                    
                                    window.currentMediaRecorder = mediaRecorder;
                                    // Start recording with timeslice to capture data every 1 second
                                    mediaRecorder.start(1000);
                                    setIsRecording(true);
                                    setRecordingTime(0);
                                    
                                    // Recording timer
                                    const maxTime = parseInt(files.recordingTime) || 90;
                                    const timerInterval = setInterval(() => {
                                      setRecordingTime(prev => {
                                        if (prev >= maxTime - 1) {
                                          clearInterval(timerInterval);
                                          if (window.currentMediaRecorder?.state === 'recording') {
                                            window.currentMediaRecorder.stop();
                                          }
                                          return maxTime;
                                        }
                                        return prev + 1;
                                      });
                                    }, 1000);
                                    window.recordingTimerInterval = timerInterval;
                                  } catch (err) {
                                    console.error('Microphone error:', err);
                                    alert('Could not access microphone. Please allow microphone access and try again.');
                                  }
                                }
                              }}
                              disabled={remainingAttempts === 0 || isTranscribing}
                              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                                isRecording 
                                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                                  : remainingAttempts > 0 
                                    ? 'bg-red-500 hover:bg-red-600' 
                                    : 'bg-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {isTranscribing ? (
                                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Mic className="w-10 h-10 text-white" />
                              )}
                            </button>
                            <p className="text-blue-700 font-medium mt-3">
                              {isTranscribing ? 'Transcribing...' : isRecording ? `Recording... ${recordingTime}s` : 'Click to Record'}
                            </p>
                          </>
                        ) : (
                          <div className="w-full">
                            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                              <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <p className="text-green-700 font-medium text-center">Recording Complete!</p>
                          </div>
                        )}
                      </div>

                      <p className="text-center text-gray-600 mb-4">
                        You have <strong>{remainingAttempts} free attempts</strong> remaining.
                      </p>

                      {/* Transcript Display */}
                      {speakingTranscript && (
                        <div className="bg-white rounded-lg border p-4 mb-4">
                          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Your Transcript:
                          </h4>
                          <p className="text-gray-600 text-sm whitespace-pre-wrap">{speakingTranscript}</p>
                          
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              onClick={(e) => handleClick(e, () => {
                                setSpeakingTranscript('');
                                setAudioBlob(null);
                                setSpeakingEvaluation(null);
                              })}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Re-record
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      {speakingTranscript && (
                        <button
                          type="button"
                          onClick={(e) => handleClick(e, () => {
                            evaluateSpeaking(
                              files.speakingPrompt,
                              speakingTranscript,
                              { basic: files.speakingSampleBasic, good: files.speakingSampleGood, excellent: files.speakingSampleExcellent }
                            );
                          })}
                          disabled={isEvaluating || !isAPIConnected}
                          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                        >
                          {isEvaluating ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Evaluating...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              Submit for evaluation
                            </>
                          )}
                        </button>
                      )}

                      {!isAPIConnected && (
                        <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1 justify-center">
                          <AlertCircle className="w-3 h-3" />
                          Please connect to OpenAI API above to enable recording and evaluation
                        </p>
                      )}
                    </div>

                    {/* See Sample Analysis Button */}
                    {!speakingEvaluation && (files.speakingSampleBasic || files.speakingSampleGood || files.speakingSampleExcellent) && (
                      <button
                        type="button"
                        onClick={(e) => handleClick(e, () => {
                          // Show sample analysis - could evaluate a sample response
                          setExpandedSample('excellent');
                        })}
                        className="w-full bg-white border-2 border-gray-200 py-3 rounded-lg hover:border-green-500 flex items-center justify-center gap-2 font-medium text-gray-700"
                      >
                        See a sample analysis
                        <div className="w-8 h-8 rounded-full border-4 border-green-500 flex items-center justify-center">
                          <span className="text-green-600 font-bold text-sm">9</span>
                        </div>
                      </button>
                    )}

                    {/* Evaluation Result */}
                    {speakingEvaluation && !speakingEvaluation.error && (
                      <div className="bg-white rounded-xl border shadow-sm p-6">
                        <div className="text-center mb-6">
                          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white mb-3">
                            <span className="text-3xl font-bold">{speakingEvaluation.overallScore}</span>
                            <span className="text-lg">/12</span>
                          </div>
                          <h4 className="font-semibold text-lg">CELPIP Speaking Score</h4>
                        </div>

                        {/* Score Breakdown */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {speakingEvaluation.breakdown && Object.entries(speakingEvaluation.breakdown).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-600 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="font-semibold text-orange-600">{value}/12</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-orange-500 rounded-full transition-all"
                                  style={{ width: `${(value / 12) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Strengths */}
                        {speakingEvaluation.strengths && speakingEvaluation.strengths.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Strengths
                            </h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {speakingEvaluation.strengths.map((s, i) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Areas for Improvement */}
                        {speakingEvaluation.improvements && speakingEvaluation.improvements.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Areas for Improvement
                            </h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {speakingEvaluation.improvements.map((s, i) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Detailed Feedback */}
                        {speakingEvaluation.detailedFeedback && (
                          <div className="bg-orange-50 rounded-lg p-4">
                            <h5 className="font-medium text-orange-800 mb-2">Detailed Feedback</h5>
                            <p className="text-sm text-gray-700">{speakingEvaluation.detailedFeedback}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error Display */}
                    {speakingEvaluation && speakingEvaluation.error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Evaluation Error
                        </h4>
                        <p className="text-sm text-red-700">{speakingEvaluation.message}</p>
                        <button
                          onClick={() => {
                            setSpeakingEvaluation(null);
                          }}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Answer Key View */}
            {viewMode === 'answers' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="font-semibold mb-6 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    {isWriting || isSpeaking ? 'Sample Responses' : 'Answer Key'}
                  </h3>
                  
                  {/* Speaking Sample Responses */}
                  {isSpeaking ? (
                    <div className="space-y-6">
                      {files.speakingSampleBasic && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-yellow-50 px-4 py-3 border-b">
                            <h4 className="font-medium text-yellow-800">Sample Response (Basic) - Score 5-6</h4>
                          </div>
                          <div className="p-4 text-gray-700 whitespace-pre-wrap">
                            {files.speakingSampleBasic}
                          </div>
                        </div>
                      )}
                      {files.speakingSampleGood && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-blue-50 px-4 py-3 border-b">
                            <h4 className="font-medium text-blue-800">Sample Response (Good) - Score 7-8</h4>
                          </div>
                          <div className="p-4 text-gray-700 whitespace-pre-wrap">
                            {files.speakingSampleGood}
                          </div>
                        </div>
                      )}
                      {files.speakingSampleExcellent && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-green-50 px-4 py-3 border-b">
                            <h4 className="font-medium text-green-800">Sample Response (Excellent) - Score 9-12</h4>
                          </div>
                          <div className="p-4 text-gray-700 whitespace-pre-wrap">
                            {files.speakingSampleExcellent}
                          </div>
                        </div>
                      )}
                      {!files.speakingSampleBasic && !files.speakingSampleGood && !files.speakingSampleExcellent && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                          <p className="text-yellow-800 font-medium">No sample responses uploaded</p>
                          <p className="text-yellow-600 text-sm mt-1">Add sample responses in the edit form for reference</p>
                        </div>
                      )}
                    </div>
                  ) : isWriting ? (
                    <div className="space-y-6">
                      {files.sampleBasic && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-yellow-50 px-4 py-3 border-b">
                            <h4 className="font-medium text-yellow-800">Sample Response (Basic) - Score 5-6</h4>
                          </div>
                          <div className="p-4 text-gray-700 whitespace-pre-wrap">
                            {files.sampleBasic}
                          </div>
                        </div>
                      )}
                      {files.sampleGood && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-blue-50 px-4 py-3 border-b">
                            <h4 className="font-medium text-blue-800">Sample Response (Good) - Score 7-8</h4>
                          </div>
                          <div className="p-4 text-gray-700 whitespace-pre-wrap">
                            {files.sampleGood}
                          </div>
                        </div>
                      )}
                      {files.sampleExcellent && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-green-50 px-4 py-3 border-b">
                            <h4 className="font-medium text-green-800">Sample Response (Excellent) - Score 9-12</h4>
                          </div>
                          <div className="p-4 text-gray-700 whitespace-pre-wrap">
                            {files.sampleExcellent}
                          </div>
                        </div>
                      )}
                      {!files.sampleBasic && !files.sampleGood && !files.sampleExcellent && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                          <p className="text-yellow-800 font-medium">No sample responses uploaded</p>
                          <p className="text-yellow-600 text-sm mt-1">Add sample responses in the edit form for reference</p>
                        </div>
                      )}
                    </div>
                  ) : (
                  /* Answer Key Table from questionAnswers */
                  questionAnswers.length > 0 ? (
                    <div className="space-y-6">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-green-50 px-4 py-3 border-b">
                          <h4 className="font-medium text-green-800">Questions & Answers</h4>
                        </div>
                        <div className="overflow-x-auto">
                          {isDropdownFormat ? (
                            /* Dropdown format table - now uses A,B,C,D like audio format */
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-3 px-4 font-medium">Q#</th>
                                  <th className="text-left py-3 px-4 font-medium">Question</th>
                                  <th className="text-left py-3 px-4 font-medium">Option A</th>
                                  <th className="text-left py-3 px-4 font-medium">Option B</th>
                                  <th className="text-left py-3 px-4 font-medium">Option C</th>
                                  <th className="text-left py-3 px-4 font-medium">Option D</th>
                                  <th className="text-left py-3 px-4 font-medium">Correct</th>
                                  <th className="text-left py-3 px-4 font-medium">Your Answer</th>
                                  <th className="text-center py-3 px-4 font-medium">Result</th>
                                </tr>
                              </thead>
                              <tbody>
                                {questionAnswers.map((q, idx) => {
                                  const correctAnswer = q?.[5] || ''; // A, B, C, or D
                                  const userAnswer = selectedAnswers[idx];
                                  const isCorrect = correctAnswer && userAnswer && correctAnswer === userAnswer;
                                  
                                  return (
                                    <tr key={idx} className="border-t hover:bg-gray-50">
                                      <td className="py-3 px-4 font-medium">{idx + 1}</td>
                                      <td className="py-3 px-4 max-w-xs truncate" title={q?.[0]}>
                                        {q?.[0] || '-'}
                                      </td>
                                      <td className={`py-3 px-4 ${correctAnswer === 'A' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                                        {q?.[1] || '-'}
                                      </td>
                                      <td className={`py-3 px-4 ${correctAnswer === 'B' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                                        {q?.[2] || '-'}
                                      </td>
                                      <td className={`py-3 px-4 ${correctAnswer === 'C' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                                        {q?.[3] || '-'}
                                      </td>
                                      <td className={`py-3 px-4 ${correctAnswer === 'D' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                                        {q?.[4] || '-'}
                                      </td>
                                      <td className="py-3 px-4">
                                        {correctAnswer ? (
                                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">
                                            {correctAnswer}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        {userAnswer ? (
                                          <span className={`px-2 py-1 rounded font-bold ${
                                            isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                          }`}>
                                            {userAnswer}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        {userAnswer ? (
                                          isCorrect ? (
                                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                                          ) : (
                                            <X className="w-5 h-5 text-red-600 mx-auto" />
                                          )
                                        ) : (
                                          <span className="text-gray-300">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            /* Audio format table */
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-3 px-4 font-medium">Q#</th>
                                  <th className="text-left py-3 px-4 font-medium">Option A</th>
                                  <th className="text-left py-3 px-4 font-medium">Option B</th>
                                  <th className="text-left py-3 px-4 font-medium">Option C</th>
                                  <th className="text-left py-3 px-4 font-medium">Option D</th>
                                  <th className="text-left py-3 px-4 font-medium">Correct</th>
                                  <th className="text-left py-3 px-4 font-medium">Your Answer</th>
                                  <th className="text-center py-3 px-4 font-medium">Result</th>
                                </tr>
                              </thead>
                              <tbody>
                                {questionAnswers.map((answers, idx) => {
                                  const correctAnswer = answers?.[4] || ''; // 5th element is correct answer letter
                                  const userAnswerIdx = selectedAnswers[idx];
                                  const userAnswer = userAnswerIdx !== undefined ? String.fromCharCode(65 + userAnswerIdx) : '';
                                  const isCorrect = correctAnswer === userAnswer;
                                  
                                  return (
                                    <tr key={idx} className="border-t hover:bg-gray-50">
                                      <td className="py-3 px-4 font-medium">{idx + 1}</td>
                                      <td className={`py-3 px-4 ${correctAnswer === 'A' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                                        {answers?.[0] || '-'}
                                      </td>
                                      <td className={`py-3 px-4 ${correctAnswer === 'B' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                                        {answers?.[1] || '-'}
                                      </td>
                                      <td className={`py-3 px-4 ${correctAnswer === 'C' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                                        {answers?.[2] || '-'}
                                      </td>
                                      <td className={`py-3 px-4 ${correctAnswer === 'D' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                                        {answers?.[3] || '-'}
                                      </td>
                                      <td className="py-3 px-4">
                                        {correctAnswer ? (
                                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">
                                            {correctAnswer}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        {userAnswer ? (
                                          <span className={`px-2 py-1 rounded font-bold ${
                                            isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                          }`}>
                                            {userAnswer}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        {userAnswer ? (
                                          isCorrect ? (
                                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                                          ) : (
                                            <X className="w-5 h-5 text-red-600 mx-auto" />
                                          )
                                        ) : (
                                          <span className="text-gray-300">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                      
                      {/* Score Summary */}
                      {Object.keys(selectedAnswers).length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-800 mb-2">Score Summary</h4>
                          <div className="flex gap-6 text-sm">
                            <span>
                              Correct: <strong className="text-green-600">
                                {questionAnswers.filter((a, idx) => 
                                  a?.[4] && selectedAnswers[idx] !== undefined && 
                                  a[4] === String.fromCharCode(65 + selectedAnswers[idx])
                                ).length}
                              </strong>
                            </span>
                            <span>
                              Incorrect: <strong className="text-red-600">
                                {questionAnswers.filter((a, idx) => 
                                  a?.[4] && selectedAnswers[idx] !== undefined && 
                                  a[4] !== String.fromCharCode(65 + selectedAnswers[idx])
                                ).length}
                              </strong>
                            </span>
                            <span>
                              Unanswered: <strong className="text-gray-600">
                                {questionAnswers.length - Object.keys(selectedAnswers).length}
                              </strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : files.answerKey ? (
                    <div className="space-y-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileCheck className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-green-800">{files.answerKey.name}</p>
                          <p className="text-sm text-green-600">{files.answerKey.size}</p>
                        </div>
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                          Download
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        Answer key document uploaded. To see answers in the table, add correct answers when uploading questions.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                      <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                      <p className="text-yellow-800 font-medium">No answer key data</p>
                      <p className="text-yellow-600 text-sm mt-1">Add correct answers for each question in the edit form</p>
                    </div>
                  )
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="bg-white border-t px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              {isWriting ? (
                <>
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Writing Prompt: 
                    <strong className={files.writingPrompt ? 'text-green-600' : 'text-red-600'}>
                      {files.writingPrompt ? 'Uploaded' : 'Missing'}
                    </strong>
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Sample Responses: 
                    <strong className={(files.sampleBasic || files.sampleGood || files.sampleExcellent) ? 'text-green-600' : 'text-yellow-600'}>
                      {[files.sampleBasic, files.sampleGood, files.sampleExcellent].filter(Boolean).length} / 3
                    </strong>
                  </span>
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-600" />
                    AI Evaluation: 
                    <strong className={isAPIConnected ? 'text-green-600' : 'text-yellow-600'}>
                      {isAPIConnected ? 'Connected' : 'Not Connected'}
                    </strong>
                  </span>
                </>
              ) : isSpeaking ? (
                <>
                  <span className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-orange-600" />
                    Speaking Prompt: 
                    <strong className={files.speakingPrompt ? 'text-green-600' : 'text-red-600'}>
                      {files.speakingPrompt ? 'Uploaded' : 'Missing'}
                    </strong>
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Sample Responses: 
                    <strong className={(files.speakingSampleBasic || files.speakingSampleGood || files.speakingSampleExcellent) ? 'text-green-600' : 'text-yellow-600'}>
                      {[files.speakingSampleBasic, files.speakingSampleGood, files.speakingSampleExcellent].filter(Boolean).length} / 3
                    </strong>
                  </span>
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-600" />
                    AI Evaluation: 
                    <strong className={isAPIConnected ? 'text-green-600' : 'text-yellow-600'}>
                      {isAPIConnected ? 'Connected' : 'Not Connected'}
                    </strong>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-blue-600" />
                    Section Audios: 
                    <strong className={sectionAudios.length > 0 ? 'text-green-600' : 'text-red-600'}>
                      {sectionAudios.length} uploaded
                    </strong>
                  </span>
                  <span className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-purple-600" />
                    Question Audios: 
                    <strong className={questionAudios.length > 0 ? 'text-green-600' : 'text-red-600'}>
                      {questionAudios.length} / {totalQuestions}
                    </strong>
                  </span>
                  <span className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-green-600" />
                    Answer Key: 
                    <strong className={files.answerKey ? 'text-green-600' : 'text-red-600'}>
                      {files.answerKey ? 'Uploaded' : 'Missing'}
                    </strong>
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => togglePublishStatus(material.id)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  material.status === 'Published'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {material.status === 'Published' ? (
                  <>
                    <ToggleRight className="w-4 h-4" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4" />
                    Publish Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // View Modal Component
  const ViewModal = () => {
    if (!viewingMaterial) return null;
    
    const material = viewingMaterial;
    const isListening = material.skill === 'listening';
    const isSpeaking = material.skill === 'speaking';
    const files = material.uploadedFiles || {};

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
        <div className="bg-white rounded-xl max-w-4xl w-full mx-4 shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
            <div className="text-white">
              <h2 className="text-2xl font-bold">{material.title}</h2>
              <p className="text-blue-100 text-sm mt-1">{material.task}</p>
            </div>
            <button 
              onClick={() => setShowViewModal(false)} 
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Status & Info */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                    material.status === 'Published' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {material.status === 'Published' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {material.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Type</p>
                  <p className="font-medium capitalize mt-1">{material.skill}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Created</p>
                  <p className="font-medium mt-1">{material.date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Downloads</p>
                  <p className="font-medium mt-1">{material.downloads}</p>
                </div>
              </div>
              <button
                onClick={() => togglePublishStatus(material.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  material.status === 'Published'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {material.status === 'Published' ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    Publish Now
                  </>
                )}
              </button>
            </div>

            {/* Description */}
            {material.description && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600 bg-gray-50 rounded-lg p-4">{material.description}</p>
              </div>
            )}

            {/* Uploaded Files Section */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Uploaded Files
              </h3>

              {Object.keys(files).length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-yellow-800 font-medium">No files uploaded yet</p>
                  <p className="text-yellow-600 text-sm mt-1">Click Edit to add files to this material</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Context Image (Listening Part 1) */}
                  {files.contextImage && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Context Image
                      </h4>
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{files.contextImage.name}</p>
                          <p className="text-xs text-gray-500">{files.contextImage.size}</p>
                        </div>
                        <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">
                          Preview
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Video File (Listening Part 5) */}
				{/* Video File (Listening Part 5) */}
					{files.videoFile && (
					  <div className="bg-red-50 rounded-lg p-4">
						<h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
						  <Play className="w-5 h-5" />
						  Discussion Video
						</h4>
						{files.videoFile.data ? (
						  <video
							controls
							className="w-full rounded-lg"
							src={files.videoFile.data}
						  >
							Your browser does not support the video tag.
						  </video>
						) : (
						  <div className="flex items-center gap-3 bg-white rounded-lg p-3">
							<div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
							  <AlertCircle className="w-5 h-5 text-yellow-600" />
							</div>
							<div className="flex-1">
							  <p className="font-medium text-sm">{files.videoFile.name}</p>
							  <p className="text-xs text-gray-500">{files.videoFile.size}</p>
							  <p className="text-xs text-yellow-600">Re-upload needed</p>
							</div>
						  </div>
						)}
					  </div>
					)}

                  {/* Section Audios */}
                  {files.sectionAudios && files.sectionAudios.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <Headphones className="w-5 h-5" />
                        Section Audio Files ({files.sectionAudios.length})
                      </h4>
                      <div className="space-y-2">
                        {files.sectionAudios.map((audio, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{audio.name}</p>
                              <p className="text-xs text-gray-500">{audio.size}</p>
                            </div>
                            <button className="p-2 hover:bg-blue-100 rounded-lg">
                              <Play className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section Transcripts */}
                  {files.sectionTranscripts && files.sectionTranscripts.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Section Transcripts ({files.sectionTranscripts.length})
                      </h4>
                      <div className="space-y-2">
                        {files.sectionTranscripts.map((transcript, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-medium text-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{transcript.name}</p>
                              <p className="text-xs text-gray-500">{transcript.size}</p>
                            </div>
                            <button className="p-2 hover:bg-green-100 rounded-lg">
                              <Eye className="w-4 h-4 text-green-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Audios */}
                  {files.questionAudios && files.questionAudios.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                        <Mic className="w-5 h-5" />
                        Question Audio Files ({files.questionAudios.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {files.questionAudios.map((audio, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-medium text-xs">
                              Q{idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs truncate">{audio.name}</p>
                              <p className="text-xs text-gray-500">{audio.size}</p>
                            </div>
                            <button className="p-1 hover:bg-purple-100 rounded">
                              <Play className="w-3 h-3 text-purple-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Answer Key */}
                  {files.answerKey && (
                    <div className="bg-emerald-50 rounded-lg p-4">
                      <h4 className="font-medium text-emerald-800 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Answer Key
                      </h4>
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{files.answerKey.name}</p>
                          <p className="text-xs text-gray-500">{files.answerKey.size}</p>
                        </div>
                        <button className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm hover:bg-emerald-200">
                          View
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Speaking Images */}
                  {files.speakingImages && files.speakingImages.length > 0 && (
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Speaking Images ({files.speakingImages.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {files.speakingImages.map((img, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-2 text-center">
                            <div className="w-full h-20 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className="text-xs font-medium truncate">{img.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General File */}
                  {files.file && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Material File
                      </h4>
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{files.file.name}</p>
                          <p className="text-xs text-gray-500">{files.file.size}</p>
                        </div>
                        <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t">
              <button 
                className="flex-1 border px-6 py-3 rounded-lg hover:bg-gray-50 font-medium"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
              <button 
                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 font-medium"
                onClick={() => {
                  setShowViewModal(false);
                  openPreviewPage(material);
                }}
              >
                <Play className="w-5 h-5" />
                Full Preview
              </button>
              <button 
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(material);
                }}
              >
                <Edit className="w-5 h-5" />
                Edit Material
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UploadModal = () => {
    const currentSkill = formData.skill;
    const selectedSkillTasks = currentSkill ? skillTasks[currentSkill] : [];
    const showSkillSelector = activeTab === 'materials';
    const selectedTask = selectedSkillTasks.find(t => t.id === formData.task);
    const isListening = currentSkill === 'listening';
    const isReading = currentSkill === 'reading';
    const isSpeaking = currentSkill === 'speaking';
    const isWriting = currentSkill === 'writing';
    
    // Local state for file uploads - initialize from formData
    const [localSectionAudios, setLocalSectionAudios] = useState(() => {
      return Array.isArray(formData.sectionAudios) ? [...formData.sectionAudios] : [];
    });
    const [localSectionTranscripts, setLocalSectionTranscripts] = useState(() => {
      return Array.isArray(formData.sectionTranscripts) ? [...formData.sectionTranscripts] : [];
    });
    const [localQuestionAudios, setLocalQuestionAudios] = useState(() => {
      return Array.isArray(formData.questionAudios) ? [...formData.questionAudios] : [];
    });
    const [localQuestionTranscripts, setLocalQuestionTranscripts] = useState(() => {
      return Array.isArray(formData.questionTranscripts) ? [...formData.questionTranscripts] : [];
    });
    const [localSpeakingImages, setLocalSpeakingImages] = useState(() => {
      return Array.isArray(formData.speakingImages) ? [...formData.speakingImages] : [];
    });
    const [localQuestionAnswers, setLocalQuestionAnswers] = useState(() => {
      return Array.isArray(formData.questionAnswers) ? [...formData.questionAnswers] : [];
    });
    // For reading paragraph text
    const [localParagraphText, setLocalParagraphText] = useState(() => {
      return formData.paragraphText || '';
    });
    // For writing samples
    const [localWritingPrompt, setLocalWritingPrompt] = useState(() => {
      return formData.writingPrompt || '';
    });
    const [localSampleBasic, setLocalSampleBasic] = useState(() => {
      return formData.sampleBasic || '';
    });
    const [localSampleGood, setLocalSampleGood] = useState(() => {
      return formData.sampleGood || '';
    });
    const [localSampleExcellent, setLocalSampleExcellent] = useState(() => {
      return formData.sampleExcellent || '';
    });
    
    // For speaking section
    const [localSpeakingPrompt, setLocalSpeakingPrompt] = useState(() => {
      return formData.speakingPrompt || '';
    });
    const [localRecordingTime, setLocalRecordingTime] = useState(() => {
      return formData.recordingTime || '90';
    });
    const [localSpeakingSampleBasic, setLocalSpeakingSampleBasic] = useState(() => {
      return formData.speakingSampleBasic || '';
    });
    const [localSpeakingSampleGood, setLocalSpeakingSampleGood] = useState(() => {
      return formData.speakingSampleGood || '';
    });
    const [localSpeakingSampleExcellent, setLocalSpeakingSampleExcellent] = useState(() => {
      return formData.speakingSampleExcellent || '';
    });
    
    // For Speaking Part 5 - Comparison options
    const [localOptionATitle, setLocalOptionATitle] = useState(() => {
      return formData.optionATitle || '';
    });
    const [localOptionADetails, setLocalOptionADetails] = useState(() => {
      return formData.optionADetails || '';
    });
    const [localOptionBTitle, setLocalOptionBTitle] = useState(() => {
      return formData.optionBTitle || '';
    });
    const [localOptionBDetails, setLocalOptionBDetails] = useState(() => {
      return formData.optionBDetails || '';
    });
    const [localOptionCTitle, setLocalOptionCTitle] = useState(() => {
      return formData.optionCTitle || '';
    });
    const [localOptionCDetails, setLocalOptionCDetails] = useState(() => {
      return formData.optionCDetails || '';
    });
    const [localOptionCLabel, setLocalOptionCLabel] = useState(() => {
      return formData.optionCLabel || 'Your Family';
    });
    const [localSelectionPrompt, setLocalSelectionPrompt] = useState(() => {
      return formData.selectionPrompt || '';
    });
    const [localComparisonPrompt, setLocalComparisonPrompt] = useState(() => {
      return formData.comparisonPrompt || '';
    });

    // Handle submit with current local state
    const handleSubmit = () => {
      // Pass local state directly to handleUpload
      handleUploadWithFiles({
		instructions: formData.instructions,
        sectionAudios: localSectionAudios,
        sectionTranscripts: localSectionTranscripts,
        questionAudios: localQuestionAudios,
        questionTranscripts: localQuestionTranscripts,
        speakingImages: localSpeakingImages,
        questionAnswers: localQuestionAnswers,
        paragraphText: localParagraphText,
        writingPrompt: localWritingPrompt,
        sampleBasic: localSampleBasic,
        sampleGood: localSampleGood,
        sampleExcellent: localSampleExcellent,
        speakingPrompt: localSpeakingPrompt,
        recordingTime: localRecordingTime,
        speakingSampleBasic: localSpeakingSampleBasic,
        speakingSampleGood: localSpeakingSampleGood,
        speakingSampleExcellent: localSpeakingSampleExcellent,
        optionATitle: localOptionATitle,
        optionADetails: localOptionADetails,
        optionBTitle: localOptionBTitle,
        optionBDetails: localOptionBDetails,
        optionCTitle: localOptionCTitle,
        optionCDetails: localOptionCDetails,
        optionCLabel: localOptionCLabel,
        selectionPrompt: localSelectionPrompt,
        comparisonPrompt: localComparisonPrompt
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
        <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={(e) => e.preventDefault()}>
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b -mx-6 px-6">
            <div>
              <h2 className="text-2xl font-bold">
                {editingMaterial ? 'Edit' : 'Upload New'} {isListening ? 'Listening' : isReading ? 'Reading' : isSpeaking ? 'Speaking' : isWriting ? 'Writing' : ''} Material
              </h2>
              {!editingMaterial && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  New materials are saved as Draft until you publish them
                </p>
              )}
            </div>
            <button onClick={() => {
              setShowUploadModal(false);
              setEditingMaterial(null);
              resetFormData();
            }} className="hover:bg-gray-100 rounded-lg p-1">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-5">
            {showSkillSelector && (
              <div>
                <label className="block text-sm font-medium mb-2">Material Type *</label>
                <select 
                  className="w-full border rounded-lg px-4 py-3"
                  value={formData.skill}
                  onChange={(e) => setFormData({...formData, skill: e.target.value, task: ''})}
                >
                  <option value="">Select type...</option>
                  <option value="listening">Listening</option>
                  <option value="reading">Reading</option>
                  <option value="writing">Writing</option>
                  <option value="speaking">Speaking</option>
                </select>
              </div>
            )}

            {currentSkill && (
              <div>
                <label className="block text-sm font-medium mb-2">Task/Part *</label>
                <select 
                  className="w-full border rounded-lg px-4 py-3"
                  value={formData.task}
                  onChange={(e) => {
                    setFormData({...formData, task: e.target.value});
                    setLocalSectionAudios([]);
                    setLocalSectionTranscripts([]);
                    setLocalQuestionAudios([]);
                    setLocalQuestionTranscripts([]);
                  }}
                >
                  <option value="">Select task...</option>
                  {selectedSkillTasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name} {task.duration && `(${task.duration})`}
                    </option>
                  ))}
                </select>
                {selectedTask && isListening && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedTask.sections} section(s) • {selectedTask.questions} questions
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input 
                type="text"
                className="w-full border rounded-lg px-4 py-3"
                placeholder={isListening ? "e.g., Problem Solving - Test 3" : "e.g., Practice Test 3"}
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea 
                className="w-full border rounded-lg px-4 py-3 h-16"
                placeholder="Brief description of this material..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

{/* ✅ Mock Set (only for mock uploads) */}
{formData.isMock && (
  <div>
    <label className="block text-sm font-medium mb-2">Mock Set</label>
    <select
      className="w-full border rounded-lg px-4 py-3"
      value={formData.mockSet ?? 1}
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, mockSet: Number(e.target.value) }))
      }
    >
{Array.from({ length: MOCK_SET_MAX }, (_, i) => i + 1).map((n) => (
  <option key={n} value={n}>
    Mock {n}
  </option>
))}

    </select>
  </div>
)}

{formData.isMock && (
  <div>
    <label className="block text-sm font-medium mb-2">Mock Order (optional)</label>
    <input
      type="number"
      className="w-full border rounded-lg px-4 py-3"
      value={formData.mockOrder ?? ""}
      onChange={(e) =>
        setFormData((prev) => ({
          ...prev,
          mockOrder: e.target.value ? Number(e.target.value) : null,
        }))
      }
    />
  </div>
)}

            {isListening && selectedTask && (
              <>
				{/* ✅ Instructions (Optional) */}
				<div className="border-t pt-4">
				  <label className="block text-sm font-medium mb-2">
					Instructions (Optional)
				  </label>
				  <textarea
					className="w-full border rounded-lg px-4 py-3 h-20"
					placeholder="e.g., Look at the picture. Listen to the conversation. Answer the questions."
					value={formData.instructions || ''}
					onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
				  />
				  <p className="text-xs text-gray-500 mt-1">
					This will appear in the Sections preview above the context image.
				  </p>
				</div>

                {/* Context Image for Part 1 */}
                {formData.task === 'part1' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Context Image (Optional)
                    </h3>
                    <div className="border-2 border-dashed rounded-lg p-4 hover:border-purple-500 transition">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Upload scenario image</p>
                          <p className="text-xs text-gray-500">JPG, PNG (Max 10MB) - Shows context for the conversation</p>
                        </div>
                        <label className="px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                          Choose File
                          <input 
                            type="file" 
                            className="hidden"
                            accept=".jpg,.jpeg,.png"
                            onChange={(e) =>
  setFormData((prev) => ({
    ...prev,
    contextImage: e.target.files?.[0] ?? null,
  }))
}

                          />
                        </label>
                      </div>
                      {formData.contextImage && (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {formData.contextImage.name || formData.contextImage}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Video/Audio for Part 5 */}
                {formData.task === 'part5' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Discussion Media (Audio or Video) *
                    </h3>
                    
                    {/* Video Upload */}
                    <div className="border-2 border-dashed rounded-lg p-4 hover:border-red-500 transition bg-red-50 mb-3">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Upload discussion video</p>
                          <p className="text-xs text-gray-500">MP4, MOV (Max 500MB) - About 1.5 to 2 minutes</p>
                        </div>
                        <label className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm cursor-pointer hover:bg-red-700">
                          Choose Video
                          <input 
                            type="file" 
                            className="hidden"
                            accept=".mp4,.mov,.avi,.webm"
                            onChange={(e) => setFormData({...formData, videoFile: e.target.files[0]})}
                          />
                        </label>
                      </div>
                      {formData.videoFile && (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {formData.videoFile.name || formData.videoFile}
                        </p>
                      )}
                    </div>
                    
                    {/* Audio Upload (Alternative) */}
                    <div className="border-2 border-dashed rounded-lg p-4 hover:border-blue-500 transition bg-blue-50">
                      <div className="flex items-center gap-3">
                        <Headphones className="w-8 h-8 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Or upload discussion audio</p>
                          <p className="text-xs text-gray-500">MP3, WAV (Max 100MB) - Use this if video is not available</p>
                        </div>
                        <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm cursor-pointer hover:bg-blue-700">
                          Choose Audio
                          <input 
                            type="file" 
                            className="hidden"
                            accept=".mp3,.wav,.ogg,.m4a"
                            onChange={(e) => {
                              const newAudios = [...localSectionAudios];
                              newAudios[0] = e.target.files[0];
                              setLocalSectionAudios(newAudios);
                            }}
                          />
                        </label>
                      </div>
                      {localSectionAudios[0] && (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {localSectionAudios[0].name || localSectionAudios[0]}
                        </p>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2 italic">
                      Note: Upload either video OR audio. Video is preferred for the official test format.
                    </p>
                  </div>
                )}

                {/* Audio Files for other parts */}
                {formData.task !== 'part5' && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-blue-600" />
                    Audio Files ({selectedTask.sections} section{selectedTask.sections > 1 ? 's' : ''})
                  </h3>
                  
                  {Array.from({length: selectedTask.sections}).map((_, idx) => (
                      <div key={idx} className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-3">
                          {selectedTask.sections > 1 ? `Section ${idx + 1}` : 'Audio & Transcript'}
                        </h4>
                        
                        {/* Audio Upload */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium mb-2">Audio File *</label>
                          <div className="border-2 border-dashed rounded-lg p-3 hover:border-blue-500 transition bg-white">
                            <div className="flex items-center gap-3">
                              <Mic className="w-6 h-6 text-blue-500" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">Upload audio for section {idx + 1}</p>
                                <p className="text-xs text-gray-500">MP3, WAV (Max 100MB)</p>
                              </div>
                              <label className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs cursor-pointer hover:bg-blue-700">
                                Choose File
                                <input 
                                  type="file" 
                                  className="hidden"
                                  accept=".mp3,.wav"
                                  onChange={(e) => {
                                    const newAudios = [...localSectionAudios];
                                    newAudios[idx] = e.target.files[0];
                                    setLocalSectionAudios(newAudios);
                                  }}
                                />
                              </label>
                            </div>
                            {localSectionAudios[idx] && (
                              <p className="text-xs text-green-600 mt-2 flex items-center gap-2">
                                <CheckCircle className="w-3 h-3" />
                                {localSectionAudios[idx].name || localSectionAudios[idx]}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Transcript Upload */}
                        <div>
                          <label className="block text-xs font-medium mb-2">Transcript (Optional)</label>
                          <div className="border-2 border-dashed rounded-lg p-3 hover:border-green-500 transition bg-white">
                            <div className="flex items-center gap-3">
                              <FileText className="w-6 h-6 text-green-500" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">Upload transcript for section {idx + 1}</p>
                                <p className="text-xs text-gray-500">TXT, PDF, DOCX (Optional for practice)</p>
                              </div>
                              <label className="px-3 py-2 border rounded-lg text-xs cursor-pointer hover:bg-gray-50">
                                Choose File
                                <input 
                                  type="file" 
                                  className="hidden"
                                  accept=".txt,.pdf,.docx"
                                  onChange={(e) => {
                                    const newTranscripts = [...localSectionTranscripts];
                                    newTranscripts[idx] = e.target.files[0];
                                    setLocalSectionTranscripts(newTranscripts);
                                  }}
                                />
                              </label>
                            </div>
                            {localSectionTranscripts[idx] && (
                              <p className="text-xs text-green-600 mt-2 flex items-center gap-2">
                                <CheckCircle className="w-3 h-3" />
                                {localSectionTranscripts[idx].name || localSectionTranscripts[idx]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                )}

                {/* Video/Discussion Transcript for Part 5 */}
                {formData.task === 'part5' && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-2">
                      Discussion Transcript (Optional)
                    </label>
                    <div className="border-2 border-dashed rounded-lg p-4 hover:border-green-500 transition">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Upload discussion transcript</p>
                          <p className="text-xs text-gray-500">TXT, PDF, DOCX (Optional for practice)</p>
                        </div>
                        <label className="px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                          Choose File
                          <input 
                            type="file" 
                            className="hidden"
                            accept=".txt,.pdf,.docx"
                            onChange={(e) => {
                              const newTranscripts = [...localSectionTranscripts];
                              newTranscripts[0] = e.target.files[0];
                              setLocalSectionTranscripts(newTranscripts);
                            }}
                          />
                        </label>
                      </div>
                      {localSectionTranscripts[0] && (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {localSectionTranscripts[0].name || localSectionTranscripts[0]}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Questions Section */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Questions & Answers ({selectedTask.questions} questions)
                  </h3>

                  {selectedTask.questionType === 'audio' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 mb-3">
                        Upload audio files for each question and add the 4 answer options.
                      </p>
                      {Array.from({length: selectedTask.questions}).map((_, idx) => (
                        <div key={idx} className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                          <h4 className="font-medium text-sm mb-3 text-purple-900">Question {idx + 1}</h4>
                          
                          {/* Question Audio */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium mb-2">Question Audio *</label>
                            <div className="border-2 border-dashed rounded-lg p-3 hover:border-purple-500 transition bg-white">
                              <div className="flex items-center gap-3">
                                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Upload question {idx + 1} audio</p>
                                  <p className="text-xs text-gray-500">MP3, WAV (Max 10MB)</p>
                                </div>
                                <label className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs cursor-pointer hover:bg-purple-700">
                                  Choose File
                                  <input 
                                    type="file" 
                                    className="hidden"
                                    accept=".mp3,.wav"
                                    onChange={(e) => {
                                      const newQuestions = [...localQuestionAudios];
                                      newQuestions[idx] = e.target.files[0];
                                      setLocalQuestionAudios(newQuestions);
                                    }}
                                  />
                                </label>
                              </div>
                              {localQuestionAudios[idx] && (
                                <p className="text-xs text-green-600 mt-2 flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3" />
                                  {localQuestionAudios[idx].name || localQuestionAudios[idx]}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Answer Options */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium mb-2">Answer Options (4 choices) + Correct Answer *</label>
                            <div className="space-y-2 bg-white rounded-lg p-3 border">
                              {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                                    {letter}
                                  </span>
                                  <input
                                    type="text"
                                    placeholder={`Option ${letter}...`}
                                    className="flex-1 border rounded px-3 py-2 text-sm"
                                    value={localQuestionAnswers[idx]?.[optIdx] || ''}
                                    onChange={(e) => {
                                      const newAnswers = [...localQuestionAnswers];
                                      if (!newAnswers[idx]) {
                                        newAnswers[idx] = ['', '', '', '', ''];
                                      }
                                      newAnswers[idx][optIdx] = e.target.value;
                                      setLocalQuestionAnswers(newAnswers);
                                    }}
                                  />
                                </div>
                              ))}
                              {/* Correct Answer - 5th line */}
                              <div className="flex items-center gap-2 pt-2 border-t mt-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                                  ✓
                                </span>
                                <select
                                  className="flex-1 border rounded px-3 py-2 text-sm"
                                  value={localQuestionAnswers[idx]?.[4] || ''}
                                  onChange={(e) => {
                                    const newAnswers = [...localQuestionAnswers];
                                    if (!newAnswers[idx]) {
                                      newAnswers[idx] = ['', '', '', '', ''];
                                    }
                                    newAnswers[idx][4] = e.target.value;
                                    setLocalQuestionAnswers(newAnswers);
                                  }}
                                >
                                  <option value="">Select correct answer...</option>
                                  <option value="A">A is correct</option>
                                  <option value="B">B is correct</option>
                                  <option value="C">C is correct</option>
                                  <option value="D">D is correct</option>
                                </select>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                Or upload a TXT file with 5 lines (4 options + correct answer letter):
                              </p>
                              <label className="inline-flex items-center gap-2 px-3 py-1 border rounded text-xs cursor-pointer hover:bg-gray-50">
                                <Upload className="w-3 h-3" />
                                Upload TXT (5 lines)
                                <input 
                                  type="file" 
                                  className="hidden"
                                  accept=".txt"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const text = event.target.result;
                                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                                        const newAnswers = [...localQuestionAnswers];
                                        // First 4 lines are options, 5th line is correct answer (A, B, C, or D)
                                        newAnswers[idx] = [
                                          lines[0] || '',
                                          lines[1] || '',
                                          lines[2] || '',
                                          lines[3] || '',
                                          lines[4]?.toUpperCase() || '' // Correct answer letter
                                        ];
                                        setLocalQuestionAnswers(newAnswers);
                                      };
                                      reader.readAsText(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Question Transcript */}
                          <div>
                            <label className="block text-xs font-medium mb-2">Question Transcript (Optional)</label>
                            <div className="border-2 border-dashed rounded-lg p-3 hover:border-green-500 transition bg-white">
                              <div className="flex items-center gap-3">
                                <FileText className="w-6 h-6 text-green-500" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Upload transcript for question {idx + 1}</p>
                                  <p className="text-xs text-gray-500">TXT, PDF, DOCX</p>
                                </div>
                                <label className="px-3 py-2 border rounded-lg text-xs cursor-pointer hover:bg-gray-50">
                                  Choose File
                                  <input 
                                    type="file" 
                                    className="hidden"
                                    accept=".txt,.pdf,.docx"
                                    onChange={(e) => {
                                      const newTranscripts = [...localQuestionTranscripts];
                                      newTranscripts[idx] = e.target.files[0];
                                      setLocalQuestionTranscripts(newTranscripts);
                                    }}
                                  />
                                </label>
                              </div>
                              {localQuestionTranscripts[idx] && (
                                <p className="text-xs text-green-600 mt-2 flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3" />
                                  {localQuestionTranscripts[idx].name || localQuestionTranscripts[idx]}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedTask.questionType === 'dropdown' ? (
                    /* Dropdown questions format (Part 4, 5, 6) - individual uploads per question */
                    <div className="space-y-4">
                      {/* Individual Question Cards - each with its own TXT upload */}
                      {Array.from({length: selectedTask.questions}).map((_, idx) => (
                        <div key={idx} className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                          <h4 className="font-medium text-sm mb-3 text-purple-900">Question {idx + 1}</h4>
                          
                          {/* Upload TXT for this question */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium mb-2">
                              Upload Question TXT File (Question + 4 Options)
                            </label>
                            <div className="border-2 border-dashed rounded-lg p-3 hover:border-purple-500 transition bg-white">
                              <div className="flex items-center gap-3">
                                <FileText className="w-6 h-6 text-purple-500" />
                                <div className="flex-1">
                                  <p className="text-sm">Upload TXT for Question {idx + 1}</p>
                                  <p className="text-xs text-gray-500">Line 1: Question, Lines 2-5: Options A-D</p>
                                </div>
                                <label className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs cursor-pointer hover:bg-purple-700">
                                  Choose TXT
                                  <input 
                                    type="file" 
                                    className="hidden"
                                    accept=".txt"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          const text = event.target.result;
                                          const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                                            .split('\n')
                                            .map(l => l.trim())
                                            .filter(l => l.length > 0);
                                          
                                          console.log(`Q${idx + 1} TXT lines:`, lines);
                                          
                                          // Line 1 = question, Lines 2-5 = options
                                          const question = lines[0] || '';
                                          const optA = lines[1]?.replace(/\.$/, '').trim() || '';
                                          const optB = lines[2]?.replace(/\.$/, '').trim() || '';
                                          const optC = lines[3]?.replace(/\.$/, '').trim() || '';
                                          const optD = lines[4]?.replace(/\.$/, '').trim() || '';
                                          
                                          // Update this question's data
                                          const newAnswers = [...localQuestionAnswers];
                                          while (newAnswers.length <= idx) {
                                            newAnswers.push(['', '', '', '', '', '']);
                                          }
                                          newAnswers[idx] = [question, optA, optB, optC, optD, newAnswers[idx]?.[5] || ''];
                                          setLocalQuestionAnswers(newAnswers);
                                          
                                          console.log(`Q${idx + 1} parsed:`, newAnswers[idx]);
                                        };
                                        reader.readAsText(file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                              {localQuestionAnswers[idx]?.[0] && (
                                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Loaded: {localQuestionAnswers[idx][0].substring(0, 40)}...
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Question Text */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium mb-2">Question Text *</label>
                            <input
                              type="text"
                              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                              placeholder={`Enter question ${idx + 1} text...`}
                              value={localQuestionAnswers[idx]?.[0] || ''}
                              onChange={(e) => {
                                const newAnswers = [...localQuestionAnswers];
                                if (!newAnswers[idx]) {
                                  newAnswers[idx] = ['', '', '', '', '', ''];
                                }
                                newAnswers[idx][0] = e.target.value;
                                setLocalQuestionAnswers(newAnswers);
                              }}
                            />
                          </div>

                          {/* Answer Options */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium mb-2">Answer Options (4 choices) *</label>
                            <div className="space-y-2 bg-white rounded-lg p-3 border">
                              {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    localQuestionAnswers[idx]?.[5] === letter 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {letter}
                                  </span>
                                  <input
                                    type="text"
                                    placeholder={`Option ${letter}...`}
                                    className="flex-1 border rounded px-3 py-2 text-sm"
                                    value={localQuestionAnswers[idx]?.[optIdx + 1] || ''}
                                    onChange={(e) => {
                                      const newAnswers = [...localQuestionAnswers];
                                      if (!newAnswers[idx]) {
                                        newAnswers[idx] = ['', '', '', '', '', ''];
                                      }
                                      newAnswers[idx][optIdx + 1] = e.target.value;
                                      setLocalQuestionAnswers(newAnswers);
                                    }}
                                  />
                                </div>
                              ))}
                              
                              {/* Correct Answer Selector */}
                              <div className="flex items-center gap-2 pt-2 border-t mt-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                                  ✓
                                </span>
                                <select
                                  className="flex-1 border rounded px-3 py-2 text-sm"
                                  value={localQuestionAnswers[idx]?.[5] || ''}
                                  onChange={(e) => {
                                    const newAnswers = [...localQuestionAnswers];
                                    if (!newAnswers[idx]) {
                                      newAnswers[idx] = ['', '', '', '', '', ''];
                                    }
                                    newAnswers[idx][5] = e.target.value;
                                    setLocalQuestionAnswers(newAnswers);
                                  }}
                                >
                                  <option value="">Select correct answer...</option>
                                  <option value="A">A is correct</option>
                                  <option value="B">B is correct</option>
                                  <option value="C">C is correct</option>
                                  <option value="D">D is correct</option>
                                </select>
                              </div>
                            </div>
                          </div>
						  
						  {/* ✅ Upload TXT (5 lines): 4 options + correct answer letter */}
<p className="text-xs text-gray-500 mt-2">
  Or upload a TXT file with 5 lines (4 options + correct answer letter):
</p>

<label className="inline-flex items-center gap-2 px-3 py-1 border rounded text-xs cursor-pointer hover:bg-gray-50 mt-2">
  <Upload className="w-3 h-3" />
  Upload TXT (5 lines)
  <input
    type="file"
    className="hidden"
    accept=".txt"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = String(event.target?.result || '');

        const lines = text
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        // lines[0..3] = options A-D
        // lines[4] = correct letter (A/B/C/D)
        const newAnswers = [...localQuestionAnswers];

        if (!newAnswers[idx]) {
          newAnswers[idx] = ['', '', '', '', '', ''];
        }

        // ✅ Keep question text (index 0) unchanged
        newAnswers[idx][1] = lines[0] || '';
        newAnswers[idx][2] = lines[1] || '';
        newAnswers[idx][3] = lines[2] || '';
        newAnswers[idx][4] = lines[3] || '';
        newAnswers[idx][5] = (lines[4] || '').toUpperCase();

        setLocalQuestionAnswers(newAnswers);
      };

      reader.readAsText(file);
    }}
  />
</label>

                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-4 hover:border-purple-500 transition">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-purple-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Questions Document *</p>
                          <p className="text-xs text-gray-500">PDF, DOCX - Include all {selectedTask.questions} questions</p>
                        </div>
                        <label className="px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                          Choose File
                          <input 
                            type="file" 
                            className="hidden"
                            accept=".pdf,.docx"
                            onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
                          />
                        </label>
                      </div>
                      {formData.file && (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {formData.file.name || formData.file}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Answer Key Section */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">
                    Answer Key Document *
                  </label>
                  <div className="border-2 border-dashed rounded-lg p-4 hover:border-green-500 transition bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Upload answer key with correct answers</p>
                        <p className="text-xs text-gray-500">PDF, DOCX - Include correct answer for each question</p>
                      </div>
                      <label className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm cursor-pointer hover:bg-green-700">
                        Choose File
                        <input 
                          type="file" 
                          className="hidden"
                          accept=".pdf,.docx"
                          onChange={(e) => setFormData({...formData, answerKey: e.target.files[0]})}
                        />
                      </label>
                    </div>
                    {formData.answerKey && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {formData.answerKey.name || formData.answerKey}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Reading Material Upload */}
            {isReading && selectedTask && (
              <>
                {/* Reading Passage Upload */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Reading Passage *
                  </h3>
                  <div className="border-2 border-dashed rounded-lg p-4 hover:border-blue-500 transition bg-blue-50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Upload reading passage</p>
                        <p className="text-xs text-gray-500">TXT, PDF, DOCX - The text students will read</p>
                      </div>
                      <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm cursor-pointer hover:bg-blue-700">
                        Choose File
                        <input 
                          type="file" 
                          className="hidden"
                          accept=".txt,.pdf,.docx"
                          onChange={(e) => {
                            const newTranscripts = [...localSectionTranscripts];
                            newTranscripts[0] = e.target.files[0];
                            setLocalSectionTranscripts(newTranscripts);
                          }}
                        />
                      </label>
                    </div>
                    {localSectionTranscripts[0] && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {localSectionTranscripts[0].name || localSectionTranscripts[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Context Image for Part 2 */}
                {formData.task === 'part2' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Diagram Image *
                    </h3>
                    <div className="border-2 border-dashed rounded-lg p-4 hover:border-orange-500 transition bg-orange-50">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Upload diagram/image</p>
                          <p className="text-xs text-gray-500">PNG, JPG - The diagram students reference</p>
                        </div>
                        <label className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm cursor-pointer hover:bg-orange-700">
                          Choose Image
                          <input 
                            type="file" 
                            className="hidden"
                            accept=".png,.jpg,.jpeg,.gif"
                            onChange={(e) => setFormData({...formData, contextImage: e.target.files[0]})}
                          />
                        </label>
                      </div>
                      {formData.contextImage && (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {formData.contextImage.name || formData.contextImage}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Questions Section for Reading */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Questions & Answers ({selectedTask.questions} questions)
                  </h3>

                  {/* Special handling for Part 3 - Paragraph with fixed A-E options */}
                  {selectedTask.paragraphWithFixedOptions ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h4 className="font-medium text-green-800 text-sm">
                          Paragraph with Fixed Options (A, B, C, D, E)
                        </h4>
                        <p className="text-xs text-green-600 mt-1">
                          Enter a passage with blanks using {'{'}1{'}'}, {'{'}2{'}'}, etc. All dropdowns will show A, B, C, D, E options.
                        </p>
                      </div>
                      
                      {/* Paragraph Text Input */}
                      <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                        <label className="block text-sm font-medium mb-2">
                          Passage Text with Blanks *
                        </label>
                        <p className="text-xs text-gray-600 mb-2">
                          Enter the passage and use {'{'}1{'}'}, {'{'}2{'}'}, {'{'}3{'}'}, etc. where dropdowns should appear.
                          <br/>Each dropdown will show options A, B, C, D, E.
                        </p>
                        <textarea
                          className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[200px]"
                          placeholder={`Enter passage with placeholders like {1}, {2}, {3}... up to {${selectedTask.questions}}`}
                          value={localParagraphText || ''}
                          onChange={(e) => setLocalParagraphText(e.target.value)}
                        />
                        
                        {/* Upload TXT for paragraph */}
                        <div className="mt-3 border-t pt-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-green-500" />
                            <span className="text-sm">Or upload passage TXT file</span>
                            <label className="px-3 py-1.5 bg-green-600 text-white rounded text-xs cursor-pointer hover:bg-green-700">
                              Choose TXT
                              <input 
                                type="file" 
                                className="hidden"
                                accept=".txt"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setLocalParagraphText(event.target.result);
                                    };
                                    reader.readAsText(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Correct Answers for each blank */}
                      <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                        <label className="block text-sm font-medium mb-3">
                          Correct Answers for Each Blank
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {Array.from({length: selectedTask.questions}).map((_, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600 w-8">Q{idx + 1}:</span>
                              <select
                                className="flex-1 border rounded px-3 py-2 text-sm"
                                value={localQuestionAnswers[idx]?.[5] || ''}
                                onChange={(e) => {
                                  const newAnswers = [...localQuestionAnswers];
                                  if (!newAnswers[idx]) {
                                    // For fixed options, we just store the correct answer
                                    newAnswers[idx] = ['', 'A', 'B', 'C', 'D', '', 'E'];
                                  }
                                  newAnswers[idx][5] = e.target.value;
                                  setLocalQuestionAnswers(newAnswers);
                                }}
                              >
                                <option value="">Select...</option>
                                {selectedTask.fixedOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                  /* Regular Reading Parts (1, 2, 4) */
                  (() => {
                    // Part 1: Q1-6 dropdown, Q7-11 paragraph
                    // Part 2: Q1-5 paragraph, Q6-8 dropdown (paragraphQuestionsFirst = true)
                    // Part 4: Q1-5 dropdown, Q6-10 paragraph
                    const paragraphQuestionsFirst = selectedTask.paragraphQuestionsFirst || false;
                    const hasParagraphSection = selectedTask.paragraphQuestions > 0;
                    
                    // Calculate ranges based on order
                    let dropdownStart, dropdownEnd, paragraphStart, paragraphEnd;
                    if (paragraphQuestionsFirst) {
                      // Paragraph first (Part 2): Q1-5 paragraph, Q6-8 dropdown
                      paragraphStart = 0;
                      paragraphEnd = selectedTask.paragraphQuestions;
                      dropdownStart = selectedTask.paragraphQuestions;
                      dropdownEnd = selectedTask.questions;
                    } else {
                      // Dropdown first (Part 1, 4): Q1-6 dropdown, Q7-11 paragraph
                      dropdownStart = 0;
                      dropdownEnd = selectedTask.dropdownQuestions || selectedTask.questions;
                      paragraphStart = selectedTask.dropdownQuestions || selectedTask.questions;
                      paragraphEnd = selectedTask.questions;
                    }
                    
                    // Dropdown Questions JSX
                    const dropdownQuestionsJSX = (dropdownEnd > dropdownStart) && (
                      <div className="space-y-4" key="dropdown-section">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h4 className="font-medium text-blue-800 text-sm">
                            {paragraphQuestionsFirst ? 'Section 2' : 'Section 1'}: Questions {dropdownStart + 1}-{dropdownEnd} (Dropdown Format)
                          </h4>
                          <p className="text-xs text-blue-600 mt-1">
                            Each question has a question text and 4 answer options
                          </p>
                        </div>
                        
                        {Array.from({length: dropdownEnd - dropdownStart}).map((_, i) => {
                          const idx = dropdownStart + i;
                          return (
                            <div key={`dropdown-q-${idx}`} className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                              <h4 className="font-medium text-sm mb-3 text-purple-900">Question {idx + 1}</h4>
                              
                              {/* Upload TXT for this question */}
                              <div className="mb-3">
                                <span className="block text-xs font-medium mb-2">
                                  Upload Question TXT File (Question + Options)
                                </span>
                                <div className="border-2 border-dashed rounded-lg p-3 hover:border-purple-500 transition bg-white">
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-6 h-6 text-purple-500" />
                                    <div className="flex-1">
                                      <p className="text-sm">Upload TXT for Question {idx + 1}</p>
                                      <p className="text-xs text-gray-500">Line 1: Question, Lines 2-5: Options A-D</p>
                                    </div>
                                    <span 
                                      className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs cursor-pointer hover:bg-purple-700"
                                      onClick={() => document.getElementById(`dropdown-file-${idx}`).click()}
                                    >
                                      Choose TXT
                                    </span>
                                    <input 
                                      id={`dropdown-file-${idx}`}
                                      type="file" 
                                      className="hidden"
                                      accept=".txt"
                                      onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            const text = event.target.result;
                                            const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                                              .split('\n')
                                              .map(l => l.trim())
                                              .filter(l => l.length > 0);
                                            
                                            const question = lines[0] || '';
                                            const optA = lines[1]?.replace(/\.$/, '').trim() || '';
                                            const optB = lines[2]?.replace(/\.$/, '').trim() || '';
                                            const optC = lines[3]?.replace(/\.$/, '').trim() || '';
                                            const optD = lines[4]?.replace(/\.$/, '').trim() || '';
                                            
                                            const newAnswers = [...localQuestionAnswers];
                                            while (newAnswers.length <= idx) {
                                              newAnswers.push(['', '', '', '', '', '']);
                                            }
                                            newAnswers[idx] = [question, optA, optB, optC, optD, newAnswers[idx]?.[5] || ''];
                                            setLocalQuestionAnswers(newAnswers);
                                          };
                                          reader.readAsText(file);
                                        }
                                      }}
                                    />
                                  </div>
                                  {localQuestionAnswers[idx]?.[0] && (
                                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Loaded: {localQuestionAnswers[idx][0].substring(0, 40)}...
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Question Text */}
                              <div className="mb-3">
                                <span className="block text-xs font-medium mb-2">Question Text *</span>
                                <input
                                  type="text"
                                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                  placeholder={`Enter question ${idx + 1} text...`}
                                  value={localQuestionAnswers[idx]?.[0] || ''}
                                  onChange={(e) => {
                                    const newAnswers = [...localQuestionAnswers];
                                    if (!newAnswers[idx]) {
                                      newAnswers[idx] = ['', '', '', '', '', ''];
                                    }
                                    newAnswers[idx][0] = e.target.value;
                                    setLocalQuestionAnswers(newAnswers);
                                  }}
                                />
                              </div>

                              {/* Answer Options */}
                              <div className="mb-3">
                                <span className="block text-xs font-medium mb-2">
                                  Answer Options ({selectedTask.questionType === 'reading-abcde' ? '5' : '4'} choices) *
                                </span>
                                <div className="space-y-2 bg-white rounded-lg p-3 border">
                                  {(selectedTask.questionType === 'reading-abcde' ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D']).map((letter, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        localQuestionAnswers[idx]?.[5] === letter 
                                          ? 'bg-green-500 text-white' 
                                          : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {letter}
                                      </span>
                                      <input
                                        type="text"
                                        placeholder={`Option ${letter}...`}
                                        className="flex-1 border rounded px-3 py-2 text-sm"
                                        value={localQuestionAnswers[idx]?.[optIdx + 1] || ''}
                                        onChange={(e) => {
                                          const newAnswers = [...localQuestionAnswers];
                                          if (!newAnswers[idx]) {
                                            newAnswers[idx] = ['', '', '', '', '', '', ''];
                                          }
                                          newAnswers[idx][optIdx + 1] = e.target.value;
                                          setLocalQuestionAnswers(newAnswers);
                                        }}
                                      />
                                    </div>
                                  ))}
                                  
                                  {/* Correct Answer Selector */}
                                  <div className="flex items-center gap-2 pt-2 border-t mt-2">
                                    <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                                      ✓
                                    </span>
                                    <select
                                      className="flex-1 border rounded px-3 py-2 text-sm"
                                      value={localQuestionAnswers[idx]?.[5] || ''}
                                      onChange={(e) => {
                                        const newAnswers = [...localQuestionAnswers];
                                        if (!newAnswers[idx]) {
                                          newAnswers[idx] = ['', '', '', '', '', '', ''];
                                        }
                                        newAnswers[idx][5] = e.target.value;
                                        setLocalQuestionAnswers(newAnswers);
                                      }}
                                    >
                                      <option value="">Select correct answer...</option>
                                      <option value="A">A is correct</option>
                                      <option value="B">B is correct</option>
                                      <option value="C">C is correct</option>
                                      <option value="D">D is correct</option>
                                      {selectedTask.questionType === 'reading-abcde' && (
                                        <option value="E">E is correct</option>
                                      )}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );

                    // Paragraph Questions JSX
                    const paragraphQuestionsJSX = hasParagraphSection && (
                      <div className="space-y-4" key="paragraph-section">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <h4 className="font-medium text-orange-800 text-sm">
                            {paragraphQuestionsFirst ? 'Section 1' : 'Section 2'}: Questions {paragraphStart + 1}-{paragraphEnd} (Fill-in-the-Blank Paragraph)
                          </h4>
                          <p className="text-xs text-orange-600 mt-1">
                            A paragraph with blanks. Use {'{'}1{'}'}, {'{'}2{'}'}, etc. as placeholders in the text.
                          </p>
                        </div>
                        
                        {/* Paragraph Text Input */}
                        <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                          <span className="block text-sm font-medium mb-2">
                            Paragraph Text with Blanks *
                          </span>
                          <p className="text-xs text-gray-600 mb-2">
                            Enter the paragraph and use {'{'}1{'}'}, {'{'}2{'}'}, {'{'}3{'}'}, etc. where dropdowns should appear.
                            <br/>Example: "Hi Jen, I'm so excited you're joining {'{'}1{'}'}. I wanted to share {'{'}2{'}'}."
                          </p>
                          <textarea
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[150px]"
                            placeholder={`Enter paragraph with placeholders like {${paragraphStart + 1}}, {${paragraphStart + 2}}, etc...`}
                            value={localParagraphText || ''}
                            onChange={(e) => setLocalParagraphText(e.target.value)}
                          />
                          
                          {/* Upload TXT for paragraph */}
                          <div className="mt-3 border-t pt-3">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-orange-500" />
                              <span className="text-sm">Or upload paragraph TXT file</span>
                              <span 
                                className="px-3 py-1.5 bg-orange-600 text-white rounded text-xs cursor-pointer hover:bg-orange-700"
                                onClick={() => document.getElementById('paragraph-file-input').click()}
                              >
                                Choose TXT
                              </span>
                              <input 
                                id="paragraph-file-input"
                                type="file" 
                                className="hidden"
                                accept=".txt"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setLocalParagraphText(event.target.result);
                                    };
                                    reader.readAsText(file);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Options for each blank */}
                        {Array.from({length: paragraphEnd - paragraphStart}).map((_, i) => {
                          const idx = paragraphStart + i;
                          const blankNum = idx + 1;
                          return (
                            <div key={`blank-${idx}`} className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                              <h4 className="font-medium text-sm mb-3 text-yellow-900">
                                Blank {blankNum} Options (shown as dropdown in paragraph)
                              </h4>
                              
                              {/* Upload TXT for this blank's options */}
                              <div className="mb-3">
                                <div className="border-2 border-dashed rounded-lg p-3 hover:border-yellow-500 transition bg-white">
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-6 h-6 text-yellow-600" />
                                    <div className="flex-1">
                                      <p className="text-sm">Upload TXT for Blank {blankNum}</p>
                                      <p className="text-xs text-gray-500">Lines 1-4: Options A-D (no question text needed)</p>
                                    </div>
                                    <span 
                                      className="px-3 py-1.5 bg-yellow-600 text-white rounded text-xs cursor-pointer hover:bg-yellow-700"
                                      onClick={() => document.getElementById(`blank-file-${idx}`).click()}
                                    >
                                      Choose TXT
                                    </span>
                                    <input 
                                      id={`blank-file-${idx}`}
                                      type="file" 
                                      className="hidden"
                                      accept=".txt"
                                      onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            const text = event.target.result;
                                            const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                                              .split('\n')
                                              .map(l => l.trim())
                                              .filter(l => l.length > 0);
                                            
                                            // For blanks: no question, just 4 options
                                            const optA = lines[0]?.replace(/\.$/, '').trim() || '';
                                            const optB = lines[1]?.replace(/\.$/, '').trim() || '';
                                            const optC = lines[2]?.replace(/\.$/, '').trim() || '';
                                            const optD = lines[3]?.replace(/\.$/, '').trim() || '';
                                            
                                            const newAnswers = [...localQuestionAnswers];
                                            while (newAnswers.length <= idx) {
                                              newAnswers.push(['', '', '', '', '', '']);
                                            }
                                            // Store as: ['', optA, optB, optC, optD, correctAnswer]
                                            // Empty string at [0] indicates it's a blank (no question text)
                                            newAnswers[idx] = ['', optA, optB, optC, optD, newAnswers[idx]?.[5] || ''];
                                            setLocalQuestionAnswers(newAnswers);
                                          };
                                          reader.readAsText(file);
                                        }
                                      }}
                                    />
                                  </div>
                                  {localQuestionAnswers[idx]?.[1] && (
                                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Options loaded
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Answer Options */}
                              <div className="space-y-2 bg-white rounded-lg p-3 border">
                                {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      localQuestionAnswers[idx]?.[5] === letter 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {letter}
                                    </span>
                                    <input
                                      type="text"
                                      placeholder={`Option ${letter}...`}
                                      className="flex-1 border rounded px-3 py-2 text-sm"
                                      value={localQuestionAnswers[idx]?.[optIdx + 1] || ''}
                                      onChange={(e) => {
                                        const newAnswers = [...localQuestionAnswers];
                                        if (!newAnswers[idx]) {
                                          newAnswers[idx] = ['', '', '', '', '', ''];
                                        }
                                        newAnswers[idx][optIdx + 1] = e.target.value;
                                        setLocalQuestionAnswers(newAnswers);
                                      }}
                                    />
                                  </div>
                                ))}
                                
                                {/* Correct Answer Selector */}
                                <div className="flex items-center gap-2 pt-2 border-t mt-2">
                                  <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                                    ✓
                                  </span>
                                  <select
                                    className="flex-1 border rounded px-3 py-2 text-sm"
                                    value={localQuestionAnswers[idx]?.[5] || ''}
                                    onChange={(e) => {
                                      const newAnswers = [...localQuestionAnswers];
                                      if (!newAnswers[idx]) {
                                        newAnswers[idx] = ['', '', '', '', '', ''];
                                      }
                                      newAnswers[idx][5] = e.target.value;
                                      setLocalQuestionAnswers(newAnswers);
                                    }}
                                  >
                                    <option value="">Select correct answer...</option>
                                    <option value="A">A is correct</option>
                                    <option value="B">B is correct</option>
                                    <option value="C">C is correct</option>
                                    <option value="D">D is correct</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                    
                    // Render in correct order based on paragraphQuestionsFirst
                    return (
                      <div className="space-y-6">
                        {paragraphQuestionsFirst ? (
                          <>
                            {paragraphQuestionsJSX}
                            {dropdownQuestionsJSX}
                          </>
                        ) : (
                          <>
                            {dropdownQuestionsJSX}
                            {paragraphQuestionsJSX}
                          </>
                        )}
                      </div>
                    );
                  })()
                  )}
                </div>

                {/* Answer Key Section for Reading */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">
                    Answer Key Document *
                  </label>
                  <div className="border-2 border-dashed rounded-lg p-4 hover:border-green-500 transition bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Upload answer key with correct answers</p>
                        <p className="text-xs text-gray-500">TXT, PDF, DOCX - Include correct answer for each question</p>
                      </div>
                      <label className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm cursor-pointer hover:bg-green-700">
                        Choose File
                        <input 
                          type="file" 
                          className="hidden"
                          accept=".txt,.pdf,.docx"
                          onChange={(e) => setFormData({...formData, answerKey: e.target.files[0]})}
                        />
                      </label>
                    </div>
                    {formData.answerKey && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {formData.answerKey.name || formData.answerKey}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Speaking Images Upload */}
            {isSpeaking && selectedTask && selectedTask.hasImage && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formData.task === 'part5' ? 'Comparison Options (2 required)' : 'Scene Image *'}
                </h3>
                
                {formData.task === 'part5' ? (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-600 mb-3">
                      Upload 3 images: Option A, Option B (for selection stage), and Image C (Your Family's Choice for comparison stage).
                    </p>

                    {/* Option A */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-3">Option A (Selection Stage)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Option A Image *</label>
                          <div className="border-2 border-dashed rounded-lg p-3 hover:border-blue-500 transition bg-white">
                            <div className="flex items-center gap-2">
                              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-xs">JPG, PNG (Max 5MB)</p>
                              </div>
                              <label className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs cursor-pointer hover:bg-blue-700">
                                Choose
                                <input 
                                  type="file" 
                                  className="hidden"
                                  accept=".jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const newImages = [...localSpeakingImages];
                                    newImages[0] = e.target.files[0];
                                    setLocalSpeakingImages(newImages);
                                  }}
                                />
                              </label>
                            </div>
                            {localSpeakingImages[0] && (
                              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {localSpeakingImages[0].name || 'Uploaded'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Option A Title *</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="e.g., New Downtown Townhouse"
                            value={localOptionATitle}
                            onChange={(e) => setLocalOptionATitle(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-2">Option A Details *</label>
                        <textarea
                          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                          placeholder="- detail 1&#10;- detail 2&#10;- detail 3"
                          value={localOptionADetails}
                          onChange={(e) => setLocalOptionADetails(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Option B */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-3">Option B (Selection Stage)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Option B Image *</label>
                          <div className="border-2 border-dashed rounded-lg p-3 hover:border-green-500 transition bg-white">
                            <div className="flex items-center gap-2">
                              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-xs">JPG, PNG (Max 5MB)</p>
                              </div>
                              <label className="px-3 py-1.5 bg-green-600 text-white rounded text-xs cursor-pointer hover:bg-green-700">
                                Choose
                                <input 
                                  type="file" 
                                  className="hidden"
                                  accept=".jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const newImages = [...localSpeakingImages];
                                    newImages[1] = e.target.files[0];
                                    setLocalSpeakingImages(newImages);
                                  }}
                                />
                              </label>
                            </div>
                            {localSpeakingImages[1] && (
                              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {localSpeakingImages[1].name || 'Uploaded'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Option B Title *</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="Enter option B title"
                            value={localOptionBTitle}
                            onChange={(e) => setLocalOptionBTitle(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-2">Option B Details *</label>
                        <textarea
                          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                          placeholder="- detail 1&#10;- detail 2&#10;- detail 3"
                          value={localOptionBDetails}
                          onChange={(e) => setLocalOptionBDetails(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Image C - Other Person's Choice (for comparison stage) */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-800 mb-3">Image C - Other Person's Choice (Comparison Stage)</h4>
                      <p className="text-xs text-yellow-700 mb-3">This is the alternative option suggested by another person (manager, family, friend, etc.) in Stage 2.</p>
                      
                      {/* Label for who is suggesting */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Who is suggesting this option? *</label>
                        <input
                          type="text"
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g., Your Family, Your Manager, Your Friend, Your Colleague"
                          value={localOptionCLabel}
                          onChange={(e) => setLocalOptionCLabel(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">This will appear as "[Person]'s Choice" in the comparison view</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Their Choice Image *</label>
                          <div className="border-2 border-dashed rounded-lg p-3 hover:border-yellow-500 transition bg-white">
                            <div className="flex items-center gap-2">
                              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-xs">JPG, PNG (Max 5MB)</p>
                              </div>
                              <label className="px-3 py-1.5 bg-yellow-600 text-white rounded text-xs cursor-pointer hover:bg-yellow-700">
                                Choose
                                <input 
                                  type="file" 
                                  className="hidden"
                                  accept=".jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const newImages = [...localSpeakingImages];
                                    newImages[2] = e.target.files[0];
                                    setLocalSpeakingImages(newImages);
                                  }}
                                />
                              </label>
                            </div>
                            {localSpeakingImages[2] && (
                              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {localSpeakingImages[2].name || 'Uploaded'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Their Choice Title *</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            placeholder="Enter comparison option title"
                            value={localOptionCTitle}
                            onChange={(e) => setLocalOptionCTitle(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-2">Their Choice Details *</label>
                        <textarea
                          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                          placeholder="- detail 1&#10;- detail 2&#10;- detail 3"
                          value={localOptionCDetails}
                          onChange={(e) => setLocalOptionCDetails(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Regular image upload for Parts 3, 4, 8 */
                  Array.from({length: selectedTask.imageCount || 1}).map((_, idx) => (
                    <div key={idx} className="mb-3">
                      <label className="block text-sm font-medium mb-2">Scene Image *</label>
                      <div className="border-2 border-dashed rounded-lg p-4 hover:border-orange-500 transition bg-orange-50">
                        <div className="flex items-center gap-3">
                          <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {formData.task === 'part3' && 'Upload classroom/scene image'}
                              {formData.task === 'part4' && 'Upload prediction scenario image'}
                              {formData.task === 'part8' && 'Upload unusual item image'}
                            </p>
                            <p className="text-xs text-gray-500">JPG, PNG (Max 5MB)</p>
                          </div>
                          <label className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm cursor-pointer hover:bg-orange-700">
                            Choose File
                            <input 
                              type="file" 
                              className="hidden"
                              accept=".jpg,.jpeg,.png"
                              onChange={(e) => {
                                const newImages = [...localSpeakingImages];
                                newImages[idx] = e.target.files[0];
                                setLocalSpeakingImages(newImages);
                              }}
                            />
                          </label>
                        </div>
                        {localSpeakingImages[idx] && (
                          <div className="mt-2">
                            <p className="text-sm text-green-600 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              {localSpeakingImages[idx].name || localSpeakingImages[idx]}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Speaking Instructions & Sample Answer */}
            {isSpeaking && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-orange-600" />
                  Speaking Task Content
                </h3>

                {/* Part 5 has two prompts: Selection and Comparison */}
                {formData.task === 'part5' ? (
                  <>
                    {/* Selection Prompt (Stage 1 - no speaking) */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Selection Prompt (Stage 1) *
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Instructions shown when user chooses an option (no speaking required)
                      </p>
                      <textarea
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[100px]"
                        placeholder="Enter stage 2 comparison instructions"
                        value={localSelectionPrompt}
                        onChange={(e) => setLocalSelectionPrompt(e.target.value)}
                      />
                    </div>

                    {/* Comparison Prompt (Stage 2 - speaking) */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Comparison Prompt (Stage 2 - Speaking) *
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Instructions shown when user speaks to persuade (after selection)
                      </p>
                      <textarea
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[100px]"
                        placeholder="Enter stage 2 comparison instructions"
                        value={localComparisonPrompt}
                        onChange={(e) => setLocalComparisonPrompt(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  /* Regular Speaking Prompt for other parts */
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Speaking Prompt/Question *
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Enter the speaking task instructions that will be shown to students
                    </p>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[120px]"
                      placeholder="Enter speaking task instructions"
                      value={localSpeakingPrompt}
                      onChange={(e) => setLocalSpeakingPrompt(e.target.value)}
                    />
                  </div>
                )}

                {/* Recording Time */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Recording Time (seconds)
                  </label>
                  <input
                    type="number"
                    className="w-32 border rounded-lg px-3 py-2 text-sm"
                    placeholder="90"
                    min="30"
                    max="180"
                    value={localRecordingTime}
                    onChange={(e) => setLocalRecordingTime(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 90 seconds</p>
                </div>

                {/* Sample Responses */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700">Sample Responses (for AI evaluation reference)</h4>
                  
                  {/* Basic Sample */}
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <label className="block text-sm font-medium mb-2 text-yellow-800">
                      Sample Response (Basic) - Score 5-6
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[100px]"
                      placeholder="Enter a basic level sample spoken response transcript..."
                      value={localSpeakingSampleBasic}
                      onChange={(e) => setLocalSpeakingSampleBasic(e.target.value)}
                    />
                  </div>

                  {/* Good Sample */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block text-sm font-medium mb-2 text-blue-800">
                      Sample Response (Good) - Score 7-8
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[100px]"
                      placeholder="Enter a good level sample spoken response transcript..."
                      value={localSpeakingSampleGood}
                      onChange={(e) => setLocalSpeakingSampleGood(e.target.value)}
                    />
                  </div>

                  {/* Excellent Sample */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <label className="block text-sm font-medium mb-2 text-green-800">
                      Sample Response (Excellent) - Score 9-12
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[100px]"
                      placeholder="Enter an excellent level sample spoken response transcript..."
                      value={localSpeakingSampleExcellent}
                      onChange={(e) => setLocalSpeakingSampleExcellent(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Writing Section Upload */}
            {isWriting && selectedTask && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  Writing Task Content
                </h3>

                {/* Writing Prompt/Question */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Writing Prompt/Question *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Enter the complete writing task instructions that will be shown to students
                  </p>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[150px]"
                    placeholder="Enter writing task instructions"
                    value={localWritingPrompt}
                    onChange={(e) => setLocalWritingPrompt(e.target.value)}
                  />
                </div>

                {/* Sample Responses */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700">Sample Responses (for AI evaluation reference)</h4>
                  
                  {/* Basic Sample */}
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <label className="block text-sm font-medium mb-2 text-yellow-800">
                      Sample Response (Basic) - Score 5-6
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[100px]"
                      placeholder="Enter a basic level sample response..."
                      value={localSampleBasic}
                      onChange={(e) => setLocalSampleBasic(e.target.value)}
                    />
                  </div>

                  {/* Good Sample */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block text-sm font-medium mb-2 text-blue-800">
                      Sample Response (Good) - Score 7-8
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[100px]"
                      placeholder="Enter a good level sample response..."
                      value={localSampleGood}
                      onChange={(e) => setLocalSampleGood(e.target.value)}
                    />
                  </div>

                  {/* Excellent Sample */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <label className="block text-sm font-medium mb-2 text-green-800">
                      Sample Response (Excellent) - Score 9-12
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[100px]"
                      placeholder="Enter an excellent level sample response..."
                      value={localSampleExcellent}
                      onChange={(e) => setLocalSampleExcellent(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Generic file upload for non-specific materials */}
            {!isListening && !isSpeaking && !isReading && !isWriting && (
              <div>
                <label className="block text-sm font-medium mb-2">Material File *</label>
                <div className="border-2 border-dashed rounded-lg p-4 hover:border-purple-500 transition">
                  <div className="flex items-center gap-3">
                    <Upload className="w-8 h-8 text-purple-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload material file</p>
                      <p className="text-xs text-gray-500">PDF, DOCX (Max 50MB)</p>
                    </div>
                    <label className="px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                      Choose File
                      <input 
                        type="file" 
                        className="hidden"
                        accept=".pdf,.docx"
                        onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
                      />
                    </label>
                  </div>
                  {formData.file && (
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {formData.file.name || formData.file}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t">
              <button 
                type="button"
                className="flex-1 border px-6 py-3 rounded-lg hover:bg-gray-50"
                onClick={() => {
                  setShowUploadModal(false);
                  setEditingMaterial(null);
                  resetFormData();
                }}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                onClick={handleSubmit}
              >
                <Save className="w-5 h-5" />
                {editingMaterial ? 'Update Material' : 'Save as Draft'}
              </button>
            </div>
          </div>
          </form>
        </div>
      </div>
    );
  };

  const Sidebar = () => {
  // Count materials for each listening part (practice)
const getPartCount = (partId, isMock = false, skill = "listening") => {
  return materials.filter((m) =>
    m.skill === skill &&
    m.taskId === partId &&
    (isMock ? m.isMock === true : m.isMock !== true)
  ).length;
};


  // Count materials for mock exam sections
  const getMockCount = (skill) => {
    if (skill === 'all') {
      return materials.filter(m => m.isMock === true).length;
    }
    return materials.filter(m => m.skill === skill && m.isMock === true).length;
  };

  // Count materials for practice sections
  const getPracticeCount = (skill) => {
    return materials.filter(m => m.skill === skill && m.isMock !== true).length;
  };

  const listeningParts = [
    { id: 'part1', name: 'Part 1: Problem Solving' },
    { id: 'part2', name: 'Part 2: Daily Life' },
    { id: 'part3', name: 'Part 3: Information' },
    { id: 'part4', name: 'Part 4: News Item' },
    { id: 'part5', name: 'Part 5: Discussion' },
    { id: 'part6', name: 'Part 6: Viewpoints' }
  ];

  return (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Award className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-xl font-bold">CELPIP</h1>
            <p className="text-xs text-gray-400">Admin Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Dashboard */}
        <button
          onClick={() => { setActiveTab('dashboard'); setActiveSubTab(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            activeTab === 'dashboard' ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        {/* Mock Exam Section with expandable sub-sections */}
        <div>
          <button
            onClick={() => {
              setExpandedSections(prev => ({ ...prev, listening: false, speaking: false, reading: false, writing: false, practiceExam: false, mock: !prev.mock }));
              if (!expandedSections.mock) {
                setActiveTab('mock');
                setActiveSubTab(null);
              }
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
              activeTab === 'mock' ? 'bg-purple-600' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5" />
              <span>Mock Exam</span>
              {getMockCount('all') > 0 && (
                <span className="bg-purple-500 text-xs px-2 py-0.5 rounded-full">
                  {getMockCount('all')}
                </span>
              )}
            </div>
            {expandedSections.mock ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {expandedSections.mock && (
            <div className="ml-4 mt-1 space-y-1">
              {/* Mock Listening with nested parts */}
              <div>
                <button
                  onClick={() => {
                    setExpandedSections(prev => ({ ...prev, mockListening: !prev.mockListening }));
                    setActiveTab('mock');
                    setActiveSubTab('mock-listening');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition ${
                    activeSubTab === 'mock-listening' || activeSubTab?.startsWith('mock-listening-') 
                      ? 'bg-purple-500 text-white' 
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    <span>Listening</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getMockCount('listening') > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400">
                        {getMockCount('listening')}
                      </span>
                    )}
                    {expandedSections.mockListening ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </button>
                
                {expandedSections.mockListening && (
                  <div className="ml-4 mt-1 space-y-1">
                    {listeningParts.map(part => {
                      const count = getPartCount(part.id, true);
                      return (
                        <button
                          key={`mock-${part.id}`}
                          onClick={() => { setActiveTab('mock'); setActiveSubTab(`mock-listening-${part.id}`); }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                            activeSubTab === `mock-listening-${part.id}` 
                              ? 'bg-purple-400 text-white' 
                              : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{part.name}</span>
                          {count > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-500 text-white">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mock Reading with nested parts */}
<div>
  <button
    onClick={() => {
      setExpandedSections((prev) => ({
        ...prev,
        mockReading: !prev.mockReading,
        mockListening: false,
        mockWriting: false,
        mockSpeaking: false,
      }));
      setActiveTab("mock");
      setActiveSubTab("mock-reading");
    }}
    className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition ${
      activeSubTab === "mock-reading" || activeSubTab?.startsWith("mock-reading-")
        ? "bg-purple-500 text-white"
        : "text-gray-400 hover:bg-gray-800 hover:text-white"
    }`}
  >
    <div className="flex items-center gap-2">
      <FileText className="w-4 h-4" />
      <span>Reading</span>
    </div>

    <div className="flex items-center gap-2">
      {getMockCount("reading") > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400">
          {getMockCount("reading")}
        </span>
      )}
      {expandedSections.mockReading ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )}
    </div>
  </button>

  {expandedSections.mockReading && (
    <div className="ml-4 mt-1 space-y-1">
      {skillTasks.reading.map((part) => {
        const count = getPartCount(part.id, true, "reading");
        return (
          <button
            key={`mock-reading-${part.id}`}
            onClick={() => {
              setActiveTab("mock");
              setActiveSubTab(`mock-reading-${part.id}`);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
              activeSubTab === `mock-reading-${part.id}`
                ? "bg-purple-400 text-white"
                : "text-gray-500 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span className="truncate">{part.name}</span>
            {count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  )}
</div>

{/* Mock Writing with nested parts */}
<div>
  <button
    onClick={() => {
      setExpandedSections((prev) => ({
        ...prev,
        mockWriting: !prev.mockWriting,
        mockListening: false,
        mockReading: false,
        mockSpeaking: false,
      }));
      setActiveTab("mock");
      setActiveSubTab("mock-writing");
    }}
    className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition ${
      activeSubTab === "mock-writing" || activeSubTab?.startsWith("mock-writing-")
        ? "bg-purple-500 text-white"
        : "text-gray-400 hover:bg-gray-800 hover:text-white"
    }`}
  >
    <div className="flex items-center gap-2">
      <Edit className="w-4 h-4" />
      <span>Writing</span>
    </div>

    <div className="flex items-center gap-2">
      {getMockCount("writing") > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400">
          {getMockCount("writing")}
        </span>
      )}
      {expandedSections.mockWriting ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )}
    </div>
  </button>

  {expandedSections.mockWriting && (
    <div className="ml-4 mt-1 space-y-1">
      {skillTasks.writing.map((part) => {
        const count = getPartCount(part.id, true, "writing");
        return (
          <button
            key={`mock-writing-${part.id}`}
            onClick={() => {
              setActiveTab("mock");
              setActiveSubTab(`mock-writing-${part.id}`);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
              activeSubTab === `mock-writing-${part.id}`
                ? "bg-purple-400 text-white"
                : "text-gray-500 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span className="truncate">{part.name}</span>
            {count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  )}
</div>

{/* Mock Speaking with nested parts */}
<div>
  <button
    onClick={() => {
      setExpandedSections((prev) => ({
        ...prev,
        mockSpeaking: !prev.mockSpeaking,
        mockListening: false,
        mockReading: false,
        mockWriting: false,
      }));
      setActiveTab("mock");
      setActiveSubTab("mock-speaking");
    }}
    className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition ${
      activeSubTab === "mock-speaking" || activeSubTab?.startsWith("mock-speaking-")
        ? "bg-purple-500 text-white"
        : "text-gray-400 hover:bg-gray-800 hover:text-white"
    }`}
  >
    <div className="flex items-center gap-2">
      <Mic className="w-4 h-4" />
      <span>Speaking</span>
    </div>

    <div className="flex items-center gap-2">
      {getMockCount("speaking") > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400">
          {getMockCount("speaking")}
        </span>
      )}
      {expandedSections.mockSpeaking ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )}
    </div>
  </button>

  {expandedSections.mockSpeaking && (
    <div className="ml-4 mt-1 space-y-1">
      {skillTasks.speaking.map((part) => {
        const count = getPartCount(part.id, true, "speaking");
        return (
          <button
            key={`mock-speaking-${part.id}`}
            onClick={() => {
              setActiveTab("mock");
              setActiveSubTab(`mock-speaking-${part.id}`);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
              activeSubTab === `mock-speaking-${part.id}`
                ? "bg-purple-400 text-white"
                : "text-gray-500 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span className="truncate">{part.name}</span>
            {count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  )}
</div>

            </div>
          )}
        </div>

{/* Practice Exam Section */}
        <div>
          <button
onClick={() => {
              setExpandedSections(prev => ({ ...prev, mock: false, mockListening: false, mockReading: false, mockWriting: false, mockSpeaking: false, practiceExam: !prev.practiceExam }));
              if (!expandedSections.practiceExam) {
                setActiveTab('practice');
                setActiveSubTab(null);
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition ${
              ['listening','reading','writing','speaking','practice'].includes(activeTab) ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5" />
              <span className="whitespace-nowrap">Practice Exam</span>
              {(['listening','reading','writing','speaking'].reduce((sum, skill) => sum + getPracticeCount(skill), 0)) > 0 && (
                <span className="bg-blue-500 text-xs px-2 py-0.5 rounded-full">
                  {['listening','reading','writing','speaking'].reduce((sum, skill) => sum + getPracticeCount(skill), 0)}
                </span>
              )}
            </div>
            {expandedSections.practiceExam ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandedSections.practiceExam && (
            <div className="ml-4 mt-1 space-y-1">

              {/* Practice Listening */}
              <div>
                <button
                  onClick={() => {
                    setExpandedSections(prev => ({ ...prev, listening: !prev.listening, speaking: false, reading: false, writing: false }));
                    setActiveTab('listening');
                    setActiveSubTab(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition ${
                    activeTab === 'listening' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
				   <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    <span>Listening</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPracticeCount('listening') > 0 && (
                      <span className="bg-blue-400 text-xs px-2 py-0.5 rounded-full">
                        {getPracticeCount('listening')}
                      </span>
                    )}
                    {expandedSections.listening ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </button>
                {expandedSections.listening && (
                  <div className="ml-4 mt-1 space-y-1">
                    {listeningParts.map(part => {
                      const count = getPartCount(part.id, false);
                      return (
                        <button
                          key={part.id}
                          onClick={() => { setActiveTab('listening'); setActiveSubTab(part.id); }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                            (activeTab === 'listening' && activeSubTab === part.id)
                              ? 'bg-blue-400 text-white'
                              : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{part.name}</span>
                          {count > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700">{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Practice Reading */}
              <div>
                <button
                  onClick={() => {
                    setExpandedSections(prev => ({ ...prev, reading: !prev.reading, listening: false, speaking: false, writing: false }));
                    setActiveTab('reading');
                    setActiveSubTab(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition ${
                    activeTab === 'reading' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
<div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Reading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPracticeCount('reading') > 0 && (
                      <span className="bg-blue-400 text-xs px-2 py-0.5 rounded-full">
                        {getPracticeCount('reading')}
                      </span>
                    )}
                    {expandedSections.reading ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </button>
                {expandedSections.reading && (
                  <div className="ml-4 mt-1 space-y-1">
                    {skillTasks.reading.map((task) => {
                      const dbTaskId = task.id.replace("task", "part");
                      const count = materials.filter(m => m.skill === "reading" && m.taskId === dbTaskId && m.isMock !== true).length;
                      return (
                        <button
                          key={task.id}
                          onClick={() => { setActiveTab("reading"); setActiveSubTab(dbTaskId); }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                            activeTab === "reading" && activeSubTab === dbTaskId
                              ? "bg-blue-400 text-white"
                              : "text-gray-500 hover:bg-gray-800 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{task.name}</span>
                          {count > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700">{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Practice Writing */}
              <div>
                <button
                  onClick={() => {
                    setExpandedSections(prev => ({ ...prev, writing: !prev.writing, listening: false, speaking: false, reading: false }));
                    setActiveTab('writing');
                    setActiveSubTab(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition ${
                    activeTab === 'writing' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
<div className="flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    <span>Writing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPracticeCount('writing') > 0 && (
                      <span className="bg-blue-400 text-xs px-2 py-0.5 rounded-full">
                        {getPracticeCount('writing')}
                      </span>
                    )}
                    {expandedSections.writing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </button>
                {expandedSections.writing && (
                  <div className="ml-4 mt-1 space-y-1">
                    {skillTasks.writing.map((task) => {
                      const dbTaskId = task.id.replace("task", "part");
                      const count = materials.filter(m => m.skill === "writing" && m.taskId === dbTaskId && m.isMock !== true).length;
                      return (
                        <button
                          key={task.id}
                          onClick={() => { setActiveTab("writing"); setActiveSubTab(dbTaskId); }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                            activeTab === "writing" && activeSubTab === dbTaskId
                              ? "bg-blue-400 text-white"
                              : "text-gray-500 hover:bg-gray-800 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{task.name}</span>
                          {count > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700">{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Practice Speaking */}
              <div>
                <button
                  onClick={() => {
                    setExpandedSections(prev => ({ ...prev, speaking: !prev.speaking, listening: false, reading: false, writing: false }));
                    setActiveTab('speaking');
                    setActiveSubTab(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition ${
                    activeTab === 'speaking' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
<div className="flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    <span>Speaking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSpeakingPracticeCount() > 0 && (
                      <span className="bg-orange-500 text-xs px-2 py-0.5 rounded-full">
                        {getSpeakingPracticeCount()}
                      </span>
                    )}
                    {expandedSections.speaking ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </button>
                {expandedSections.speaking && (
                  <div className="ml-4 mt-1 space-y-1">
                    {speakingParts.map(part => {
                      const count = getSpeakingPartCount(part.id, false);
                      return (
                        <button
                          key={part.id}
                          onClick={() => { setActiveTab('speaking'); setActiveSubTab(part.id); }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                            (activeTab === 'speaking' && activeSubTab === part.id)
                              ? 'bg-orange-500 text-white'
                              : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{part.name}</span>
                          {count > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700">{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Students */}
        {/* Students */}
        <button
          onClick={() => { setActiveTab('students'); setActiveSubTab(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            activeTab === 'students' ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Students</span>
        </button>

        {/* Analytics */}
        <button
          onClick={() => { setActiveTab('analytics'); setActiveSubTab(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            activeTab === 'analytics' ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Analytics</span>
        </button>
{		/* API Settings */}
        <button
          onClick={() => { setActiveTab('api-settings'); setActiveSubTab(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            activeTab === 'api-settings' ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span>API Settings</span>
        </button>
        {/* Settings */}
        <button
          onClick={() => { setActiveTab('settings'); setActiveSubTab(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            activeTab === 'settings' ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
		
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

  const MaterialsView = () => {
    const filteredMaterials = materials.filter(m => {
		  let matchesTab = false;
		  
		  if (activeTab === 'practice') {
        // All practice materials (non-mock)
        matchesTab = m.isMock !== true;
      } else if (activeTab === 'mock') {
			// Mock exam filtering
			if (activeSubTab === 'mock-listening') {
			  matchesTab = m.skill === 'listening' && m.isMock === true;
			} else if (activeSubTab?.startsWith('mock-listening-')) {
			  const partId = activeSubTab.replace('mock-listening-', '');
			  matchesTab = m.skill === 'listening' && m.taskId === partId && m.isMock === true;
			} else if (activeSubTab === 'mock-reading') {
			  matchesTab = m.skill === 'reading' && m.isMock === true;
			} else if (activeSubTab === 'mock-writing') {
			  matchesTab = m.skill === 'writing' && m.isMock === true;
			} else if (activeSubTab?.startsWith("mock-reading-")) {
  const partId = activeSubTab.replace("mock-reading-", "");
  matchesTab = m.skill === "reading" && m.taskId === partId && m.isMock === true;

} else if (activeSubTab?.startsWith("mock-writing-")) {
  const partId = activeSubTab.replace("mock-writing-", "");
  matchesTab = m.skill === "writing" && m.taskId === partId && m.isMock === true;

} else if (activeSubTab?.startsWith("mock-speaking-")) {
  const partId = activeSubTab.replace("mock-speaking-", "");
  matchesTab = m.skill === "speaking" && m.taskId === partId && m.isMock === true;
  } else if (activeSubTab === 'mock-speaking') {
			  matchesTab = m.skill === 'speaking' && m.isMock === true;
			} else {
			  matchesTab = m.isMock === true; // All mock materials
			}
			} else if (activeTab === 'listening' && activeSubTab) {
			  // Practice listening sub-section
			  matchesTab = m.skill === 'listening' && m.taskId === activeSubTab && m.isMock !== true;
			} else if (activeTab === 'listening') {
			  // All practice listening
			  matchesTab = m.skill === 'listening' && m.isMock !== true;
			} else if (activeTab === 'speaking' && activeSubTab) {
			  // Practice speaking sub-section
			  matchesTab = m.skill === 'speaking' && m.taskId === activeSubTab && m.isMock !== true;
			} else if (activeTab === 'speaking') {
			  // All practice speaking
			  matchesTab = m.skill === 'speaking' && m.isMock !== true;
			  
			  } else if (activeTab === "reading" && activeSubTab) {
  // ✅ Practice reading sub-section
  matchesTab = m.skill === "reading" && m.taskId === activeSubTab && m.isMock !== true;

} else if (activeTab === "reading") {
  // ✅ All practice reading
  matchesTab = m.skill === "reading" && m.isMock !== true;

} else if (activeTab === "writing" && activeSubTab) {
  // ✅ Practice writing sub-section
  matchesTab = m.skill === "writing" && m.taskId === activeSubTab && m.isMock !== true;

} else if (activeTab === "writing") {
  // ✅ All practice writing
  matchesTab = m.skill === "writing" && m.isMock !== true;
  
			} else {
			// Other practice sections
			matchesTab = m.skill === activeTab && m.isMock !== true;
		  }
		  
		  const matchesSearch = searchQuery === '' || 
			m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			m.task.toLowerCase().includes(searchQuery.toLowerCase());
		  return matchesTab && matchesSearch;
		});

    const getSkillIcon = (skill) => {
      const icons = {
        listening: <Headphones className="w-5 h-5 text-blue-600" />,
        reading: <BookOpen className="w-5 h-5 text-green-600" />,
        writing: <Edit className="w-5 h-5 text-purple-600" />,
        speaking: <Mic className="w-5 h-5 text-orange-600" />
      };
      return icons[skill] || <FileText className="w-5 h-5 text-gray-600" />;
    };

    return (
      <div className="space-y-6">
        <div className="flex gap-4 justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search materials..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Filter className="w-5 h-5" />
              Filter
            </button>
<button
  onClick={() => {
    const isMockTab = activeTab === "mock";

    const derivedSkill =
      !isMockTab
        ? (activeTab === "materials" ? "" : activeTab)
        : activeSubTab?.includes("listening") ? "listening"
        : activeSubTab?.includes("reading") ? "reading"
        : activeSubTab?.includes("writing") ? "writing"
        : activeSubTab?.includes("speaking") ? "speaking"
        : "listening";

    const derivedTask =
      !isMockTab
        ? (activeSubTab || "")
        : activeSubTab?.startsWith("mock-listening-") ? activeSubTab.replace("mock-listening-", "")
        : activeSubTab?.startsWith("mock-reading-") ? activeSubTab.replace("mock-reading-", "")
        : activeSubTab?.startsWith("mock-writing-") ? activeSubTab.replace("mock-writing-", "")
        : activeSubTab?.startsWith("mock-speaking-") ? activeSubTab.replace("mock-speaking-", "")
        : "";

    openUploadModal(derivedSkill, derivedTask, isMockTab);
  }}
  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  <Plus className="w-5 h-5" />
  Upload New
</button>

          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                {activeTab === 'materials' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
				{activeTab === "mock" && (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
    Mock
  </th>
)}

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloads</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMaterials.map((material, index) => (
				  <tr key={material.id} className="hover:bg-gray-50">
					<td className="px-6 py-4">
					  <div className="flex items-center gap-3">
						<span className="text-gray-400 font-medium w-6 text-center">{index + 1}.</span>
						<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
						  {getSkillIcon(material.skill)}
						</div>
						<p className="font-medium">{material.title}</p>
					  </div>
					</td>
                  {activeTab === 'materials' && (
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-sm capitalize">
                        {material.skill}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-600">{material.task}</td>
				  {activeTab === "mock" && (
  <td className="px-6 py-4 text-sm text-gray-600">
    {material.isMock ? `Mock ${material.mockSet ?? "-"}` : "-"}
  </td>
)}

                  <td className="px-6 py-4">
                    <button
                      onClick={() => togglePublishStatus(material.id)}
                      className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition hover:opacity-80 ${
                        material.status === 'Published' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {material.status === 'Published' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {material.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{material.date}</td>
                  <td className="px-6 py-4 text-gray-600">{material.downloads}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        className="p-2 hover:bg-blue-50 rounded-lg"
                        onClick={() => openPreviewPage(material)}
                        title="Preview Content"
                      >
                        <Play className="w-4 h-4 text-blue-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        onClick={() => openViewModal(material)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-blue-50 rounded-lg"
                        onClick={() => openEditModal(material)}
                        title="Edit Material"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-red-50 rounded-lg"
                        onClick={() => handleDelete(material.id)}
                        title="Delete Material"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMaterials.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No materials found</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
    const StudentsView = () => {
    const onlyStudents = students.filter(
      (student: any) => (student.role || "user").toLowerCase() !== "admin"
    );

    const q = studentSearchQuery.trim().toLowerCase();

const filteredStudents = onlyStudents.filter((student: any) => {
  if (!q) return true;

  return (
    (student.name || "").toLowerCase().includes(q) ||
    (student.email || "").toLowerCase().includes(q) ||
    (student.accountStatus || "active").toLowerCase().includes(q) ||
    prettifyPlan(student.subscriptionPlan).toLowerCase().includes(q) ||
    getSubscriptionState(student).toLowerCase().includes(q) ||
    getPresenceState(student).toLowerCase().includes(q)
  );
});

    const activeProCount = onlyStudents.filter((student: any) => isProActive(student)).length;
    const basicCount = onlyStudents.length - activeProCount;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border">
            <Users className="w-6 h-6 text-blue-600 mb-4" />
            <h3 className="text-2xl font-bold">{onlyStudents.length}</h3>
            <p className="text-gray-600 text-sm">Total Students</p>
          </div>

          <div className="bg-white rounded-xl p-6 border">
            <Award className="w-6 h-6 text-amber-600 mb-4" />
            <h3 className="text-2xl font-bold">{activeProCount}</h3>
            <p className="text-gray-600 text-sm">Active Pro Members</p>
          </div>

          <div className="bg-white rounded-xl p-6 border">
            <FileText className="w-6 h-6 text-gray-600 mb-4" />
            <h3 className="text-2xl font-bold">{basicCount}</h3>
            <p className="text-gray-600 text-sm">Basic Users</p>
          </div>

          <div className="bg-white rounded-xl p-6 border">
            <TrendingUp className="w-6 h-6 text-green-600 mb-4" />
            <h3 className="text-2xl font-bold">{filteredStudents.length}</h3>
            <p className="text-gray-600 text-sm">Filtered Results</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border">
          <div className="p-6 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, plan, or status..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

<div className="flex gap-2">
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create User
              </button>
<button
  onClick={syncAuthUsers}
  disabled={studentsLoading}
  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
>
  ⟳ Sync Auth Users
</button>
<button
  onClick={loadStudents}
  disabled={studentsLoading}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
>
  {studentsLoading ? "Refreshing..." : "Refresh"}
</button>
            </div>
			
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50">
<tr className="text-left text-sm text-gray-600">
  <th className="px-3 py-3 whitespace-nowrap">Name</th>
  <th className="px-3 py-3 min-w-[220px]">Email</th>
  <th className="px-3 py-3 whitespace-nowrap">Role</th>
  <th className="px-3 py-3 whitespace-nowrap">Account</th>
  <th className="px-3 py-3 whitespace-nowrap">Presence</th>
  <th className="px-3 py-3 whitespace-nowrap">Plan</th>
  <th className="px-3 py-3 whitespace-nowrap">Subscription</th>
  <th className="px-3 py-3 whitespace-nowrap">Last Activity</th>
  <th className="px-3 py-3 whitespace-nowrap">Last Seen</th>
  <th className="px-3 py-3 whitespace-nowrap">Paid At</th>
  <th className="px-3 py-3 whitespace-nowrap">Start At</th>
  <th className="px-3 py-3 whitespace-nowrap">End At</th>
  <th className="px-3 py-3 whitespace-nowrap text-center">Actions</th>
</tr>
              </thead>

              <tbody>
                {studentsLoading && filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-10 text-center text-gray-500">
                      Loading students...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-10 text-center text-gray-500">
                      No students found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student: any) => {
                    const subscriptionState = getSubscriptionState(student);

                    return (
                    <tr key={student.$id} className="border-t text-sm">
  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
    {student.name || "-"}
  </td>

  <td className="px-3 py-3 text-gray-700 min-w-[220px]">
    {student.email || "-"}
  </td>

  <td className="px-3 py-3 text-gray-700">
    {student.role || "user"}
  </td>

  <td className="px-3 py-3 whitespace-nowrap">
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        (student.accountStatus || "active") === "active"
          ? "bg-blue-100 text-blue-700"
          : (student.accountStatus || "active") === "blocked"
          ? "bg-red-100 text-red-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {student.accountStatus || "active"}
    </span>
  </td>

  <td className="px-3 py-3 whitespace-nowrap">
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        getPresenceState(student) === "Online"
          ? "bg-green-100 text-green-700"
          : getPresenceState(student) === "Away"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {getPresenceState(student)}
    </span>
  </td>

  <td className="px-3 py-3 whitespace-nowrap">
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        isProActive(student)
          ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {prettifyPlan(student.subscriptionPlan)}
    </span>
  </td>

  <td className="px-3 py-3 whitespace-nowrap">
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        subscriptionState === "Active"
          ? "bg-green-100 text-green-700"
          : subscriptionState === "Expired"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {subscriptionState}
    </span>
  </td>

  <td className="px-3 py-3 text-gray-700">
    {formatDateTime(student.lastActivityAt)}
  </td>

  <td className="px-3 py-3 text-gray-700">
    {formatDateTime(student.lastSeenAt)}
  </td>

  <td className="px-3 py-3 text-gray-700">
    {formatDateTime(student.subscriptionPaidAt)}
  </td>

  <td className="px-3 py-3 text-gray-700">
    {formatDateTime(student.subscriptionStartAt)}
  </td>

  <td className="px-3 py-3 text-gray-700">
    {formatDateTime(student.subscriptionEndAt)}
  </td>

<td className="px-3 py-3 text-gray-700">
  <div className="flex items-center gap-2">
    <button
      onClick={() => openStudentEditor(student)}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
    >
      <Edit className="w-4 h-4" />
      Edit
    </button>
    <button
      onClick={() => handleDeleteStudent(student)}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
    >
      <Trash2 className="w-4 h-4" />
      Delete
    </button>
  </div>
</td>
</tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
		

	  
	  
		{showStudentEditModal && editingStudent && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Edit Student</h3>
        <button
          onClick={() => {
            setShowStudentEditModal(false);
            setEditingStudent(null);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={studentForm.name}
            onChange={(e) => setStudentForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            value={studentForm.role}
            onChange={(e) => setStudentForm((prev) => ({ ...prev, role: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Account Status</label>
          <select
            value={studentForm.accountStatus}
            onChange={(e) => setStudentForm((prev) => ({ ...prev, accountStatus: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="active">active</option>
            <option value="blocked">blocked</option>
            <option value="suspended">suspended</option>
          </select>
        </div>

<div>
  <label className="block text-sm font-medium mb-1">Current Plan</label>
  <select
    value={studentForm.subscriptionPlan}
    onChange={(e) => setStudentForm((prev) => ({ ...prev, subscriptionPlan: e.target.value }))}
    className="w-full border rounded-lg px-3 py-2"
  >
    <option value="basic">Basic</option>
    <option value="monthly">30 Days</option>
    <option value="bimonthly">60 Days</option>
    <option value="quarterly">90 Days</option>
  </select>
</div>

        <div>
          <label className="block text-sm font-medium mb-1">Subscription Status</label>
          <select
            value={studentForm.subscriptionStatus}
            onChange={(e) => setStudentForm((prev) => ({ ...prev, subscriptionStatus: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="inactive">inactive</option>
            <option value="active">active</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Paid At</label>
          <input
            type="datetime-local"
            value={studentForm.subscriptionPaidAt}
            onChange={(e) => setStudentForm((prev) => ({ ...prev, subscriptionPaidAt: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start At</label>
          <input
            type="datetime-local"
            value={studentForm.subscriptionStartAt}
            onChange={(e) => setStudentForm((prev) => ({ ...prev, subscriptionStartAt: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End At</label>
          <input
            type="datetime-local"
            value={studentForm.subscriptionEndAt}
            onChange={(e) => setStudentForm((prev) => ({ ...prev, subscriptionEndAt: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>
	  
	  <div className="border-t pt-5">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h4 className="text-lg font-semibold">Transaction History</h4>
      <p className="text-sm text-gray-500">
        Add or remove payments here. The latest active transaction becomes the current subscription.
      </p>
    </div>

    <button
      type="button"
      onClick={addTransactionRow}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
    >
      <Plus className="w-4 h-4" />
      Add Transaction
    </button>
  </div>

  {studentForm.transactionHistory.length === 0 ? (
    <div className="rounded-xl border border-dashed p-5 text-sm text-gray-500">
      No transactions yet.
    </div>
  ) : (
    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
      {studentForm.transactionHistory.map((tx, index) => (
        <div key={tx.id} className="rounded-xl border bg-gray-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-900">
              Transaction {studentForm.transactionHistory.length - index}
            </div>

            <button
              type="button"
              onClick={() => removeTransactionRow(tx.id)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plan</label>
              <select
                value={tx.plan}
                onChange={(e) => updateTransactionRow(tx.id, "plan", e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="basic">Basic</option>
                <option value="monthly">30 Days</option>
                <option value="bimonthly">60 Days</option>
                <option value="quarterly">90 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={tx.status}
                onChange={(e) => updateTransactionRow(tx.id, "status", e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="cancelled">cancelled</option>
                <option value="expired">expired</option>
                <option value="refunded">refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="text"
                value={tx.amount}
                onChange={(e) => updateTransactionRow(tx.id, "amount", e.target.value)}
                placeholder="e.g. 19.99 CAD"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select
                value={tx.source}
                onChange={(e) => updateTransactionRow(tx.id, "source", e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="admin">admin</option>
                <option value="stripe">stripe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Paid At</label>
              <input
                type="datetime-local"
                value={tx.paidAt}
                onChange={(e) => updateTransactionRow(tx.id, "paidAt", e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start At</label>
              <input
                type="datetime-local"
                value={tx.startAt}
                onChange={(e) => updateTransactionRow(tx.id, "startAt", e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

<div>
  <label className="block text-sm font-medium mb-1">End At</label>
  <input
    type="datetime-local"
    value={tx.endAt}
    onChange={(e) => updateTransactionRow(tx.id, "endAt", e.target.value)}
    className="w-full border rounded-lg px-3 py-2"
  />
</div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Note</label>
              <input
                type="text"
                value={tx.note}
                onChange={(e) => updateTransactionRow(tx.id, "note", e.target.value)}
                placeholder="Optional note"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            setShowStudentEditModal(false);
            setEditingStudent(null);
          }}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          onClick={saveStudentChanges}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
)}
		
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="ml-64">
        <header className="bg-white border-b px-8 py-4">
			  <div className="flex justify-between items-center">
				<div>
				  <h2 className="text-2xl font-bold capitalize flex items-center gap-3">
					{activeTab === 'mock' ? 'Mock Exam' : activeTab}
					{/* Mock Exam sub-sections */}
					{activeTab === 'mock' && activeSubTab && (
					  <>
						<span className="text-gray-400 font-normal">/</span>
						<span>
						  {activeSubTab === 'mock-listening' ? 'Listening' :
						   activeSubTab === 'mock-reading' ? 'Reading' :
						   activeSubTab === 'mock-writing' ? 'Writing' :
						   activeSubTab === 'mock-speaking' ? 'Speaking' :
						   activeSubTab?.startsWith('mock-listening-') ? 
							 `Listening / ${skillTasks.listening.find(t => t.id === activeSubTab.replace('mock-listening-', ''))?.name || activeSubTab}` :
						   activeSubTab}
						</span>
						<span className="bg-purple-100 text-purple-700 text-sm px-3 py-1 rounded-full font-medium">
						  {activeSubTab === 'mock-listening' ? 
							materials.filter(m => m.skill === 'listening' && m.isMock === true).length :
						   activeSubTab === 'mock-reading' ? 
							materials.filter(m => m.skill === 'reading' && m.isMock === true).length :
						   activeSubTab === 'mock-writing' ? 
							materials.filter(m => m.skill === 'writing' && m.isMock === true).length :
						   activeSubTab === 'mock-speaking' ? 
							materials.filter(m => m.skill === 'speaking' && m.isMock === true).length :
						   activeSubTab?.startsWith('mock-listening-') ?
							materials.filter(m => m.skill === 'listening' && m.taskId === activeSubTab.replace('mock-listening-', '') && m.isMock === true).length :
						   0} question{materials.filter(m => m.isMock === true).length !== 1 ? 's' : ''}
						</span>
					  </>
					)}
				{/* Practice Speaking sub-sections */}
				{activeTab === 'speaking' && activeSubTab && (
				  <>
					<span className="text-gray-400 font-normal">/</span>
					<span>
					  {skillTasks.speaking.find(t => t.id === activeSubTab)?.name || activeSubTab}
					</span>
					<span className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full font-medium">
					  {materials.filter(m => m.skill === 'speaking' && m.taskId === activeSubTab && m.isMock !== true).length} question{materials.filter(m => m.skill === 'speaking' && m.taskId === activeSubTab && m.isMock !== true).length !== 1 ? 's' : ''}
					</span>
				  </>
				)}
				  </h2>
				  <p className="text-gray-600 text-sm">
					{activeTab === 'mock' 
					  ? activeSubTab 
						? `Manage mock exam questions for ${
							activeSubTab === 'mock-listening' ? 'Listening' :
							activeSubTab === 'mock-reading' ? 'Reading' :
							activeSubTab === 'mock-writing' ? 'Writing' :
							activeSubTab === 'mock-speaking' ? 'Speaking' :
							activeSubTab?.startsWith('mock-listening-') ? 
							  skillTasks.listening.find(t => t.id === activeSubTab.replace('mock-listening-', ''))?.name || 'this section' :
							'this section'
						  }`
						: 'Manage your mock exam materials'
					  : activeTab === 'listening' && activeSubTab 
						? `Manage practice questions for ${skillTasks.listening.find(t => t.id === activeSubTab)?.name || 'this section'}`
					  : activeTab === 'students'
					    ? 'View all students and their subscription details'
						: 'Manage your CELPIP exam materials'
					}
				  </p>
				</div>
				<div className="flex items-center gap-4">
				  <div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
					  A
					</div>
					<div>
					  <p className="text-sm font-medium">Admin User</p>
					  <p className="text-xs text-gray-500">admin@celpip.com</p>
					</div>
				  </div>
				</div>
			  </div>
			</header>

        <main className="p-8">
          {activeTab === 'dashboard' ? (
            <div className="grid grid-cols-4 gap-6">
{dashboardStats.map((stat, i) => (
  <div key={i} className="bg-white rounded-xl p-6 border">
    <stat.icon className="w-6 h-6 text-blue-600 mb-4" />
    <h3 className="text-2xl font-bold">{stat.value}</h3>
    <p className="text-gray-600 text-sm">{stat.label}</p>
  </div>
))}
            </div>

          ) : activeTab === 'students' ? (
            <StudentsView />

          ) : activeTab === 'api-settings' ? (
  <div className="space-y-6">
    {/* API Connection Status Card */}
    <div className={`rounded-xl p-6 border ${apiSettings.isConnected ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${apiSettings.isConnected ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <Zap className={`w-6 h-6 ${apiSettings.isConnected ? 'text-green-600' : 'text-yellow-600'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{apiSettings.isConnected ? 'API Connected' : 'API Not Connected'}</h3>
            <p className="text-sm text-gray-600">
              {apiSettings.isConnected 
                ? 'All users can use AI scoring for Speaking tests' 
                : 'Connect an API key to enable AI scoring for Speaking tests'}
            </p>
          </div>
        </div>
        {apiSettings.isConnected && (
          <button
            onClick={disconnectAPI}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>

    {/* API Configuration Card */}
    <div className="bg-white rounded-xl p-6 border">
      <h3 className="text-lg font-semibold mb-4">AI Provider Configuration</h3>
      <p className="text-gray-600 mb-6">
        Select your AI provider and enter an API key to enable AI-powered scoring for Speaking tests.
        This key will be used for all users on the platform.
      </p>

      <div className="space-y-4">

        {/* Provider Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
          <select
            value={apiSettings.provider}
            onChange={(e) => {
const providerModels = {
  openai: 'gpt-5-nano',
  gemini: 'gemini-1.5-flash',
  claude: 'claude-haiku-4-5-20251001',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.1-70b-versatile',
  openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
};
              setApiSettings(prev => ({
                ...prev,
                provider: e.target.value as 'openai' | 'gemini' | 'claude' | 'deepseek' | 'groq' | 'openrouter',
                modelName: providerModels[e.target.value] || prev.modelName
              }));
            }}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="💳 Requires Billing">
              <option value="openai">OpenAI (GPT) — Paid</option>
              <option value="claude">Anthropic Claude — Paid</option>
              <option value="deepseek">DeepSeek — Very Cheap (~$0.001/1K tokens)</option>
            </optgroup>
            <optgroup label="✅ Free Tier Available">
              <option value="gemini">Google Gemini — Free (1,500 req/day)</option>
              <option value="groq">Groq — Free (14,400 req/day) ⭐ Recommended</option>
              <option value="openrouter">OpenRouter — Free models available</option>
            </optgroup>
          </select>
        </div>

        {/* API Key — changes per provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>

          {apiSettings.provider === 'openai' && (
            <>
              <input
                type="password"
                value={apiSettings.openAIKey}
                onChange={(e) => setApiSettings(prev => ({ ...prev, openAIKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Dashboard</a>
              </p>
            </>
          )}

          {apiSettings.provider === 'gemini' && (
            <>
              <input
                type="password"
                value={apiSettings.geminiKey}
                onChange={(e) => setApiSettings(prev => ({ ...prev, geminiKey: e.target.value }))}
                placeholder="AIza..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
              </p>
            </>
          )}

          {apiSettings.provider === 'claude' && (
            <>
              <input
                type="password"
                value={apiSettings.claudeKey}
                onChange={(e) => setApiSettings(prev => ({ ...prev, claudeKey: e.target.value }))}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a>
              </p>
            </>
          )}

          {apiSettings.provider === 'deepseek' && (
            <>
              <input
                type="password"
                value={apiSettings.deepseekKey}
                onChange={(e) => setApiSettings(prev => ({ ...prev, deepseekKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your key from <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">DeepSeek Platform</a>
              </p>
            </>
          )}

          {apiSettings.provider === 'groq' && (
            <>
              <input
                type="password"
                value={apiSettings.groqKey}
                onChange={(e) => setApiSettings(prev => ({ ...prev, groqKey: e.target.value }))}
                placeholder="gsk_..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                ✅ Free tier — Get your key from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Groq Console</a>
              </p>
            </>
          )}

          {apiSettings.provider === 'openrouter' && (
            <>
              <input
                type="password"
                value={apiSettings.openrouterKey}
                onChange={(e) => setApiSettings(prev => ({ ...prev, openrouterKey: e.target.value }))}
                placeholder="sk-or-..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                ✅ Free models available — Get your key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenRouter</a>
              </p>
            </>
          )}
        </div>

        {/* Model selector — options change per provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select
            value={apiSettings.modelName}
            onChange={(e) => setApiSettings(prev => ({ ...prev, modelName: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
{apiSettings.provider === 'openai' && (
  <>
    <option value="gpt-5-nano">GPT-5 nano (Cheapest)</option>
    <option value="gpt-5-mini">GPT-5 mini</option>
    <option value="gpt-5">GPT-5</option>
    <option value="gpt-5.4-nano">GPT-5.4 nano</option>
  </>
)}
            {apiSettings.provider === 'gemini' && (
              <>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash ✅ Free Tier (Recommended)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash ✅ Free Tier</option>
                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite ✅ Free Tier (Fastest)</option>
                <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B ✅ Free Tier</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro 💳 Requires Billing</option>
              </>
            )}
            {apiSettings.provider === 'claude' && (
              <>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 💳 (Cheapest)</option>
                <option value="claude-sonnet-4-6">Claude Sonnet 💳 (Balanced)</option>
                <option value="claude-opus-4-6">Claude Opus 💳 (Most Capable)</option>
              </>
            )}
            {apiSettings.provider === 'deepseek' && (
              <>
                <option value="deepseek-chat">DeepSeek Chat 💸 (Very Cheap)</option>
                <option value="deepseek-reasoner">DeepSeek Reasoner 💸 (Very Cheap)</option>
              </>
            )}
            {apiSettings.provider === 'groq' && (
              <>
                <option value="llama-3.1-70b-versatile">Llama 3.1 70B ✅ Free (Recommended)</option>
                <option value="llama-3.1-8b-instant">Llama 3.1 8B ✅ Free (Fastest)</option>
                <option value="llama3-70b-8192">Llama 3 70B ✅ Free</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B ✅ Free</option>
                <option value="gemma2-9b-it">Gemma 2 9B ✅ Free</option>
              </>
            )}
            {apiSettings.provider === 'openrouter' && (
              <>
                <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B ✅ Free</option>
                <option value="meta-llama/llama-3.2-3b-instruct:free">Llama 3.2 3B ✅ Free (Fastest)</option>
                <option value="mistralai/mistral-7b-instruct:free">Mistral 7B ✅ Free</option>
                <option value="google/gemma-2-9b-it:free">Gemma 2 9B ✅ Free</option>
                <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B ✅ Free</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini 💳 Paid</option>
                <option value="anthropic/claude-haiku">Claude Haiku 💳 Paid</option>
              </>
            )}
          </select>
        </div>

        {/* Save button */}
        <button
          onClick={() => saveAPISettings(apiSettings)}
          disabled={
            !(apiSettings.provider === 'openai' ? apiSettings.openAIKey
              : apiSettings.provider === 'gemini' ? apiSettings.geminiKey
              : apiSettings.provider === 'claude' ? apiSettings.claudeKey
              : apiSettings.provider === 'groq' ? apiSettings.groqKey
              : apiSettings.provider === 'openrouter' ? apiSettings.openrouterKey
              : apiSettings.deepseekKey)
            || isSavingAPI
          }
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {isSavingAPI ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Validating & Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {apiSettings.isConnected ? 'Update API Settings' : 'Connect & Save'}
            </>
          )}
        </button>
      </div>
    </div>

    {/* Usage Info Card */}
    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
      <h3 className="text-lg font-semibold mb-2 text-blue-800">ℹ️ How it Works</h3>
      <ul className="text-sm text-blue-700 space-y-2">
        <li>• When connected, all users can submit their Speaking recordings for AI evaluation</li>
        <li>• The AI analyzes pronunciation, fluency, vocabulary, and grammar</li>
        <li>• Scores are provided on the CELPIP 0-12 scale with detailed feedback</li>
        <li>• API costs are billed to your OpenAI account based on usage</li>
      </ul>
    </div>

    {/* Security Note */}
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-2 text-gray-800">🔒 Security Note</h3>
      <p className="text-sm text-gray-600">
        Your API key is stored locally in the browser's localStorage. For a production environment,
        we recommend storing the API key securely on your backend server and proxying requests through it.
      </p>
    </div>
  </div>
  
          ) : activeTab === 'settings' ? (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-4">Data Management</h3>
                <p className="text-gray-600 mb-4">
                  Your materials are stored in your browser's local storage. This means they persist across page refreshes but are specific to this browser.
                </p>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={clearAllData}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Reset All Data
                  </button>
                  <span className="text-sm text-gray-500">
                    This will restore default sample materials
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-4">Storage Info</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Total Materials:</span> {materials.length}</p>
                  <p><span className="font-medium">Published:</span> {materials.filter(m => m.status === 'Published').length}</p>
                  <p><span className="font-medium">Drafts:</span> {materials.filter(m => m.status === 'Draft').length}</p>
                  <p><span className="font-medium">Storage Type:</span> IndexedDB (supports large files)</p>
                </div>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  ✓ Using IndexedDB for storage - can handle hundreds of MB of audio files without issues.
                </div>
              </div>
              
              {/* File Storage Details */}
              <div className="bg-white rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-4">Uploaded Files Details</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {materials.map(m => (
                    <div key={m.id} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{m.title}</h4>
                      <div className="text-xs space-y-1">
                        {m.uploadedFiles?.contextImage && (
                          <p className={(m.uploadedFiles.contextImage.data || m.uploadedFiles.contextImage.storageUrl) ? 'text-green-600' : 'text-red-600'}>
                            • Context Image: {m.uploadedFiles.contextImage.name} 
                            {(m.uploadedFiles.contextImage.data || m.uploadedFiles.contextImage.storageUrl) ? ' ✓ (has data)' : ' ✗ (no data - re-upload needed)'}
                          </p>
                        )}
                        {m.uploadedFiles?.sectionAudios?.map((audio, i) => (
                          <p key={i} className={(audio.data || audio.storageUrl) ? 'text-green-600' : 'text-red-600'}>
                            • Section {i+1} Audio: {audio.name}
                            {(audio.data || audio.storageUrl) ? ' ✓ (has data)' : ' ✗ (no data - re-upload needed)'}
                          </p>
                        ))}
                        {m.uploadedFiles?.sectionTranscripts?.map((trans, i) => (
                          <p key={i} className={(trans.data || trans.storageUrl) ? 'text-green-600' : 'text-red-600'}>
                            • Section {i+1} Transcript: {trans.name}
                            {(trans.data || trans.storageUrl) ? ' ✓ (has data)' : ' ✗ (no data - re-upload needed)'}
                          </p>
                        ))}
                        {m.uploadedFiles?.questionAudios?.map((audio, i) => (
                          <p key={i} className={(audio.data || audio.storageUrl) ? 'text-green-600' : 'text-red-600'}>
                            • Question {i+1} Audio: {audio.name}
                            {(audio.data || audio.storageUrl) ? ' ✓ (has data)' : ' ✗ (no data - re-upload needed)'}
                          </p>
                        ))}
                        {m.uploadedFiles?.questionAnswers?.map((answers, i) => (
                          <p key={`ans-${i}`} className={answers && answers.some(a => a) ? 'text-green-600' : 'text-red-600'}>
                            • Question {i+1} Answers: {answers && answers.filter(a => a).length || 0}/4 options
                            {answers && answers.some(a => a) ? ' ✓' : ' ✗ (no answers)'}
                          </p>
                        ))}
                        {m.uploadedFiles?.answerKey && (
                          <p className={(m.uploadedFiles.answerKey.data || m.uploadedFiles.answerKey.storageUrl) ? 'text-green-600' : 'text-red-600'}>
                            • Answer Key: {m.uploadedFiles.answerKey.name}
                            {(m.uploadedFiles.answerKey.data || m.uploadedFiles.answerKey.storageUrl) ? ' ✓ (has data)' : ' ✗ (no data - re-upload needed)'}
                          </p>
                        )}
                        {!m.uploadedFiles || Object.keys(m.uploadedFiles).length === 0 && (
                          <p className="text-gray-500">No files uploaded</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">ℹ️ Storage Information</h3>
                <p className="text-blue-700 text-sm">
                  Your data is stored in IndexedDB (browser database) which can handle large audio files. 
                  Data persists across page refreshes and browser restarts, but is specific to this browser.
                  For a production application, you would want a backend server with cloud storage.
                </p>
              </div>
            </div>
          ) : (
            <MaterialsView />
          )}
        </main>
      </div>

{showUploadModal && <UploadModal key={editingMaterial?.id || 'new'} />}
      {showViewModal && <ViewModal />}
      {showPreviewPage && <PreviewPage />}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Create New User</h2>
              <button onClick={() => setShowCreateUserModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input type="text" style={{ display: 'none' }} autoComplete="username" />
            <input type="password" style={{ display: 'none' }} autoComplete="current-password" />
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createUserForm.name}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  autoComplete="off"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  autoComplete="off"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div>
                  <p className="text-sm font-medium text-gray-700">Mark Email as Verified</p>
                  <p className="text-xs text-gray-500">Skip email verification for this user</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateUserForm(prev => ({ ...prev, emailVerified: !prev.emailVerified }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    createUserForm.emailVerified ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    createUserForm.emailVerified ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isCreatingUser}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isCreatingUser ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="w-4 h-4" /> Create User</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
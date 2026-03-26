// src/pages/userHome.tsx
import ListeningPracticeTest from "../pages/Listening/1. Problem Solving/ListeningPracticeTest";
import ListeningDailyLifeConversationTest from "../pages/Listening/2. Daily Life Conversation/ListeningDailyLifeConversationTest";
import ListeningForInformationPracticeTest from './Listening/3. Listening for Information/ListeningForInformationPracticeTest';
import ListeningDiscussionTest from './Listening/5. Discussion/ListeningDiscussionTest';
//import ListeningNewsItemPracticeTest from "./Listening/4. Listening to a News Item/ListeningNewsItemPracticeTest";
import ListeningNewsItemTest from './Listening/4. Listening to a News Item/ListeningNewsItemTest';
import ListeningViewPointsTest from './Listening/6. View Points/ListeningViewPointsTest';
import SpeakingPracticeTest from "../pages/Speaking/SpeakingPracticeTest";
import { getAPISettings } from "../services/settingsService";
import WritingPracticeTest from "../pages/Writing/WritingPracticeTest";
import L_T1_MockTest from "../pages/Mock/L_T1_MockTest";
import L_T2_MockTest from "../pages/Mock/L_T2_MockTest";
import L_T3_MockTest from "../pages/Mock/L_T3_MockTest";
import L_T4_MockTest from "../pages/Mock/L_T4_MockTest";
import L_T5_MockTest from "../pages/Mock/L_T5_MockTest";
import L_T6_MockTest from "../pages/Mock/L_T6_MockTest";
import L_Results_MockTest from "../pages/Mock/L_Results_MockTest";
// ADD THIS LINE:
import R_T1_MockTest from "../pages/Mock/R_T1_MockTest";
import R_T2_MockTest from "../pages/Mock/R_T2_MockTest"; // ✅ ADD
import R_T3_MockTest from "../pages/Mock/R_T3_MockTest"; // ✅ ADD
import R_T4_MockTest from "../pages/Mock/R_T4_MockTest"; // ✅ ADD
import R_Results_MockTest from "../pages/Mock/R_Results_MockTest";

import W_T1_MockTest from "../pages/Mock/W_T1_MockTest";
import W_T2_MockTest from "../pages/Mock/W_T2_MockTest";
import W_Results_MockTest from "../pages/Mock/W_Results_MockTest";

import S_T1_MockTest from "../pages/Mock/S_T1_MockTest";
import S_T2_MockTest from "../pages/Mock/S_T2_MockTest";
import S_T3_MockTest from "../pages/Mock/S_T3_MockTest";
import S_T4_MockTest from "../pages/Mock/S_T4_MockTest";
import S_T5_MockTest from "../pages/Mock/S_T5_MockTest";
import S_T6_MockTest from "../pages/Mock/S_T6_MockTest";
import S_T7_MockTest from "../pages/Mock/S_T7_MockTest";
import S_T8_MockTest from "../pages/Mock/S_T8_MockTest";
import S_Results_MockTest from "../pages/Mock/S_Results_MockTest";

import { clearMockAnswersFromDB } from "../services/mockTestAnswersService";


import ReadingTest from "../pages/Reading/ReadingTest";
import FeedbackPage from "./feedback";


import { account, databases, DATABASE_ID, USERS_COLLECTION_ID } from "../appwrite";
import { Query } from "appwrite";
import { useNavigate, useLocation } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import { 
  Award, Headphones, BookOpen, Edit, Mic, TrendingUp, 
  Clock, Target, CheckCircle, Play, Lock, Trophy,
  User, Settings, LogOut, ChevronRight, ChevronDown, Crown,
  BarChart3, Calendar, Zap, Star, Home, FileText,
  ArrowLeft, Volume2, LayoutDashboard, History, X, CreditCard,
  MessageSquare
} from 'lucide-react';
import { getMaterials, getMaterialById } from "../services/materialsService";
// ✅ ADD: Import for real user results from database
import { getDashboardStats, getUserResultsParsed } from '../services/userResultsService';



import AISkillBuilders from "./AISkillBuilders";
import { Brain } from "lucide-react"; // Brain icon for sidebar


export default function CelpipPracticeDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [practiceTestData, setPracticeTestData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const [upgradeModalMessage, setUpgradeModalMessage] = useState(
  "Upgrade to Pro to unlock all practice scenarios and mock tests."
);

  // API connection status (loaded from admin settings)
const [isAPIConnected, setIsAPIConnected] = useState(false);
const [apiSettings, setApiSettings] = useState(null);
	const [settingsForm, setSettingsForm] = useState({
	  currentPassword: '',
	  newPassword: '',
	  confirmPassword: '',
	  displayName: 'Soheila A.',
	  email: '',
	  notifications: true,
	  darkMode: false
	});
	const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });
	
const navigate = useNavigate();


const [showProfileMenu, setShowProfileMenu] = useState(false);
const [showFeedbackPage, setShowFeedbackPage] = useState(false);
const profileMenuRef = React.useRef<HTMLDivElement | null>(null);

const [userRowId, setUserRowId] = useState<string | null>(null);

const [authChecked, setAuthChecked] = useState(false);
const [authAllowed, setAuthAllowed] = useState(false);

useEffect(() => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}, []);

useEffect(() => {
  if (activeTab === "dashboard" && currentView === "dashboard") {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
}, [activeTab, currentView]);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (!showProfileMenu) return;

    const target = event.target as Node;
    if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
      setShowProfileMenu(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [showProfileMenu]);




useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (!showProfileMenu) return;

    const target = event.target as Node;
    if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
      setShowProfileMenu(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [showProfileMenu]);

// Add this near your other useState declarations in the PARENT component:
const params = new URLSearchParams(window.location.search);
const justPaid = params.get("checkout") === "success";
const [subTab, setSubTab] = React.useState<"details" | "history">("details");

const [subscription, setSubscription] = useState<{
    plan: string;
    status: string;
    paidAt: string | null;
    startAt: string | null;
    endAt: string | null;
    sessionId: string | null;
    customerId: string | null;
    subscriptionId: string | null;
    amountPaid: number;
    paymentLast4: string | null;
    paymentBrand: string | null;
    transactionHistory: any[];
  }>({
    plan: "basic",
    status: "inactive",
    paidAt: null,
    startAt: null,
    endAt: null,
    sessionId: null,
    customerId: null,
    subscriptionId: null,
    amountPaid: 0,
    paymentLast4: null,
    paymentBrand: null,
    transactionHistory: [],
  });

  const isProMember =
    subscription.status === "active" &&
    (!subscription.endAt || new Date(subscription.endAt).getTime() > Date.now());

const canAccessScenario = (scenarioIndex: number) => {
  return isProMember || scenarioIndex === 0; // Basic user can access only Scenario 1
};

const canAccessMockExam = (exam: any) => {
  const mockNumber =
    Number(
      exam?.number ??
      exam?.mockSet ??
      String(exam?.name || "").match(/(\d+)/)?.[1] ??
      0
    );

  return isProMember || mockNumber === 1; // Basic user can access only Mock Test 1
};

const openUpgradeModal = (message?: string) => {
  setShowProfileMenu(false);
  setUpgradeModalMessage(
    message || "Upgrade to Pro to unlock all practice scenarios and mock tests."
  );
  setShowUpgradeModal(true);
};

// ✅ Load logged-in user info (Auth) and set displayName/email used across UI
useEffect(() => {
  const loadMe = async () => {
    try {
      const me = await account.get();

      // Guard: redirect unverified or unauthenticated users to login
      if (!me.emailVerification) {
        try {
          await account.deleteSession("current");
        } catch {}
        window.location.href = "/login";
        return;
      }

      const prettyName =
        (me.name && me.name.trim()) ||
        (me.email ? me.email.split("@")[0] : "") ||
        "User";

      setSettingsForm((prev) => ({
        ...prev,
        displayName: prettyName,
        email: me.email || prev.email,
      }));

      setAuthAllowed(true);
      setAuthChecked(true);
    } catch (e) {
      setAuthAllowed(false);
      setAuthChecked(true);
      window.location.href = "/login";
    }
  };

  loadMe();
}, []);

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const skill = params.get("skill");
  if (skill && ["listening", "reading", "writing", "speaking"].includes(skill)) {
    setExpandedSkill(skill);
    setActiveTab("practice");
  }
}, [location.search]);

useEffect(() => {
const loadSubscription = async () => {
  try {
    // ✅ Use cached result for this session to avoid repeated DB reads
    const cached = sessionStorage.getItem("clbprep_sub");
    if (cached) {
      const parsed = JSON.parse(cached);
      setUserRowId(parsed.rowId);
      setSubscription(parsed.subscription);
      return;
    }

    const me = await account.get();
    const email = (me.email || "").trim().toLowerCase();
    const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
      Query.equal("email", email),
    ]);

      if (!res.documents.length) return;

      const userDoc: any = res.documents[0];
      setUserRowId(userDoc.$id);

      if (["blocked", "suspended"].includes((userDoc.accountStatus || "active").toLowerCase())) {
        await account.deleteSession("current");
        window.location.href = "/login";
        return;
      }

let parsedHistory = [];
      try {
        if (userDoc.transactionHistory) {
          parsedHistory = JSON.parse(userDoc.transactionHistory);
        }
      } catch { parsedHistory = []; }

      setSubscription({
        plan: userDoc.subscriptionPlan || "basic",
        status: userDoc.subscriptionStatus || "inactive",
        paidAt: userDoc.subscriptionPaidAt || null,
        startAt: userDoc.subscriptionStartAt || null,
        endAt: userDoc.subscriptionEndAt || null,
        sessionId: userDoc.stripeCheckoutSessionId || null,
        customerId: userDoc.stripeCustomerId || null,
        subscriptionId: userDoc.stripeSubscriptionId || null,
        amountPaid: userDoc.amountPaid || 0,
        paymentLast4: userDoc.paymentLast4 || null,
        paymentBrand: userDoc.paymentBrand || null,
        transactionHistory: parsedHistory,
      });
	  
	    // ✅ ADD THESE LINES ↓
      sessionStorage.setItem("clbprep_sub", JSON.stringify({
        rowId: userDoc.$id,
        subscription: {
          plan: userDoc.subscriptionPlan || "basic",
          status: userDoc.subscriptionStatus || "inactive",
          paidAt: userDoc.subscriptionPaidAt || null,
          startAt: userDoc.subscriptionStartAt || null,
          endAt: userDoc.subscriptionEndAt || null,
          sessionId: userDoc.stripeCheckoutSessionId || null,
          customerId: userDoc.stripeCustomerId || null,
          subscriptionId: userDoc.stripeSubscriptionId || null,
          amountPaid: userDoc.amountPaid || 0,
          paymentLast4: userDoc.paymentLast4 || null,
          paymentBrand: userDoc.paymentBrand || null,
          transactionHistory: parsedHistory,
        }
      }));
      // ✅ END OF ADDED LINES ↑
	  
    } catch (error) {
      console.log("Could not load subscription", error);
    }
  };

  loadSubscription();

  const params = new URLSearchParams(window.location.search);
  const isCheckoutSuccess = params.get("checkout") === "success";

// ✅ AFTER — keeps retrying for 45 seconds to catch Stripe's webhook retry:
if (isCheckoutSuccess) {
  const retry1 = setTimeout(loadSubscription, 2000);
  const retry2 = setTimeout(loadSubscription, 5000);
  const retry3 = setTimeout(loadSubscription, 10000);
  const retry4 = setTimeout(loadSubscription, 20000);
  const retry5 = setTimeout(loadSubscription, 35000);  // catches Stripe's ~30s retry

  return () => {
    clearTimeout(retry1);
    clearTimeout(retry2);
    clearTimeout(retry3);
    clearTimeout(retry4);
    clearTimeout(retry5);
  };
}
}, []);

const updatePresence = async (patch: Record<string, any>) => {
  if (!userRowId) return;

  try {
    await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, userRowId, patch);
  } catch (error) {
    console.log("Presence update failed", error);
  }
};

useEffect(() => {
  if (!userRowId) return;

  let inactivityTimer: number | undefined;
  let heartbeatTimer: number | undefined;
  let lastWriteAt = 0;

  const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
  const WRITE_THROTTLE_MS = 60 * 1000; // max 1 DB write per minute from activity
  const HEARTBEAT_MS = 60 * 1000; // keep online fresh every minute

  const resetLogoutTimer = () => {
    if (inactivityTimer) window.clearTimeout(inactivityTimer);

    inactivityTimer = window.setTimeout(async () => {
      const nowIso = new Date().toISOString();

      await updatePresence({
        presenceStatus: "offline",
        lastSeenAt: nowIso,
      });

      try {
        await account.deleteSession("current");
      } catch (error) {
        console.error("Auto logout failed:", error);
      } finally {
        window.location.href = "/login";
      }
    }, INACTIVITY_LIMIT_MS);
  };

  const markActive = async () => {
    resetLogoutTimer();

    if (document.visibilityState === "hidden") return;

    const nowMs = Date.now();
    if (nowMs - lastWriteAt < WRITE_THROTTLE_MS) return;

    lastWriteAt = nowMs;
    const nowIso = new Date().toISOString();

    await updatePresence({
      presenceStatus: "online",
      lastActivityAt: nowIso,
      lastSeenAt: nowIso,
    });
  };

  const handleVisibilityChange = async () => {
    if (document.visibilityState === "hidden") {
      await updatePresence({
        presenceStatus: "away",
        lastSeenAt: new Date().toISOString(),
      });
      return;
    }

    await markActive();
  };

  const activityEvents = [
    "click",
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
  ];

  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, markActive, { passive: true });
  });

  document.addEventListener("visibilitychange", handleVisibilityChange);

  const nowIso = new Date().toISOString();
  void updatePresence({
    presenceStatus: "online",
    lastActivityAt: nowIso,
    lastSeenAt: nowIso,
  });

  resetLogoutTimer();

  heartbeatTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      const heartbeatIso = new Date().toISOString();
      lastWriteAt = Date.now();

      void updatePresence({
        presenceStatus: "online",
        lastActivityAt: heartbeatIso,
        lastSeenAt: heartbeatIso,
      });
    }
  }, HEARTBEAT_MS);

  return () => {
    if (inactivityTimer) window.clearTimeout(inactivityTimer);
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);

    activityEvents.forEach((eventName) => {
      window.removeEventListener(eventName, markActive);
    });

    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [userRowId]);

  // Mock test state
// Mock test state
const [activeMockTest, setActiveMockTest] = useState<any>(null);        // Part 1 material
const [activeMockTestPart2, setActiveMockTestPart2] = useState<any>(null);
const [activeMockTestPart3, setActiveMockTestPart3] = useState<any>(null);
const [activeMockTestPart4, setActiveMockTestPart4] = useState<any>(null);
const [activeMockTestPart5, setActiveMockTestPart5] = useState<any>(null);
const [activeMockTestPart6, setActiveMockTestPart6] = useState<any>(null); // ✅ NEW

// ADD THIS LINE:
const [activeReadingPart1, setActiveReadingPart1] = useState<any>(null); // Reading Part 1 material
const [activeReadingPart2, setActiveReadingPart2] = useState<any>(null); // ✅ Reading Part 2 material
const [activeReadingPart3, setActiveReadingPart3] = useState<any>(null); // ✅ ADD
const [activeReadingPart4, setActiveReadingPart4] = useState<any>(null); // ✅ ADD

// ✅ Writing mock materials (Task 1 & 2)
const [activeWritingPart1, setActiveWritingPart1] = useState<any>(null);
const [activeWritingPart2, setActiveWritingPart2] = useState<any>(null);

// ✅ Speaking mock materials (Task 1-8)
const [activeSpeakingPart1, setActiveSpeakingPart1] = useState<any>(null);
const [activeSpeakingPart2, setActiveSpeakingPart2] = useState<any>(null);
const [activeSpeakingPart3, setActiveSpeakingPart3] = useState<any>(null);
const [activeSpeakingPart4, setActiveSpeakingPart4] = useState<any>(null);
const [activeSpeakingPart5, setActiveSpeakingPart5] = useState<any>(null);
const [activeSpeakingPart6, setActiveSpeakingPart6] = useState<any>(null);
const [activeSpeakingPart7, setActiveSpeakingPart7] = useState<any>(null);
const [activeSpeakingPart8, setActiveSpeakingPart8] = useState<any>(null);


const [showMockTest, setShowMockTest] = useState(false);
const [mockTestPart, setMockTestPart] = useState(1); // ✅ 1..6
const [backFromPart2, setBackFromPart2] = useState(false);
// ✅ Pre-fetched mock material cache — keyed by material id
const [mockMaterialsCache, setMockMaterialsCache] = useState<Map<string, any>>(new Map());

const normalizeMockSetKey = (v: any) => {
  const s = String(v ?? "").trim();
  const match = s.match(/\d+/);
  return match ? match[0] : s;
};

const decodeBase64TextForMock = (dataUrl: string): string => {
  if (!dataUrl) return "";
  // ✅ FIX: already plain text — return as-is
  if (!dataUrl.startsWith("data:")) return dataUrl;
  try {
    const base64Content = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
};

const parseUploadedFilesForMock = (raw: any) => {
  let files = raw;

  if (typeof files === "string") {
    try {
      files = JSON.parse(files);
    } catch {
      files = {};
    }
  }

  files = files || {};

if (Array.isArray(files.sectionTranscripts)) {
  files.sectionTranscripts = files.sectionTranscripts.map((t: any, idx: number) => {
    if (!t || !t.data) return t;

    // For reading: keep as raw base64 but strip the "Read the following..." prefix
    // (mock reading components decode internally, same as practice components)
    if (idx === 0 && typeof t.data === "string" && t.data.startsWith("data:")) {
      const decoded = decodeBase64TextForMock(t.data);
      const stripped = decoded.replace(/^Read the following[^\n]*[\r\n]*/i, '').trimStart();
      const encoded = btoa(unescape(encodeURIComponent(stripped)));
      return { ...t, data: `data:text/plain;base64,${encoded}` };
    }

    // Already plain text (non-base64): strip prefix and return as-is
    if (typeof t.data === "string" && !t.data.startsWith("data:")) {
      return {
        ...t,
        data: t.data.replace(/^Read the following[^\n]*[\r\n]*/i, '').trimStart(),
      };
    }

    return t;
  });
}

  return files;
};

const isReadingPart1Material = (m: any) => {
  const skill = String(m?.skill || "").toLowerCase();
  const task = String(m?.taskId ?? m?.task ?? "").toLowerCase();
  const title = String(m?.title ?? "").toLowerCase();

  return (
    skill === "reading" &&
    (
      task === "part1" ||
      task === "task1" ||
      task.includes("r_t1") ||
      task.includes("reading_t1") ||
      task.includes("part 1") ||
      task.includes("part1") ||
      task.includes("correspondence") ||
      title.includes("r_t1") ||
      title.includes("reading_t1") ||
      title.includes("part 1") ||
      title.includes("part1") ||
      title.includes("correspondence") ||
      title.includes("reading correspondence")
    )
  );
};

const isReadingPart2Material = (m: any) => {
  const skill = String(m?.skill || "").toLowerCase();
  const task = String(m?.taskId ?? m?.task ?? "").toLowerCase();
  const title = String(m?.title ?? "").toLowerCase();

  return (
    skill === "reading" &&
    (
      task === "part2" ||
      task === "task2" ||
      task.includes("r_t2") ||
      task.includes("reading_t2") ||
      task.includes("part 2") ||
      task.includes("part2") ||
      task.includes("diagram") ||
      title.includes("r_t2") ||
      title.includes("reading_t2") ||
      title.includes("part 2") ||
      title.includes("part2") ||
      title.includes("diagram") ||
      title.includes("apply a diagram")
    )
  );
};

const isReadingPart3Material = (m: any) => {
  const skill = String(m?.skill || "").toLowerCase();
  const task = String(m?.taskId ?? m?.task ?? "").toLowerCase();
  const title = String(m?.title ?? "").toLowerCase();

  return (
    skill === "reading" &&
    (
      task === "part3" ||
      task === "task3" ||
      task.includes("r_t3") ||
      task.includes("reading_t3") ||
      task.includes("part 3") ||
      task.includes("part3") ||
      task.includes("information") ||
      title.includes("r_t3") ||
      title.includes("reading_t3") ||
      title.includes("part 3") ||
      title.includes("part3") ||
      title.includes("information")
    )
  );
};

const isReadingPart4Material = (m: any) => {
  const skill = String(m?.skill || "").toLowerCase();
  const task = String(m?.taskId ?? m?.task ?? "").toLowerCase();
  const title = String(m?.title ?? "").toLowerCase();

  return (
    skill === "reading" &&
    (
      task === "part4" ||
      task === "task4" ||
      task.includes("r_t4") ||
      task.includes("reading_t4") ||
      task.includes("part 4") ||
      task.includes("part4") ||
      task.includes("viewpoint") ||
      task.includes("viewpoints") ||
      title.includes("r_t4") ||
      title.includes("reading_t4") ||
      title.includes("part 4") ||
      title.includes("part4") ||
      title.includes("viewpoint") ||
      title.includes("viewpoints")
    )
  );
};

const isWritingPart1Material = (m: any) => {
  const skill = String(m?.skill || "").toLowerCase();
  const task = String(m?.taskId ?? m?.task ?? "").toLowerCase();
  const title = String(m?.title ?? "").toLowerCase();

  return (
    skill === "writing" &&
    (
      task === "part1" ||
      task === "task1" ||
      task.includes("w_t1") ||
      task.includes("writing_t1") ||
      task.includes("part 1") ||
      task.includes("part1") ||
      task.includes("email") ||
      title.includes("w_t1") ||
      title.includes("writing_t1") ||
      title.includes("part 1") ||
      title.includes("part1") ||
      title.includes("email")
    )
  );
};

const isWritingPart2Material = (m: any) => {
  const skill = String(m?.skill || "").toLowerCase();
  const task = String(m?.taskId ?? m?.task ?? "").toLowerCase();
  const title = String(m?.title ?? "").toLowerCase();

  return (
    skill === "writing" &&
    (
      task === "part2" ||
      task === "task2" ||
      task.includes("w_t2") ||
      task.includes("writing_t2") ||
      task.includes("part 2") ||
      task.includes("part2") ||
      task.includes("survey") ||
      title.includes("w_t2") ||
      title.includes("writing_t2") ||
      title.includes("part 2") ||
      title.includes("part2") ||
      title.includes("survey")
    )
  );
};

const makeSpeakingMatcher = (partNum: number, extraKeywords: string[] = []) => {
  return (m: any) => {
    const skill = String(m?.skill || "").toLowerCase();
    const task = String(m?.taskId ?? m?.task ?? "").toLowerCase();
    const title = String(m?.title ?? "").toLowerCase();

    const markers = [
      `part${partNum}`,
      `part ${partNum}`,
      `task${partNum}`,
      `task ${partNum}`,
      `s_t${partNum}`,
      `speaking_t${partNum}`,
      ...extraKeywords.map((x) => x.toLowerCase()),
    ];

    return (
      skill === "speaking" &&
      markers.some((marker) => task.includes(marker) || title.includes(marker))
    );
  };
};

const isSpeakingPart1Material = makeSpeakingMatcher(1, ["advice", "giving advice"]);
const isSpeakingPart2Material = makeSpeakingMatcher(2, ["personal experience", "experience"]);
const isSpeakingPart3Material = makeSpeakingMatcher(3, ["scene", "describing a scene"]);
const isSpeakingPart4Material = makeSpeakingMatcher(4, ["prediction", "predictions", "making predictions"]);
const isSpeakingPart5Material = makeSpeakingMatcher(5, ["comparing", "persuading", "compare", "persuade"]);
const isSpeakingPart6Material = makeSpeakingMatcher(6, ["difficult situation"]);
const isSpeakingPart7Material = makeSpeakingMatcher(7, ["opinion", "opinions", "expressing opinions"]);
const isSpeakingPart8Material = makeSpeakingMatcher(8, ["unusual situation"]);

const isTrueLike = (v: any) =>
  v === true || v === "true" || v === 1 || v === "1";

const ensureReadingPart1Ready = async () =>
  ensureReadingPartReady({
    currentValue: activeReadingPart1,
    setValue: setActiveReadingPart1,
    matcher: isReadingPart1Material,
  });

const ensureReadingPart2Ready = async () =>
  ensureReadingPartReady({
    currentValue: activeReadingPart2,
    setValue: setActiveReadingPart2,
    matcher: isReadingPart2Material,
  });

const ensureReadingPart3Ready = async () =>
  ensureReadingPartReady({
    currentValue: activeReadingPart3,
    setValue: setActiveReadingPart3,
    matcher: isReadingPart3Material,
  });

const ensureReadingPart4Ready = async () =>
  ensureReadingPartReady({
    currentValue: activeReadingPart4,
    setValue: setActiveReadingPart4,
    matcher: isReadingPart4Material,
  });
  
 const ensureWritingPart1Ready = async () =>
  ensureWritingPartReady({
    currentValue: activeWritingPart1,
    setValue: setActiveWritingPart1,
    matcher: isWritingPart1Material,
  });

const ensureWritingPart2Ready = async () =>
  ensureWritingPartReady({
    currentValue: activeWritingPart2,
    setValue: setActiveWritingPart2,
    matcher: isWritingPart2Material,
  });
  
  const ensureSpeakingPart1Ready = async () =>
  ensureSpeakingPartReady({
    currentValue: activeSpeakingPart1,
    setValue: setActiveSpeakingPart1,
    matcher: isSpeakingPart1Material,
  });

const ensureSpeakingPart2Ready = async () =>
  ensureSpeakingPartReady({
    currentValue: activeSpeakingPart2,
    setValue: setActiveSpeakingPart2,
    matcher: isSpeakingPart2Material,
  });

const ensureSpeakingPart3Ready = async () =>
  ensureSpeakingPartReady({
    currentValue: activeSpeakingPart3,
    setValue: setActiveSpeakingPart3,
    matcher: isSpeakingPart3Material,
  });

const ensureSpeakingPart4Ready = async () =>
  ensureSpeakingPartReady({
    currentValue: activeSpeakingPart4,
    setValue: setActiveSpeakingPart4,
    matcher: isSpeakingPart4Material,
  });

const ensureSpeakingPart5Ready = async () =>
  ensureSpeakingPartReady({
    currentValue: activeSpeakingPart5,
    setValue: setActiveSpeakingPart5,
    matcher: isSpeakingPart5Material,
  });

const ensureSpeakingPart6Ready = async () =>
  ensureSpeakingPartReady({
    currentValue: activeSpeakingPart6,
    setValue: setActiveSpeakingPart6,
    matcher: isSpeakingPart6Material,
  });

const ensureSpeakingPart7Ready = async () =>
  ensureSpeakingPartReady({
    currentValue: activeSpeakingPart7,
    setValue: setActiveSpeakingPart7,
    matcher: isSpeakingPart7Material,
  });

const ensureSpeakingPart8Ready = async () =>
  ensureSpeakingPartReady({
    currentValue: activeSpeakingPart8,
    setValue: setActiveSpeakingPart8,
    matcher: isSpeakingPart8Material,
  });

const getActiveMockSetKey = () =>
  normalizeMockSetKey(
    localStorage.getItem("activeMockSet") ??
      activeMockTestPart6?.mockSet ??
      activeMockTestPart5?.mockSet ??
      activeMockTestPart4?.mockSet ??
      activeMockTestPart3?.mockSet ??
      activeMockTestPart2?.mockSet ??
      activeMockTest?.mockSet ??
      ""
  );

const ensureReadingPartReady = async ({
  currentValue,
  setValue,
  matcher,
}: {
  currentValue: any;
  setValue: (value: any) => void;
  matcher: (m: any) => boolean;
}) => {
  if (currentValue) return currentValue;

  const activeSet = getActiveMockSetKey();
  const cacheValues = Array.from(mockMaterialsCache.values());

  const cachedExact = cacheValues.find((m: any) => {
    return (
      String(m?.skill || "").toLowerCase() === "reading" &&
      normalizeMockSetKey(m?.mockSet) === activeSet &&
      matcher(m)
    );
  });

  if (cachedExact) {
    setValue(cachedExact);
    return cachedExact;
  }

  const cachedFallback = cacheValues.find((m: any) => {
    return (
      String(m?.skill || "").toLowerCase() === "reading" &&
      matcher(m)
    );
  });

  if (cachedFallback) {
    setValue(cachedFallback);
    return cachedFallback;
  }

  const all = (await getMaterials()) as any[];

  const picked =
    all.find((m: any) => {
      return (
        isTrueLike(m?.isMock) &&
        String(m?.skill || "").toLowerCase() === "reading" &&
        normalizeMockSetKey(m?.mockSet) === activeSet &&
        matcher(m)
      );
    }) ??
    all.find((m: any) => {
      return (
        isTrueLike(m?.isMock) &&
        String(m?.skill || "").toLowerCase() === "reading" &&
        matcher(m)
      );
    }) ??
    null;

  if (!picked) return null;

  const docId = picked.id ?? picked.$id;
  if (!docId) return null;

  const full = await getMaterialById(docId);
  if (!full) return null;

  const ready = {
    ...picked,
    ...full,
    uploadedFiles: parseUploadedFilesForMock((full as any).uploadedFiles),
  };

  setValue(ready);
  setMockMaterialsCache((prev) => {
    const next = new Map(prev);
    next.set(docId, ready);
    return next;
  });

  return ready;
};

const ensureWritingPartReady = async ({
  currentValue,
  setValue,
  matcher,
}: {
  currentValue: any;
  setValue: (value: any) => void;
  matcher: (m: any) => boolean;
}) => {
  if (currentValue) return currentValue;

  const activeSet = getActiveMockSetKey();
  const cacheValues = Array.from(mockMaterialsCache.values());

  const cachedExact = cacheValues.find((m: any) => {
    return (
      String(m?.skill || "").toLowerCase() === "writing" &&
      normalizeMockSetKey(m?.mockSet) === activeSet &&
      matcher(m)
    );
  });

  if (cachedExact) {
    setValue(cachedExact);
    return cachedExact;
  }

  const cachedFallback = cacheValues.find((m: any) => {
    return (
      String(m?.skill || "").toLowerCase() === "writing" &&
      matcher(m)
    );
  });

  if (cachedFallback) {
    setValue(cachedFallback);
    return cachedFallback;
  }

  const all = (await getMaterials()) as any[];

  const picked =
    all.find((m: any) => {
      return (
        isTrueLike(m?.isMock) &&
        String(m?.skill || "").toLowerCase() === "writing" &&
        normalizeMockSetKey(m?.mockSet) === activeSet &&
        matcher(m)
      );
    }) ??
    all.find((m: any) => {
      return (
        isTrueLike(m?.isMock) &&
        String(m?.skill || "").toLowerCase() === "writing" &&
        matcher(m)
      );
    }) ??
    null;

  if (!picked) return null;

  const docId = picked.id ?? picked.$id;
  if (!docId) return null;

  const full = await getMaterialById(docId);
  if (!full) return null;

  let files = (full as any).uploadedFiles;
  if (typeof files === "string") {
    try {
      files = JSON.parse(files);
    } catch {
      files = {};
    }
  }

  const ready = {
    ...picked,
    ...full,
    uploadedFiles: files || {},
  };

  setValue(ready);
  setMockMaterialsCache((prev) => {
    const next = new Map(prev);
    next.set(docId, ready);
    return next;
  });

  return ready;
};

const ensureSpeakingPartReady = async ({
  currentValue,
  setValue,
  matcher,
}: {
  currentValue: any;
  setValue: (value: any) => void;
  matcher: (m: any) => boolean;
}) => {
  if (currentValue) return currentValue;

  const activeSet = getActiveMockSetKey();
  const cacheValues = Array.from(mockMaterialsCache.values());

  const cachedExact = cacheValues.find((m: any) => {
    return (
      String(m?.skill || "").toLowerCase() === "speaking" &&
      normalizeMockSetKey(m?.mockSet) === activeSet &&
      matcher(m)
    );
  });

  if (cachedExact) {
    setValue(cachedExact);
    return cachedExact;
  }

  const cachedFallback = cacheValues.find((m: any) => {
    return (
      String(m?.skill || "").toLowerCase() === "speaking" &&
      matcher(m)
    );
  });

  if (cachedFallback) {
    setValue(cachedFallback);
    return cachedFallback;
  }

  const all = (await getMaterials()) as any[];

  const picked =
    all.find((m: any) => {
      return (
        isTrueLike(m?.isMock) &&
        String(m?.skill || "").toLowerCase() === "speaking" &&
        normalizeMockSetKey(m?.mockSet) === activeSet &&
        matcher(m)
      );
    }) ??
    all.find((m: any) => {
      return (
        isTrueLike(m?.isMock) &&
        String(m?.skill || "").toLowerCase() === "speaking" &&
        matcher(m)
      );
    }) ??
    null;

  if (!picked) return null;

  const docId = picked.id ?? picked.$id;
  if (!docId) return null;

  const full = await getMaterialById(docId);
  if (!full) return null;

  const ready = {
    ...picked,
    ...full,
    uploadedFiles: parseUploadedFilesForMock((full as any).uploadedFiles),
  };

  setValue(ready);
  setMockMaterialsCache((prev) => {
    const next = new Map(prev);
    next.set(docId, ready);
    return next;
  });

  return ready;
};

useEffect(() => {
  if (!showMockTest) return;
  if (mockTestPart !== 7) return; // Listening Results page

  void Promise.all([
    ensureReadingPart1Ready(),
    ensureReadingPart2Ready(),
    ensureReadingPart3Ready(),
    ensureReadingPart4Ready(),
  ]);
}, [showMockTest, mockTestPart, mockMaterialsCache.size]);

useEffect(() => {
  if (!showMockTest) return;
  if (mockTestPart !== 12) return; // Reading Results page

  void Promise.all([
    ensureWritingPart1Ready(),
    ensureWritingPart2Ready(),
  ]);
}, [showMockTest, mockTestPart, mockMaterialsCache.size]);

useEffect(() => {
  if (!showMockTest) return;
  if (mockTestPart !== 15) return; // Writing Results page

  void Promise.all([
    ensureSpeakingPart1Ready(),
    ensureSpeakingPart2Ready(),
    ensureSpeakingPart3Ready(),
    ensureSpeakingPart4Ready(),
    ensureSpeakingPart5Ready(),
    ensureSpeakingPart6Ready(),
    ensureSpeakingPart7Ready(),
    ensureSpeakingPart8Ready(),
  ]);
}, [showMockTest, mockTestPart, mockMaterialsCache.size]);

const [showListeningResults, setShowListeningResults] = useState(false);


  // Load materials from Appwrite
// 🚀 Load materials from Appwrite WITH CACHE → instant refreshes
useEffect(() => {
  const loadMaterials = async () => {
    try {
      setIsLoading(true);
      console.log("📡 Fetching materials (no cache)...");
      const t0 = performance.now();

      const data = await getMaterials();

      const t1 = performance.now();
      console.log(`⏱️ Fetch took ${((t1 - t0) / 1000).toFixed(2)}s`);

      if (!data?.length) {
        setMaterials([]);
        return;
      }

      const published = data
        .map((doc: any) => ({
          id: doc.$id,
          title: doc.title,
          skill: doc.skill,
          task: doc.task,
          taskId: doc.taskId ?? doc.task ?? doc.taskID ?? doc.task_id,
          type: doc.type,
          status: doc.status,
          date: doc.date,
          questions: doc.questions || 0,
          description: doc.description || "",
          isMock: doc.isMock === true,
          mockSet: doc.mockSet ?? null,
          mockOrder: doc.mockOrder ?? null,
          uploadedFiles: {},
        }))
        .filter((m: any) => m.status === "Published");

      setMaterials(published);
      console.log(`✅ Loaded ${published.length} published materials`);
    } catch (error) {
      console.error("Error loading materials:", error);
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  };

  loadMaterials();
}, []);
  
  

  // Load API settings to check if Speaking scoring is available
// Load API settings from database to check if Speaking scoring is available
// Load API settings from database to check if Speaking scoring is available
useEffect(() => {
  const loadAPISettings = async () => {
    try {
      const settings = await getAPISettings();
      console.log('Loaded API settings:', settings); // ADD THIS LINE
      setApiSettings(settings);
      setIsAPIConnected(settings.isConnected || false);
    } catch (e) {
      console.error('Error loading API settings:', e);
    }
  };
  loadAPISettings();
}, []);
  
  const toggleSkillAccordion = (skillKey: string) => {
  setExpandedSkill((prev) => (prev === skillKey ? null : skillKey));
};


  // Helper function to get material count by skill and task
const getTaskMaterialCount = (skill: string, taskId: string) => {
  return materials.filter(
    (m: any) => m.skill === skill && m.taskId === taskId && m.isMock !== true
  ).length;
};

  
  const userStats = {
    testsCompleted: 12,
    averageScore: 8.5,
    studyStreak: 7,
    totalStudyHours: 24
  };
  
  const skillsData = {
    listening: {
      name: 'Listening',
      icon: Headphones,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      parts: 6,
      completed: 4,
      totalScenarios: 85,
      completedScenarios: 62,
      tasks: [
        { id: 'task1', name: 'Problem Solving', scenarios: 20, completed: 15, sections: 3, questions: 8 },
        { id: 'task2', name: 'Daily Life Conversation', scenarios: 15, completed: 12, sections: 1, questions: 5 },
        { id: 'task3', name: 'Information', scenarios: 18, completed: 10, sections: 1, questions: 6 },
        { id: 'task4', name: 'News Item', scenarios: 12, completed: 8, sections: 1, questions: 5 },
        { id: 'task5', name: 'Discussion', scenarios: 16, completed: 14, sections: 1, questions: 8 },
        { id: 'task6', name: 'Viewpoints', scenarios: 14, completed: 3, sections: 1, questions: 6 }
      ]
    },
    speaking: {
      name: 'Speaking',
      icon: Mic,
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      parts: 8,
      completed: 5,
      totalScenarios: 140,
      completedScenarios: 88,
      tasks: [
        { id: 'task1', name: 'Giving Advice', scenarios: 25, completed: 20 },
        { id: 'task2', name: 'Personal Experience', scenarios: 20, completed: 18 },
        { id: 'task3', name: 'Describing a Scene', scenarios: 18, completed: 12 },
        { id: 'task4', name: 'Making Predictions', scenarios: 16, completed: 10 },
        { id: 'task5', name: 'Comparing & Persuading', scenarios: 15, completed: 8 },
        { id: 'task6', name: 'Difficult Situation', scenarios: 14, completed: 12 },
        { id: 'task7', name: 'Expressing Opinions', scenarios: 17, completed: 6 },
        { id: 'task8', name: 'Unusual Situation', scenarios: 13, completed: 2 }
      ]
    },
    writing: {
      name: 'Writing',
      icon: Edit,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      parts: 2,
      completed: 1,
      totalScenarios: 40,
      completedScenarios: 20,
      tasks: [
        { id: 'task1', name: 'Writing an Email', scenarios: 22, completed: 18 },
        { id: 'task2', name: 'Survey Questions', scenarios: 18, completed: 2 }
      ]
    },
    reading: {
      name: 'Reading',
      icon: BookOpen,
      color: 'green',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      parts: 4,
      completed: 3,
      totalScenarios: 80,
      completedScenarios: 60,
      tasks: [
        { id: 'task1', name: 'Correspondence', scenarios: 24, completed: 20 },
        { id: 'task2', name: 'Apply a Diagram', scenarios: 19, completed: 15 },
        { id: 'task3', name: 'Information', scenarios: 21, completed: 18 },
        { id: 'task4', name: 'Viewpoints', scenarios: 16, completed: 7 }
      ]
    }
  };


// Transform database material into practice test format
const transformMaterialToScenario = (material, taskInfo) => {
  const files = material.uploadedFiles || {};
  
  const sectionAudios = files.sectionAudios || [];
  const sectionTranscripts = files.sectionTranscripts || [];
  const questionAudios = files.questionAudios || [];
  const questionAnswers = files.questionAnswers || [];
  const questionTranscripts = files.questionTranscripts || [];
  const videoFile = files.videoFile || null;


const contextImage =
    // Base64 data (most common)
    files?.contextImage?.data ||
    // Appwrite Storage URL (for large files)
    files?.contextImage?.storageUrl ||
    // Generic URL
    files?.contextImage?.url ||
    // If contextImage is directly a string (URL or base64)
    (typeof files?.contextImage === 'string' ? files?.contextImage : null);
	
	const instructions =
	  files?.instructions ||
	  material?.instructions ||
	  material?.description ||
	  "";


  // Problem Solving: 3 sections with 2, 3, 3 questions
  //const questionDistribution = taskInfo?.id === 'part1' ? [2, 3, 3] : [material.questions || 8];
  //const numSections = Math.max(3, sectionAudios.length, sectionTranscripts.length);
  
  // ✅ Listening Task 1 (Problem Solving): 3 sections with 2, 3, 3 questions
	const totalQuestions =
	  material.questions || questionAnswers.length || questionAudios.length || 8;

	// Your listening task list uses "task1" for Problem Solving
	const isProblemSolving =
	  material.taskId === "part1" ||
	  material.taskId === "task1" ||
	  taskInfo?.id === "task1" ||
	  taskInfo?.name === "Problem Solving" ||
	  taskInfo?.sections === 3 ||
	  taskInfo?.questions === 8;

	const questionDistribution = isProblemSolving ? [2, 3, 3] : [totalQuestions];

	// ✅ create the correct number of sections
	const numSections = Math.max(
	  questionDistribution.length,
	  sectionAudios.length,
	  sectionTranscripts.length
	);


  
const decodeTextContent = (dataUrl) => {
  if (!dataUrl) return '';

  // ✅ FIX: If it's already plain text (no data: prefix), return as-is
  if (!dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  try {
    const base64Content = dataUrl.split(',')[1];
    if (base64Content) {
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch (e) { console.error('Decode error:', e); }
  return '';
};
  
  const decodedMainFileText =
  typeof files?.file?.data === "string"
    ? decodeTextContent(files.file.data)
    : typeof files?.file === "string"
    ? decodeTextContent(files.file)
    : "";

const decodedParagraphText =
  typeof files?.paragraphText === "string"
    ? decodeTextContent(files.paragraphText)
    : "";
	
	
	const normalizedSectionTranscripts =
  Array.isArray(files.sectionTranscripts) && files.sectionTranscripts.length > 0
    ? files.sectionTranscripts.map((t: any) => {
        if (!t || !t.data) return t;
        return {
          ...t,
          data: decodeTextContent(t.data),
        };
      })
    : decodedMainFileText
    ? [
        {
          name: files?.file?.name || "reading-passage.txt",
          type: "text/plain",
          data: decodedMainFileText,
        },
      ]
    : [];
	
  const sections = [];
  let questionIndex = 0;
  
  for (let sectionIdx = 0; sectionIdx < numSections; sectionIdx++) {
    const sectionAudio = sectionAudios[sectionIdx];
    const sectionTranscript = sectionTranscripts[sectionIdx];
    const numQuestionsInSection = questionDistribution[sectionIdx] || 3;
    
    const sectionQuestions = [];
    const totalQuestions =
		  material.questions || questionAnswers.length || questionAudios.length || 8;

for (let q = 0; q < numQuestionsInSection && questionIndex < totalQuestions; q++) {
  const qAnswers = questionAnswers?.[questionIndex] || [];

  // ✅ Robust parsing (supports BOTH formats):
  // 1) [question, A, B, C, D, correctLetter]
  // 2) [A, B, C, D, correctLetter]
  const raw = Array.isArray(qAnswers)
    ? qAnswers.map(v => (typeof v === "string" ? v.trim() : v))
    : [];

  const normalizeLetter = (v: any) => {
    const s = String(v ?? "").trim().toUpperCase().replace(/[^A-D]/g, "");
    return ["A", "B", "C", "D"].includes(s) ? s : "";
  };

  const candLast = normalizeLetter(raw[raw.length - 1]);
  const cand5 = normalizeLetter(raw[5]);
  const cand4 = normalizeLetter(raw[4]);

  const correctUpper = candLast || cand5 || cand4 || "A";
  const correctLetter = correctUpper.toLowerCase();

  // remove correct letter from payload so it never becomes an option
  let payload = raw;
  if (candLast) payload = raw.slice(0, -1);
  else if (cand5) payload = raw.filter((_, i) => i !== 5);
  else if (cand4 && raw.length === 5) payload = raw.slice(0, 4);

  // payload can be:
  // - [question, A, B, C, D]
  // - [A, B, C, D]
  let qText = "";
  let optA = "", optB = "", optC = "", optD = "";

  if (payload.length >= 5) {
    qText =
      (payload[0] as string) ||
      material.questionsText?.[questionIndex] ||
      `Question ${questionIndex + 1}`;
    [optA, optB, optC, optD] = payload.slice(1, 5) as string[];
  } else {
    qText = material.questionsText?.[questionIndex] || `Question ${questionIndex + 1}`;
    [optA, optB, optC, optD] = payload.slice(0, 4) as string[];
  }

  const options = [optA, optB, optC, optD]
    .map(v => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

  const qTranscriptFile = questionTranscripts[questionIndex];
  const qTranscriptText = qTranscriptFile?.data ? decodeTextContent(qTranscriptFile.data) : null;

  sectionQuestions.push({
    id: `q${questionIndex + 1}`,
    questionText: qText,
    options: options.map((txt, i) => ({
      id: String.fromCharCode(97 + i), // a,b,c,d
      text: txt,
    })),
    correctAnswer: correctLetter,
    audioUrl: questionAudios[questionIndex]?.data || null,
    transcript: qTranscriptText,
  });

  questionIndex++;
}


    
    sections.push({
      id: `section-${sectionIdx + 1}`,
      title: `Section ${sectionIdx + 1}`,
      audioUrl: sectionAudio?.data || null,
      audioDuration: 90,
      transcript: sectionTranscript?.data ? decodeTextContent(sectionTranscript.data) : null,
      preparationTime: sectionIdx > 0 ? 10 : 0,
      questions: sectionQuestions
    });
  }
  
  // ✅ NEW: get instructions from DB (uploadedFiles.instructions)
	const instructionsText =
	typeof files?.instructions === "string"
    ? files.instructions
    : material.instructions || material.description || "";


// ✅ FIX: Make sure taskId exists for READING (very important)
// Your reading components routing depends on practiceTestData.taskId === "part1/part2/part3/part4"
const normalizeTaskId = (skill: string, id: string) => {
  if (!id) return id;

  // If reading tasks come as task1..task4, convert them to part1..part4
  if (skill === "reading" && id.startsWith("task")) {
    return id.replace("task", "part");
  }

  return id;
};

const resolvedTaskId = normalizeTaskId(
  material.skill,
  material.taskId || taskInfo?.id || ""
);


  
// ✅ Task 5 & Task 6 use 60s prep + 60s recording
// ✅ Per-task timing for ALL 8 tasks (matches SpeakingPracticeTest timing map)
const speakingTimingMap: Record<string, { prepTime: number; maxTime: number }> = {
  task1: { prepTime: 30, maxTime: 90 },
  task2: { prepTime: 30, maxTime: 60 },
  task3: { prepTime: 30, maxTime: 60 },
  task4: { prepTime: 30, maxTime: 60 },
  task5: { prepTime: 60, maxTime: 60 },
  task6: { prepTime: 60, maxTime: 60 },
  task7: { prepTime: 30, maxTime: 90 },
  task8: { prepTime: 30, maxTime: 60 },
};
const timingKey = taskInfo?.id || material.taskId || "";
const taskTiming = speakingTimingMap[timingKey] || { prepTime: 30, maxTime: 90 };

// ✅ Strip "Read the following..." prefix from passage text (already shown in UI header)
const stripReadingPrefix = (text: string): string =>
  text.replace(/^Read the following[^\n]*[\r\n]*/i, '').trimStart();
  
return {
    id: material.id,
    title: material.title,
    skill: material.skill,
  taskId: resolvedTaskId,
  
    taskName: taskInfo?.name || material.task,
    taskType: taskInfo?.id || material.taskId,
    totalTime: taskTiming.maxTime,
    prepTime: taskTiming.prepTime,
    maxTime: taskTiming.maxTime,
	
// ✅ ALWAYS use the DB instruction text
  instructions: instructionsText,
  contextDescription: instructionsText,

//message: decodedMainFileText,
//fileText: decodedMainFileText,
message: material.skill === "reading" ? stripReadingPrefix(decodedMainFileText) : decodedMainFileText,
fileText: material.skill === "reading" ? stripReadingPrefix(decodedMainFileText) : decodedMainFileText,
paragraphText: decodedParagraphText,

// ✅ Pre-decode all sectionTranscripts so ReadingInformationTest gets clean text
uploadedFiles: {
  ...files,

  file: files.file
    ? {
        ...files.file,
        data: decodedMainFileText,
      }
    : files.file,

  paragraphText: decodedParagraphText,

sectionTranscripts: material.skill === "reading"
  ? (files.sectionTranscripts || []).map((t: any, idx: number) => {
      if (idx !== 0 || !t?.data) return t;
      const decoded = decodeTextContent(t.data);
      const stripped = stripReadingPrefix(decoded);
      const encoded = btoa(unescape(encodeURIComponent(stripped)));
      return { ...t, data: `data:text/plain;base64,${encoded}` };
    })
  : normalizedSectionTranscripts,

  questionTranscripts: (files.questionTranscripts || []).map((t: any) => {
    if (!t || !t.data) return t;
    return {
      ...t,
      data: decodeTextContent(t.data),
    };
  }),
},

  // ✅ keep image in scenario
  contextImage: contextImage,

  // ✅ NEW: also provide imageUrl so SpeakingPracticeTest can show it
  imageUrl: contextImage,

  sections: sections,

  videoUrl: videoFile?.storageUrl || videoFile?.data || null,

  };

};



  const handleContinuePractice = (skillKey) => {
    setSelectedSkill(skillKey);
    setCurrentView('skill-tasks');
    setActiveTab('practice');
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setCurrentView('scenarios');
  };
  
    // Chaning for problem solving
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
  setCurrentView('dashboard');
  setSelectedTask(null);
  setSelectedSkill(null);
} else if (currentView === 'skill-tasks') {
		setCurrentView('dashboard');
		setSelectedSkill(null);
	  }
	};
  //const handleBack = () => {
   // if (currentView === 'question-active' || currentView === 'question-intro') {
    //  setCurrentView('scenarios');
    //  setSelectedScenario(null);
    //  setCurrentQuestion(0);
    //} else if (currentView === 'scenarios') {
   //   setCurrentView('skill-tasks');
    //  setSelectedTask(null);
   // } else if (currentView === 'skill-tasks') {
   //   setCurrentView('dashboard');
   //   setSelectedSkill(null);
  //  }
 // };
  
    //const handleLogout = async () => {
   // await signOut(auth);
  //};
  
const handleUpgradeToPro = () => {
  setShowProfileMenu(false);
  navigate("/?page=pricing");
};

const handleFeedback = () => {
  setShowProfileMenu(false);
  setShowFeedbackPage(true);
};

const handleLogout = async () => {
  sessionStorage.removeItem("clbprep_sub");   // ✅ ADD THIS LINE
  const nowIso = new Date().toISOString();

  try {
    if (userRowId) {
      await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, userRowId, {
        presenceStatus: "offline",
        lastSeenAt: nowIso,
      });
    }
  } catch (error) {
    console.log("Failed to mark offline before logout", error);
  }

  try {
    await account.deleteSession('current');
    window.location.href = '/';
  } catch (error) {
    console.error('Logout failed:', error);
    window.location.href = '/';
  }
};

const handleChangePassword = async () => {
  // Validate passwords
  if (!settingsForm.currentPassword || !settingsForm.newPassword || !settingsForm.confirmPassword) {
    setSettingsMessage({ type: 'error', text: 'Please fill in all password fields' });
    return;
  }
  
  if (settingsForm.newPassword !== settingsForm.confirmPassword) {
    setSettingsMessage({ type: 'error', text: 'New passwords do not match' });
    return;
  }
  
  if (settingsForm.newPassword.length < 8) {
    setSettingsMessage({ type: 'error', text: 'Password must be at least 8 characters' });
    return;
  }
  
  try {
    // Update password using Appwrite
    await account.updatePassword(settingsForm.newPassword, settingsForm.currentPassword);
    setSettingsMessage({ type: 'success', text: 'Password updated successfully!' });
    
    // Clear password fields
    setSettingsForm(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  } catch (error) {
    console.error('Password update error:', error);
    setSettingsMessage({ type: 'error', text: error.message || 'Failed to update password' });
  }
};

const handleSaveSettings = () => {
  // Save other settings (notifications, etc.)
  setSettingsMessage({ type: 'success', text: 'Settings saved successfully!' });
  
  // Close modal after a delay
  setTimeout(() => {
    setShowSettingsModal(false);
    setSettingsMessage({ type: '', text: '' });
  }, 1500);
};
  // Sidebar Component
  const Sidebar = () => (
    <>
      {/* Mobile backdrop overlay */}
      {isMobileMenuOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    <div className={`w-64 bg-white border-r h-screen h-dvh bg-white border-r fixed left-0 top-0 flex flex-col shadow-sm z-40 transition-transform duration-300 ${isDesktop || isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ height: '100dvh' }}>
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">CELPIP</h1>
            <p className="text-xs text-gray-500">Practice Platform</p>
          </div>
          {/* Close button - mobile only */}
          {!isDesktop && (
          <button
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          )}
        </div>
      </div>

      <nav className="flex-1 min-h-0 p-4 space-y-2 overflow-y-auto overflow-x-hidden">

  {/* MAIN MENU */}
{[
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mock-exams', label: 'Mock Exams', icon: FileText },
    { id: 'skill-builders', label: 'AI Skill Builders', icon: Brain },
  ].map(item => (
    <button
      key={item.id}
onClick={() => {
  setShowProfileMenu(false);
  setIsMobileMenuOpen(false);
  setActiveTab(item.id);
  setExpandedSkill(null); // ← ADD THIS LINE
  if (item.id === 'dashboard') {
    setCurrentView('dashboard');
    setSelectedSkill(null);
    setSelectedTask(null);
  }
}}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
        activeTab === item.id
          ? 'bg-blue-50 text-blue-600 font-semibold'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <item.icon className="w-5 h-5" />
      <span>{item.label}</span>
    </button>
  ))}

  {/* PRACTICE SECTION */}
{/* PRACTICE SECTION (Compact like Admin) */}
<div className="pt-4">
  <p className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
    Practice by Skill
  </p>

  <div className="space-y-1">
		{/* Original Order */}
    {/*{Object.entries(skillsData).map(([skillKey, skillData]: any) => (*/}
{(["listening", "reading", "writing", "speaking"] as const).map((skillKey) => {
  const skillData: any = (skillsData as any)[skillKey];
  return (

      <div key={skillKey}>
        {/* Skill Header */}
        <button
          onClick={() => toggleSkillAccordion(skillKey)}
          className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition ${
            expandedSkill === skillKey
              ? "bg-blue-50 text-blue-600 font-semibold"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <skillData.icon className="w-5 h-5" />
            <span className="text-sm">{skillData.name}</span>
          </div>

          <ChevronRight
            className={`w-4 h-4 transition-transform ${
              expandedSkill === skillKey ? "rotate-90" : ""
            }`}
          />
        </button>

        {/* Subsections (Parts) */}
        {expandedSkill === skillKey && (
          <div className="mt-1 ml-8 space-y-1">
{skillData.tasks.map((task: any, index: number) => (
  <button
    key={task.id}
onClick={() => {
  setShowProfileMenu(false);
  setIsMobileMenuOpen(false);
  setSelectedSkill(skillKey);
  setSelectedTask(task);
  setCurrentView("scenarios");
  setActiveTab("practice");
}}
    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition truncate ${
      selectedSkill === skillKey && selectedTask?.id === task.id
        ? "bg-blue-600 text-white font-medium"
        : "text-gray-600 hover:bg-gray-50"
    }`}
  >
    <span className="truncate block">
      Task {index + 1}: {task.name}
    </span>
  </button>
))}

          </div>
        )}
    </div>
  );
})}

  </div>
</div>

</nav>

{/* Subscription section label */}
{/* Account section */}
<div className="shrink-0 border-t bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
  <div className="px-4 pt-2 pb-1">
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
      Account
    </p>
  </div>

  <div className="px-4 pb-3">
    <div className="relative" ref={profileMenuRef}>
      <button
        onClick={() => setShowProfileMenu((prev) => !prev)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition text-left"
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
            isProMember
              ? "bg-gradient-to-br from-amber-400 to-yellow-500 shadow"
              : "bg-gradient-to-br from-blue-600 to-indigo-600"
          }`}
        >
          {(settingsForm.displayName || "U").trim().charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {settingsForm.displayName || "User"}
          </p>
          <p
            className={`text-[12px] font-medium ${
              isProMember ? "text-amber-600" : "text-gray-500"
            }`}
          >
            {isProMember ? "Pro Member" : "Basic"}
          </p>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            showProfileMenu ? "rotate-180" : ""
          }`}
        />
      </button>

      {showProfileMenu && (
        <div className="fixed left-2 right-2 bottom-[70px] rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl z-[60]"
          style={{ width: '240px', bottom: '70px' }}>
{!isProMember && (
  <button
    onClick={handleUpgradeToPro}
    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
  >
    <Crown className="w-4 h-4" />
    <span>Upgrade to Pro</span>
  </button>
)}

<button
  onClick={handleFeedback}
  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
>
  <MessageSquare className="w-4 h-4" />
  <span>Feedback</span>
</button>

<button
  onClick={() => {
    setShowProfileMenu(false);
    setActiveTab("subscription");
  }}
  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
>
  <CreditCard className="w-4 h-4" />
  <span>Subscription</span>
</button>

          <button
            onClick={() => {
              setShowProfileMenu(false);
              setShowSettingsModal(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => {
              setShowProfileMenu(false);
              void handleLogout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  </div>
</div>
    </div>
    </>
  );

// Subscription View
// Subscription View
// ✅ AFTER — add the two lines after useState:
const SubscriptionView = () => {
  const params = new URLSearchParams(window.location.search);
  const justPaid = params.get("checkout") === "success";

  const [subTab, setSubTab] = React.useState<"details" | "history">(
    justPaid ? "history" : "details"
  );

  const planLabels: Record<string, string> = {
    weekly: "1 Week (7 Days)",
    monthly: "1 Month (30 Days)",
    quarterly: "3 Months (90 Days)",
    basic: "Basic (Free)",
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = subscription.endAt
    ? new Date(subscription.endAt).getTime() < Date.now()
    : false;

  const daysLeft = subscription.endAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.endAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const planText = planLabels[subscription.plan] || subscription.plan;
  const statusText = isProMember
    ? "Active"
    : isExpired
    ? "Expired"
    : "Inactive";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Subscription</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your membership and view your payment history
          </p>
        </div>

        {isProMember && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
            <Crown className="w-4 h-4" />
            Pro Member
          </div>
        )}
      </div>

      {/* Golden Hero Card */}
      <div
        className={`relative overflow-hidden rounded-3xl border shadow-lg ${
          isProMember
            ? "border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-yellow-200/30 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                  isProMember
                    ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md"
                    : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                }`}
              >
                {isProMember ? (
                  <Crown className="h-8 w-8" />
                ) : (
                  <CreditCard className="h-8 w-8" />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Membership
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900">
                  {isProMember ? "Pro Member Subscription" : "Basic Membership"}
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  {isProMember
                    ? "You have full access to premium practice scenarios and mock exams."
                    : "Upgrade to Pro to unlock all practice scenarios and mock exams."}
                </p>
              </div>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                isProMember
                  ? "bg-white/80 text-amber-700 border border-amber-200"
                  : "bg-gray-100 text-gray-700 border border-gray-200"
              }`}
            >
              <Star className="w-4 h-4" />
              {statusText}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Zap className="w-4 h-4" />
                Plan
              </div>
              <p className="mt-2 text-lg font-bold text-gray-900">{planText}</p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Calendar className="w-4 h-4" />
                Started
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {formatDate(subscription.startAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Clock className="w-4 h-4" />
                Expires
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {formatDate(subscription.endAt)}
              </p>
              {isProMember && daysLeft !== null && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  {daysLeft} day{daysLeft === 1 ? "" : "s"} remaining
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSubTab("details")}
          className={`rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
            subTab === "details"
              ? "border-b-2 border-amber-500 text-amber-700"
              : "border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Subscription Details
        </button>

        <button
          onClick={() => setSubTab("history")}
          className={`rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
            subTab === "history"
              ? "border-b-2 border-amber-500 text-amber-700"
              : "border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Transaction History
        </button>
      </div>

      {/* Details Tab */}
      {subTab === "details" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h4 className="text-base font-bold text-gray-900">Membership Details</h4>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Membership</span>
                <span className="text-sm font-semibold text-gray-900">
                  {isProMember ? "Pro Member" : "Basic"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Plan</span>
                <span className="text-sm font-semibold text-gray-900">{planText}</span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Status</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isProMember
                      ? "bg-amber-50 text-amber-700"
                      : isExpired
                      ? "bg-red-50 text-red-600"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {statusText}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Started</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatDate(subscription.startAt)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Expires</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatDate(subscription.endAt)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-500">Paid On</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatDate(subscription.paidAt)}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              isProMember
                ? "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <h4 className="text-base font-bold text-gray-900">
              {isProMember ? "Your Pro Access" : "Upgrade Benefits"}
            </h4>

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white p-1.5 shadow-sm">
                  <CheckCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    All practice scenarios unlocked
                  </p>
                  <p className="text-xs text-gray-600">
                    Access every scenario across all skills.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white p-1.5 shadow-sm">
                  <CheckCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Full mock exam access
                  </p>
                  <p className="text-xs text-gray-600">
                    Unlock Mock Test 2 and above.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white p-1.5 shadow-sm">
                  <CheckCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Premium learning experience
                  </p>
                  <p className="text-xs text-gray-600">
                    Study with full platform access.
                  </p>
                </div>
              </div>
            </div>

            {!isProMember && (
              <button
                onClick={handleUpgradeToPro}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-3 font-semibold text-white transition hover:brightness-105"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {subTab === "history" && (
        <div>
          {subscription.transactionHistory.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center text-gray-400">
              <History className="mx-auto mb-3 h-10 w-10 opacity-30" />
              {justPaid ? (
                <>
                  <p className="text-sm font-medium text-amber-700">
                    Payment received — loading your receipt...
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    This may take up to 30 seconds. Please wait.
                  </p>
                  <div className="mx-auto mt-3 h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </>
              ) : (
                <p className="text-sm">No transactions yet.</p>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-700">
                {subscription.transactionHistory.length} transaction(s) found
              </div>

              <div className="hidden sm:grid grid-cols-4 gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <span>Date</span>
                <span>Plan</span>
                <span>Invoice ID</span>
                <span className="text-right">Amount</span>
              </div>

              {subscription.transactionHistory.map((tx: any, i: number) => (
                <div
                  key={i}
                  className={`px-4 sm:px-6 py-4 text-sm ${i !== 0 ? "border-t border-gray-100" : ""}`}
                >
                  {/* Mobile stacked layout */}
                  <div className="sm:hidden space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Date</span>
                      <span className="text-xs text-gray-700">
                        {tx.date ? new Date(tx.date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Plan</span>
                      <span className="text-xs font-medium capitalize text-gray-800">{tx.plan || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Amount</span>
                      <span className="text-xs font-bold text-gray-900">
                        {tx.amount != null && tx.amount > 0 ? `$${tx.amount} ${tx.currency || "CAD"}` : tx.status === "paid" ? "Paid ✓" : "—"}
                      </span>
                    </div>
                  </div>
                  {/* Desktop grid layout */}
                  <div className={`hidden sm:grid grid-cols-4 gap-3 items-center`}>
                    <span className="text-xs leading-snug text-gray-700">
                      {tx.date
                        ? new Date(tx.date).toLocaleString("en-CA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                    <span className="font-medium capitalize text-gray-800">
                      {tx.plan || "—"}
                    </span>
                    <span
                      className="truncate font-mono text-xs text-gray-400"
                      title={tx.id}
                    >
                      {tx.id ? tx.id.slice(0, 18) + "…" : "—"}
                    </span>
                    <span className="text-right font-bold text-gray-900">
                      {tx.amount != null && tx.amount > 0
                        ? `$${tx.amount} ${tx.currency || "CAD"}`
                        : tx.status === "paid"
                        ? "Paid ✓"
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
  
  // Dashboard View
  const DashboardView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
  {(() => {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${settingsForm.displayName?.split(" ")[0] || "User"}! ☀️`;
  if (hour < 17) return `Good afternoon, ${settingsForm.displayName?.split(" ")[0] || "User"}! 👋`;
  return `Good evening, ${settingsForm.displayName?.split(" ")[0] || "User"}! 🌙`;
})()}
</h2>

      
      </div>

      {/* Mock Test Experience Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1">Complete Mock Test Experience</h3>
            <p className="text-white/90 mb-2 text-sm">Practice all skills: Listening, Reading, Writing, and Speaking in one comprehensive test</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="text-white/95 text-sm">Timed sections matching real exam conditions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="text-white/95 text-sm">AI-powered scoring and detailed feedback</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="text-white/95 text-sm">Performance analysis for each skill</span>
              </div>
            </div>
          </div>
          <div className="sm:ml-6 shrink-0">
            <button 
              onClick={() => setActiveTab('mock-exams')}
              className="w-full sm:w-auto px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Mock Test
            </button>
          </div>
        </div>
      </div>

{/* AI Skill Builders Banner */}
<div className="bg-gradient-to-r from-violet-500 via-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-5 h-5" />
        <h3 className="text-xl font-bold">AI Skill Builders</h3>
      </div>
      <p className="text-white/90 text-sm mb-2">
        Practice English freely with personalized AI guidance — Vocabulary, Grammar, Speaking, Writing & more
      </p>
      <div className="flex flex-wrap gap-3 text-xs">
        {["📖 Learn Mode", "🏋️ Practice Mode", "🎯 Exam Mode"].map((item) => (
          <span key={item} className="bg-white/20 rounded-full px-3 py-1 font-medium">
            {item}
          </span>
        ))}
      </div>
    </div>
    <div className="sm:ml-6 shrink-0">
      <button
        onClick={() => setActiveTab("skill-builders")}
        className="w-full sm:w-auto px-5 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition shadow-lg flex items-center justify-center gap-2"
      >
        <Brain className="w-5 h-5" />
        Explore Builders
      </button>
    </div>
  </div>
</div>

      {/* All Skills with Subsections — one unified grid, header + tasks per column */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Practice by Skill</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(["listening", "reading", "writing", "speaking"] as const).map((skillKey) => {
            const skill = skillsData[skillKey];
            return (
              <div key={skillKey} className="flex flex-col gap-3">
                {/* Skill header */}
                <div className={`${skill.bgColor} rounded-xl p-4 border ${skill.borderColor} text-center`}>
                  <div className="flex items-center justify-center gap-2">
                    <skill.icon className={`w-5 h-5 text-${skill.color}-600`} />
                    <h4 className="font-bold text-gray-900">{skill.name}</h4>
                  </div>
                </div>

                {/* Task cards */}
                {skill.tasks.map((task, idx) => {
                  const actualCount = getTaskMaterialCount(skillKey, task.id.replace('task', 'part'));
                  const taskProgress = actualCount > 0 ? 100 : 0;
                  return (
                    <button
                      key={task.id}
                      onClick={() => {
                        setSelectedSkill(skillKey);
                        setSelectedTask(task);
                        setCurrentView('scenarios');
                      }}
                      className="w-full bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md hover:border-gray-300 transition text-left"
                    >
                      <div className="mb-2">
                        <span className="text-xs font-semibold text-gray-500">Task #{idx + 1}</span>
                      </div>
                      <h5 className="font-semibold text-gray-900 text-sm mb-2">{task.name}</h5>
                      <div className="text-xs text-gray-600 mb-2">
                        {actualCount > 0 ? `${actualCount} scenarios available` : 'No scenarios yet'}
                      </div>
                      {actualCount > 0 && (
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full bg-gradient-to-r ${skill.gradient}`}
                            style={{ width: `${Math.min(taskProgress, 100)}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );

  // Skill Tasks View (Subsections)
  const SkillTasksView = () => {
    const skill = skillsData[selectedSkill];
    
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className={`bg-gradient-to-r ${skill.gradient} rounded-2xl p-6 text-white shadow-lg`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <skill.icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">{skill.name} Practice</h2>
              <p className="text-white/90">{skill.parts} parts • {skill.totalScenarios} total scenarios</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Choose a Part to Practice</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
{skill.tasks
  .map((task, idx) => {
    // ✅ Fix mapping: task1 -> part1 (matches your DB taskId)
    const dbTaskId = task.id.replace("task", "part");
    const actualCount = getTaskMaterialCount(selectedSkill, dbTaskId);

    // ✅ Hide tasks with no scenarios yet
    if (actualCount === 0) return null;

    return (
      <div
        key={task.id}
        onClick={() => handleTaskClick(task)}
        className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-xs font-semibold text-gray-500 mb-1 block">
              Part {idx + 1}
            </span>
            <h4 className="text-lg font-bold text-gray-900">{task.name}</h4>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        {task.sections && (
          <p className="text-sm text-gray-600 mb-3">
            {task.sections} section{task.sections > 1 ? "s" : ""} • {task.questions} questions
          </p>
        )}

        {/* ✅ Show real scenario count */}
        <div className="text-sm text-gray-600 mb-3">
          {actualCount} scenario{actualCount > 1 ? "s" : ""} available
        </div>

        <button
          className={`mt-2 w-full py-2.5 ${skill.bgColor} text-${skill.color}-700 rounded-lg font-semibold hover:shadow-md transition flex items-center justify-center gap-2`}
        >
          <Play className="w-4 h-4" />
          Start Practice
        </button>
      </div>
    );
  })
  .filter(Boolean)}

          </div>
        </div>
      </div>
    );
  };

  // Mock Exams View
  const MockExamsView = () => {
const mockExams = React.useMemo(() => {
  const mockMaterials = (materials as any[]).filter((m) => m.isMock === true);

const parseMockNumberFromTitle = (title?: string) => {
  const text = String(title || "");
  const match = text.match(/mock(?:\s*test)?\s*(\d+)/i);
  return match ? Number(match[1]) : null;
};

const getMockNumber = (m: any) => {
  const fromMockSet = Number(m?.mockSet);
  if (Number.isFinite(fromMockSet) && fromMockSet > 0) return fromMockSet;

  const fromMockTestId = Number(m?.mockTestId);
  if (Number.isFinite(fromMockTestId) && fromMockTestId > 0) return fromMockTestId;

  const fromTitle = parseMockNumberFromTitle(m?.title);
  if (Number.isFinite(fromTitle) && fromTitle > 0) return fromTitle;

  return null;
};

const getGroupKey = (m: any) => {
  const n = getMockNumber(m);
  if (n != null) return `mock-${n}`;

  return "mock-unknown";
};

const groups = new Map<string, any>();

for (const m of mockMaterials) {
  const key = getGroupKey(m);
  const inferredNumber = getMockNumber(m);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        number: Number.isFinite(inferredNumber) ? inferredNumber : null,
        name:
          Number.isFinite(inferredNumber)
            ? `Mock Test ${inferredNumber}`
            : "Mock Test",
        skills: {
          listening: 0,
          reading: 0,
          writing: 0,
          speaking: 0,
        },
        totalScenarios: 0,
        materials: [], // Store all materials for this mock exam
      });
    }

    const g = groups.get(key);
    if (m.skill && g.skills[m.skill] != null) g.skills[m.skill] += 1;
    g.totalScenarios += 1;
    g.materials.push(m); // Add the material to the group
  }

  const list = Array.from(groups.values());

  // Sort: newest/highest mock number first; unknown last
// Sort: Mock Test 1 first, then 2, 3... unknown last
list.sort((a, b) => {
  const an = a.number ?? Number.MAX_SAFE_INTEGER;
  const bn = b.number ?? Number.MAX_SAFE_INTEGER;
  return an - bn;
});

  return list;
}, [materials]);

// Function to start mock test
// Function to start mock test
const handleStartMockTest = async (exam: any) => {
  if (!canAccessMockExam(exam)) {
    openUpgradeModal(
      "Only Mock Test 1 is available on the Basic plan. Upgrade to Pro to unlock Mock Test 2 and above."
    );
    return;
  }
  
  // ✅ Wipe previous answers so results always reflect this fresh attempt
const mockSetNum = parseInt(
  String(exam?.number ?? exam?.key ?? "1"),
  10
) || 1;
await clearMockAnswersFromDB(mockSetNum);

  const isListening = (m: any) => String(m?.skill || "").toLowerCase() === "listening";
    const isReading = (m: any) =>
    String(m?.skill || "").toLowerCase() === "reading";
	
	const isWriting = (m: any) => String(m?.skill || "").toLowerCase() === "writing";
	const isSpeaking = (m: any) => String(m?.skill || "").toLowerCase() === "speaking";


    const getTaskText = (m: any) =>
    String(m?.taskId ?? m?.task ?? m?.taskID ?? "").toLowerCase();

  const getTitleText = (m: any) => String(m?.title ?? "").toLowerCase();

  const isReadingPart1 = (m: any) => {
    const task = getTaskText(m);
    const title = getTitleText(m);
    return (
      task === "part1" ||
      task === "task1" ||
      task.includes("r_t1") ||
      task.includes("reading_t1") ||
      task.includes("part 1") ||
      task.includes("part1") ||
      task.includes("correspondence") ||
      title.includes("r_t1") ||
      title.includes("reading_t1") ||
      title.includes("part 1") ||
      title.includes("part1") ||
      title.includes("correspondence") ||
      title.includes("reading correspondence")
    );
  };

  const isReadingPart2 = (m: any) => {
    const task = getTaskText(m);
    const title = getTitleText(m);
    return (
      task === "part2" ||
      task === "task2" ||
      task.includes("r_t2") ||
      task.includes("reading_t2") ||
      task.includes("part 2") ||
      task.includes("part2") ||
      task.includes("diagram") ||
      task.includes("apply a diagram") ||
      title.includes("r_t2") ||
      title.includes("reading_t2") ||
      title.includes("part 2") ||
      title.includes("part2") ||
      title.includes("diagram") ||
      title.includes("apply a diagram")
    );
  };

  const isReadingPart3 = (m: any) => {
    const task = getTaskText(m);
    const title = getTitleText(m);
    return (
      task === "part3" ||
      task === "task3" ||
      task.includes("r_t3") ||
      task.includes("reading_t3") ||
      task.includes("part 3") ||
      task.includes("part3") ||
      task.includes("information") ||
      title.includes("r_t3") ||
      title.includes("reading_t3") ||
      title.includes("part 3") ||
      title.includes("part3") ||
      title.includes("information")
    );
  };

  const isReadingPart4 = (m: any) => {
    const task = getTaskText(m);
    const title = getTitleText(m);
    return (
      task === "part4" ||
      task === "task4" ||
      task.includes("r_t4") ||
      task.includes("reading_t4") ||
      task.includes("part 4") ||
      task.includes("part4") ||
      task.includes("viewpoints") ||
      title.includes("r_t4") ||
      title.includes("reading_t4") ||
      title.includes("part 4") ||
      title.includes("part4") ||
      title.includes("viewpoints")
    );
  };





  const isPart1 = (m: any) => {
    const task = String(m?.taskId || "").toLowerCase();
    const title = String(m?.title || "").toLowerCase();
    return task.includes("part 1") || task.includes("problem") || task.includes("t1") || title.includes("t1");
  };

  const isPart2 = (m: any) => {
    const task = String(m?.taskId || "").toLowerCase();
    const title = String(m?.title || "").toLowerCase();
    return task.includes("part 2") || task.includes("daily life") || task.includes("conversation") || task.includes("t2") || title.includes("t2");
  };

  const isPart3 = (m: any) => {
    const task = String(m?.taskId || "").toLowerCase();
    const title = String(m?.title || "").toLowerCase();
    return task.includes("part 3") || task.includes("information") || task.includes("t3") || title.includes("t3");
  };

  // ✅ ADD Part 4 detector (news item)
  const isPart4 = (m: any) => {
    const task = String(m?.taskId || "").toLowerCase();
    const title = String(m?.title || "").toLowerCase();
    return (
      task.includes("part 4") ||
      task.includes("news") ||
      task.includes("t4") ||
      title.includes("t4") ||
      title.includes("news")
    );
  };
  
  // ✅ ADD Part 5 detector (discussion / video)
const isPart5 = (m: any) => {
  const task = String(m?.taskId || "").toLowerCase();
  const title = String(m?.title || "").toLowerCase();
  return (
    task.includes("part 5") ||
    task.includes("discussion") ||
    task.includes("t5") ||
    title.includes("t5") ||
    title.includes("discussion")
  );
};

// ✅ ADD Part 6 detector
const isPart6 = (m: any) => {
  const task = String(m?.taskId || "").toLowerCase();
  const title = String(m?.title || "").toLowerCase();

  return (
    task.includes("part 6") ||
    task.includes("part6") ||
    task.includes("t6") ||
    task.includes("l_t6") ||
    title.includes("part 6") ||
    title.includes("part6") ||
    title.includes("t6") ||
    title.includes("l_t6")
  );
};


  const p1 =
    exam.materials.find((m: any) => isListening(m) && isPart1(m)) ||
    exam.materials.find((m: any) => isListening(m)) ||
    null;

  const p2 =
    exam.materials.find((m: any) => isListening(m) && isPart2(m)) ||
    null;

  const p3 =
    exam.materials.find((m: any) => isListening(m) && isPart3(m)) ||
    null;

// ✅ NEW: Part 5 doc
const p5 =
  exam.materials.find((m: any) => isListening(m) && isPart5(m)) ||
  null;

const p6 =
  exam.materials.find((m: any) => isListening(m) && isPart6(m)) ||
  null;
  
    const r1 =
    exam.materials.find((m: any) => isReading(m) && isReadingPart1(m)) ||
    null;
	
	const r2 =
  exam.materials.find((m: any) => isReading(m) && isReadingPart2(m)) ||
  null;

	const r3 =
	exam.materials.find((m: any) => isReading(m) && isReadingPart3(m)) || null;
  
	const r4 =
	exam.materials.find((m: any) => isReading(m) && isReadingPart4(m)) || null;
	
	// ✅ Writing mock docs (prefer mockOrder when present)
// ✅ Writing mock docs (Admin uses taskId: part1 / part2)
const w1 =
  exam.materials.find((m: any) => isWriting(m) && m.isMock === true && m.taskId === "part1") ||
  exam.materials.find((m: any) => isWriting(m) && m.taskId === "part1") ||
  null;

const w2 =
  exam.materials.find((m: any) => isWriting(m) && m.isMock === true && m.taskId === "part2") ||
  exam.materials.find((m: any) => isWriting(m) && m.taskId === "part2") ||
  null;

// ✅ Speaking mock docs (Task 1-8, uses taskId: part1..part8)
const s1 = exam.materials.find((m: any) => isSpeaking(m) && m.isMock === true && m.taskId === "part1") || null;
const s2 = exam.materials.find((m: any) => isSpeaking(m) && m.isMock === true && m.taskId === "part2") || null;
const s3 = exam.materials.find((m: any) => isSpeaking(m) && m.isMock === true && m.taskId === "part3") || null;
const s4 = exam.materials.find((m: any) => isSpeaking(m) && m.isMock === true && m.taskId === "part4") || null;
const s5 = exam.materials.find((m: any) => isSpeaking(m) && m.isMock === true && m.taskId === "part5") || null;
const s6 = exam.materials.find((m: any) => isSpeaking(m) && m.isMock === true && m.taskId === "part6") || null;
const s7 = exam.materials.find((m: any) => isSpeaking(m) && m.isMock === true && m.taskId === "part7") || null;
const s8 = exam.materials.find((m: any) => isSpeaking(m) && m.isMock === true && m.taskId === "part8") || null;




  // ✅ NEW: Part 4 doc
  const p4 =
    exam.materials.find((m: any) => isListening(m) && isPart4(m)) ||
    null;

if (!p1) {
    alert("No listening material found for this mock test");
    return;
  }

  // 🔑 Fetch FULL materials (with uploadedFiles) from DB before starting
  setIsLoading(true);
  try {
    // Helper: fetch full doc and parse uploadedFiles string → object
const decodeBase64Text = (dataUrl: string): string => {
      if (!dataUrl) return '';
      try {
        const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
      } catch (e) { return ''; }
    };

const fetchFull = async (m: any) => {
  if (!m) return null;

  const cached = mockMaterialsCache.get(m.id);
  if (cached) return cached;

  const full = await getMaterialById(m.id);
  if (!full) return null;

  let files = (full as any).uploadedFiles;
  if (typeof files === "string") {
    try {
      files = JSON.parse(files);
    } catch {
      files = {};
    }
  }
  files = files || {};

  if (Array.isArray(files.sectionTranscripts)) {
    files.sectionTranscripts = files.sectionTranscripts.map((t: any) => {
      if (!t || !t.data) return t;

      if (typeof t.data === "string" && !t.data.startsWith("data:")) {
        return t;
      }

      return { ...t, data: decodeBase64Text(t.data) };
    });
  }

  const ready = { ...full, uploadedFiles: files };

  setMockMaterialsCache((prev) => {
    const next = new Map(prev);
    next.set(m.id, ready);
    return next;
  });

  return ready;
};

    const [
      fullP1, fullP2, fullP3, fullP4, fullP5, fullP6,
      fullR1, fullR2, fullR3, fullR4,
      fullW1, fullW2,
      fullS1, fullS2, fullS3, fullS4, fullS5, fullS6, fullS7, fullS8
    ] = await Promise.all([
      fetchFull(p1), fetchFull(p2), fetchFull(p3), fetchFull(p4), fetchFull(p5), fetchFull(p6),
      fetchFull(r1), fetchFull(r2), fetchFull(r3), fetchFull(r4),
      fetchFull(w1), fetchFull(w2),
      fetchFull(s1), fetchFull(s2), fetchFull(s3), fetchFull(s4),
      fetchFull(s5), fetchFull(s6), fetchFull(s7), fetchFull(s8),
    ]);

    localStorage.setItem("activeMockMaterialId", p1.id);

    const normalizeMockSet = (v: any) => {
      const s = String(v ?? "").trim();
      const match = s.match(/\d+/);
      return match ? match[0] : s;
    };

    const setKey = normalizeMockSet(p1.mockSet ?? exam?.number ?? exam?.key);
    if (setKey) localStorage.setItem("activeMockSet", setKey);

    setActiveMockTest(fullP1);
    setActiveMockTestPart2(fullP2);
    setActiveMockTestPart3(fullP3);
    setActiveMockTestPart4(fullP4);
    setActiveMockTestPart5(fullP5);
    setActiveMockTestPart6(fullP6);

    setActiveReadingPart1(fullR1);
    setActiveReadingPart2(fullR2);
    setActiveReadingPart3(fullR3);
    setActiveReadingPart4(fullR4);

    setActiveWritingPart1(fullW1);
    setActiveWritingPart2(fullW2);

    setActiveSpeakingPart1(fullS1);
    setActiveSpeakingPart2(fullS2);
    setActiveSpeakingPart3(fullS3);
    setActiveSpeakingPart4(fullS4);
    setActiveSpeakingPart5(fullS5);
    setActiveSpeakingPart6(fullS6);
    setActiveSpeakingPart7(fullS7);
    setActiveSpeakingPart8(fullS8);

    setBackFromPart2(false);
    setMockTestPart(1);
    setShowMockTest(true);
  } catch (error) {
    console.error("Failed to load mock test materials:", error);
    alert("Failed to load mock test. Please try again.");
  } finally {
    setIsLoading(false);
  }
};




    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Mock Exams</h2>
          <p className="text-gray-600">Full CELPIP practice tests with all four skills</p>
        </div>

        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Complete Mock Test Experience</h3>
              <p className="text-white/90 mb-4">Practice all skills: Listening, Reading, Writing, and Speaking in one comprehensive test</p>
              <ul className="space-y-2 text-sm text-white/90">
                <li>✓ Timed sections matching real exam conditions</li>
                <li>✓ AI-powered scoring and detailed feedback</li>
                <li>✓ Performance analysis for each skill</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
{mockExams.map((exam) => {
  const isReady =
    exam.skills?.listening > 0 &&
    exam.skills?.reading > 0 &&
    exam.skills?.writing > 0 &&
    exam.skills?.speaking > 0;

  const isLocked = !canAccessMockExam(exam);

  return (
    <div
      key={exam.key}
      className={`bg-white rounded-xl p-6 border-2 transition-all ${
        isLocked
          ? "border-gray-200 bg-gray-50 opacity-80"
          : isReady
          ? "border-green-200 bg-green-50"
          : "border-gray-200 hover:border-blue-300 hover:shadow-lg"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-lg font-bold text-gray-900">{exam.name}</h4>

        {isLocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700">
            <Lock className="w-3.5 h-3.5" />
            Pro Only
          </span>
        ) : exam.status === "completed" ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-4">
          {exam.skills?.listening > 0 && (
            <span className="flex items-center gap-1">
              <Headphones className="w-4 h-4" /> Listening
            </span>
          )}
          {exam.skills?.reading > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" /> Reading
            </span>
          )}
          {exam.skills?.writing > 0 && (
            <span className="flex items-center gap-1">
              <Edit className="w-4 h-4" /> Writing
            </span>
          )}
          {exam.skills?.speaking > 0 && (
            <span className="flex items-center gap-1">
              <Mic className="w-4 h-4" /> Speaking
            </span>
          )}
        </div>

        <div className="text-sm text-gray-600 mb-4">
          {exam.totalScenarios} scenario{exam.totalScenarios !== 1 ? "s" : ""} found in database
        </div>

        {isLocked ? (
          <button
            onClick={() =>
              openUpgradeModal(
                "Only Mock Test 1 is available on the Basic plan. Upgrade to Pro to unlock Mock Test 2 and above."
              )
            }
            className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition text-sm flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Locked - Upgrade to Pro
          </button>
        ) : (
          <button
            onClick={() => handleStartMockTest(exam)}
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition text-sm flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Mock Test
          </button>
        )}
      </div>
    </div>
  );
})}
        </div>
      </div>
    );
  };

  // Results View

  // ✅ FIXED: ResultsView - Now loads REAL data from database
  const ResultsView = () => {
    const [isLoadingResults, setIsLoadingResults] = useState(true);
    const [resultsStats, setResultsStats] = useState<{
      totalTests: number;
      averageScore: number;
      bestScore: number;
      skillStats: { skill: string; tests: number; average: number; best: number }[];
    } | null>(null);
    const [allResults, setAllResults] = useState<any[]>([]);

    useEffect(() => {
      const loadResults = async () => {
        setIsLoadingResults(true);
        try {
          const [stats, results] = await Promise.all([
            getDashboardStats(),
            getUserResultsParsed({ limit: 20 })
          ]);
          setResultsStats(stats);
          setAllResults(results);
        } catch (error) {
          console.error('[ResultsView] Failed to load:', error);
        } finally {
          setIsLoadingResults(false);
        }
      };
      loadResults();
    }, []);

    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const calculateImprovement = () => {
      if (allResults.length < 2) return 0;
      const recent = allResults.slice(0, Math.min(5, allResults.length));
      const older = allResults.slice(Math.min(5, allResults.length));
      if (older.length === 0) return 0;
      const recentAvg = recent.reduce((sum, r) => sum + (r.celpipScore || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, r) => sum + (r.celpipScore || 0), 0) / older.length;
      return (recentAvg - olderAvg).toFixed(1);
    };

    // Loading state
    if (isLoadingResults) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Results</h2>
            <p className="text-gray-600">View your test history and performance</p>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      );
    }

    // Empty state
    if (!resultsStats || resultsStats.totalTests === 0) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Results</h2>
            <p className="text-gray-600">View your test history and performance</p>
          </div>
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Test Results Yet</h3>
            <p className="text-gray-600 mb-6">Complete some practice or mock tests to see your progress!</p>
            <button onClick={() => setActiveTab('dashboard')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
              Start Practicing
            </button>
          </div>
        </div>
      );
    }

    // Main view with REAL data
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">My Results</h2>
          <p className="text-gray-600">View your test history and performance</p>
        </div>

        {/* Overall Performance - REAL DATA */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Highest Score</p>
                <p className="text-2xl font-bold text-gray-900">{resultsStats.bestScore}/12</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{resultsStats.averageScore}/12</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tests Taken</p>
                <p className="text-2xl font-bold text-gray-900">{resultsStats.totalTests}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Improvement</p>
                <p className="text-2xl font-bold text-gray-900">{Number(calculateImprovement()) >= 0 ? '+' : ''}{calculateImprovement()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Test Results - REAL DATA */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Test Results</h3>
          <div className="space-y-3">
            {allResults.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No test results yet</p>
            ) : (
              allResults.slice(0, 5).map((result, idx) => {
                const skill = skillsData[result.skill] || skillsData.listening;
                return (
                  <div key={result.id || idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${skill.gradient} rounded-xl flex items-center justify-center`}>
                        <skill.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {result.testType === 'mock' ? 'Mock Test' : 'Practice Test'}
                          {result.mockSet ? ` Set ${result.mockSet}` : ''}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(result.createdAt)} • {skill.name}
                          {result.taskId ? ` • ${result.taskId}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">{result.celpipScore}</p>
                        <p className="text-xs text-gray-500">out of 12</p>
                      </div>
                      {result.correctCount !== undefined && result.totalQuestions && (
                        <div className="text-right text-sm text-gray-500">
                          <p>{result.correctCount}/{result.totalQuestions}</p>
                          <p>correct</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Performance by Skill - REAL DATA */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance by Skill</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(skillsData).map(([key, skill]) => {
              const skillStat = resultsStats.skillStats.find(s => s.skill === key);
              const avgScore = skillStat?.average || 0;
              const testCount = skillStat?.tests || 0;
              return (
                <div key={key} className={`${skill.bgColor} rounded-xl p-5 border ${skill.borderColor}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${skill.gradient} rounded-lg flex items-center justify-center`}>
                      <skill.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{skill.name}</h4>
                      <p className="text-sm text-gray-600">{testCount > 0 ? `${testCount} tests` : 'No tests yet'}</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-bold text-gray-900">{testCount > 0 ? avgScore.toFixed(1) : '-'}</p>
                    {testCount > 0 && <p className="text-sm text-gray-500 mb-1">out of 12</p>}
                  </div>
                  {skillStat && skillStat.best > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Best: {skillStat.best}/12</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

const ScenariosView = () => {
    const skill = skillsData[selectedSkill];
    
    // Get actual materials from database for this skill and task
const taskMaterials = materials.filter(
  (m) =>
    m.skill === selectedSkill &&
    m.taskId === selectedTask.id.replace("task", "part") &&
    m.isMock !== true
);

    
    // If no materials from database, show empty state
    if (taskMaterials.length === 0) {
      return (
        <div className="space-y-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to {skill.name} Parts
          </button>

          <div className={`bg-gradient-to-r ${skill.gradient} rounded-2xl p-6 text-white shadow-lg`}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <skill.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{selectedTask.name}</h2>
                <p className="text-white/90">No practice materials available yet</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm text-center">
            <div className="text-gray-400 mb-4">
              <FileText className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Scenarios Available</h3>
            <p className="text-gray-600">Check back later for new practice materials.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to {skill.name} Parts
        </button>

        <div className={`bg-gradient-to-r ${skill.gradient} rounded-2xl p-6 text-white shadow-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <skill.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{selectedTask.name}</h2>
                <p className="text-white/90">{taskMaterials.length} practice scenarios available</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{taskMaterials.length}</p>
              <p className="text-sm text-white/80">Available</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Available Scenarios</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {taskMaterials.map((material, index) => {
  const isLocked = !canAccessScenario(index);

  return (
    <button
      key={material.id}
onClick={async () => {
  if (isLocked) {
    openUpgradeModal(
      "Only Scenario 1 is available on the Basic plan. Upgrade to Pro to unlock Scenario 2 and above."
    );
    return;
  }

  setSelectedScenario(material);

  // ✅ Lazy-load the full material (with uploadedFiles) only now
  const fullMaterial = await getMaterialById(material.id);
  const uploadedFiles = fullMaterial?.uploadedFiles
    ? (typeof fullMaterial.uploadedFiles === "string"
        ? JSON.parse(fullMaterial.uploadedFiles)
        : fullMaterial.uploadedFiles)
    : {};
  const materialWithFiles = { ...material, uploadedFiles };

  const scenarioData = transformMaterialToScenario(materialWithFiles, {
    id: selectedTask.id,
    name: selectedTask.name,
    sections: selectedTask.sections || 3,
  });

  console.log("Transformed scenario data:", scenarioData);
setPracticeTestData(scenarioData);
  setCurrentView("practice-test");
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}}
      className={`relative p-5 rounded-xl border-2 transition-all text-left ${
        isLocked
          ? "bg-gray-50 border-gray-200 opacity-80"
          : `${skill.bgColor} ${skill.borderColor} hover:shadow-md`
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          Scenario {index + 1}
        </span>

        {isLocked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700">
            <Lock className="w-3.5 h-3.5" />
            Pro Only
          </span>
        )}
      </div>

      <h4 className="font-medium text-gray-900 text-sm mb-2">{material.title}</h4>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{material.questions} questions</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          {isLocked ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isLocked ? "Locked - Upgrade to Pro" : "Start Practice"}</span>
        </div>
      </div>
    </button>
  );
})}
          </div>
        </div>
      </div>
    );
  };

// ✅ Add this RIGHT AFTER ScenariosView ends
// Replace the PracticeTestView component AND the main render section in your userHome__.tsx

// ============================================================
// OPTION 1: Replace PracticeTestView (lines ~1283-1511) with this:
// ============================================================

const PracticeTestView = () => {
  if (!practiceTestData) return null;

  const handleBackFromTest = () => {
    setCurrentView("scenarios");
    setPracticeTestData(null);
  };

  const handleComplete = (results: any) => {
    console.log("Test completed:", results);
    setCurrentView("scenarios");
    setPracticeTestData(null);
  };

  // ✅ SPEAKING
  if (practiceTestData.skill === "speaking") {
    return (
      <SpeakingPracticeTest
        scenario={practiceTestData}
        apiSettings={apiSettings}
        onBack={handleBackFromTest}
        onComplete={handleComplete}
      />
    );
  }

  // ✅ WRITING
  if (practiceTestData.skill === "writing") {
    return (
      <WritingPracticeTest
        scenario={practiceTestData}
        apiSettings={apiSettings}
        onBack={handleBackFromTest}
        onComplete={handleComplete}
      />
    );
  }

  // ✅ READING - Unified ReadingTest auto-detects part from scenario
  if (practiceTestData.skill === "reading") {
    return (
      <ReadingTest
        scenario={practiceTestData}
        onBack={handleBackFromTest}
        onComplete={handleComplete}
      />
    );
  }

  // ✅ LISTENING - Route to specific listening components based on taskName/taskType
  // Daily Life Conversation
  if (practiceTestData.taskName === "Daily Life Conversation") {
    return (
      <ListeningDailyLifeConversationTest
        scenario={practiceTestData}
        onBack={handleBackFromTest}
        onComplete={handleComplete}
      />
    );
  }

  // Listening for Information
  if (practiceTestData.taskName?.toLowerCase().includes("information")) {
    return (
      <ListeningForInformationPracticeTest
        scenario={practiceTestData}
        onBack={handleBackFromTest}
        onComplete={handleComplete}
      />
    );
  }

  // News Item
  if (
    practiceTestData.taskName?.toLowerCase().includes("news") ||
    practiceTestData.taskType === "task4" ||
    practiceTestData.taskType === "part4"
  ) {
    return (
      <ListeningNewsItemTest
        scenario={practiceTestData}
        onBack={handleBackFromTest}
        onComplete={handleComplete}
      />
    );
  }

  // Discussion
  if (
    practiceTestData.taskName === "Discussion" ||
    practiceTestData.taskType === "task5" ||
    practiceTestData.taskType === "part5"
  ) {
    return (
      <ListeningDiscussionTest
        scenario={practiceTestData}
        onBack={handleBackFromTest}
        onComplete={handleComplete}
      />
    );
  }

  // Viewpoints
  if (
    practiceTestData.taskName?.toLowerCase().includes("view") ||
    practiceTestData.taskType === "task6" ||
    practiceTestData.taskType === "part6"
  ) {
    return (
      <ListeningViewPointsTest
        scenario={practiceTestData}
        onBack={handleBackFromTest}
        onComplete={handleComplete}
      />
    );
  }

  // Default: Problem Solving (Listening Part 1)
  return (
    <ListeningPracticeTest
      scenario={practiceTestData}
      onBack={handleBackFromTest}
      onComplete={handleComplete}
    />
  );
};


// ============================================================
// ALTERNATIVE OPTION 2: Keep main render logic like the original file
// Replace lines 1816-1831 with this conditional rendering:
// ============================================================

{/* Main Content */}
<main className="p-6">
{activeTab === "mock-exams" ? (
    <MockExamsView />
  ) : activeTab === "results" ? (
    <ResultsView />
  ) : activeTab === "subscription" ? (
    <SubscriptionView />
  ) : currentView === "dashboard" && activeTab === "dashboard" ? (
    <DashboardView />
  ) : currentView === "skill-tasks" ? (
    <SkillTasksView />
  ) : currentView === "scenarios" ? (
    <ScenariosView />
  ) : currentView === "question-intro" ? (
    <QuestionIntroView />
  ) : currentView === "practice-test" && practiceTestData ? (
    <>
      {/* ✅ SPEAKING */}
      {practiceTestData.skill === "speaking" ? (
        <SpeakingPracticeTest
          scenario={practiceTestData}
          apiSettings={apiSettings}
          onBack={() => {
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
          onComplete={(results) => {
            console.log("Speaking completed:", results);
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
        />

      ) : practiceTestData.skill === "writing" ? (
        <WritingPracticeTest
          scenario={practiceTestData}
          apiSettings={apiSettings}
          onBack={() => {
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
          onComplete={(results) => {
            console.log("Writing completed:", results);
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
        />

      // ✅ READING
      ) : practiceTestData.skill === "reading" ? (
        <ReadingTest
          scenario={practiceTestData}
          onBack={() => {
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
          onComplete={(results) => {
            console.log("Reading completed:", results);
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
        />

      /* ✅ LISTENING */
      ) : practiceTestData.taskName === "Daily Life Conversation" ? (
        <ListeningDailyLifeConversationTest
          scenario={practiceTestData}
          onBack={() => {
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
          onComplete={(results) => {
            console.log("Daily Life Conversation completed:", results);
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
        />
      ) : practiceTestData.taskName?.toLowerCase().includes("information") ? (
        <ListeningForInformationPracticeTest
          scenario={practiceTestData}
          onBack={() => {
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
          onComplete={(results) => {
            console.log("Listening for Information completed:", results);
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
        />
      ) : practiceTestData.taskName?.toLowerCase().includes("news") ||
        practiceTestData.taskType === "task4" ||
        practiceTestData.taskType === "part4" ? (
        <ListeningNewsItemTest
          scenario={practiceTestData}
          onBack={() => {
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
          onComplete={(results) => {
            console.log("News Item completed:", results);
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
        />
      ) : practiceTestData.taskName === "Discussion" ||
        practiceTestData.taskType === "task5" ||
        practiceTestData.taskType === "part5" ? (
        <ListeningDiscussionTest
          scenario={practiceTestData}
          onBack={() => {
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
          onComplete={(results) => {
            console.log("Discussion completed:", results);
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
        />
      ) : practiceTestData.taskName?.toLowerCase().includes("view") ||
        practiceTestData.taskType === "task6" ||
        practiceTestData.taskType === "part6" ? (
        <ListeningViewPointsTest
          scenario={practiceTestData}
          onBack={() => {
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
          onComplete={(results) => {
            console.log("View Points completed:", results);
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
        />
      ) : (
        <ListeningPracticeTest
          scenario={practiceTestData}
          onBack={() => {
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
          onComplete={(results) => {
            console.log("Test completed:", results);
            setCurrentView("scenarios");
            setPracticeTestData(null);
          }}
        />
      )}
    </>
  ) : null}
</main>
  // DELETE lines 830-1007 in your userHome.tsx and REPLACE with this:

  // Settings Modal Component - Using local state to prevent re-render jumps
  const SettingsModal = () => {
    // Local state for the modal to prevent parent re-renders
    const [localNotifications, setLocalNotifications] = useState(settingsForm.notifications);
    const [localDarkMode, setLocalDarkMode] = useState(settingsForm.darkMode);
    const [localDisplayName, setLocalDisplayName] = useState(settingsForm.displayName);
    const [localCurrentPassword, setLocalCurrentPassword] = useState('');
    const [localNewPassword, setLocalNewPassword] = useState('');
    const [localConfirmPassword, setLocalConfirmPassword] = useState('');
    
    if (!showSettingsModal) return null;
    
    const handleSave = () => {
      // Update parent state only when saving
      setSettingsForm({
        ...settingsForm,
        notifications: localNotifications,
        darkMode: localDarkMode,
        displayName: localDisplayName,
        currentPassword: localCurrentPassword,
        newPassword: localNewPassword,
        confirmPassword: localConfirmPassword
      });
      setSettingsMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => {
        setShowSettingsModal(false);
        setSettingsMessage({ type: '', text: '' });
      }, 1500);
    };
    
    const handlePasswordUpdate = async () => {
      if (!localCurrentPassword || !localNewPassword || !localConfirmPassword) {
        setSettingsMessage({ type: 'error', text: 'Please fill in all password fields' });
        return;
      }
      if (localNewPassword !== localConfirmPassword) {
        setSettingsMessage({ type: 'error', text: 'New passwords do not match' });
        return;
      }
      if (localNewPassword.length < 8) {
        setSettingsMessage({ type: 'error', text: 'Password must be at least 8 characters' });
        return;
      }
      try {
        await account.updatePassword(localNewPassword, localCurrentPassword);
        setSettingsMessage({ type: 'success', text: 'Password updated successfully!' });
        setLocalCurrentPassword('');
        setLocalNewPassword('');
        setLocalConfirmPassword('');
      } catch (error) {
        setSettingsMessage({ type: 'error', text: error.message || 'Failed to update password' });
      }
    };
    
    return (
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setShowSettingsModal(false);
          }
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <button 
              type="button"
              onClick={() => {
                setShowSettingsModal(false);
                setSettingsMessage({ type: '', text: '' });
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Content - Scrollable */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Success/Error Message */}
            {settingsMessage.text && (
              <div className={`p-4 rounded-lg ${
                settingsMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {settingsMessage.text}
              </div>
            )}
            
            {/* Profile Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={localDisplayName}
                    onChange={(e) => setLocalDisplayName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value="user@celpip.com"
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>
            
            {/* Password Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={localCurrentPassword}
                    onChange={(e) => setLocalCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={localNewPassword}
                    onChange={(e) => setLocalNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={localConfirmPassword}
                    onChange={(e) => setLocalConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePasswordUpdate}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Update Password
                </button>
              </div>
            </div>
            
            {/* Preferences Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
              <div className="space-y-4">
                {/* Email Notifications Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive updates about your progress</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={localNotifications}
                    onClick={() => setLocalNotifications(!localNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      localNotifications ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {/* Dark Mode Toggle */}
                
              </div>
            </div>
          </div>
          
          {/* Footer - Fixed */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={() => {
                setShowSettingsModal(false);
                setSettingsMessage({ type: '', text: '' });
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };


const UpgradeModal = () => {
  if (!showUpgradeModal) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setShowUpgradeModal(false);
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pro content locked</h3>
              <p className="text-sm text-gray-500">Upgrade to unlock everything</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowUpgradeModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm leading-6 text-gray-600">
            {upgradeModalMessage}
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
            >
              Maybe later
            </button>

            <button
              type="button"
              onClick={() => {
                setShowUpgradeModal(false);
                navigate("/?page=pricing");
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition font-medium flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Upgrade Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

if (!authChecked) {
	if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-sm text-gray-500">Loading your practice materials...</p>
      </div>
    </div>
  );
}
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-sm text-gray-500">Checking account...</div>
    </div>
  );
}

if (!authAllowed) {
  return null;
}

  return (
    <div className={`flex min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
      {/* Show Mock Test Full Screen when active */}
{showMockTest && activeMockTest ? (
  <div className="w-full min-h-screen bg-gray-100">
    {/* Back button */}
    <div className="bg-white border-b px-4 py-2">
      <button
onClick={() => {
  setShowMockTest(false);

  setActiveMockTest(null);
  setActiveMockTestPart2(null);
  setActiveMockTestPart3(null);
  setActiveMockTestPart4(null);
  setActiveMockTestPart5(null);
  setActiveMockTestPart6(null); // ✅ NEW
// ADD THIS LINE:
  setActiveReadingPart1(null); // Clear reading state
  
  setActiveWritingPart1(null);
  setActiveWritingPart2(null);

  setMockTestPart(1);
  setBackFromPart2(false);

  localStorage.removeItem("activeMockMaterialId");
  localStorage.removeItem("activeMockSet");
}}

        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Exit Mock Test
      </button>
    </div>

    {/* Render mock parts */}
{/* Render mock parts */}
{/* Render mock parts */}
{mockTestPart === 1 ? (
  <L_T1_MockTest
    material={activeMockTest}
    startAtLastQuestion={backFromPart2}
    onComplete={() => setMockTestPart(2)}
  />
) : mockTestPart === 2 ? (
  <L_T2_MockTest
    material={activeMockTestPart2 ?? null}
    onBack={() => {
      setBackFromPart2(true);
      setMockTestPart(1);
    }}
    onComplete={() => {
      setBackFromPart2(false);
      setMockTestPart(3);
    }}
  />
) : mockTestPart === 3 ? (
  <L_T3_MockTest
    material={activeMockTestPart3 ?? null}
    onBack={() => setMockTestPart(2)}
    onComplete={() => setMockTestPart(4)}
  />
) : mockTestPart === 4 ? (
  <L_T4_MockTest
    material={activeMockTestPart4 ?? null}
    onBack={() => setMockTestPart(3)}
    onComplete={() => setMockTestPart(5)}
  />
) : mockTestPart === 5 ? (
  <L_T5_MockTest
    material={activeMockTestPart5 ?? null}
    onBack={() => setMockTestPart(4)}
    onComplete={() => setMockTestPart(6)}
  />
) : mockTestPart === 6 ? (
  <L_T6_MockTest
    material={activeMockTestPart6 ?? null}
    onBack={() => setMockTestPart(5)}
    onComplete={() => setMockTestPart(7)} // Go to results
  />
) : mockTestPart === 7 ? (
  <L_Results_MockTest
    onBack={() => setMockTestPart(6)}
    onComplete={async () => {
      const ready = await ensureReadingPart1Ready();

      if (!ready) {
        alert("Reading Part 1 material was not found.");
        return;
      }

      setMockTestPart(8);
    }}
    onRetry={() => {
      setMockTestPart(1);
      setBackFromPart2(false);
    }}
  />
) : mockTestPart === 8 ? (
  <R_T1_MockTest
    material={activeReadingPart1 ?? null}
    onBack={() => setMockTestPart(7)}
    onComplete={async () => {
      await ensureReadingPart2Ready();
      setMockTestPart(9);
    }}
  />
) : mockTestPart === 9 ? (
  <R_T2_MockTest
    material={activeReadingPart2 ?? null}
    onBack={() => setMockTestPart(8)}
    onComplete={async () => {
      await ensureReadingPart3Ready();
      setMockTestPart(10);
    }}
  />
) : mockTestPart === 10 ? (
  <R_T3_MockTest
    material={activeReadingPart3 ?? null}
    onBack={() => setMockTestPart(9)}
    onComplete={async () => {
      await ensureReadingPart4Ready();
      setMockTestPart(11);
    }}
  />
) : mockTestPart === 11 ? (
  <R_T4_MockTest
    material={activeReadingPart4 ?? null}
    onBack={() => setMockTestPart(10)}
    onComplete={() => setMockTestPart(12)}   // ✅ Part 4 → Results
  />
) : mockTestPart === 12 ? (
  <R_Results_MockTest
    onBack={() => setMockTestPart(11)}
    onComplete={async () => {
      await Promise.all([
        ensureWritingPart1Ready(),
        ensureWritingPart2Ready(),
      ]);
      setMockTestPart(13);
    }}
    onRetry={() => setMockTestPart(8)}
  />
) : mockTestPart === 13 ? (
  <W_T1_MockTest
    material={activeWritingPart1 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onComplete={async () => {
      await ensureWritingPart2Ready();
      setMockTestPart(14);
    }}
    onBack={() => setMockTestPart(12)}
  />
) : mockTestPart === 14 ? (
  <W_T2_MockTest
    material={activeWritingPart2 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onComplete={() => setMockTestPart(15)}
    onBack={() => setMockTestPart(13)}
  />

) : mockTestPart === 15 ? (
  <W_Results_MockTest
    onBack={() => setMockTestPart(14)}
    onComplete={async () => {
      await Promise.all([
        ensureSpeakingPart1Ready(),
        ensureSpeakingPart2Ready(),
        ensureSpeakingPart3Ready(),
        ensureSpeakingPart4Ready(),
        ensureSpeakingPart5Ready(),
        ensureSpeakingPart6Ready(),
        ensureSpeakingPart7Ready(),
        ensureSpeakingPart8Ready(),
      ]);
      setMockTestPart(16);
    }}
  />
) : mockTestPart === 16 ? (
  <S_T1_MockTest
    material={activeSpeakingPart1 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onBack={() => setMockTestPart(15)}
    onComplete={async () => {
      await ensureSpeakingPart2Ready();
      setMockTestPart(17);
    }}
  />
) : mockTestPart === 17 ? (
  <S_T2_MockTest
    material={activeSpeakingPart2 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onBack={() => setMockTestPart(16)}
    onComplete={async () => {
      await ensureSpeakingPart3Ready();
      setMockTestPart(18);
    }}
  />
) : mockTestPart === 18 ? (
  <S_T3_MockTest
    material={activeSpeakingPart3 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onBack={() => setMockTestPart(17)}
    onComplete={async () => {
      await ensureSpeakingPart4Ready();
      setMockTestPart(19);
    }}
  />
) : mockTestPart === 19 ? (
  <S_T4_MockTest
    material={activeSpeakingPart4 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onBack={() => setMockTestPart(18)}
    onComplete={async () => {
      await ensureSpeakingPart5Ready();
      setMockTestPart(20);
    }}
  />
) : mockTestPart === 20 ? (
  <S_T5_MockTest
    material={activeSpeakingPart5 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onBack={() => setMockTestPart(19)}
    onComplete={async () => {
      await ensureSpeakingPart6Ready();
      setMockTestPart(21);
    }}
  />
) : mockTestPart === 21 ? (
  <S_T6_MockTest
    material={activeSpeakingPart6 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onBack={() => setMockTestPart(20)}
    onComplete={async () => {
      await ensureSpeakingPart7Ready();
      setMockTestPart(22);
    }}
  />
) : mockTestPart === 22 ? (
  <S_T7_MockTest
    material={activeSpeakingPart7 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onBack={() => setMockTestPart(21)}
    onComplete={async () => {
      await ensureSpeakingPart8Ready();
      setMockTestPart(23);
    }}
  />
) : mockTestPart === 23 ? (
  <S_T8_MockTest
    material={activeSpeakingPart8 ?? null}
    mockSet={localStorage.getItem("activeMockSet") || 1}
    onBack={() => setMockTestPart(22)}
    onComplete={() => setMockTestPart(24)}
  />
) : mockTestPart === 24 ? (
  <S_Results_MockTest
    onBack={() => setMockTestPart(23)}
    onComplete={() => {
      setShowMockTest(false);
    }}
  />
) : null}







  </div>
) : showFeedbackPage ? (
  <FeedbackPage
  onBack={() => setShowFeedbackPage(false)}
  userEmail={settingsForm.email}
  userName={settingsForm.displayName}
/>
) : (
  <>
    <Sidebar />
    {/* Mobile top header bar */}
    {!isDesktop && (
    <div className="fixed top-0 left-0 right-0 z-20 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
          <Award className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-sm">CELPIP Practice</span>
      </div>
    </div>
    )}

      <div
        className="flex-1"
        style={{ marginLeft: isDesktop ? '16rem' : 0, paddingTop: isDesktop ? 0 : '57px' }}
      >
            {/* Header */}


            {/* Main Content */}
            {/* Main Content */}
<main className="p-3 sm:p-4 md:p-6">
{activeTab === "mock-exams" ? (
  <MockExamsView />
) : activeTab === "results" ? (
  <ResultsView />
) : activeTab === "subscription" ? (
  <SubscriptionView />
) : activeTab === "skill-builders" ? (
  <AISkillBuilders
    isProMember={isProMember}
    openUpgradeModal={openUpgradeModal}
    userId={userRowId ?? undefined}
    onBack={() => {
      setActiveTab("dashboard");
      setCurrentView("dashboard");
    }}
  />
) : currentView === "dashboard" && activeTab === "dashboard" ? (
  <DashboardView />
  
  ) : currentView === "skill-tasks" ? (
    <SkillTasksView />
  ) : currentView === "scenarios" ? (
    <ScenariosView />
  ) : currentView === "question-intro" ? (
    <QuestionIntroView />
) : currentView === "practice-test" && practiceTestData ? (
  <PracticeTestView />
) : null}

</main>


            {/* Question Active View - Full Screen */}
            {currentView === 'question-active' && (
              <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 z-50"
                style={{ top: isDesktop ? 0 : '57px' }}>
                <div className="h-full p-4 sm:p-8">
                  <QuestionActiveView />
                </div>
              </div>
            )}

		{/* Settings Modal */}
            <SettingsModal />
			<UpgradeModal />
          </div>
        </>
      )}
    </div>
  );
}
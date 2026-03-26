import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Headphones, PlayCircle } from "lucide-react";
import { getMaterials } from "../services/materialsService";

type UploadedFile = {
  name?: string;
  size?: string;
  type?: string;
  data?: string; // base64 data URL
};

type Material = {
  id: string;
  title: string;
  skill: string;
  task: string;
  taskId: string;
  status: string;
  questions?: number;
  uploadedFiles?: {
    questionAudios?: UploadedFile[];
    questionAnswers?: string[][];
  };
};

export default function ListeningScenarioList() {
  const { skill, taskId } = useParams();
  const navigate = useNavigate();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getMaterials();

        const formatted = (data || []).map((doc: any) => ({
          id: doc.$id,
          title: doc.title,
          skill: doc.skill,
          task: doc.task,
          taskId: doc.taskId,
          status: doc.status,
          questions: doc.questions || 0,
          uploadedFiles: doc.uploadedFiles ? JSON.parse(doc.uploadedFiles) : {},
        }));

        // ✅ only Published
        setMaterials(formatted.filter((m: Material) => m.status === "Published"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const scenarios = useMemo(() => {
    return materials.filter(
      (m) => m.skill === skill && m.taskId === taskId
    );
  }, [materials, skill, taskId]);

  const getQuestionCount = (m: Material) => {
    const qAudios = m.uploadedFiles?.questionAudios?.length || 0;
    const qAnswers = m.uploadedFiles?.questionAnswers?.length || 0;
    return Math.max(qAudios, qAnswers, m.questions || 0);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/user")}
            className="h-10 w-10 rounded-xl border bg-white hover:bg-slate-50 grid place-items-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                Listening • Problem Solving
              </div>
              <div className="text-xs text-slate-500">
                Choose a scenario to start Question 1
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Available Scenarios
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Each scenario contains question audio + multiple-choice answers.
          </p>

          {loading ? (
            <div className="text-sm text-slate-500">Loading scenarios...</div>
          ) : scenarios.length === 0 ? (
            <div className="text-sm text-slate-500">
              No published scenarios found for this task.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() =>
                    navigate(`/practice/${skill}/${taskId}/${s.id}`, {
                      state: { startAt: 0 },
                    })
                  }
                  className="text-left rounded-2xl border bg-white hover:bg-slate-50 transition shadow-sm p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        Scenario {idx + 1}
                      </div>
                      <div className="font-semibold text-slate-900 leading-snug">
                        {s.title}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {getQuestionCount(s)} questions
                      </div>
                    </div>

                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center shrink-0">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-4 text-sm font-medium text-blue-600">
                    Start Question 1 →
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

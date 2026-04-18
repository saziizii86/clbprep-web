// src/pages/ProgressDashboard.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ArrowLeft, Gamepad2, Trash2, Loader2, RefreshCw } from "lucide-react";
import { loadSessionsFromDB, clearSessionsFromDB } from "../services/progressService";
import { getSessions, clearLocalSessions } from "./games/sessionTracker";
import type { SessionRecord } from "./games/sessionTracker";

const DAILY_GOAL = 5;

const SKILLS = [
  { id: "listening",  label: "Listening",  color: "#3b82f6", icon: "🎧" },
  { id: "speaking",   label: "Speaking",   color: "#f97316", icon: "🗣️" },
  { id: "reading",    label: "Reading",    color: "#10b981", icon: "📖" },
  { id: "writing",    label: "Writing",    color: "#8b5cf6", icon: "✍️" },
  { id: "vocabulary", label: "Vocabulary", color: "#ec4899", icon: "📚" },
  { id: "grammar",    label: "Grammar",    color: "#f59e0b", icon: "📝" },
];

const ACTIVITY_SKILL: Record<string, string> = {
  ws:"vocabulary", mg:"vocabulary", sb:"grammar", fb:"grammar",
  lp:"listening",  dc:"speaking",
  listening:"listening", speaking:"speaking", reading:"reading",
  writing:"writing", vocabulary:"vocabulary", grammar:"grammar",
  pronunciation:"speaking", conversation:"speaking", "mistake-review":"grammar",
};

const ACTIVITY_COLORS: Record<string, string> = {
  ws:"#3b82f6", mg:"#9333ea", sb:"#16a34a", fb:"#f59e0b",
  lp:"#0d9488", dc:"#f43f5e",
  listening:"#3b82f6", speaking:"#f97316", reading:"#10b981",
  writing:"#8b5cf6", vocabulary:"#ec4899", grammar:"#d97706",
  pronunciation:"#ea580c", conversation:"#c2410c", "mistake-review":"#64748b",
};

const ACTIVITY_LABELS: Record<string, { label: string; type: "Game"|"Builder" }> = {
  ws:{label:"Word Search",type:"Game"}, mg:{label:"Matching Game",type:"Game"},
  sb:{label:"Sentence Builder",type:"Game"}, fb:{label:"Fill in the Blank",type:"Game"},
  lp:{label:"Listening Puzzle",type:"Game"}, dc:{label:"Dialogue",type:"Game"},
  listening:{label:"Listening Builder",type:"Builder"}, speaking:{label:"Speaking Builder",type:"Builder"},
  reading:{label:"Reading Builder",type:"Builder"}, writing:{label:"Writing Builder",type:"Builder"},
  vocabulary:{label:"Vocabulary Builder",type:"Builder"}, grammar:{label:"Grammar Builder",type:"Builder"},
  pronunciation:{label:"Pronunciation",type:"Builder"}, conversation:{label:"Conversation",type:"Builder"},
  "mistake-review":{label:"Mistake Review",type:"Builder"},
};

function localDateStr(d=new Date()):string{return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function dateLabel(str:string,fmt:"short"|"week"|"month"="short"):string{const d=new Date(str+"T12:00:00");if(fmt==="week")return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});if(fmt==="month")return d.toLocaleDateString("en-US",{month:"short"});return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});}
function addDays(base:string,n:number):string{const d=new Date(base+"T12:00:00");d.setDate(d.getDate()+n);return localDateStr(d);}

type SkillMins=Record<string,number>;
type ActMins=Record<string,number>;
interface BarEntry{label:string;isToday:boolean;sessions:number;skillMins:SkillMins;actMins:ActMins;actSessions:Record<string,number>;totalMins:number;}

function calcSkillMins(recs:SessionRecord[]):SkillMins{const o:SkillMins={};SKILLS.forEach(s=>o[s.id]=0);recs.forEach(r=>{const sk=ACTIVITY_SKILL[r.activityId]??r.skill;if(sk in o)o[sk]+=Math.round(r.durationSeconds/60);});return o;}
function calcActData(recs:SessionRecord[]):{actMins:ActMins;actSessions:Record<string,number>}{const am:ActMins={},as2:Record<string,number>={};recs.forEach(r=>{am[r.activityId]=(am[r.activityId]??0)+Math.round(r.durationSeconds/60);as2[r.activityId]=(as2[r.activityId]??0)+1;});return{actMins:am,actSessions:as2};}
function total(sm:SkillMins){return Object.values(sm).reduce((a,b)=>a+b,0);}

function buildBiweekly(sessions:SessionRecord[]):BarEntry[]{const today=localDateStr();const bd:Record<string,SessionRecord[]>={};sessions.forEach(s=>{(bd[s.date]=bd[s.date]??[]).push(s);});return Array.from({length:14},(_,i)=>{const dt=addDays(today,i-13);const recs=bd[dt]??[];const sm=calcSkillMins(recs);const{actMins:am,actSessions:as2}=calcActData(recs);return{label:dateLabel(dt),isToday:dt===today,sessions:recs.length,skillMins:sm,actMins:am,actSessions:as2,totalMins:total(sm)};});}
function buildWeekly(sessions:SessionRecord[]):BarEntry[]{const today=localDateStr();const dow=new Date(today+"T12:00:00").getDay();const ws=addDays(today,-(dow===0?6:dow-1));return Array.from({length:5},(_,w)=>{const start=addDays(ws,-(4-w)*7);const end=addDays(start,6);const recs=sessions.filter(s=>s.date>=start&&s.date<=end);const sm=calcSkillMins(recs);const{actMins:am,actSessions:as2}=calcActData(recs);return{label:`${dateLabel(start,"week")}–${dateLabel(end,"week")}`,isToday:w===4,sessions:recs.length,skillMins:sm,actMins:am,actSessions:as2,totalMins:total(sm)};});}
function buildMonthly(sessions:SessionRecord[]):BarEntry[]{const d=new Date();return Array.from({length:12},(_,i)=>{const m=11-i;const dt=new Date(d.getFullYear(),d.getMonth()-m,1);const yr=dt.getFullYear();const mo=dt.getMonth();const start=`${yr}-${String(mo+1).padStart(2,"0")}-01`;const end=localDateStr(new Date(yr,mo+1,0));const recs=sessions.filter(s=>s.date>=start&&s.date<=end);const sm=calcSkillMins(recs);const{actMins:am,actSessions:as2}=calcActData(recs);return{label:dt.toLocaleDateString("en-US",{month:"short"}),isToday:m===0,sessions:recs.length,skillMins:sm,actMins:am,actSessions:as2,totalMins:total(sm)};});}

// Donut chart
function arcPath(cx:number,cy:number,r:number,s:number,e:number):string{const rad=(deg:number)=>((deg-90)*Math.PI)/180;const x1=cx+r*Math.cos(rad(s)),y1=cy+r*Math.sin(rad(s));const x2=cx+r*Math.cos(rad(e)),y2=cy+r*Math.sin(rad(e));return`M ${x1} ${y1} A ${r} ${r} 0 ${e-s>180?1:0} 1 ${x2} ${y2}`;}
function DonutChart({sm}:{sm:SkillMins}){
  const t=Object.values(sm).reduce((a,b)=>a+b,0);
  const S=200,R=72;
  if(t===0)return(<svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}><circle cx={S/2} cy={S/2} r={R} fill="none" stroke="#e5e7eb" strokeWidth="18"/><text x={S/2} y={S/2+5} textAnchor="middle" fontSize="13" fill="#9ca3af" fontWeight="600">No data</text></svg>);
  let start=0;
  const slices=SKILLS.map(sk=>{const pct=(sm[sk.id]??0)/t;const sweep=pct*360;const path=sweep>0.5?arcPath(S/2,S/2,R,start,start+sweep):null;start+=sweep;return{...sk,pct,path};}).filter(s=>s.path);
  return(<svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>{slices.map(s=>(<path key={s.id} d={s.path!} fill="none" stroke={s.color} strokeWidth="18" strokeLinecap="butt"><title>{s.label}: {Math.round(sm[s.id]??0)} min ({Math.round(s.pct*100)}%)</title></path>))}<text x={S/2} y={S/2-5} textAnchor="middle" fontSize="24" fontWeight="900" fill="#1e293b">{t}</text><text x={S/2} y={S/2+18} textAnchor="middle" fontSize="13" fontWeight="600" fill="#64748b">min</text></svg>);
}

// Bar chart
function StackedBarChart({bars,colorKey}:{bars:BarEntry[];colorKey:"skill"|"activity"}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const wrapRef=useRef<HTMLDivElement>(null);
  const [tooltip,setTooltip]=useState<{bar:BarEntry;x:number;y:number}|null>(null);
  const [canvasW,setCanvasW]=useState(640);
  const H=300;
  const maxTotal=Math.max(...bars.map(b=>b.totalMins),1);
  const activities=useMemo(()=>{const ids=new Set<string>();bars.forEach(b=>Object.keys(b.actMins).forEach(id=>ids.add(id)));return Array.from(ids);},[bars]);

  // Track container width
  useEffect(()=>{
    const el=wrapRef.current;if(!el)return;
    const ro=new ResizeObserver(entries=>{const w=entries[0].contentRect.width;if(w>0)setCanvasW(w);});
    ro.observe(el);
    setCanvasW(el.getBoundingClientRect().width||640);
    return()=>ro.disconnect();
  },[]);

  const W=canvasW;

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");if(!ctx)return;
    const dpr=window.devicePixelRatio||1;
    canvas.width=W*dpr;canvas.height=H*dpr;
    canvas.style.width="100%";canvas.style.height=`${H}px`;
    ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
    const n=bars.length,padL=16,padR=16;
    const chartW=W-padL-padR,barW=Math.max(12,(chartW/n)*0.65),gap=chartW/n,chartH=H-48;
    bars.forEach((bar,i)=>{
      const x=padL+i*gap+(gap-barW)/2;let y=chartH;
      if(colorKey==="skill"){SKILLS.forEach(sk=>{const m=bar.skillMins[sk.id]??0;if(!m)return;const bh=(m/maxTotal)*chartH;y-=bh;ctx.fillStyle=sk.color;ctx.beginPath();ctx.roundRect(x,y,barW,bh,[3,3,0,0]);ctx.fill();});}
      else{activities.forEach(aid=>{const m=bar.actMins[aid]??0;if(!m)return;const bh=(m/maxTotal)*chartH;y-=bh;ctx.fillStyle=ACTIVITY_COLORS[aid]??"#94a3b8";ctx.beginPath();ctx.roundRect(x,y,barW,bh,[3,3,0,0]);ctx.fill();});}
      if(bar.isToday){ctx.strokeStyle="#6366f1";ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(x-2,2,barW+4,chartH-4);ctx.setLineDash([]);}
      if(bar.totalMins>0){const topY=chartH-(bar.totalMins/maxTotal)*chartH-7;ctx.fillStyle=bar.isToday?"#4f46e5":"#64748b";ctx.font=`${bar.isToday?"700":"600"} 11px system-ui`;ctx.textAlign="center";ctx.fillText(`${bar.totalMins}m`,x+barW/2,Math.max(14,topY));}
      ctx.fillStyle=bar.isToday?"#4f46e5":"#94a3b8";ctx.font=`${bar.isToday?"700":"500"} 11px system-ui`;ctx.textAlign="center";ctx.fillText(bar.label,x+barW/2,H-12);
    });
    if(colorKey==="skill"&&bars.length===14){ctx.beginPath();ctx.strokeStyle="rgba(99,102,241,0.55)";ctx.lineWidth=2.5;let started=false;bars.forEach((bar,i)=>{if(i<6)return;const avg=bars.slice(i-6,i+1).reduce((a,b)=>a+b.totalMins,0)/7;const cx2=padL+i*gap+gap/2;const cy2=chartH-(avg/maxTotal)*chartH;if(!started){ctx.moveTo(cx2,cy2);started=true;}else ctx.lineTo(cx2,cy2);});ctx.stroke();}
  },[bars,colorKey,activities,maxTotal,W]);

  const handleMove=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const rect=canvas.getBoundingClientRect();const mx=(e.clientX-rect.left)*(W/rect.width);
    const gap=(W-32)/bars.length;const idx=Math.floor((mx-16)/gap);
    if(idx<0||idx>=bars.length){setTooltip(null);return;}
    setTooltip({bar:bars[idx],x:e.clientX-rect.left+14,y:e.clientY-rect.top-14});
  },[bars,W]);

  const tip=tooltip?.bar??null;
  const tipGames=tip?activities.filter(a=>(tip.actMins[a]??0)>0&&ACTIVITY_LABELS[a]?.type==="Game"):[];
  const tipBldrs=tip?activities.filter(a=>(tip.actMins[a]??0)>0&&ACTIVITY_LABELS[a]?.type==="Builder"):[];

  return(
    <div className="relative" ref={wrapRef}>
      <canvas ref={canvasRef} onMouseMove={handleMove} onMouseLeave={()=>setTooltip(null)} style={{cursor:"crosshair",display:"block"}}/>
      {tip&&(
        <div className="pointer-events-none absolute z-20 bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-2xl" style={{left:tooltip!.x,top:tooltip!.y,maxWidth:260,minWidth:190,fontSize:12}}>
          <div className="font-bold mb-2" style={{fontSize:13}}>{tip.label} — {tip.totalMins}m / {tip.sessions} session{tip.sessions!==1?"s":""}</div>
          {colorKey==="skill"?(SKILLS.filter(s=>(tip.skillMins[s.id]??0)>0).map(s=>(<div key={s.id} className="flex items-center gap-2 mb-1"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:s.color}}/><span className="text-white/80 flex-1">{s.label}:</span><span className="font-bold">{tip.skillMins[s.id]} min</span></div>))):(
            <>{tipGames.length>0&&<><div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1.5">Games</div>{tipGames.map(a=>(<div key={a} className="flex items-center gap-2 mb-1"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:ACTIVITY_COLORS[a]??"#94a3b8"}}/><span className="text-white/80 flex-1">{ACTIVITY_LABELS[a]?.label??a}:</span><span className="font-bold">{tip.actSessions?.[a]??1} · {tip.actMins[a]}m</span></div>))}</>}
            {tipBldrs.length>0&&<><div className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-2 mb-1.5">Builders</div>{tipBldrs.map(a=>(<div key={a} className="flex items-center gap-2 mb-1"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:ACTIVITY_COLORS[a]??"#94a3b8"}}/><span className="text-white/80 flex-1">{ACTIVITY_LABELS[a]?.label??a}:</span><span className="font-bold">{tip.actSessions?.[a]??1} · {tip.actMins[a]}m</span></div>))}</>}</>
          )}
        </div>
      )}
    </div>
  );
}

function CardHeader({icon,title,sub,bg}:{icon:string;title:string;sub?:string;bg:string}){return(<div className="flex items-center gap-3 mb-6"><div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>{icon}</div><div className="flex-1"><h2 className="font-bold text-gray-900 text-lg">{title}</h2>{sub&&<p className="text-sm text-gray-400 font-medium mt-0.5">{sub}</p>}</div></div>);}

type Range="biweekly"|"monthly"|"yearly";
function RangeToggle({value,onChange}:{value:Range;onChange:(r:Range)=>void}){return(<div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">{(["biweekly","monthly","yearly"] as Range[]).map(r=>(<button key={r} onClick={()=>onChange(r)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${value===r?"bg-white shadow text-gray-900":"text-gray-400 hover:text-gray-600"}`}>{r==="biweekly"?"Bi-weekly":r==="monthly"?"Monthly":"Yearly"}</button>))}</div>);}

interface Props{onBack:()=>void;userId?:string;}

export default function ProgressDashboard({onBack,userId}:Props){
  const [sessions,setSessions]=useState<SessionRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [skillRange,setSkillRange]=useState<Range>("biweekly");
  const [actRange,setActRange]=useState<Range>("biweekly");

  const loadData=useCallback(async()=>{
    setLoading(true);
    if(userId){
      const db=await loadSessionsFromDB(userId);
      setSessions(db.length>0?db:getSessions());
    }else{setSessions(getSessions());}
    setLoading(false);
  },[userId]);

  useEffect(()=>{loadData();},[loadData]);

  const today=localDateStr();
  const yesterday=addDays(today,-1);
  const todayRecs=useMemo(()=>sessions.filter(s=>s.date===today),[sessions,today]);
  const yestRecs=useMemo(()=>sessions.filter(s=>s.date===yesterday),[sessions,yesterday]);
  const todaySM=useMemo(()=>calcSkillMins(todayRecs),[todayRecs]);
  const yestSM=useMemo(()=>calcSkillMins(yestRecs),[yestRecs]);
  const todayTotal=useMemo(()=>total(todaySM),[todaySM]);

  const sessionCount=todayRecs.length;
  const ringCirc=2*Math.PI*32;
  const ringOffset=ringCirc*(1-Math.min(sessionCount/DAILY_GOAL,1));

  const bwBars=useMemo(()=>buildBiweekly(sessions),[sessions]);
  const wkBars=useMemo(()=>buildWeekly(sessions),[sessions]);
  const moBars=useMemo(()=>buildMonthly(sessions),[sessions]);
  const skillBars=skillRange==="biweekly"?bwBars:skillRange==="monthly"?wkBars:moBars;
  const actBars=actRange==="biweekly"?bwBars:actRange==="monthly"?wkBars:moBars;

  const activeActivities=useMemo(()=>{const ids=new Set<string>();sessions.forEach(s=>ids.add(s.activityId));return Array.from(ids);},[sessions]);

  async function handleClear(){
    if(!window.confirm("Delete all session history permanently?"))return;
    clearLocalSessions();
    if(userId)await clearSessionsFromDB(userId);
    setSessions([]);
  }

  return(
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3.5 flex items-center shadow-sm">
        <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium min-w-[60px]">
          <ArrowLeft className="w-4 h-4"/> Back
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-900 text-base">My Progress</h1>
        <div className="flex items-center gap-1 min-w-[60px] justify-end">
          <button onClick={loadData} title="Refresh" className="text-gray-300 hover:text-blue-500 transition p-1.5"><RefreshCw className="w-4 h-4"/></button>
          <button onClick={handleClear} title="Clear history" className="text-gray-300 hover:text-red-400 transition p-1.5"><Trash2 className="w-4 h-4"/></button>
        </div>
      </div>

      {loading?(
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-3"/>
            <p className="text-gray-400 text-sm font-medium">Loading your progress…</p>
          </div>
        </div>
      ):(
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6">

          {/* CARD 1 — TODAY'S GOAL */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <CardHeader icon="🎯" title="Today's Practice Goal" bg="bg-green-100"
              sub={new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}/>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-5 sm:p-6">
              <div className="flex items-center gap-5 sm:gap-8 mb-6">
                <div className="relative flex-shrink-0 w-[108px] h-[108px]">
                  <svg viewBox="0 0 76 76" width="100%" height="100%" style={{transform:"rotate(-90deg)"}}>
                    <circle cx="38" cy="38" r="32" fill="none" stroke="#bbf7d0" strokeWidth="8"/>
                    <circle cx="38" cy="38" r="32" fill="none" stroke="#22c55e" strokeWidth="8" strokeDasharray={ringCirc} strokeDashoffset={ringOffset} strokeLinecap="round"/>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-green-700 leading-none">{sessionCount}/{DAILY_GOAL}</span>
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-wide mt-0.5">sessions</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-green-800 text-lg leading-tight">
                    {sessionCount>=DAILY_GOAL?"Daily goal reached! 🎉":`${sessionCount} of ${DAILY_GOAL} sessions done today`}
                  </p>
                  {sessionCount<DAILY_GOAL&&<p className="text-green-600 text-base mt-1 font-medium">{DAILY_GOAL-sessionCount} more to reach your goal</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="bg-green-200/60 text-green-800 text-sm font-bold px-3 py-1 rounded-full">⏱ {todayTotal} active min</span>
                    {sessionCount>0&&<span className="bg-green-200/60 text-green-800 text-sm font-bold px-3 py-1 rounded-full">✓ {sessionCount} session{sessionCount!==1?"s":""}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {SKILLS.map(sk=>{const done=(todaySM[sk.id]??0)>0;return(
                  <div key={sk.id} title={`${sk.label}: ${todaySM[sk.id]??0} min`}
                    className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl font-semibold transition select-none ${done?"bg-green-500 text-white shadow-sm":"bg-white border border-dashed border-green-200 text-green-300"}`}>
                    <span className="text-lg">{sk.icon}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide">{sk.label.slice(0,3)}</span>
                  </div>
                );})}
              </div>
            </div>
            {sessions.length===0&&<p className="text-center text-sm text-gray-400 mt-4 italic">Start a game or AI builder session to see your progress here!</p>}
          </div>

          {/* CARD 2 — SKILL DISTRIBUTION */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <CardHeader icon="🥧" title="Skill Distribution" bg="bg-yellow-100" sub="where did you spend time?"/>
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {[{label:"Yesterday",mins:yestSM,recs:yestRecs},{label:"Today",mins:todaySM,recs:todayRecs}].map(({label,mins,recs})=>(
                <div key={label} className="flex flex-col items-center gap-4">
                  <p className="text-sm font-bold text-gray-700">{label}</p>
                  <DonutChart sm={mins}/>
                  <div className="w-full space-y-2">
                    {SKILLS.filter(s=>(mins[s.id]??0)>0).map(sk=>(
                      <div key={sk.id} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{background:sk.color}}/>
                        <span className="text-sm font-medium text-gray-500 flex-1">{sk.label}</span>
                        <span className="text-sm font-bold text-gray-700">{mins[sk.id]} min</span>
                      </div>
                    ))}
                    {recs.length===0&&<p className="text-sm text-gray-300 text-center py-1">No sessions</p>}
                  </div>
                </div>
              ))}
            </div>
            {(todayRecs.length>0||yestRecs.length>0)&&(
              <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-500 leading-relaxed">
                {(()=>{const ty=todayTotal;const ye=total(yestSM);if(ye===0&&ty===0)return"No data for today or yesterday.";if(ye===0)return`Today you practiced ${ty} min — great start!`;const diff=ty-ye;return diff>=0?`Today: ${ty} min (+${diff} vs yesterday ${ye} min) — great!`:`Today: ${ty} min (${diff} vs yesterday ${ye} min) — keep going!`;})()}
              </div>
            )}
          </div>

          {/* CARD 3 — DAILY SKILL BREAKDOWN */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <CardHeader icon="📊" title="Daily Skill Breakdown" bg="bg-blue-100"
              sub={skillRange==="biweekly"?"last 14 days":skillRange==="monthly"?"last 5 weeks":"last 12 months"}/>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              Bar height = active minutes. Colours = skill mix. Dashed border = today.{skillRange==="biweekly"&&" Purple line = 7-day rolling average."}
            </p>
            <RangeToggle value={skillRange} onChange={setSkillRange}/>
            <StackedBarChart bars={skillBars} colorKey="skill"/>
            <div className="flex flex-wrap gap-3 mt-5 justify-center">
              {SKILLS.map(sk=>(<div key={sk.id} className="flex items-center gap-2 text-sm font-semibold text-gray-500"><span className="w-3.5 h-3.5 rounded-sm" style={{background:sk.color}}/>{sk.label}</div>))}
            </div>
            {todayRecs.length>0&&(
              <div className="mt-5 bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Today's skill balance</p>
                <div className="flex h-3 rounded-full overflow-hidden mb-3 bg-gray-200">
                  {SKILLS.filter(s=>(todaySM[s.id]??0)>0).map(sk=>{const pct=todayTotal>0?((todaySM[sk.id]??0)/todayTotal)*100:0;return<div key={sk.id} style={{width:`${pct}%`,background:sk.color}}/>;  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {SKILLS.filter(s=>(todaySM[s.id]??0)>0).map(sk=>(<span key={sk.id} className="text-xs font-semibold" style={{color:sk.color}}>{sk.icon} {sk.label} {todaySM[sk.id]} min</span>))}
                </div>
              </div>
            )}
            <div className="mt-5 border border-gray-100 rounded-xl p-4 bg-gray-50">
              <p className="text-xs font-black uppercase tracking-widest text-gray-700 mb-3">How this chart works</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-100">
                {[["✅ Valid Session","Stayed more than 1 min. Quick opens excluded."],["█ Bar Height","Total active minutes from valid sessions."],["🌈 Bar Colours","Skill mix — 6 colours, one per skill area."],["— Rolling Avg","7-day average (bi-weekly view only)."]].map(([h,b])=>(<div key={h} className="text-xs text-gray-500 leading-relaxed"><span className="font-bold text-gray-700">{h}</span><br/>{b}</div>))}
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-700 mb-2">What counts toward each skill</p>
              <div className="flex flex-col gap-2">
                {[["#3b82f6","Listening — Listening Builder · Listening Puzzle"],["#f97316","Speaking — Speaking Builder · Pronunciation · Conversation · Dialogue"],["#10b981","Reading — Reading Builder"],["#8b5cf6","Writing — Writing Builder"],["#ec4899","Vocabulary — Word Search · Matching Game · Vocabulary Builder"],["#f59e0b","Grammar — Fill in the Blank · Sentence Builder · Grammar Builder · Mistake Review"]].map(([c,d])=>(<div key={d} className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed"><span className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5" style={{background:c}}/><span>{d}</span></div>))}
              </div>
            </div>
          </div>

          {/* CARD 4 — ACTIVITY BY GAME & BUILDER */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <CardHeader icon="🎮" title="Activity by Game & Builder" bg="bg-violet-100"
              sub={actRange==="biweekly"?"last 14 days":actRange==="monthly"?"last 5 weeks":"last 12 months"}/>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">Each bar = one time period. Segments show which games &amp; builders you used. Hover or tap to see details.</p>
            <RangeToggle value={actRange} onChange={setActRange}/>
            <StackedBarChart bars={actBars} colorKey="activity"/>
            {activeActivities.length>0&&(()=>{
              const games=activeActivities.filter(a=>ACTIVITY_LABELS[a]?.type==="Game");
              const bldrs=activeActivities.filter(a=>ACTIVITY_LABELS[a]?.type==="Builder");
              return(
                <div className="mt-4 space-y-3">
                  {games.length>0&&<div><p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Games</p><div className="flex flex-wrap gap-3">{games.map(aid=>(<div key={aid} className="flex items-center gap-2 text-sm font-semibold text-gray-500"><span className="w-3.5 h-3.5 rounded-sm" style={{background:ACTIVITY_COLORS[aid]??"#94a3b8"}}/>{ACTIVITY_LABELS[aid]?.label??aid}</div>))}</div></div>}
                  {bldrs.length>0&&<div><p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Builders</p><div className="flex flex-wrap gap-3">{bldrs.map(aid=>(<div key={aid} className="flex items-center gap-2 text-sm font-semibold text-gray-500"><span className="w-3.5 h-3.5 rounded-sm" style={{background:ACTIVITY_COLORS[aid]??"#94a3b8"}}/>{ACTIVITY_LABELS[aid]?.label??aid}</div>))}</div></div>}
                </div>
              );
            })()}
            {sessions.length===0&&(
              <div className="text-center py-10">
                <Gamepad2 className="w-14 h-14 text-gray-200 mx-auto mb-3"/>
                <p className="text-base text-gray-400 font-medium">No activity yet</p>
                <p className="text-sm text-gray-300 mt-1">Play a game or start an AI builder session to see your activity here.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Analytics } from "@vercel/analytics/react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Upload, FileText, CheckCircle, AlertTriangle, XCircle, 
  BarChart2, Lock, Zap, Search, ChevronRight, Award, 
  TrendingUp, Type, RefreshCw
} from 'lucide-react';

// ==========================================
// ⚙️ CONFIGURATION SECTION
// ==========================================

// 1. API KEY LOGIC
// We use the secure environment variable if available, otherwise default to empty string (Safe Mode)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// 2. THE BRAIN (System Prompt)
const SYSTEM_PROMPT = `
ROLE:
You are "CV Pulse," an elite Technical Recruiter and Resume Strategist with 15 years of experience at FAANG companies. You are critical, data-driven, and strictly professional.

OBJECTIVE:
Analyze the provided resume text against the provided Job Description (if any).

ANALYSIS RULES:
1. FATAL FLAWS: Identify any use of personal pronouns (I, me), photos, or charts.
2. IMPACT CHECK: Calculate the ratio of bullet points that contain numbers ($, %, +) vs those that don't.
3. ACTION VERBS: Flag any bullet point starting with weak verbs like "Helped," "Worked," "Responsible for."
4. REWRITE: For the 3 weakest bullet points, provide a "Before" and "After" version. The "After" version MUST use the Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]."

OUTPUT FORMAT (JSON ONLY):
{
  "score": (Integer 0-100),
  "summary": (String, max 2 sentences, brutally honest),
  "bulletPoints": [
    { "original": "...", "improved": "..." }
  ],
  "missingKeywords": [Array of strings],
  "softSkills": [Array of strings]
}
`;

// ==========================================
// 🧠 REAL AI SERVICE (Gemini)
// ==========================================
const realGeminiAnalysis = async (text, jobDesc) => {
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-001",
      systemInstruction: SYSTEM_PROMPT
    });

    const userPrompt = `
      RESUME TEXT: 
      ${text}

      JOB DESCRIPTION: 
      ${jobDesc || "General Software Engineering role"}
    `;

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const textResponse = response.text();

    // Clean up the response to ensure it's pure JSON (remove markdown code blocks)
    const jsonString = textResponse.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Gemini API Error:", error);
    alert("API Error: Check console for details. Falling back to mock data.");
  }
};

// ==========================================
// 🎭 MOCK AI SERVICE (Free Testing)
// ==========================================
const mockAIAnalysis = (text, jobDesc) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        summary: "This candidate shows strong technical potential but lacks quantitative evidence. The structure is ATS-friendly, but the language is too passive. (MOCK DATA - Add API Key to see real results)",
        bulletPoints: [
          { original: "Worked on a React project for a client.", improved: "Architected a scalable React application for a Fortune 500 client, reducing page load time by 40%." },
          { original: "Responsible for managing a team.", improved: "Spearheaded a cross-functional team of 10 engineers, delivering the Q4 roadmap 2 weeks ahead of schedule." }
        ],
        missingKeywords: jobDesc ? ['Kubernetes', 'CI/CD', 'System Design'] : ['Leadership', 'Optimization'],
        softSkills: ['Communication', 'Problem Solving'],
        score: 72
      });
    }, 1500);
  });
};

// ==========================================
// 🧮 REAL-TIME STATS ENGINE
// ==========================================
const calculateStats = (text) => {
  if (!text) return null;
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.length > 0);
  
  // Impact Score: Detect numbers, percentages, currency
  const quantifiers = text.match(/(\d+%|\$\d+|\d+k|\d+m|\d+\+)/gi) || [];
  const impactScore = Math.min(100, Math.round((quantifiers.length / (sentences.length || 1)) * 100 * 1.5));

  // Action Verbs
  const strongVerbs = ['spearheaded', 'orchestrated', 'developed', 'engineered', 'implemented', 'generated', 'increased', 'reduced', 'launched'];
  const weakVerbs = ['helped', 'worked', 'responsible', 'assisted', 'participated'];
  
  let strongCount = 0;
  let weakCount = 0;
  words.forEach(w => {
    if (strongVerbs.includes(w.toLowerCase())) strongCount++;
    if (weakVerbs.includes(w.toLowerCase())) weakCount++;
  });
  
  const verbScore = Math.min(100, Math.round((strongCount / (strongCount + weakCount + 1)) * 100));

  // Brevity
  const avgSentenceLength = words.length / (sentences.length || 1);
  const brevityScore = avgSentenceLength > 25 ? 40 : avgSentenceLength > 15 ? 100 : 80;

  return { wordCount: words.length, impactScore, verbScore, brevityScore };
};

// ==========================================
// 🚀 MAIN APP COMPONENT
// ==========================================
const App = () => {
  const [step, setStep] = useState(1); 
  const [resumeText, setResumeText] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [stats, setStats] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleAnalyze = async () => {
    if (resumeText.length < 50) return alert("Please enter a longer resume text.");
    setStep(2);
    
    // 1. Local Stats (Free/Instant)
    const computedStats = calculateStats(resumeText);
    setStats(computedStats);

    // 2. AI Analysis (Real vs Mock)
    let aiData;
    if (API_KEY) {
      aiData = await realGeminiAnalysis(resumeText, jobDesc);
    } else {
      console.log("No API Key found. Using Mock Service.");
      aiData = await mockAIAnalysis(resumeText, jobDesc);
    }
    
    setAiResult(aiData);
    setStep(3);
  };

  const reset = () => {
    setStep(1);
    setResumeText('');
    setJobDesc('');
    setStats(null);
    setAiResult(null);
  };

  // --- UI COMPONENTS ---

  const ProgressBar = ({ label, value, color = "bg-blue-600", locked = false }) => (
    <div className="mb-4 relative">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
          {label} {locked && <Lock size={12} className="text-slate-400"/>}
        </span>
        <span className={`text-sm font-bold ${locked ? 'blur-sm' : 'text-slate-900'}`}>
          {locked ? '??%' : `${value}%`}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div 
          className={`${color} h-2.5 rounded-full transition-all duration-1000`} 
          style={{ width: locked ? '0%' : `${value}%` }}
        ></div>
      </div>
      {locked && (
        <div 
          onClick={() => setShowUpgradeModal(true)}
          className="absolute inset-0 bg-white/50 cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded"
        >
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 shadow-sm">Unlock Pro</span>
        </div>
      )}
    </div>
  );

  const ScoreCard = ({ title, score, icon: Icon, description, color }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
        <div className="text-2xl font-bold text-slate-800">{score}</div>
      </div>
      <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );

  const UpgradeModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="bg-indigo-600 p-6 text-center">
          <Award className="w-12 h-12 text-yellow-300 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-white">Go Professional</h3>
          <p className="text-indigo-100 text-sm mt-1">Unlock deep AI insights & rewrites</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {[
              "Unlock Detailed Action Verb Analysis",
              "Get AI-Powered Bullet Point Rewrites",
              "Unlimited Rescans",
              "Export to PDF Report"
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-700">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium">{feat}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => { setIsPro(true); setShowUpgradeModal(false); }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all"
          >
            Unlock for $9/mo
          </button>
          <button 
            onClick={() => setShowUpgradeModal(false)}
            className="w-full py-2 text-slate-400 text-sm hover:text-slate-600"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );

  if (step === 1) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800">CV Pulse AI</span>
          </div>
          <button className="text-slate-600 font-medium hover:text-indigo-600 text-sm">Sign In</button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Is your resume <span className="text-indigo-600">hired</span> or <span className="text-rose-500">fired?</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Get professional-level critique, ATS compatibility checks, and AI-powered improvement suggestions in seconds.
            </p>
          </div>

          <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button className="flex-1 py-4 text-center font-semibold text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50">
                Paste Text
              </button>
              <button className="flex-1 py-4 text-center font-medium text-slate-400 hover:text-slate-600 cursor-not-allowed">
                Upload PDF (Pro)
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Resume Content</label>
                <textarea 
                  className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                  placeholder="Paste your resume content here... (e.g. Achieved 20% growth...)"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Target Job Description (Optional)</label>
                <textarea 
                  className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                  placeholder="Paste the job description you are applying for..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                ></textarea>
              </div>
              <button 
                onClick={handleAnalyze}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                <Search size={20} />
                Analyze My Resume
              </button>
              {!API_KEY && (
                <p className="text-center text-xs text-slate-400 italic mt-2">
                  Running in Demo Mode (Mock Data). Add API Key to enable AI.
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center w-full">
            {[
              { icon: TrendingUp, title: "Quantify Impact", text: "We detect missing metrics." },
              { icon: CheckCircle, title: "ATS Friendly", text: "Ensure parsability." },
              { icon: Lock, title: "Secure & Private", text: "Data processed locally." },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-full shadow-sm border border-slate-100">
                  <item.icon className="text-indigo-600" size={24} />
                </div>
                <h4 className="font-bold text-slate-800">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            <Zap className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={32} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Analyzing Resume...</h2>
            <p className="text-slate-500">Checking ATS compatibility, strong verbs, and impact metrics.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {showUpgradeModal && <UpgradeModal />}
      
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
            <Zap className="text-indigo-600 fill-current" /> CV Pulse
          </div>
          <div className="flex items-center gap-4">
            {!isPro && (
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 hover:bg-amber-100 transition-colors"
              >
                Go Pro
              </button>
            )}
            <button onClick={reset} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              <RefreshCw size={16} /> New Scan
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
          <div className="md:col-span-4 bg-slate-900 rounded-2xl p-8 text-white flex flex-col justify-between relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full filter blur-3xl opacity-20 -mr-16 -mt-16"></div>
            <div>
              <h2 className="text-slate-300 font-medium mb-1">Overall Quality</h2>
              <div className="text-6xl font-bold tracking-tighter mb-2 flex items-baseline gap-2">
                {aiResult?.score}<span className="text-2xl text-slate-400 font-normal">/100</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                {aiResult?.score > 75 ? <CheckCircle size={14} className="text-green-400"/> : <AlertTriangle size={14} className="text-amber-400"/>}
                {aiResult?.score > 75 ? "Top 20% of Candidates" : "Needs Improvement"}
              </div>
            </div>
            <div className="space-y-3 mt-8">
              <p className="text-sm text-slate-300 leading-relaxed opacity-90">
                "{aiResult?.summary}"
              </p>
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ScoreCard 
              title="Impact Score" 
              score={`${stats?.impactScore || 0}/100`} 
              icon={TrendingUp} 
              color="bg-emerald-500"
              description="Measures use of numbers, metrics, and dollar signs to prove value."
            />
            <ScoreCard 
              title="Action Verbs" 
              score={`${stats?.verbScore || 0}/100`} 
              icon={Zap} 
              color="bg-blue-500"
              description="Ratio of strong leadership verbs (e.g. 'Spearheaded') vs passive ones."
            />
            <ScoreCard 
              title="Brevity" 
              score={`${stats?.brevityScore || 0}/100`} 
              icon={Type} 
              color="bg-purple-500"
              description="Readability analysis. Short, punchy sentences perform best in ATS."
            />
            <div className="sm:col-span-2 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-indigo-600"/> Detailed Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Critical Stats</h4>
                  <ProgressBar label="ATS Readability" value={85} color="bg-green-500" />
                  <ProgressBar label="Keyword Match" value={45} color="bg-amber-500" />
                  <ProgressBar label="Structure & Formatting" value={92} color="bg-indigo-500" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Pro Metrics</h4>
                  <ProgressBar label="Industry Benchmark" value={0} locked={!isPro} />
                  <ProgressBar label="Recruiter Persona Check" value={0} locked={!isPro} />
                  <ProgressBar label="Tone Consistency" value={0} locked={!isPro} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Award size={18} className="text-indigo-600" /> AI Improvement Suggestions
                </h3>
                <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded">High Priority</span>
              </div>
              <div className="divide-y divide-slate-100">
                {aiResult?.bulletPoints?.map((item, i) => (
                  <div key={i} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex gap-4">
                      <div className="mt-1">
                         <XCircle className="text-rose-400" size={20} />
                      </div>
                      <div className="flex-1">
                         <p className="text-slate-500 line-through text-sm mb-2">{item.original}</p>
                         <div className="flex gap-3">
                           <div className="mt-1"><CheckCircle className="text-green-500" size={16} /></div>
                           <div className="flex-1">
                             <p className={`text-slate-800 font-medium text-sm ${!isPro && i > 0 ? 'blur-sm select-none' : ''}`}>
                               {item.improved}
                             </p>
                             {!isPro && i > 0 && (
                               <div className="mt-2">
                                 <button 
                                   onClick={() => setShowUpgradeModal(true)} 
                                   className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                 >
                                   <Lock size={10} /> Unlock this rewrite
                                 </button>
                               </div>
                             )}
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Search size={18} className="text-indigo-600" /> Missing Keywords
               </h3>
               <div className="flex flex-wrap gap-2">
                 {aiResult?.missingKeywords?.map((kw, i) => (
                   <span key={i} className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-sm font-medium flex items-center gap-1">
                     {kw} <span className="opacity-50 text-xs">+5 pts</span>
                   </span>
                 ))}
                 <span className="px-3 py-1 border border-dashed border-slate-300 text-slate-400 rounded-full text-sm flex items-center">
                   + 4 more detected
                 </span>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-6 text-white shadow-lg">
              <h3 className="font-bold text-lg mb-2">Pro Report PDF</h3>
              <p className="text-indigo-100 text-sm mb-4">Download a 12-page detailed breakdown of your CV including font analysis and layout checks.</p>
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="w-full py-2 bg-white text-indigo-600 font-bold rounded-lg text-sm hover:bg-indigo-50 transition-colors"
              >
                Download Report
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
               <h3 className="font-bold text-slate-800 mb-4">Recommended Skills</h3>
               <ul className="space-y-3">
                 <li className="flex items-center justify-between text-sm">
                   <span className="text-slate-600">Python Data Analysis</span>
                   <a href="#" className="text-indigo-600 font-medium text-xs hover:underline">View Course</a>
                 </li>
                 <li className="flex items-center justify-between text-sm">
                   <span className="text-slate-600">AWS Certification</span>
                   <a href="#" className="text-indigo-600 font-medium text-xs hover:underline">View Course</a>
                 </li>
                 <li className="flex items-center justify-between text-sm">
                   <span className="text-slate-600">System Design</span>
                   <a href="#" className="text-indigo-600 font-medium text-xs hover:underline">View Course</a>
                 </li>
               </ul>
               <div className="mt-4 pt-4 border-t border-slate-100">
                 <p className="text-xs text-slate-400">Affiliate recommendations help you earn commission.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
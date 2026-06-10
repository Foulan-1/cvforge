import { useState } from "react";

const T = {
  bg: "#0a0a0a", bgCard: "#111111", bgInput: "#161616",
  green: "#39ff14", greenDim: "#1a7a0a",
  greenGlow: "rgba(57,255,20,0.15)", greenGlow2: "rgba(57,255,20,0.06)",
  border: "#1e1e1e", borderGreen: "rgba(57,255,20,0.3)",
  text: "#f0f0f0", textMuted: "#555", textDim: "#888", danger: "#ff4444",
};

const FREE_SECTORS = ["tech", "healthcare", "finance"];

const SECTORS = [
  { id: "tech",        label: "Technology & IT",       icon: "⚡", free: true  },
  { id: "healthcare",  label: "Healthcare & Medical",   icon: "🏥", free: true  },
  { id: "finance",     label: "Finance & Banking",      icon: "💹", free: true  },
  { id: "marketing",   label: "Marketing & Creative",   icon: "🎯", free: false },
  { id: "engineering", label: "Engineering",            icon: "⚙️", free: false },
  { id: "legal",       label: "Legal & Law",            icon: "⚖️", free: false },
  { id: "education",   label: "Education & Research",   icon: "📚", free: false },
  { id: "hr",          label: "Human Resources",        icon: "👥", free: false },
];

const STEPS = ["Sector", "Info", "Experience", "Skills", "Preview"];

const inp = {
  width: "100%", background: T.bgInput, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "10px 14px", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.2s",
};
const lbl = { fontSize: 11, color: T.textDim, marginBottom: 5, display: "block", letterSpacing: "0.06em", textTransform: "uppercase" };
const fw  = { marginBottom: 16 };

export default function CVBuilder() {
  const [step, setStep]       = useState(0);
  const [sector, setSector]   = useState(null);
  const [isPro, setIsPro]     = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cvOutput, setCvOutput] = useState(null);
  const [error, setError]     = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const [form, setForm] = useState({
    fullName: "", jobTitle: "", email: "", phone: "", location: "", linkedin: "", summary: "",
    experience: [{ company: "", role: "", duration: "", bullets: "" }],
    education:  [{ degree: "", institution: "", year: "" }],
    skills: "", certifications: "", languages: "",
  });

  const upd    = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const updExp = (i, f, v) => setForm(p => { const e=[...p.experience]; e[i]={...e[i],[f]:v}; return {...p,experience:e}; });
  const addExp = () => setForm(p => ({ ...p, experience: [...p.experience, { company:"",role:"",duration:"",bullets:"" }] }));
  const rmExp  = (i) => setForm(p => ({ ...p, experience: p.experience.filter((_,j)=>j!==i) }));

  // ── Generate CV via Claude ─────────────────────────────────────────────────
  const generateCV = async () => {
    setLoading(true); setError(null);
    const sectorName = SECTORS.find(s=>s.id===sector)?.label || sector;
    const prompt = `You are an expert CV writer specializing in ${sectorName} sector resumes. Create a flawless, ATS-optimized professional CV.

Candidate:
- Name: ${form.fullName}
- Target Role: ${form.jobTitle}
- Email: ${form.email} | Phone: ${form.phone} | Location: ${form.location} | LinkedIn: ${form.linkedin}
- Summary notes: ${form.summary}

Experience:
${form.experience.map((e,i)=>`${i+1}. ${e.role} @ ${e.company} (${e.duration})\nNotes: ${e.bullets}`).join("\n\n")}

Education:
${form.education.map(e=>`${e.degree} – ${e.institution} (${e.year})`).join("\n")}

Skills: ${form.skills}
Certifications: ${form.certifications}
Languages: ${form.languages}

Return ONLY valid JSON (no markdown fences):
{
  "name":"...","title":"...",
  "contact":{"email":"...","phone":"...","location":"...","linkedin":"..."},
  "summary":"3-4 sentence powerful summary tailored to ${sectorName}",
  "experience":[{"role":"...","company":"...","duration":"...","achievements":["bullet 1","bullet 2","bullet 3"]}],
  "education":[{"degree":"...","institution":"...","year":"..."}],
  "skills":["s1","s2","s3","s4","s5","s6","s7","s8"],
  "certifications":["c1"],
  "languages":["l1"]
}`;
    try {
      const res  = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setCvOutput(data.cv);
      setStep(5);
    } catch(e) { setError(e.message || "Failed. Please try again."); }
    finally    { setLoading(false); }
  };

  // ── Stripe Checkout ────────────────────────────────────────────────────────
  const handleUpgrade = async () => {
    setPayLoading(true);
    try {
      const res  = await fetch("/api/checkout", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ email: form.email || undefined }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error);
    } catch(e) { alert("Payment error: " + e.message); }
    finally    { setPayLoading(false); }
  };

  // ── Sector lock check ──────────────────────────────────────────────────────
  const handleSectorClick = (s) => {
    if (!s.free && !isPro) { setSector(s.id); setShowPaywall(true); }
    else { setSector(s.id); setShowPaywall(false); }
  };

  // ────────────────────────────────────────────────────────────────────────────
  const Btn = ({ children, onClick, disabled, full, variant="primary", style={} }) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "13px 24px", borderRadius: 10, border: variant==="ghost" ? `1px solid ${T.border}` : "none",
      background: variant==="ghost" ? "transparent" : disabled ? T.greenDim : T.green,
      color: variant==="ghost" ? T.textDim : T.bg,
      fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
      width: full ? "100%" : "auto", transition: "all 0.2s", ...style,
    }}>{children}</button>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ borderBottom:`1px solid ${T.border}`, padding:"14px 24px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:34, height:34, borderRadius:8, background:T.greenGlow, border:`1px solid ${T.borderGreen}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚡</div>
        <div>
          <div style={{ fontWeight:800, fontSize:15, letterSpacing:"-0.02em" }}>CVForge<span style={{color:T.green}}>.</span>ai</div>
          <div style={{ fontSize:11, color:T.textMuted }}>AI-Powered CV Generator</div>
        </div>

        {/* Pro badge */}
        {isPro
          ? <div style={{ marginLeft:"auto", background:"rgba(57,255,20,0.12)", border:`1px solid ${T.borderGreen}`, borderRadius:20, padding:"4px 14px", fontSize:11, color:T.green, fontWeight:700 }}>⚡ PRO</div>
          : <div onClick={()=>setShowPaywall(true)} style={{ marginLeft:"auto", background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:20, padding:"4px 14px", fontSize:11, color:T.textDim, cursor:"pointer" }}>Upgrade to Pro →</div>
        }
      </nav>

      <div style={{ maxWidth:740, margin:"0 auto", padding:"32px 20px" }}>

        {/* ── PROGRESS BAR ── */}
        {step < 5 && (
          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:36 }}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", flex: i<STEPS.length-1 ? 1 : "none" }}>
                <div style={{
                  width:28, height:28, borderRadius:"50%", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:700,
                  background: i<step ? T.green : i===step ? T.greenGlow : "transparent",
                  border:`2px solid ${i<=step?T.green:T.border}`,
                  color: i<step ? T.bg : i===step ? T.green : T.textMuted,
                  transition:"all 0.3s",
                }}>{i<step?"✓":i+1}</div>
                {i<STEPS.length-1 && <div style={{ flex:1, height:1, background:i<step?T.green:T.border, margin:"0 4px" }} />}
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* STEP 0 — Sector */}
        {/* ════════════════════════════════════════════════════════ */}
        {step===0 && (
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, margin:"0 0 6px", letterSpacing:"-0.03em" }}>
              Choose Your <span style={{color:T.green}}>Sector</span>
            </h1>
            <p style={{ color:T.textDim, fontSize:14, marginBottom:24 }}>
              AI tailors every word to your industry. Free plan: 3 sectors. Pro: all 8.
            </p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {SECTORS.map(s=>{
                const locked = !s.free && !isPro;
                const selected = sector===s.id;
                return (
                  <div key={s.id} onClick={()=>handleSectorClick(s)} style={{
                    padding:"16px 18px", borderRadius:12, cursor:"pointer",
                    border:`1px solid ${selected?T.green:T.border}`,
                    background: selected ? T.greenGlow : locked ? "rgba(255,255,255,0.02)" : T.bgCard,
                    display:"flex", alignItems:"center", gap:12, transition:"all 0.2s",
                    opacity: locked ? 0.6 : 1,
                    boxShadow: selected ? `0 0 20px ${T.greenGlow}` : "none",
                  }}>
                    <span style={{fontSize:20}}>{s.icon}</span>
                    <span style={{ fontSize:13, fontWeight:selected?600:400, color:selected?T.green:T.text, flex:1 }}>{s.label}</span>
                    {locked
                      ? <span style={{ fontSize:11, color:T.textMuted, background:T.bgInput, borderRadius:4, padding:"2px 6px" }}>PRO</span>
                      : selected && <span style={{color:T.green}}>✓</span>
                    }
                  </div>
                );
              })}
            </div>

            <Btn full onClick={()=>sector&&!showPaywall&&setStep(1)}
              disabled={!sector||showPaywall} style={{marginTop:20}}>
              Continue →
            </Btn>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* STEP 1 — Personal Info */}
        {/* ════════════════════════════════════════════════════════ */}
        {step===1 && (
          <div>
            <h2 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Personal <span style={{color:T.green}}>Information</span></h2>
            <p style={{color:T.textDim,fontSize:14,marginBottom:22}}>Contact details and professional headline.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
              {[["fullName","Full Name","Sarah Al-Rashid"],["jobTitle","Target Job Title","Senior Software Engineer"],
                ["email","Email","you@email.com"],["phone","Phone","+1 234 567 890"],
                ["location","Location","Dubai, UAE"],["linkedin","LinkedIn","linkedin.com/in/name"]
              ].map(([f,l,ph])=>(
                <div key={f} style={fw}>
                  <label style={lbl}>{l}</label>
                  <input placeholder={ph} value={form[f]} onChange={e=>upd(f,e.target.value)}
                    style={inp} onFocus={e=>e.target.style.borderColor=T.green} onBlur={e=>e.target.style.borderColor=T.border} />
                </div>
              ))}
            </div>
            <div style={fw}>
              <label style={lbl}>Summary Notes (optional — AI will polish it)</label>
              <textarea rows={3} placeholder="Brief notes about your experience and goals..." value={form.summary} onChange={e=>upd("summary",e.target.value)}
                style={{...inp,resize:"vertical"}} onFocus={e=>e.target.style.borderColor=T.green} onBlur={e=>e.target.style.borderColor=T.border} />
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn variant="ghost" onClick={()=>setStep(0)}>← Back</Btn>
              <Btn full onClick={()=>form.fullName&&form.jobTitle&&setStep(2)} disabled={!form.fullName||!form.jobTitle}>Continue →</Btn>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* STEP 2 — Experience */}
        {/* ════════════════════════════════════════════════════════ */}
        {step===2 && (
          <div>
            <h2 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Work <span style={{color:T.green}}>Experience</span></h2>
            <p style={{color:T.textDim,fontSize:14,marginBottom:20}}>Add your roles — AI crafts powerful bullet points.</p>

            {form.experience.map((exp,i)=>(
              <div key={i} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:20,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <span style={{fontSize:11,color:T.green,fontWeight:700,letterSpacing:"0.08em"}}>POSITION {i+1}</span>
                  {i>0 && <button onClick={()=>rmExp(i)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  {[["role","Job Title","Software Engineer"],["company","Company","Google"]].map(([f,l,ph])=>(
                    <div key={f} style={fw}>
                      <label style={lbl}>{l}</label>
                      <input placeholder={ph} value={exp[f]} onChange={e=>updExp(i,f,e.target.value)}
                        style={inp} onFocus={e=>e.target.style.borderColor=T.green} onBlur={e=>e.target.style.borderColor=T.border} />
                    </div>
                  ))}
                </div>
                <div style={fw}>
                  <label style={lbl}>Duration</label>
                  <input placeholder="Jan 2022 – Present" value={exp.duration} onChange={e=>updExp(i,"duration",e.target.value)}
                    style={inp} onFocus={e=>e.target.style.borderColor=T.green} onBlur={e=>e.target.style.borderColor=T.border} />
                </div>
                <div style={fw}>
                  <label style={lbl}>Key points (AI will expand these into strong bullets)</label>
                  <textarea rows={2} placeholder="Led team of 5, built payment API, cut costs 30%..." value={exp.bullets} onChange={e=>updExp(i,"bullets",e.target.value)}
                    style={{...inp,resize:"vertical"}} onFocus={e=>e.target.style.borderColor=T.green} onBlur={e=>e.target.style.borderColor=T.border} />
                </div>
              </div>
            ))}

            <button onClick={addExp} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px dashed ${T.borderGreen}`,background:T.greenGlow2,color:T.green,cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:20}}>
              + Add Another Position
            </button>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Education</div>
              {form.education.map((edu,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr",gap:10,marginBottom:10}}>
                  {[["degree","Degree","B.Sc. Computer Science"],["institution","Institution","MIT"],["year","Year","2020"]].map(([f,l,ph])=>(
                    <div key={f}>
                      <label style={{...lbl,fontSize:10}}>{l}</label>
                      <input placeholder={ph} value={edu[f]} onChange={e=>{const ed=[...form.education];ed[i]={...ed[i],[f]:e.target.value};upd("education",ed);}}
                        style={inp} onFocus={e=>e.target.style.borderColor=T.green} onBlur={e=>e.target.style.borderColor=T.border} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:10}}>
              <Btn variant="ghost" onClick={()=>setStep(1)}>← Back</Btn>
              <Btn full onClick={()=>setStep(3)}>Continue →</Btn>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* STEP 3 — Skills */}
        {/* ════════════════════════════════════════════════════════ */}
        {step===3 && (
          <div>
            <h2 style={{fontSize:22,fontWeight:800,margin:"0 0 6px"}}>Skills & <span style={{color:T.green}}>Extras</span></h2>
            <p style={{color:T.textDim,fontSize:14,marginBottom:22}}>List your skills, certifications, and languages.</p>

            {[["skills","Technical & Soft Skills","Python, Project Management, SQL, Agile, Communication..."],
              ["certifications","Certifications (optional)","AWS Certified, PMP, CPA..."],
              ["languages","Languages (optional)","English (Fluent), Arabic (Native)"]
            ].map(([f,l,ph])=>(
              <div key={f} style={fw}>
                <label style={lbl}>{l}</label>
                <textarea rows={2} placeholder={ph} value={form[f]} onChange={e=>upd(f,e.target.value)}
                  style={{...inp,resize:"vertical"}} onFocus={e=>e.target.style.borderColor=T.green} onBlur={e=>e.target.style.borderColor=T.border} />
              </div>
            ))}

            <div style={{background:T.greenGlow2,border:`1px solid ${T.borderGreen}`,borderRadius:10,padding:"14px 18px",marginBottom:20}}>
              <div style={{fontSize:13,color:T.green,fontWeight:700,marginBottom:4}}>⚡ AI is about to craft your CV</div>
              <div style={{fontSize:13,color:T.textDim,lineHeight:1.6}}>
                Tailored for <strong style={{color:T.text}}>{SECTORS.find(s=>s.id===sector)?.label}</strong> · ATS-optimized · Professional language
              </div>
            </div>

            {error && <div style={{marginBottom:16,padding:"12px 16px",background:"rgba(255,68,68,0.08)",border:"1px solid rgba(255,68,68,0.25)",borderRadius:8,color:T.danger,fontSize:13}}>{error}</div>}

            <div style={{display:"flex",gap:10}}>
              <Btn variant="ghost" onClick={()=>setStep(2)}>← Back</Btn>
              <button onClick={generateCV} disabled={loading} style={{
                flex:1,padding:"13px",borderRadius:10,border:"none",
                background: loading ? T.greenDim : T.green,
                color:T.bg,fontWeight:700,fontSize:15,cursor:loading?"not-allowed":"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              }}>
                {loading
                  ? <><span style={{width:16,height:16,border:`2px solid ${T.bg}`,borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>Generating…</>
                  : "⚡ Generate My CV"
                }
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* STEP 5 — CV Preview */}
        {/* ════════════════════════════════════════════════════════ */}
        {step===5 && cvOutput && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:800,margin:0}}>Your CV is <span style={{color:T.green}}>Ready!</span></h2>
                <p style={{color:T.textDim,fontSize:13,marginTop:4}}>Tailored for {SECTORS.find(s=>s.id===sector)?.label}</p>
              </div>
              <Btn variant="ghost" onClick={()=>{setStep(0);setSector(null);setCvOutput(null);}}>← New CV</Btn>
            </div>

            {/* CV Document */}
            <div id="cv-doc" style={{background:"#fff",color:"#1a1a1a",borderRadius:12,padding:"40px 44px",fontFamily:"Georgia,serif",lineHeight:1.6,position:"relative"}}>

              {/* Watermark for free users */}
              {!isPro && (
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:2,transform:"rotate(-30deg)",opacity:0.06}}>
                  <span style={{fontSize:72,fontWeight:900,color:"#000",fontFamily:"sans-serif",letterSpacing:"-0.02em"}}>CVFORGE.AI</span>
                </div>
              )}

              <div style={{borderBottom:"3px solid #0a0a0a",paddingBottom:18,marginBottom:20}}>
                <h1 style={{margin:0,fontSize:26,fontWeight:800,letterSpacing:"-0.02em"}}>{cvOutput.name}</h1>
                <div style={{fontSize:14,color:"#16a34a",fontWeight:600,marginTop:4,fontFamily:"sans-serif"}}>{cvOutput.title}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"4px 18px",marginTop:10,fontSize:12,color:"#555",fontFamily:"sans-serif"}}>
                  {cvOutput.contact?.email    && <span>✉ {cvOutput.contact.email}</span>}
                  {cvOutput.contact?.phone    && <span>📞 {cvOutput.contact.phone}</span>}
                  {cvOutput.contact?.location && <span>📍 {cvOutput.contact.location}</span>}
                  {cvOutput.contact?.linkedin && <span>🔗 {cvOutput.contact.linkedin}</span>}
                </div>
              </div>

              {cvOutput.summary && (
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",color:"#0a0a0a",fontFamily:"sans-serif",marginBottom:8,textTransform:"uppercase"}}>Professional Summary</div>
                  <p style={{margin:0,fontSize:13,color:"#333",lineHeight:1.75}}>{cvOutput.summary}</p>
                </div>
              )}

              {cvOutput.experience?.length>0 && (
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",color:"#0a0a0a",fontFamily:"sans-serif",marginBottom:10,textTransform:"uppercase",borderBottom:"1px solid #e5e5e5",paddingBottom:5}}>Work Experience</div>
                  {cvOutput.experience.map((exp,i)=>(
                    <div key={i} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:13.5,fontFamily:"sans-serif"}}>{exp.role}</div>
                          <div style={{fontSize:12.5,color:"#555",fontFamily:"sans-serif"}}>{exp.company}</div>
                        </div>
                        <div style={{fontSize:11.5,color:"#888",fontFamily:"sans-serif",whiteSpace:"nowrap"}}>{exp.duration}</div>
                      </div>
                      <ul style={{margin:"6px 0 0",paddingLeft:18}}>
                        {exp.achievements?.map((a,j)=><li key={j} style={{fontSize:12.5,color:"#333",marginBottom:3,lineHeight:1.65}}>{a}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
                {cvOutput.skills?.length>0 && (
                  <div>
                    <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",color:"#0a0a0a",fontFamily:"sans-serif",marginBottom:10,textTransform:"uppercase",borderBottom:"1px solid #e5e5e5",paddingBottom:5}}>Skills</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {cvOutput.skills.map((s,i)=><span key={i} style={{fontSize:11,padding:"3px 9px",borderRadius:4,background:"#f3f4f6",color:"#333",fontFamily:"sans-serif"}}>{s}</span>)}
                    </div>
                  </div>
                )}
                {cvOutput.education?.length>0 && (
                  <div>
                    <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",color:"#0a0a0a",fontFamily:"sans-serif",marginBottom:10,textTransform:"uppercase",borderBottom:"1px solid #e5e5e5",paddingBottom:5}}>Education</div>
                    {cvOutput.education.map((e,i)=>(
                      <div key={i} style={{marginBottom:8}}>
                        <div style={{fontWeight:600,fontSize:13,fontFamily:"sans-serif"}}>{e.degree}</div>
                        <div style={{fontSize:12,color:"#666",fontFamily:"sans-serif"}}>{e.institution} · {e.year}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(cvOutput.certifications?.length>0||cvOutput.languages?.length>0) && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginTop:18}}>
                  {cvOutput.certifications?.length>0 && (
                    <div>
                      <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",color:"#0a0a0a",fontFamily:"sans-serif",marginBottom:8,textTransform:"uppercase",borderBottom:"1px solid #e5e5e5",paddingBottom:5}}>Certifications</div>
                      {cvOutput.certifications.map((c,i)=><div key={i} style={{fontSize:12.5,color:"#333",fontFamily:"sans-serif",marginBottom:3}}>• {c}</div>)}
                    </div>
                  )}
                  {cvOutput.languages?.length>0 && (
                    <div>
                      <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",color:"#0a0a0a",fontFamily:"sans-serif",marginBottom:8,textTransform:"uppercase",borderBottom:"1px solid #e5e5e5",paddingBottom:5}}>Languages</div>
                      {cvOutput.languages.map((l,i)=><div key={i} style={{fontSize:12.5,color:"#333",fontFamily:"sans-serif",marginBottom:3}}>• {l}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CTA */}
            {isPro
              ? (
                <div style={{marginTop:14,background:T.bgCard,border:`1px solid ${T.borderGreen}`,borderRadius:12,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>Download as PDF</div>
                    <div style={{fontSize:12,color:T.textDim,marginTop:2}}>Clean, print-ready · No watermark</div>
                  </div>
                  <Btn onClick={()=>window.print()}>⬇ Download PDF</Btn>
                </div>
              ) : (
                <div style={{marginTop:14,background:"linear-gradient(135deg,#111 0%,rgba(57,255,20,0.06) 100%)",border:`1px solid ${T.borderGreen}`,borderRadius:12,padding:"22px 24px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>Unlock your CV — <span style={{color:T.green}}>$5 one-time</span></div>
                      <div style={{fontSize:13,color:T.textDim,lineHeight:1.6}}>✓ PDF download &nbsp;·&nbsp; ✓ No watermark &nbsp;·&nbsp; ✓ All 8 sectors &nbsp;·&nbsp; ✓ Unlimited regenerations</div>
                    </div>
                    <button onClick={handleUpgrade} disabled={payLoading} style={{
                      padding:"13px 28px",borderRadius:10,border:"none",background:T.green,color:T.bg,
                      fontWeight:800,fontSize:15,cursor:payLoading?"not-allowed":"pointer",flexShrink:0,
                    }}>
                      {payLoading ? "Redirecting…" : "⚡ Get Pro — $5"}
                    </button>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* PAYWALL MODAL */}
        {/* ════════════════════════════════════════════════════════ */}
        {showPaywall && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20}}>
            <div style={{background:T.bgCard,border:`1px solid ${T.borderGreen}`,borderRadius:16,padding:"36px 32px",maxWidth:440,width:"100%",textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>🔒</div>
              <h2 style={{fontSize:22,fontWeight:800,margin:"0 0 8px",letterSpacing:"-0.02em"}}>Pro Sector</h2>
              <p style={{color:T.textDim,fontSize:14,lineHeight:1.7,marginBottom:24}}>
                <strong style={{color:T.text}}>{SECTORS.find(s=>s.id===sector)?.label}</strong> is available on the Pro plan. Upgrade once, get all 8 sectors + PDF download + unlimited regenerations.
              </p>

              <div style={{background:T.bg,borderRadius:12,padding:"18px 20px",marginBottom:24,textAlign:"left"}}>
                {["All 8 industry sectors","PDF download (no watermark)","Unlimited CV regenerations","Priority AI generation"].map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom: i<3?10:0}}>
                    <span style={{color:T.green,fontWeight:700}}>✓</span>
                    <span style={{fontSize:13,color:T.text}}>{f}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleUpgrade} disabled={payLoading} style={{
                width:"100%",padding:"14px",borderRadius:10,border:"none",background:T.green,color:T.bg,
                fontWeight:800,fontSize:16,cursor:payLoading?"not-allowed":"pointer",marginBottom:12,
              }}>
                {payLoading ? "Redirecting to payment…" : "⚡ Upgrade Now — $5"}
              </button>
              <button onClick={()=>{setShowPaywall(false);setSector(null);}} style={{background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:13}}>
                No thanks, stay on Free
              </button>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: #383838; }
        * { box-sizing: border-box; }
        @media print {
          body * { visibility: hidden; }
          #cv-doc, #cv-doc * { visibility: visible; }
          #cv-doc { position: absolute; left: 0; top: 0; width: 100%; border-radius: 0; }
        }
        @media (max-width: 600px) {
          [style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          [style*="grid-template-columns: 2fr 2fr 1fr"] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

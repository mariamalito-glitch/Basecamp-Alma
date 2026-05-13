import { useState, useEffect, useRef, useCallback } from "react";

const FIREBASE_CONFIG_ALMA = {
  apiKey: "AIzaSyD5PCOXHJQnOJAeffxijG90n_CRm_DlCXM",
  authDomain: "basecamp-alma.firebaseapp.com",
  projectId: "basecamp-alma",
  storageBucket: "basecamp-alma.firebasestorage.app",
  messagingSenderId: "691606603854",
  appId: "1:691606603854:web:0f9cec324ce89aa16adb1f"
};

const FIREBASE_CONFIG_LIMPIEZA = {
  apiKey: "AIzaSyD6DLC3bfjwNJsbMwZAr812FKNTonDs_yA",
  authDomain: "limpieza-app-52f54.firebaseapp.com",
  projectId: "limpieza-app-52f54",
  storageBucket: "limpieza-app-52f54.firebasestorage.app",
  messagingSenderId: "701120235035",
  appId: "1:701120235035:web:99b0afe0629cdb302edabe"
};

const EDIFICIOS_INIT = {
  QDB:  ["101","102","103","104","201","202","203","204","301","302","303","PH","Zona común","Cochera"],
  H475: ["101","102","103","201","202","203","204","301","302","PH 1","PH 2","Zona común","SUM","Cochera"]
};
const URGENCIAS = [
  { label:"Urgente", bg:"#FCEBEB", text:"#A32D2D", border:"#F09595" },
  { label:"Media",   bg:"#FAEEDA", text:"#854F0B", border:"#EF9F27" },
  { label:"Baja",    bg:"#EAF3DE", text:"#3B6D11", border:"#97C459" },
];
const TIPOS_INIT = ["Eléctrica","Sanitaria","Pintura","Obra mayor","Albañilería","Herrería","Gas","Limpieza","Cerrajería","General","Otro"];
const ESTADOS    = ["Pendiente","En curso","Pausada","Completada"];
const PERSONAL   = ["Yo","Personal semanal (4h)","Personal semanal (8h)","Personal eventual","Emergencia"];
const MONTHS     = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const PAD      = n => String(n).padStart(2,"0");
const FMT_DATE = d => { if(!d) return "—"; const [y,m,dd]=d.split("-"); return `${dd}/${m}/${y}`; };
const TODAY    = new Date().toISOString().slice(0,10);

const S = {
  card: { background:"#fff", border:"1px solid #e2e0d8", borderRadius:14, padding:"1rem 1.25rem", marginBottom:"1rem" },
  section: { background:"#f7f6f2", border:"1px solid #ebe9e2", borderRadius:16, padding:"1.5rem", marginBottom:"1.25rem" },
  label: { fontSize:12, color:"#888", marginBottom:4, display:"block", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.04em" },
  input: { width:"100%", boxSizing:"border-box", fontSize:14, padding:"8px 10px", borderRadius:8, border:"1px solid #dddbd3", background:"#fff", color:"#222" },
  btn: (bg,col) => ({ background:bg||"#fff", color:col||"#333", border:`1px solid ${bg||"#dddbd3"}`, borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:500, fontSize:14, display:"inline-flex", alignItems:"center", gap:6 }),
  tag: (bg,col,border) => ({ background:bg, color:col, border:`1px solid ${border}`, borderRadius:20, fontSize:12, fontWeight:500, padding:"2px 10px", whiteSpace:"nowrap" }),
};

const urgStyle = u => URGENCIAS.find(x=>x.label===u)||URGENCIAS[2];
const estStyle = e => {
  if(e==="Completada") return {bg:"#EAF3DE",text:"#3B6D11",border:"#97C459"};
  if(e==="En curso")   return {bg:"#E6F1FB",text:"#185FA5",border:"#85B7EB"};
  if(e==="Pausada")    return {bg:"#FAEEDA",text:"#854F0B",border:"#EF9F27"};
  return {bg:"#F1EFE8",text:"#5F5E5A",border:"#B4B2A9"};
};

// ── Clasificador por reglas ────────────────────────────────────────────────────
function clasificarReporte(texto) {
  const t = (texto||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const noMante = ["olvido","olvide","perdido","perdida","objeto","ropa","vajilla","vaso","vasos",
    "taza","plato","cubierto","falta reponer","reponer","amenities","toalla falta","sabana",
    "papel higienico","shampoo","jabon","sucio","sucia","limpieza","mancha","olor","basura","mugre"];
  for(const p of noMante) if(t.includes(p)) return { esMantenimiento:false };

  const checks = [
    { words:["sin luz","no hay luz","no anda la luz","disyuntor","tablero","cortocircuito","tomacorriente","enchufe","lampara","electricidad","electrico","calefactor","aire acondicionado","no enfria","no calienta"], tipo:"Eléctrica", urgFn: w => w==="sin luz"||w==="no hay luz" },
    { words:["sin agua","no sale agua","perdida de agua","inundacion","canilla","caño","pileta","inodoro","ducha","gotea","presion","desague","humedad","calefon","termotanque","baño"], tipo:"Sanitaria", urgFn: w => w==="sin agua"||w==="no sale agua"||w==="inundacion" },
    { words:["olor a gas","escape de gas","gas","garrafa","hornalla","cocina no anda"], tipo:"Gas", urgFn: w => w==="olor a gas"||w==="escape de gas" },
    { words:["caja fuerte","cerradura","no abre","no cierra","traba","cerrojo","puerta trabada","candado","pomo","llave"], tipo:"Cerrajería", urgFn: ()=>false },
    { words:["caido","roto","rajado","rajadura","grieta","pared","techo","piso","baldosa","azulejo","estante","madera","bisagra","ventana rota","vidrio","persiana","espejo"], tipo:"Albañilería", urgFn: ()=>false },
    { words:["reja","baranda","barandal","oxidado"], tipo:"Herrería", urgFn: ()=>false },
    { words:["no funciona","no anda","no sirve","daño","dañado","falla","desprendido","caída"], tipo:"General", urgFn: ()=>false },
  ];

  for(const {words,tipo,urgFn} of checks) {
    for(const w of words) {
      if(t.includes(w)) return { esMantenimiento:true, tipo, urgencia: urgFn(w)?"Urgente":"Media" };
    }
  }
  return { esMantenimiento:false };
}

function capitalizar(str) { if(!str) return ""; return str.charAt(0).toUpperCase()+str.slice(1); }

// ── Firebase ──────────────────────────────────────────────────────────────────
let firebaseLoaded = false;
let dbAlma = null, dbLimp = null;

async function loadFirebase() {
  if(firebaseLoaded) return;
  const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const fb = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const almaApp = getApps().find(a=>a.name==="alma") || initializeApp(FIREBASE_CONFIG_ALMA,"alma");
  const limpApp = getApps().find(a=>a.name==="limpieza") || initializeApp(FIREBASE_CONFIG_LIMPIEZA,"limpieza");
  dbAlma = fb.getFirestore(almaApp);
  dbLimp = fb.getFirestore(limpApp);
  window._fb = fb;
  firebaseLoaded = true;
}

async function almaSet(k,v) { const {doc,setDoc}=window._fb; await setDoc(doc(dbAlma,"alma",String(k)),{value:JSON.stringify(v)}); }
async function almaGet(k) { const {doc,getDoc}=window._fb; const s=await getDoc(doc(dbAlma,"alma",String(k))); return s.exists()?JSON.parse(s.data().value):null; }
function almaListen(k,cb) { const {doc,onSnapshot}=window._fb; return onSnapshot(doc(dbAlma,"alma",String(k)),s=>{cb(s.exists()?JSON.parse(s.data().value):null);}); }
async function limpiezaGet(k) { const {doc,getDoc}=window._fb; const s=await getDoc(doc(dbLimp,"limpiezas",String(k))); return s.exists()?JSON.parse(s.data().value):null; }

// ── Modal genérico ─────────────────────────────────────────────────────────────
function Modal({onClose,children,wide}) {
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(10,10,20,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#fff",borderRadius:18,padding:"2rem",width:"100%",maxWidth:wide?800:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 12px 48px rgba(0,0,0,0.25)"}}>
        {children}
      </div>
    </div>
  );
}

// ── Modal Historial Depto ─────────────────────────────────────────────────────
function ModalDepto({edificio,depto,tareas,onClose}) {
  const todas = tareas.filter(t=>t.edificio===edificio&&t.depto===depto);
  const activas = todas.filter(t=>t.estado!=="Completada");
  const completadas = todas.filter(t=>t.estado==="Completada");
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(8,20,45,0.8)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#1C2B45",borderRadius:20,padding:"2rem",width:"100%",maxWidth:620,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 16px 64px rgba(0,0,0,0.6)",border:"2px solid #2E4A6E"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <div>
            <p style={{margin:0,fontSize:20,fontWeight:700,color:"#fff"}}>🏠 {edificio} · Dpto {depto}</p>
            <p style={{margin:0,fontSize:13,color:"#8BAFD4",marginTop:2}}>{todas.length} registro{todas.length!==1?"s":""} en total</p>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:10,width:36,height:36,fontSize:18,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {activas.length>0&&(
          <div style={{marginBottom:"1.5rem"}}>
            <p style={{margin:"0 0 0.75rem",fontSize:12,fontWeight:700,color:"#F09595",textTransform:"uppercase",letterSpacing:"0.06em"}}>🔴 Tareas activas ({activas.length})</p>
            {activas.map(t=>{
              const urg=urgStyle(t.urgencia); const est=estStyle(t.estado);
              return (
                <div key={t.id} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"0.875rem 1rem",marginBottom:"0.5rem",borderLeft:`4px solid ${urg.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                    <p style={{margin:0,fontWeight:600,fontSize:14,color:"#fff"}}>{t.titulo}</p>
                    <div style={{display:"flex",gap:6}}>
                      <span style={{...S.tag(urg.bg,urg.text,urg.border),fontSize:11}}>{t.urgencia}</span>
                      <span style={{...S.tag(est.bg,est.text,est.border),fontSize:11}}>{t.estado}</span>
                    </div>
                  </div>
                  <p style={{margin:"4px 0 0",fontSize:12,color:"#8BAFD4"}}>🔧 {t.tipo} &nbsp;|&nbsp; 📅 {FMT_DATE(t.fecha)} &nbsp;|&nbsp; 👤 {t.asignado}</p>
                  {t.origen==="reporte"&&<p style={{margin:"3px 0 0",fontSize:11,color:"#FFB74D"}}>🔗 Migrado desde reporte</p>}
                  {t.fotoReporte&&<img src={t.fotoReporte} alt="foto" style={{marginTop:8,maxWidth:180,borderRadius:8,border:"1px solid rgba(255,255,255,0.15)",cursor:"zoom-in"}} onClick={()=>window.open(t.fotoReporte,"_blank")}/>}
                </div>
              );
            })}
          </div>
        )}

        {completadas.length>0&&(
          <div>
            <p style={{margin:"0 0 0.75rem",fontSize:12,fontWeight:700,color:"#97C459",textTransform:"uppercase",letterSpacing:"0.06em"}}>✅ Historial completado ({completadas.length})</p>
            {completadas.map(t=>(
              <div key={t.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"0.75rem 1rem",marginBottom:"0.5rem",borderLeft:"4px solid #97C459"}}>
                <p style={{margin:0,fontWeight:500,fontSize:14,color:"#b0c8e0",textDecoration:"line-through",opacity:0.8}}>{t.titulo}</p>
                <p style={{margin:"4px 0 0",fontSize:12,color:"#6A8FAF"}}>🔧 {t.tipo} &nbsp;|&nbsp; 📅 {FMT_DATE(t.fecha)}{t.fechaFin?` → ${FMT_DATE(t.fechaFin)}`:""} &nbsp;|&nbsp; 👤 {t.asignado}</p>
                {t.fotoReporte&&<img src={t.fotoReporte} alt="foto" style={{marginTop:6,maxWidth:120,borderRadius:6,border:"1px solid rgba(255,255,255,0.1)",cursor:"zoom-in"}} onClick={()=>window.open(t.fotoReporte,"_blank")}/>}
              </div>
            ))}
          </div>
        )}

        {todas.length===0&&(
          <div style={{textAlign:"center",padding:"2.5rem 0",color:"#8BAFD4"}}>
            <p style={{fontSize:36,marginBottom:8}}>🏠</p>
            <p style={{fontSize:15}}>Sin registros para este departamento</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Badge origen ──────────────────────────────────────────────────────────────
function OrigenBadge({origen}) {
  if(!origen) return null;
  const cfg = {
    reporte:  {bg:"#FFF3E0",color:"#E65100",border:"#FFB74D",label:"🔗 Desde Reporte"},
    limpieza: {bg:"#E8F5E9",color:"#1B5E20",border:"#66BB6A",label:"🧹 Post-mantenimiento"},
  };
  const c=cfg[origen]; if(!c) return null;
  return <span style={{...S.tag(c.bg,c.color,c.border),fontSize:11}}>{c.label}</span>;
}

// ── Tarjeta Tarea ─────────────────────────────────────────────────────────────
function TareaCard({t,onEdit,onEstado,onDelete,onComentario}) {
  const urg=urgStyle(t.urgencia);
  const est=estStyle(t.estado);
  const [open,setOpen]=useState(false);
  const [comentario,setComentario]=useState(t.comentario||"");
  return (
    <div style={{...S.card,borderLeft:`5px solid ${urg.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
            {t.huespedAlerta&&<span style={S.tag("#FAECE7","#993C1D","#F5C4B3")}>⚠ Huésped</span>}
            <span style={S.tag(urg.bg,urg.text,urg.border)}>{t.urgencia}</span>
            <span style={S.tag(est.bg,est.text,est.border)}>{t.estado}</span>
            <span style={S.tag("#F1EFE8","#5F5E5A","#B4B2A9")}>{t.tipo}</span>
            {t.recurrente&&<span style={S.tag("#E6F1FB","#185FA5","#85B7EB")}>🔁 Mensual</span>}
            {t.limpieza&&<span style={S.tag("#EEEDFE","#534AB7","#AFA9EC")}>🧹 Limpieza</span>}
            <OrigenBadge origen={t.origen}/>
          </div>
          <p style={{margin:"0 0 3px",fontWeight:600,fontSize:16}}>{t.titulo}</p>
          <p style={{margin:0,fontSize:13,color:"#888"}}>
            🏢 {t.edificio} · {t.depto||"—"} &nbsp;|&nbsp; 👤 {t.asignado} &nbsp;|&nbsp; 📅 {FMT_DATE(t.fecha)}{t.fechaFin?` → ${FMT_DATE(t.fechaFin)}`:""}
          </p>
          {t.materiales&&<p style={{margin:"2px 0 0",fontSize:13,color:"#888"}}>🔧 {t.materiales}</p>}
          {t.fotoReporte&&(
            <img src={t.fotoReporte} alt="foto reporte" style={{marginTop:8,maxWidth:160,borderRadius:8,border:"1px solid #e2e0d8",cursor:"zoom-in",display:"block"}}
              onClick={()=>window.open(t.fotoReporte,"_blank")}/>
          )}
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          <button onClick={()=>setOpen(!open)} style={{...S.btn(),padding:"6px 10px"}}>{open?"▲":"▼"}</button>
          <button onClick={()=>onEdit(t)} style={{...S.btn(),padding:"6px 10px"}}>✏️</button>
          <button onClick={()=>onDelete(t.id)} style={{...S.btn("#FCEBEB","#A32D2D"),padding:"6px 10px",border:"1px solid #F09595"}}>🗑️</button>
        </div>
      </div>

      {open&&(
        <div style={{marginTop:"0.75rem",paddingTop:"0.75rem",borderTop:"1px solid #ebe9e2"}}>
          {t.descripcion&&<p style={{fontSize:14,margin:"0 0 0.75rem",color:"#666"}}>{t.descripcion}</p>}

          {/* Comentario interno editable */}
          <div style={{marginBottom:"0.75rem"}}>
            <label style={S.label}>💬 Comentario interno</label>
            <textarea
              style={{...S.input,resize:"vertical",fontSize:13}}
              rows={2}
              value={comentario}
              onChange={e=>setComentario(e.target.value)}
              placeholder="Notas internas, observaciones..."/>
            <button onClick={()=>onComentario(t.id,comentario)} style={{...S.btn("#185FA5","#fff"),marginTop:6,padding:"5px 14px",fontSize:12}}>
              💾 Guardar comentario
            </button>
          </div>

          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
            {t.estado!=="En curso"&&t.estado!=="Completada"&&<button onClick={()=>onEstado(t.id,"En curso")} style={S.btn("#185FA5","#fff")}>▶ Iniciar</button>}
            {t.estado==="En curso"&&<>
              <button onClick={()=>onEstado(t.id,"Completada")} style={S.btn("#3B6D11","#fff")}>✔ Finalizar</button>
              <button onClick={()=>onEstado(t.id,"Pausada")} style={S.btn("#854F0B","#fff")}>⏸ Pausar</button>
            </>}
            {t.estado==="Pausada"&&<button onClick={()=>onEstado(t.id,"En curso")} style={S.btn("#185FA5","#fff")}>▶ Reanudar</button>}
            {t.estado==="Completada"&&<button onClick={()=>onEstado(t.id,"Pendiente")} style={S.btn()}>↩ Reabrir</button>}
          </div>

          {t.historial?.length>0&&(
            <div style={{background:"#f7f6f2",borderRadius:8,padding:"0.5rem 0.75rem"}}>
              <p style={{margin:"0 0 4px",fontSize:12,fontWeight:500,color:"#888"}}>REGISTRO</p>
              {t.historial.map((h,i)=><p key={i} style={{margin:"2px 0",fontSize:12,color:"#aaa"}}>• {h}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Formulario Tarea ──────────────────────────────────────────────────────────
function TareaForm({tarea,edificios,tipos,onSave,onClose}) {
  const blank={titulo:"",edificio:"QDB",depto:"",tipo:"General",asignado:"Yo",urgencia:"Baja",
    estado:"Pendiente",fecha:TODAY,fechaFin:"",descripcion:"",materiales:"",comentario:"",
    limpieza:false,recurrente:false,huespedAlerta:false,historial:[]};
  const [f,setF]=useState(tarea?{...tarea}:blank);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const deptos=edificios[f.edificio]||[];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:500}}>{tarea?"Editar tarea":"Nueva tarea"}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#888"}}>✕</button>
      </div>
      <div style={{display:"grid",gap:"1rem"}}>
        <div><label style={S.label}>Título *</label>
          <input style={S.input} value={f.titulo} onChange={e=>set("titulo",e.target.value)} placeholder="Descripción breve"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem"}}>
          <div><label style={S.label}>Edificio</label>
            <select style={S.input} value={f.edificio} onChange={e=>{set("edificio",e.target.value);set("depto","");}}>
              {Object.keys(edificios).map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Dpto / Sector</label>
            <select style={S.input} value={f.depto} onChange={e=>set("depto",e.target.value)}>
              <option value="">— Seleccionar —</option>
              {deptos.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Tipo</label>
            <select style={S.input} value={f.tipo} onChange={e=>set("tipo",e.target.value)}>
              {tipos.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem"}}>
          <div><label style={S.label}>Asignado a</label>
            <select style={S.input} value={f.asignado} onChange={e=>set("asignado",e.target.value)}>
              {PERSONAL.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Urgencia</label>
            <select style={S.input} value={f.urgencia} onChange={e=>set("urgencia",e.target.value)}>
              {URGENCIAS.map(u=><option key={u.label}>{u.label}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Estado</label>
            <select style={S.input} value={f.estado} onChange={e=>set("estado",e.target.value)}>
              {ESTADOS.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <div><label style={S.label}>Fecha de inicio</label>
            <input type="date" style={S.input} value={f.fecha} onChange={e=>set("fecha",e.target.value)}/>
          </div>
          <div><label style={S.label}>Fecha de fin (opcional)</label>
            <input type="date" style={S.input} value={f.fechaFin} onChange={e=>set("fechaFin",e.target.value)}/>
          </div>
        </div>
        <div><label style={S.label}>Materiales necesarios</label>
          <input style={S.input} value={f.materiales} onChange={e=>set("materiales",e.target.value)} placeholder="Ej: pintura blanca, rodillo..."/>
        </div>
        <div><label style={S.label}>Descripción / Notas</label>
          <textarea style={{...S.input,resize:"vertical"}} rows={2} value={f.descripcion} onChange={e=>set("descripcion",e.target.value)}/>
        </div>
        <div><label style={S.label}>💬 Comentario interno</label>
          <textarea style={{...S.input,resize:"vertical"}} rows={2} value={f.comentario||""} onChange={e=>set("comentario",e.target.value)} placeholder="Notas internas..."/>
        </div>
        <div style={{display:"flex",gap:"2rem",flexWrap:"wrap",padding:"0.75rem 1rem",background:"#f7f6f2",borderRadius:10}}>
          {[["limpieza","🧹 Requiere limpieza"],["recurrente","🔁 Mensual"],["huespedAlerta","⚠️ Huésped presente"]].map(([k,lbl])=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:8,fontSize:14,cursor:"pointer"}}>
              <input type="checkbox" checked={!!f[k]} onChange={e=>set(k,e.target.checked)} style={{width:16,height:16}}/>{lbl}
            </label>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:"0.75rem",marginTop:"1.5rem",justifyContent:"flex-end"}}>
        <button onClick={onClose} style={S.btn()}>Cancelar</button>
        <button onClick={()=>{if(!f.titulo.trim())return;onSave(f);onClose();}} style={{...S.btn("#185FA5","#fff"),padding:"9px 22px",fontSize:15}}>
          {tarea?"Guardar cambios":"Crear tarea"}
        </button>
      </div>
    </div>
  );
}

// ── Calendario ────────────────────────────────────────────────────────────────
function Calendario({tareas}) {
  const now=new Date();
  const [cur,setCur]=useState({y:now.getFullYear(),m:now.getMonth()});
  const prev=()=>setCur(c=>c.m===0?{y:c.y-1,m:11}:{...c,m:c.m-1});
  const next=()=>setCur(c=>c.m===11?{y:c.y+1,m:0}:{...c,m:c.m+1});
  const offset=(new Date(cur.y,cur.m,1).getDay()+6)%7;
  const days=new Date(cur.y,cur.m+1,0).getDate();
  const tareasDelDia=dia=>{
    const d=`${cur.y}-${PAD(cur.m+1)}-${PAD(dia)}`;
    return tareas.filter(t=>t.fecha===d||(t.fechaFin&&t.fecha<=d&&t.fechaFin>=d));
  };
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.25rem"}}>
        <button onClick={prev} style={S.btn()}>◀</button>
        <h3 style={{margin:0,fontSize:17,fontWeight:500,flex:1,textAlign:"center"}}>{MONTHS[cur.m]} {cur.y}</h3>
        <button onClick={next} style={S.btn()}>▶</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=>(
          <div key={d} style={{textAlign:"center",fontSize:12,fontWeight:500,color:"#888",padding:"6px 0",background:"#f7f6f2",borderRadius:6}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {Array.from({length:offset}).map((_,i)=><div key={"e"+i} style={{minHeight:80}}/>)}
        {Array.from({length:days}).map((_,i)=>{
          const dia=i+1, dStr=`${cur.y}-${PAD(cur.m+1)}-${PAD(dia)}`, ts=tareasDelDia(dia), esHoy=dStr===TODAY;
          return (
            <div key={dia} style={{minHeight:80,background:esHoy?"#E6F1FB":"#fff",border:`1.5px solid ${esHoy?"#378ADD":"#ebe9e2"}`,borderRadius:8,padding:"6px 8px",overflow:"hidden"}}>
              <p style={{margin:"0 0 4px",fontSize:13,fontWeight:500,color:esHoy?"#185FA5":"#222"}}>{dia}</p>
              {ts.slice(0,3).map(t=>{const u=urgStyle(t.urgencia);return(
                <div key={t.id} style={{background:t.origen?"#FFF3E0":u.bg,borderRadius:4,padding:"2px 5px",marginBottom:2}}>
                  <p style={{margin:0,fontSize:10,color:t.origen?"#E65100":u.text,whiteSpace:"nowrap",textOverflow:"ellipsis",overflow:"hidden"}}>
                    {t.origen==="reporte"?"🔗 ":""}{t.titulo}
                  </p>
                </div>
              );})}
              {ts.length>3&&<p style={{margin:0,fontSize:10,color:"#aaa"}}>+{ts.length-3} más</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── App Principal ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("dashboard");
  const [tareas,setTareasState]=useState([]);
  const [edificios,setEdificiosState]=useState(EDIFICIOS_INIT);
  const [tipos,setTiposState]=useState(TIPOS_INIT);
  const [showForm,setShowForm]=useState(false);
  const [editando,setEditando]=useState(null);
  const [filtro,setFiltro]=useState({edificio:"",urgencia:"",estado:"",tipo:""});
  const [newEdificio,setNewEdificio]=useState("");
  const [newDepto,setNewDepto]=useState({ed:"QDB",nombre:""});
  const [newTipo,setNewTipo]=useState("");
  const [mensualTareas,setMensualTareas]=useState({});
  const [mensualForm,setMensualForm]=useState({ed:"QDB",depto:"",texto:""});
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [procesadosIds,setProcesadosIds]=useState(new Set());
  const [deptoModal,setDeptoModal]=useState(null);

  const nextId=useRef(Date.now());
  const unsubscribers=useRef([]);
  const procesadosRef=useRef(new Set());
  const mesKey=new Date().toISOString().slice(0,7);

  const showToast=(msg,tipo="ok")=>{setToast({msg,tipo});setTimeout(()=>setToast(null),4000);};

  const saveTareas=useCallback(async v=>{setTareasState(v);try{await almaSet("alma_tasks",v);}catch(e){console.error(e);};},[]);
  const saveEdificios=useCallback(async v=>{setEdificiosState(v);try{await almaSet("alma_edificios",v);}catch(e){console.error(e);};},[]);
  const saveTipos=useCallback(async v=>{setTiposState(v);try{await almaSet("alma_tipos",v);}catch(e){console.error(e);};},[]);
  const saveMensual=useCallback(async v=>{setMensualTareas(v);try{await almaSet("alma_mensual",v);}catch(e){console.error(e);};},[]);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try {
        await loadFirebase();
        const [t,e,ti,m,proc]=await Promise.all([almaGet("alma_tasks"),almaGet("alma_edificios"),almaGet("alma_tipos"),almaGet("alma_mensual"),almaGet("alma_procesados")]);
        if(!mounted) return;
        if(t) setTareasState(t);
        if(e) setEdificiosState(e);
        if(ti) setTiposState(ti);
        if(m) setMensualTareas(m);
        if(proc){procesadosRef.current=new Set(proc);setProcesadosIds(new Set(proc));}
        const u1=almaListen("alma_tasks",data=>{if(mounted&&data)setTareasState(data);});
        const u2=almaListen("alma_mensual",data=>{if(mounted&&data)setMensualTareas(data);});
        unsubscribers.current.push(u1,u2);
        setLoading(false);
        checkReportesLimpieza();
        const iv=setInterval(checkReportesLimpieza,60000);
        unsubscribers.current.push(()=>clearInterval(iv));
      } catch(err){console.error(err);if(mounted)setLoading(false);}
    })();
    return()=>{mounted=false;unsubscribers.current.forEach(u=>typeof u==="function"&&u());};
  },[]);

  const checkReportesLimpieza=useCallback(async()=>{
    try {
      const reportes=await limpiezaGet("lim_reports");
      if(!reportes||!Array.isArray(reportes)) return;
      const nuevos=reportes.filter(r=>r.comentario?.trim()&&!procesadosRef.current.has(String(r.id)));
      if(!nuevos.length) return;

      // Cargar tareas actuales UNA sola vez antes del loop (evita duplicados)
      let tareasActuales=await almaGet("alma_tasks")||[];

      for(const rep of nuevos) {
        if(procesadosRef.current.has(String(rep.id))) continue;

        // Marcar procesado ANTES de crear la tarea (evita duplicados en reproceso)
        procesadosRef.current.add(String(rep.id));
        const procArray=Array.from(procesadosRef.current);
        setProcesadosIds(new Set(procArray));
        await almaSet("alma_procesados",procArray);

        const resultado=clasificarReporte(rep.comentario);
        if(!resultado.esMantenimiento) continue;

        // Verificar que no exista ya una tarea con este reporteId
        if(tareasActuales.some(t=>t.reporteId===rep.id)) continue;

        let edificio="", depto="";
        const dText=(rep.depto||"").trim();
        const match=dText.match(/^(QDB|H475|qdb|h475)\s*(.+)$/i);
        if(match){edificio=match[1].toUpperCase();depto=match[2].trim();}
        else{edificio="H475";depto=dText;}

        const nuevaTarea={
          id:Date.now()+Math.random(),
          titulo:capitalizar(rep.comentario.slice(0,60)),
          edificio, depto,
          tipo:resultado.tipo||"General",
          asignado:"Yo",
          urgencia:resultado.urgencia||"Media",
          estado:"Pendiente",
          fecha:rep.fecha||TODAY,
          fechaFin:"",
          descripcion:`Reportado por: ${rep.asignado||"Personal"}`,
          materiales:"",
          comentario:"",
          limpieza:false, recurrente:false, huespedAlerta:false,
          historial:[`Migrada automáticamente el ${new Date().toLocaleDateString("es-AR")}`],
          origen:"reporte",
          reporteId:rep.id,
          fotoReporte:rep.foto||null,
        };

        tareasActuales=[...tareasActuales,nuevaTarea];
        showToast(`🔗 Nueva tarea: ${nuevaTarea.titulo}`);
      }

      // Guardar todo de una sola vez
      await almaSet("alma_tasks",tareasActuales);
      setTareasState(tareasActuales);

    } catch(e){console.error("Error reportes:",e);}
  },[]);

  const enviarTareaLimpieza=useCallback(async(tarea)=>{
    if(!tarea.limpieza||!tarea.fechaFin) return;
    try {
      const limpTasks=await limpiezaGet("lim_tasks")||[];
      if(limpTasks.some(t=>t._almaId===tarea.id)) return;
      const nueva={id:Date.now(),_almaId:tarea.id,depto:`${tarea.edificio} ${tarea.depto}`,fecha:tarea.fechaFin||tarea.fecha,tipo:"Otro",descripcion:`🔧 Post-mantenimiento: ${tarea.titulo}`,comentario:"Limpieza tras mantenimiento",asignado:"",completado:false,ingresos:[],minutosOtro:null,libre:false,_origen:"basecamp_alma"};
      const {doc,setDoc}=window._fb;
      await setDoc(doc(dbLimp,"limpiezas","lim_tasks"),{value:JSON.stringify([...limpTasks,nueva])});
      showToast("🧹 Tarea de limpieza enviada");
    } catch(e){console.error(e);}
  },[]);

  const saveTarea=useCallback(async f=>{
    let lista;
    const histEntry=`Editada el ${new Date().toLocaleDateString("es-AR")}`;
    if(editando){
      lista=tareas.map(t=>{
        if(t.id!==editando.id) return t;
        const prevHist=t.historial||[];
        return {...f,id:t.id,origen:t.origen,fotoReporte:t.fotoReporte,reporteId:t.reporteId,historial:[...prevHist,histEntry]};
      });
    } else {
      const newT={...f,id:nextId.current++,historial:[`Creada el ${new Date().toLocaleDateString("es-AR")}`]};
      lista=[...tareas,newT];
    }
    await saveTareas(lista);
    setEditando(null);
  },[editando,tareas,saveTareas]);

  const cambiarEstado=useCallback(async(id,nuevoEstado)=>{
    const lista=tareas.map(t=>{
      if(t.id!==id) return t;
      const prevHist=t.historial||[];
      const updated={...t,estado:nuevoEstado,historial:[...prevHist,`${new Date().toLocaleDateString("es-AR")} — Estado: ${nuevoEstado}`]};
      if(nuevoEstado==="Completada"&&t.limpieza) enviarTareaLimpieza(updated);
      return updated;
    });
    await saveTareas(lista);
  },[tareas,saveTareas,enviarTareaLimpieza]);

  const eliminarTarea=useCallback(async id=>{await saveTareas(tareas.filter(t=>t.id!==id));},[tareas,saveTareas]);

  const guardarComentario=useCallback(async(id,comentario)=>{
    const lista=tareas.map(t=>t.id===id?{...t,comentario}:t);
    await saveTareas(lista);
    showToast("💬 Comentario guardado");
  },[tareas,saveTareas]);

  const tareasActivas=tareas.filter(t=>t.estado!=="Completada");
  const tareasComp=tareas.filter(t=>t.estado==="Completada");
  const urgentes=tareasActivas.filter(t=>t.urgencia==="Urgente");
  const enCurso=tareas.filter(t=>t.estado==="En curso");
  const huesped=tareas.filter(t=>t.huespedAlerta&&t.estado!=="Completada");
  const desdeLimpieza=tareas.filter(t=>t.origen==="reporte"&&t.estado!=="Completada");

  const tareasF=tareas.filter(t=>{
    if(tab==="historial") return t.estado==="Completada";
    if(filtro.edificio&&t.edificio!==filtro.edificio) return false;
    if(filtro.urgencia&&t.urgencia!==filtro.urgencia) return false;
    if(filtro.estado&&t.estado!==filtro.estado) return false;
    if(filtro.tipo&&t.tipo!==filtro.tipo) return false;
    return t.estado!=="Completada";
  });

  const TABS=[
    {id:"dashboard",icon:"🏠",label:"Dashboard"},
    {id:"tareas",icon:"✅",label:"Tareas"},
    {id:"calendario",icon:"📅",label:"Calendario"},
    {id:"mensual",icon:"🔁",label:"Mensual"},
    {id:"edificios",icon:"🏢",label:"Edificios"},
    {id:"historial",icon:"📋",label:"Historial"},
    {id:"config",icon:"⚙️",label:"Config"},
  ];

  if(loading) return (
    <div style={{fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#f4f3ef"}}>
      <div style={{fontSize:48,marginBottom:16}}>🔧</div>
      <p style={{fontSize:18,fontWeight:700,color:"#185FA5"}}>AlmaDesk</p>
      <p style={{color:"#888",fontSize:14,marginTop:4}}>Conectando...</p>
      <div style={{width:36,height:36,border:"4px solid #E6F1FB",borderTop:"4px solid #185FA5",borderRadius:"50%",animation:"spin 1s linear infinite",marginTop:20}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:960,margin:"0 auto",paddingBottom:"3rem",background:"#f4f3ef",minHeight:"100vh"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast&&<div style={{position:"fixed",top:14,right:14,zIndex:9999,background:toast.tipo==="err"?"#c0392b":"#185FA5",color:"#fff",borderRadius:10,padding:"10px 18px",fontSize:14,fontWeight:600,boxShadow:"0 4px 18px rgba(0,0,0,.2)",maxWidth:380}}>{toast.msg}</div>}

      {deptoModal&&<ModalDepto edificio={deptoModal.edificio} depto={deptoModal.depto} tareas={tareas} onClose={()=>setDeptoModal(null)}/>}

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0C447C,#185FA5)",padding:"1.25rem 2rem",borderRadius:"0 0 20px 20px",marginBottom:"1.25rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
          <div>
            <p style={{margin:0,fontWeight:700,fontSize:24,color:"#fff",letterSpacing:"-0.5px"}}>🔧 AlmaDesk</p>
            <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,0.75)"}}>
              Alma Rentals · {new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </p>
          </div>
          <div style={{display:"flex",gap:"1.5rem",textAlign:"center"}}>
            {[
              {label:"Urgentes",val:urgentes.length,col:"#F09595"},
              {label:"En curso",val:enCurso.length,col:"#85B7EB"},
              {label:"De reportes",val:desdeLimpieza.length,col:"#FFB74D"},
            ].map(c=>(
              <div key={c.label}>
                <p style={{margin:0,fontSize:22,fontWeight:700,color:c.col}}>{c.val}</p>
                <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,0.75)"}}>{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:"0.4rem",padding:"0 1rem",marginBottom:"1.25rem",flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 18px",borderRadius:24,fontSize:14,fontWeight:500,cursor:"pointer",
              background:tab===t.id?"#185FA5":"#fff",color:tab===t.id?"#fff":"#333",
              border:tab===t.id?"none":"1px solid #dddbd3"}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"0 1rem"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.25rem"}}>
              {[
                {label:"Pendientes",val:tareas.filter(t=>t.estado==="Pendiente").length,bg:"#F1EFE8",text:"#444",border:"#B4B2A9"},
                {label:"En curso",val:enCurso.length,bg:"#E6F1FB",text:"#185FA5",border:"#85B7EB"},
                {label:"Urgentes",val:urgentes.length,bg:"#FCEBEB",text:"#A32D2D",border:"#F09595"},
                {label:"Completadas",val:tareasComp.length,bg:"#EAF3DE",text:"#3B6D11",border:"#97C459"},
              ].map(c=>(
                <div key={c.label} style={{background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:12,padding:"1.25rem 1.5rem",textAlign:"center"}}>
                  <p style={{margin:"0 0 4px",fontSize:13,color:c.text,fontWeight:500}}>{c.label}</p>
                  <p style={{margin:0,fontSize:32,fontWeight:700,color:c.text}}>{c.val}</p>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              <div style={S.section}>
                <p style={{margin:"0 0 0.75rem",fontWeight:600,fontSize:15,color:"#A32D2D"}}>🔴 Urgentes activas</p>
                {urgentes.length===0?<p style={{color:"#888",fontSize:14}}>Sin urgencias.</p>:urgentes.map(t=>(
                  <div key={t.id} style={{padding:"8px 10px",background:"#fff",borderRadius:8,marginBottom:6,borderLeft:"4px solid #F09595"}}>
                    <p style={{margin:0,fontWeight:500,fontSize:14}}>{t.titulo}</p>
                    <p style={{margin:0,fontSize:12,color:"#888"}}>🏢 {t.edificio} · {t.depto}</p>
                  </div>
                ))}
              </div>
              <div style={S.section}>
                <p style={{margin:"0 0 0.75rem",fontWeight:600,fontSize:15,color:"#854F0B"}}>⚠️ Con huésped</p>
                {huesped.length===0?<p style={{color:"#888",fontSize:14}}>Sin alertas.</p>:huesped.map(t=>(
                  <div key={t.id} style={{padding:"8px 10px",background:"#FAEEDA",borderRadius:8,marginBottom:6,borderLeft:"4px solid #EF9F27"}}>
                    <p style={{margin:0,fontWeight:500,fontSize:14}}>{t.titulo}</p>
                    <p style={{margin:0,fontSize:12,color:"#854F0B"}}>🏢 {t.edificio} · {t.depto}</p>
                  </div>
                ))}
              </div>
              <div style={S.section}>
                <p style={{margin:"0 0 0.75rem",fontWeight:600,fontSize:15,color:"#185FA5"}}>▶ En curso</p>
                {enCurso.length===0?<p style={{color:"#888",fontSize:14}}>Nada en ejecución.</p>:enCurso.map(t=>(
                  <div key={t.id} style={{padding:"8px 10px",background:"#fff",borderRadius:8,marginBottom:6,borderLeft:"4px solid #85B7EB"}}>
                    <p style={{margin:0,fontWeight:500,fontSize:14}}>{t.titulo}</p>
                    <p style={{margin:0,fontSize:12,color:"#888"}}>👤 {t.asignado} · 📅 {FMT_DATE(t.fecha)}</p>
                  </div>
                ))}
              </div>
              <div style={S.section}>
                <p style={{margin:"0 0 0.75rem",fontWeight:600,fontSize:15}}>📅 Próximos 7 días</p>
                {(()=>{
                  const fin=new Date();fin.setDate(fin.getDate()+7);
                  const finStr=fin.toISOString().slice(0,10);
                  const ts=tareasActivas.filter(t=>t.fecha>=TODAY&&t.fecha<=finStr);
                  if(!ts.length) return <p style={{color:"#888",fontSize:14}}>Sin tareas próximas.</p>;
                  return ts.map(t=>(
                    <div key={t.id} style={{padding:"8px 10px",background:t.origen==="reporte"?"#FFF3E0":"#fff",borderRadius:8,marginBottom:6,borderLeft:`4px solid ${t.origen==="reporte"?"#FFB74D":urgStyle(t.urgencia).border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <p style={{margin:0,fontWeight:500,fontSize:14}}>{t.titulo}</p>
                        {t.origen==="reporte"&&<span style={{fontSize:10,color:"#E65100",fontWeight:600}}>🔗</span>}
                      </div>
                      <p style={{margin:0,fontSize:12,color:"#888"}}>🏢 {t.edificio} · {FMT_DATE(t.fecha)}</p>
                    </div>
                  ));
                })()}
              </div>

              {/* Panel reportes migrados SOLO en dashboard */}
              {desdeLimpieza.length>0&&(
                <div style={{...S.section,gridColumn:"1/-1",border:"1.5px solid #FFB74D",background:"#FFFBF5"}}>
                  <p style={{margin:"0 0 0.75rem",fontWeight:600,fontSize:15,color:"#E65100"}}>🔗 Pendientes migrados de reportes ({desdeLimpieza.length})</p>
                  {desdeLimpieza.map(t=>(
                    <div key={t.id} style={{padding:"8px 10px",background:"#fff",borderRadius:8,marginBottom:6,borderLeft:"4px solid #FFB74D",display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                          <p style={{margin:0,fontWeight:500,fontSize:14}}>{t.titulo}</p>
                          <span style={S.tag(urgStyle(t.urgencia).bg,urgStyle(t.urgencia).text,urgStyle(t.urgencia).border)}>{t.urgencia}</span>
                        </div>
                        <p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>🏢 {t.edificio} · {t.depto} &nbsp;|&nbsp; 🔧 {t.tipo} &nbsp;|&nbsp; 📅 {FMT_DATE(t.fecha)}</p>
                      </div>
                      {t.fotoReporte&&<img src={t.fotoReporte} alt="foto" style={{width:56,height:56,objectFit:"cover",borderRadius:8,border:"1px solid #FFB74D",flexShrink:0,cursor:"zoom-in"}} onClick={()=>window.open(t.fotoReporte,"_blank")}/>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAREAS */}
        {tab==="tareas"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <p style={{margin:0,fontWeight:500,fontSize:16}}>Tareas activas ({tareasF.length})</p>
              <button onClick={()=>{setEditando(null);setShowForm(true);}} style={{...S.btn("#185FA5","#fff"),fontSize:15,padding:"9px 20px"}}>+ Nueva tarea</button>
            </div>
            <div style={{...S.section,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
              <p style={{margin:"0 0 0.75rem",fontSize:13,fontWeight:500,color:"#888"}}>FILTROS</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem"}}>
                {[
                  {key:"edificio",opts:["",...Object.keys(edificios)],ph:"Edificio"},
                  {key:"urgencia",opts:["",...URGENCIAS.map(u=>u.label)],ph:"Urgencia"},
                  {key:"estado",opts:["",...ESTADOS],ph:"Estado"},
                  {key:"tipo",opts:["",...tipos],ph:"Tipo"},
                ].map(({key,opts,ph})=>(
                  <select key={key} style={{...S.input,fontSize:13}} value={filtro[key]} onChange={e=>setFiltro(p=>({...p,[key]:e.target.value}))}>
                    <option value="">{ph} (todos)</option>
                    {opts.filter(Boolean).map(o=><option key={o}>{o}</option>)}
                  </select>
                ))}
              </div>
            </div>
            {tareasF.length===0?<p style={{textAlign:"center",color:"#888",marginTop:"2rem",fontSize:15}}>No hay tareas con esos filtros.</p>
              :tareasF.map(t=><TareaCard key={t.id} t={t} onEdit={tt=>{setEditando(tt);setShowForm(true);}} onEstado={cambiarEstado} onDelete={eliminarTarea} onComentario={guardarComentario}/>)}
          </div>
        )}

        {/* CALENDARIO */}
        {tab==="calendario"&&(
          <div style={S.section}>
            <Calendario tareas={tareas}/>
            <div style={{marginTop:"1.5rem",borderTop:"1px solid #ebe9e2",paddingTop:"1rem"}}>
              <p style={{margin:"0 0 0.5rem",fontSize:13,fontWeight:500,color:"#888"}}>REFERENCIA</p>
              <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
                {URGENCIAS.map(u=><span key={u.label} style={S.tag(u.bg,u.text,u.border)}>{u.label}</span>)}
                <span style={S.tag("#FFF3E0","#E65100","#FFB74D")}>🔗 Desde Reporte</span>
              </div>
            </div>
          </div>
        )}

        {/* MENSUAL */}
        {tab==="mensual"&&(
          <div>
            <div style={S.section}>
              <p style={{margin:"0 0 1rem",fontWeight:500,fontSize:15}}>Agregar tarea mensual recurrente</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:"0.75rem",alignItems:"end"}}>
                <div><label style={S.label}>Edificio</label>
                  <select style={S.input} value={mensualForm.ed} onChange={e=>setMensualForm(p=>({...p,ed:e.target.value,depto:""}))}>
                    {Object.keys(edificios).map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>Dpto / Sector</label>
                  <select style={S.input} value={mensualForm.depto} onChange={e=>setMensualForm(p=>({...p,depto:e.target.value}))}>
                    <option value="">— Seleccionar —</option>
                    {(edificios[mensualForm.ed]||[]).map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>Descripción</label>
                  <input style={S.input} value={mensualForm.texto} onChange={e=>setMensualForm(p=>({...p,texto:e.target.value}))} placeholder="Ej: Revisión matafuegos"/>
                </div>
                <button onClick={async()=>{
                  if(!mensualForm.depto||!mensualForm.texto.trim()) return;
                  const k=`${mensualForm.ed}-${mensualForm.depto}-${mesKey}`;
                  await saveMensual({...mensualTareas,[k]:[...(mensualTareas[k]||[]),{texto:mensualForm.texto,done:false}]});
                  setMensualForm(p=>({...p,texto:""}));
                }} style={{...S.btn("#185FA5","#fff"),padding:"9px 16px",whiteSpace:"nowrap"}}>+ Agregar</button>
              </div>
            </div>
            {Object.keys(edificios).map(ed=>(
              <div key={ed} style={S.section}>
                <p style={{margin:"0 0 1rem",fontWeight:500,fontSize:16}}>🏢 {ed} — {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</p>
                {(edificios[ed]||[]).map(d=>{
                  const k=`${ed}-${d}-${mesKey}`, items=mensualTareas[k]||[];
                  if(!items.length) return null;
                  const done=items.filter(i=>i.done).length;
                  return (
                    <div key={d} style={{...S.card,marginBottom:"0.75rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
                        <p style={{margin:0,fontWeight:500,fontSize:14}}>Dpto {d}</p>
                        <span style={S.tag(done===items.length?"#EAF3DE":"#F1EFE8",done===items.length?"#3B6D11":"#5F5E5A",done===items.length?"#97C459":"#B4B2A9")}>{done}/{items.length} completadas</span>
                      </div>
                      {items.map((item,i)=>(
                        <label key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,cursor:"pointer"}}>
                          <input type="checkbox" checked={item.done} onChange={async e=>{
                            await saveMensual({...mensualTareas,[k]:mensualTareas[k].map((x,j)=>j===i?{...x,done:e.target.checked}:x)});
                          }} style={{width:16,height:16}}/>
                          <span style={{fontSize:14,textDecoration:item.done?"line-through":"none",color:item.done?"#aaa":"#222"}}>{item.texto}</span>
                          <button onClick={async()=>await saveMensual({...mensualTareas,[k]:mensualTareas[k].filter((_,j)=>j!==i)})}
                            style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:16}}>✕</button>
                        </label>
                      ))}
                    </div>
                  );
                })}
                {!(edificios[ed]||[]).some(d=>mensualTareas[`${ed}-${d}-${mesKey}`]?.length)&&
                  <p style={{color:"#888",fontSize:14}}>Sin tareas mensuales este mes.</p>}
              </div>
            ))}
          </div>
        )}

        {/* EDIFICIOS — click en depto abre popup historial */}
        {tab==="edificios"&&(
          <div>
            {Object.keys(edificios).map(ed=>(
              <div key={ed} style={S.section}>
                <p style={{margin:"0 0 1rem",fontWeight:500,fontSize:16}}>🏢 {ed}</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:"0.6rem"}}>
                  {(edificios[ed]||[]).map(d=>{
                    const alerta=tareas.some(t=>t.edificio===ed&&t.depto===d&&t.huespedAlerta&&t.estado!=="Completada");
                    const ts=tareas.filter(t=>t.edificio===ed&&t.depto===d&&t.estado!=="Completada");
                    const urg=ts.some(t=>t.urgencia==="Urgente");
                    const desdeRep=ts.some(t=>t.origen==="reporte");
                    const histCount=tareas.filter(t=>t.edificio===ed&&t.depto===d&&t.estado==="Completada").length;
                    return (
                      <div key={d} onClick={()=>setDeptoModal({edificio:ed,depto:d})}
                        style={{background:alerta?"#FAECE7":urg?"#FCEBEB":desdeRep?"#FFF3E0":"#fff",
                          border:`1.5px solid ${alerta?"#F5C4B3":urg?"#F09595":desdeRep?"#FFB74D":"#dddbd3"}`,
                          borderRadius:10,padding:"0.75rem",textAlign:"center",cursor:"pointer",
                          transition:"transform 0.15s,box-shadow 0.15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.12)";}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}>
                        <p style={{margin:"0 0 4px",fontWeight:600,fontSize:15}}>{d}</p>
                        {alerta&&<p style={{margin:"0 0 2px",fontSize:11,color:"#993C1D"}}>⚠ Huésped</p>}
                        {desdeRep&&<p style={{margin:"0 0 2px",fontSize:11,color:"#E65100"}}>🔗 Reporte</p>}
                        {ts.length>0
                          ?<span style={S.tag(urg?"#FCEBEB":"#E6F1FB",urg?"#A32D2D":"#185FA5",urg?"#F09595":"#85B7EB")}>{ts.length} activa{ts.length>1?"s":""}</span>
                          :<span style={{fontSize:12,color:"#aaa"}}>Libre</span>}
                        {histCount>0&&<p style={{margin:"4px 0 0",fontSize:11,color:"#aaa"}}>📋 {histCount} completada{histCount>1?"s":""}</p>}
                        <p style={{margin:"4px 0 0",fontSize:11,color:"#185FA5",fontWeight:500}}>Ver historial →</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HISTORIAL */}
        {tab==="historial"&&(
          <div>
            <p style={{fontWeight:500,fontSize:16,marginBottom:"1rem"}}>Historial de tareas completadas ({tareasComp.length})</p>
            {tareasComp.length===0?<p style={{textAlign:"center",color:"#888",fontSize:15,marginTop:"2rem"}}>Aún no hay tareas completadas.</p>
              :tareasComp.map(t=><TareaCard key={t.id} t={t} onEdit={tt=>{setEditando(tt);setShowForm(true);}} onEstado={cambiarEstado} onDelete={eliminarTarea} onComentario={guardarComentario}/>)}
          </div>
        )}

        {/* CONFIG */}
        {tab==="config"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            <div style={S.section}>
              <p style={{margin:"0 0 1rem",fontWeight:500,fontSize:15}}>🏢 Edificios y departamentos</p>
              <div style={{background:"#E6F1FB",border:"1px solid #85B7EB",borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem"}}>
                <p style={{margin:"0 0 6px",fontSize:13,fontWeight:600,color:"#185FA5"}}>📂 Importar desde CSV</p>
                <p style={{margin:"0 0 8px",fontSize:12,color:"#555"}}>Columnas: <b>Edificio</b> y <b>Departamento</b></p>
                <input type="file" accept=".csv" onChange={async e=>{
                  const file=e.target.files[0]; if(!file) return;
                  const text=await file.text();
                  const lines=text.trim().split(/\r?\n/);
                  if(lines.length<2){showToast("CSV vacío","err");return;}
                  const delim=lines[0].includes(";")?";":",";
                  const headers=lines[0].split(delim).map(h=>h.trim().toLowerCase().replace(/"/g,""));
                  const iEd=headers.findIndex(h=>h.includes("edif")||h.includes("build")||h==="ed");
                  const iDep=headers.findIndex(h=>h.includes("dep")||h.includes("apt")||h.includes("unidad")||h.includes("unit")||h.includes("hab"));
                  if(iEd===-1||iDep===-1){showToast("No encontré columnas Edificio y Departamento","err");e.target.value="";return;}
                  const upd=JSON.parse(JSON.stringify(edificios));
                  let nuevos=0,duplicados=0;
                  lines.slice(1).forEach(line=>{
                    if(!line.trim()) return;
                    const cols=line.split(delim).map(c=>c.trim().replace(/"/g,""));
                    const ed=cols[iEd]?.trim().toUpperCase(), dep=cols[iDep]?.trim();
                    if(!ed||!dep) return;
                    if(!upd[ed]) upd[ed]=[];
                    if(upd[ed].includes(dep)){duplicados++;return;}
                    upd[ed].push(dep); nuevos++;
                  });
                  await saveEdificios(upd);
                  showToast(`✅ ${nuevos} deptos importados${duplicados>0?`, ${duplicados} duplicados omitidos`:""}`);
                  e.target.value="";
                }} style={{...S.input,padding:"6px",fontSize:13,cursor:"pointer"}}/>
              </div>
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.75rem"}}>
                <input style={{...S.input,flex:1}} placeholder="Nuevo edificio" value={newEdificio} onChange={e=>setNewEdificio(e.target.value)}/>
                <button onClick={async()=>{
                  if(!newEdificio.trim()) return;
                  const key=newEdificio.trim().toUpperCase();
                  if(edificios[key]){showToast("Ese edificio ya existe","err");return;}
                  await saveEdificios({...edificios,[key]:[]});setNewEdificio("");
                }} style={S.btn("#185FA5","#fff")}>+ Edificio</button>
              </div>
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem",flexWrap:"wrap"}}>
                <select style={{...S.input,width:"auto",flex:1}} value={newDepto.ed} onChange={e=>setNewDepto(p=>({...p,ed:e.target.value}))}>
                  {Object.keys(edificios).map(b=><option key={b}>{b}</option>)}
                </select>
                <input style={{...S.input,flex:2}} placeholder="Número o nombre del dpto" value={newDepto.nombre} onChange={e=>setNewDepto(p=>({...p,nombre:e.target.value}))}/>
                <button onClick={async()=>{
                  if(!newDepto.nombre.trim()) return;
                  const dep=newDepto.nombre.trim();
                  if((edificios[newDepto.ed]||[]).includes(dep)){showToast("Ese dpto ya existe","err");return;}
                  await saveEdificios({...edificios,[newDepto.ed]:[...(edificios[newDepto.ed]||[]),dep]});
                  setNewDepto(p=>({...p,nombre:""}));
                }} style={S.btn("#3B6D11","#fff")}>+ Dpto</button>
              </div>
              {Object.entries(edificios).map(([ed,ds])=>(
                <div key={ed} style={{marginBottom:"0.75rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <p style={{margin:0,fontWeight:600,fontSize:13,color:"#444"}}>{ed} <span style={{color:"#888",fontWeight:400}}>({ds.length} deptos)</span></p>
                    <button onClick={async()=>{
                      if(!window.confirm(`¿Eliminar edificio ${ed}?`)) return;
                      const upd={...edificios}; delete upd[ed]; await saveEdificios(upd);
                    }} style={{...S.btn("#FCEBEB","#A32D2D"),padding:"3px 8px",fontSize:11,border:"1px solid #F09595"}}>🗑️</button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {ds.map(d=>(
                      <span key={d} style={{...S.tag("#F1EFE8","#444","#B4B2A9"),display:"flex",alignItems:"center",gap:4}}>
                        {d}
                        <button onClick={async()=>await saveEdificios({...edificios,[ed]:edificios[ed].filter(x=>x!==d)})}
                          style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:12,padding:0}}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={S.section}>
              <p style={{margin:"0 0 1rem",fontWeight:500,fontSize:15}}>🔧 Tipos de tarea</p>
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem"}}>
                <input style={{...S.input,flex:1}} placeholder="Nuevo tipo" value={newTipo} onChange={e=>setNewTipo(e.target.value)}/>
                <button onClick={async()=>{if(!newTipo.trim()) return;await saveTipos([...tipos,newTipo.trim()]);setNewTipo("");}} style={S.btn("#534AB7","#fff")}>+ Agregar</button>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:"1.5rem"}}>
                {tipos.map(t=>(
                  <span key={t} style={{...S.tag("#EEEDFE","#534AB7","#AFA9EC"),display:"flex",alignItems:"center",gap:4}}>
                    {t}<button onClick={async()=>await saveTipos(tipos.filter(x=>x!==t))} style={{background:"none",border:"none",cursor:"pointer",color:"#534AB7",fontSize:12,padding:0}}>✕</button>
                  </span>
                ))}
              </div>
              <div style={{borderTop:"1px solid #ebe9e2",paddingTop:"1rem"}}>
                <p style={{margin:"0 0 0.75rem",fontWeight:500,fontSize:14}}>🔗 Estado de integraciones</p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{background:"#EAF3DE",border:"1px solid #97C459",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#3B6D11"}}>✅ Firebase AlmaDesk conectado</div>
                  <div style={{background:"#EAF3DE",border:"1px solid #97C459",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#3B6D11"}}>✅ App de Limpieza (solo lectura) conectada</div>
                  <div style={{background:"#E6F1FB",border:"1px solid #85B7EB",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#185FA5"}}>🔄 Polling de reportes: cada 60 segundos</div>
                  <div style={{background:"#FFF3E0",border:"1px solid #FFB74D",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#E65100",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>🔗 Reportes procesados: {procesadosIds.size}</span>
                    <button onClick={async()=>{
                      if(!window.confirm("¿Reprocesar todos los reportes? Solo se crearán tareas de los que aún no existan.")) return;
                      procesadosRef.current=new Set();
                      setProcesadosIds(new Set());
                      await almaSet("alma_procesados",[]);
                      showToast("✅ Listo, reprocesando...");
                      setTimeout(checkReportesLimpieza,2000);
                    }} style={{...S.btn("#E65100","#fff"),fontSize:11,padding:"4px 10px"}}>🔄 Reprocesar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm&&(
        <Modal onClose={()=>{setShowForm(false);setEditando(null);}} wide>
          <TareaForm tarea={editando} edificios={edificios} tipos={tipos} onSave={saveTarea} onClose={()=>{setShowForm(false);setEditando(null);}}/>
        </Modal>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";

// ── Constantes ────────────────────────────────────────────────────────────────
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
  {label:"Urgente", bg:"#FEE2E2", text:"#991B1B", border:"#FCA5A5", dot:"#EF4444"},
  {label:"Media",   bg:"#FEF3C7", text:"#92400E", border:"#FCD34D", dot:"#F59E0B"},
  {label:"Baja",    bg:"#D1FAE5", text:"#065F46", border:"#6EE7B7", dot:"#10B981"},
];
const TIPOS_INIT = ["Eléctrica","Sanitaria","Pintura","Obra mayor","Albañilería","Herrería","Gas","Limpieza","Cerrajería","General","Otro"];
const ESTADOS = ["Pendiente","Asignada","En curso","Pausada","Completada"];
const PERSONAL_INIT = ["Yo","Mantenimiento Alma Rentals","Obra"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

const TODAY = new Date().toISOString().slice(0,10);
const CURRENT_MONTH = TODAY.slice(0,7);

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = d => { if(!d) return "—"; const [y,m,dd]=d.split("-"); return `${dd}/${m}/${y}`; };
const sortDesc = arr => [...arr].sort((a,b) => (b.fechaCarga||b.fecha||"").localeCompare(a.fechaCarga||a.fecha||""));
const dedup = arr => { const s=new Set(); return arr.filter(t=>{ const k=String(t.id); if(s.has(k))return false; s.add(k); return true; }); };

const urgStyle = u => URGENCIAS.find(x=>x.label===u) || URGENCIAS[2];
const estColor = e => {
  if(e==="Completada") return {bg:"#D1FAE5",text:"#065F46",border:"#6EE7B7"};
  if(e==="En curso")   return {bg:"#DBEAFE",text:"#1E40AF",border:"#93C5FD"};
  if(e==="Pausada")    return {bg:"#FEF3C7",text:"#92400E",border:"#FCD34D"};
  if(e==="Asignada")   return {bg:"#EDE9FE",text:"#5B21B6",border:"#C4B5FD"};
  return {bg:"#F3F4F6",text:"#374151",border:"#D1D5DB"};
};

function getWeekDays(offset=0) {
  const now = new Date();
  const dow = now.getDay();
  const lunes = new Date(now);
  lunes.setDate(now.getDate() - (dow===0?6:dow-1) + offset*7);
  return Array.from({length:7},(_,i)=>{
    const d = new Date(lunes); d.setDate(lunes.getDate()+i);
    return d.toISOString().slice(0,10);
  });
}

function clasificarReporte(texto) {
  const t=(texto||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const noMante=["olvido","olvide","perdido","perdida","objeto","ropa","vajilla","vaso","vasos","taza","plato","cubierto","falta reponer","reponer","amenities","toalla falta","sabana","papel higienico","shampoo","jabon","sucio","sucia","limpieza","mancha","olor","basura","mugre"];
  const forzarMante=["flojo","floja","salido","salida","caido","caida","suelto","suelta","roto","rota","desprendido","desprendida","caída","aflojado","torcido","rajadura","grieta","quebrado","quebrada"];
  const esForzado = forzarMante.some(p=>t.includes(p));
  if(!esForzado) { for(const p of noMante) if(t.includes(p)) return {esMantenimiento:false}; }
  const checks=[
    {words:["sin luz","no hay luz","no anda la luz","disyuntor","tablero","tomacorriente","enchufe","lampara","electricidad","electrico","calefactor","aire acondicionado","no enfria","no calienta"],tipo:"Eléctrica",urgFn:w=>w==="sin luz"||w==="no hay luz"},
    {words:["sin agua","no sale agua","perdida de agua","inundacion","canilla","caño","pileta","inodoro","ducha","gotea","presion","desague","humedad","calefon","termotanque","baño"],tipo:"Sanitaria",urgFn:w=>w==="sin agua"||w==="no sale agua"||w==="inundacion"},
    {words:["olor a gas","escape de gas","gas","garrafa","hornalla","cocina no anda"],tipo:"Gas",urgFn:w=>w==="olor a gas"||w==="escape de gas"},
    {words:["caja fuerte","cerradura","no abre","no cierra","traba","cerrojo","puerta trabada","candado","pomo","llave"],tipo:"Cerrajería",urgFn:()=>false},
    {words:["caido","roto","rajado","rajadura","grieta","pared","techo","piso","baldosa","azulejo","estante","madera","bisagra","ventana rota","vidrio","persiana","espejo"],tipo:"Albañilería",urgFn:()=>false},
    {words:["reja","baranda","barandal","oxidado"],tipo:"Herrería",urgFn:()=>false},
    {words:["no funciona","no anda","no sirve","daño","dañado","falla","desprendido","caída","flojo","floja","salido","salida","caido","caida","suelto","suelta","roto","rota","quebrado"],tipo:"General",urgFn:()=>false},
  ];
  for(const {words,tipo,urgFn} of checks)
    for(const w of words)
      if(t.includes(w)) return {esMantenimiento:true,tipo,urgencia:urgFn(w)?"Urgente":"Media"};
  return {esMantenimiento:false};
}
const capitalizar = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : "";

// ── Firebase ──────────────────────────────────────────────────────────────────
let firebaseLoaded=false, dbAlma=null, dbLimp=null;
async function loadFirebase(){
  if(firebaseLoaded) return;
  const {initializeApp,getApps}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const fb=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const aApp=getApps().find(a=>a.name==="alma")||initializeApp(FIREBASE_CONFIG_ALMA,"alma");
  const lApp=getApps().find(a=>a.name==="limpieza")||initializeApp(FIREBASE_CONFIG_LIMPIEZA,"limpieza");
  dbAlma=fb.getFirestore(aApp); dbLimp=fb.getFirestore(lApp);
  window._fb=fb; firebaseLoaded=true;
}
async function aSet(k,v){const {doc,setDoc}=window._fb;await setDoc(doc(dbAlma,"alma",String(k)),{value:JSON.stringify(v)});}
async function aGet(k){const {doc,getDoc}=window._fb;const s=await getDoc(doc(dbAlma,"alma",String(k)));return s.exists()?JSON.parse(s.data().value):null;}
function aListen(k,cb){const {doc,onSnapshot}=window._fb;return onSnapshot(doc(dbAlma,"alma",String(k)),s=>{cb(s.exists()?JSON.parse(s.data().value):null);});}
async function lGet(k){const {doc,getDoc}=window._fb;const s=await getDoc(doc(dbLimp,"limpiezas",String(k)));return s.exists()?JSON.parse(s.data().value):null;}

function resizePhoto(file,cb){
  const r=new FileReader(); r.onload=ev=>{
    const img=new Image(); img.src=ev.target.result;
    img.onload=()=>{
      const MAX=800,c=document.createElement("canvas");
      let w=img.width,h=img.height;
      if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
      c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);
      cb(c.toDataURL("image/jpeg",0.72));
    };
  }; r.readAsDataURL(file);
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F8F7F4",
  card: "#FFFFFF",
  border: "#E5E3DC",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  text: "#111827",
  textMuted: "#6B7280",
  textLight: "#9CA3AF",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  success: "#059669",
  successLight: "#ECFDF5",
  warn: "#D97706",
  warnLight: "#FFFBEB",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
  shadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)",
  shadowLg: "0 10px 25px rgba(0,0,0,0.12)",
};

const inp = {width:"100%",boxSizing:"border-box",fontSize:14,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",color:C.text,outline:"none"};
const btn = (bg,col,bd)=>({background:bg||"#fff",color:col||C.text,border:`1.5px solid ${bd||bg||C.border}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:500,fontSize:14,display:"inline-flex",alignItems:"center",gap:6,transition:"opacity 0.15s"});
const pill = (bg,col,bd)=>({background:bg,color:col,border:`1px solid ${bd}`,borderRadius:20,fontSize:11,fontWeight:600,padding:"3px 10px",whiteSpace:"nowrap",display:"inline-block"});

// ── Componentes base ──────────────────────────────────────────────────────────
function Badge({label,bg,text,border}){
  return <span style={pill(bg,text,border)}>{label}</span>;
}

function Toast({msg,tipo}){
  return(
    <div style={{position:"fixed",top:16,right:16,zIndex:9999,background:tipo==="err"?"#DC2626":"#1D4ED8",color:"#fff",borderRadius:10,padding:"12px 20px",fontSize:14,fontWeight:600,boxShadow:C.shadowLg,maxWidth:380,display:"flex",alignItems:"center",gap:8}}>
      <span>{tipo==="err"?"⚠️":"✅"}</span>{msg}
    </div>
  );
}

function Modal({onClose,children,wide,title}){
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",backdropFilter:"blur(2px)"}}>
      <div style={{background:"#fff",borderRadius:20,padding:"0",width:"100%",maxWidth:wide?860:580,maxHeight:"92vh",overflowY:"auto",boxShadow:C.shadowLg}}>
        {title&&(
          <div style={{padding:"1.25rem 1.5rem",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1,borderRadius:"20px 20px 0 0"}}>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>{title}</h2>
            <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.textMuted,lineHeight:1,padding:"2px 6px",borderRadius:6}}>✕</button>
          </div>
        )}
        <div style={{padding:"1.5rem"}}>{children}</div>
      </div>
    </div>
  );
}

// ── Tarjeta de Tarea ──────────────────────────────────────────────────────────
function TareaCard({t, onEdit, onEstado, onDelete, onComentario, onIniciar, compact}){
  const [open, setOpen] = useState(false);
  const [com, setCom] = useState(t.comentario||"");
  const urg = urgStyle(t.urgencia);
  const est = estColor(t.estado);
  const foto = t.foto||t.fotoReporte||null;
  const esComp = t.estado==="Completada";

  return(
    <div style={{
      background:"#fff",
      border:`1px solid ${C.border}`,
      borderRadius:14,
      overflow:"hidden",
      marginBottom:10,
      boxShadow:C.shadow,
      borderLeft:`4px solid ${urg.dot}`,
      opacity: esComp ? 0.75 : 1,
    }}>
      {/* Header de la tarjeta */}
      <div style={{padding:"12px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            {/* Tags */}
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:7}}>
              <Badge label={t.urgencia} bg={urg.bg} text={urg.text} border={urg.border}/>
              <Badge label={t.estado} bg={est.bg} text={est.text} border={est.border}/>
              <Badge label={t.tipo} bg="#F3F4F6" text="#374151" border="#D1D5DB"/>
              {t.huespedAlerta && <Badge label="⚠ Huésped" bg="#FEF2F2" text="#991B1B" border="#FCA5A5"/>}
              {t.recurrente && <Badge label="🔁 Mensual" bg="#DBEAFE" text="#1E40AF" border="#93C5FD"/>}
              {t.origen==="reporte" && <Badge label="🔗 Reporte" bg="#FEF3C7" text="#92400E" border="#FCD34D"/>}
              {t.limpieza && <Badge label="🧹 Limpieza" bg="#EDE9FE" text="#5B21B6" border="#C4B5FD"/>}
              {t.fechaTrabajo && <Badge label={`📅 ${fmtDate(t.fechaTrabajo)}`} bg="#F5F3FF" text="#5B21B6" border="#C4B5FD"/>}
            </div>
            {/* Título */}
            <p style={{margin:"0 0 5px",fontWeight:700,fontSize:15,color:C.text,lineHeight:1.3,
              textDecoration: esComp ? "line-through" : "none"}}>{t.titulo}</p>
            {/* Info rápida */}
            <div style={{display:"flex",flexWrap:"wrap",gap:"10px 16px",fontSize:12,color:C.textMuted}}>
              <span>🏢 <strong style={{color:C.text}}>{t.edificio}</strong> · {t.depto||"—"}</span>
              <span>👤 <strong style={{color:C.text}}>{t.asignado}</strong></span>
              {t.fecha && <span>📅 {fmtDate(t.fecha)}{t.fechaFin?` → ${fmtDate(t.fechaFin)}`:""}</span>}
              {t.materiales && <span>🔧 {t.materiales}</span>}
            </div>
          </div>
          {/* Acciones */}
          <div style={{display:"flex",gap:5,flexShrink:0}}>
            <button onClick={()=>onEdit(t)} title="Editar" style={{...btn("#F3F4F6","#374151","#E5E7EB"),padding:"6px 10px",fontSize:13,borderRadius:7}}>✏️</button>
            <button onClick={()=>setOpen(!open)} title="Detalles" style={{...btn("#F3F4F6","#374151","#E5E7EB"),padding:"6px 10px",fontSize:13,borderRadius:7}}>{open?"▲":"▼"}</button>
            <button onClick={()=>onDelete(t.id)} title="Eliminar" style={{...btn(C.dangerLight,C.danger,"#FCA5A5"),padding:"6px 10px",fontSize:13,borderRadius:7}}>🗑</button>
          </div>
        </div>
        {foto && !open && (
          <img src={foto} alt="" style={{marginTop:8,height:50,width:80,objectFit:"cover",borderRadius:6,border:`1px solid ${C.border}`,cursor:"zoom-in"}} onClick={()=>window.open(foto,"_blank")}/>
        )}
      </div>

      {/* Panel expandible */}
      {open && (
        <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 16px",background:"#FAFAF9"}}>
          {t.descripcion && <p style={{fontSize:13,margin:"0 0 10px",color:C.textMuted,lineHeight:1.5}}>{t.descripcion}</p>}
          {foto && <img src={foto} alt="foto" style={{marginBottom:10,maxWidth:"100%",maxHeight:200,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}`,cursor:"zoom-in",display:"block"}} onClick={()=>window.open(foto,"_blank")}/>}

          {/* Comentario */}
          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:4}}>💬 Comentario interno</label>
            <textarea style={{...inp,resize:"vertical",fontSize:13,minHeight:56}} rows={2} value={com} onChange={e=>setCom(e.target.value)} placeholder="Notas internas..."/>
            <button onClick={()=>onComentario(t.id,com)} style={{...btn(C.blue,"#fff",C.blue),marginTop:5,padding:"5px 13px",fontSize:12}}>💾 Guardar nota</button>
          </div>

          {/* Acciones de estado */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {t.estado!=="En curso"&&t.estado!=="Completada"&&(
              <button onClick={()=>onIniciar(t)} style={btn("#1D4ED8","#fff","#1D4ED8")}>▶ Iniciar</button>
            )}
            {t.estado==="En curso"&&<>
              <button onClick={()=>onEstado(t.id,"Completada")} style={btn("#059669","#fff","#059669")}>✔ Completar</button>
              <button onClick={()=>onEstado(t.id,"Pausada")} style={btn(C.warnLight,C.warn,"#FCD34D")}>⏸ Pausar</button>
            </>}
            {t.estado==="Pausada"&&<button onClick={()=>onIniciar(t)} style={btn("#1D4ED8","#fff","#1D4ED8")}>▶ Reanudar</button>}
            {t.estado==="Completada"&&<button onClick={()=>onEstado(t.id,"Pendiente")} style={btn("#F3F4F6",C.text,C.border)}>↩ Reabrir</button>}
          </div>

          {/* Historial de la tarea */}
          {t.historial?.length>0 && (
            <div style={{background:"#F3F4F6",borderRadius:8,padding:"8px 12px"}}>
              <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Registro de cambios</p>
              {t.historial.map((h,i)=><p key={i} style={{margin:"2px 0",fontSize:11,color:C.textLight}}>• {h}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Formulario de tarea ───────────────────────────────────────────────────────
function TareaForm({tarea, edificios, tipos, personal, onSave, onClose}){
  const blank={titulo:"",edificio:"QDB",depto:"",tipo:"General",asignado:"Yo",urgencia:"Baja",
    estado:"Pendiente",fechaCarga:TODAY,fecha:"",fechaFin:"",descripcion:"",materiales:"",
    comentario:"",foto:null,limpieza:false,recurrente:false,huespedAlerta:false,historial:[]};
  const [f,setF]=useState(tarea?{...tarea,fechaCarga:tarea.fechaCarga||TODAY,fecha:tarea.fecha||""}:blank);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const deptos=edificios[f.edificio]||[];

  return(
    <div style={{display:"grid",gap:"1rem"}}>
      <div>
        <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Título *</label>
        <input style={inp} value={f.titulo} onChange={e=>set("titulo",e.target.value)} placeholder="Describí brevemente el trabajo a realizar"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem"}}>
        {[
          {lbl:"Edificio",k:"edificio",opts:Object.keys(edificios),onChange:e=>{set("edificio",e.target.value);set("depto","");}},
        ].map(({lbl,k,opts,onChange})=>(
          <div key={k}>
            <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>{lbl}</label>
            <select style={inp} value={f[k]} onChange={onChange||((e)=>set(k,e.target.value))}>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Dpto / Sector</label>
          <select style={inp} value={f.depto} onChange={e=>set("depto",e.target.value)}>
            <option value="">— Seleccionar —</option>
            {deptos.map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Tipo</label>
          <select style={inp} value={f.tipo} onChange={e=>set("tipo",e.target.value)}>
            {tipos.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem"}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Asignado a</label>
          <select style={inp} value={f.asignado} onChange={e=>set("asignado",e.target.value)}>
            {personal.map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Urgencia</label>
          <select style={inp} value={f.urgencia} onChange={e=>set("urgencia",e.target.value)}>
            {URGENCIAS.map(u=><option key={u.label}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Estado</label>
          <select style={inp} value={f.estado} onChange={e=>set("estado",e.target.value)}>
            {ESTADOS.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem"}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>📋 Fecha de carga</label>
          <input type="date" style={{...inp,background:"#F9FAFB",color:C.textMuted}} value={f.fechaCarga} readOnly/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>🔧 Inicio de tarea</label>
          <input type="date" style={inp} value={f.fecha} onChange={e=>set("fecha",e.target.value)}/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>✅ Fecha de fin</label>
          <input type="date" style={inp} value={f.fechaFin} onChange={e=>set("fechaFin",e.target.value)}/>
        </div>
      </div>
      <div>
        <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Materiales necesarios</label>
        <input style={inp} value={f.materiales} onChange={e=>set("materiales",e.target.value)} placeholder="Ej: pintura blanca 1L, sellador..."/>
      </div>
      <div>
        <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Descripción / Notas</label>
        <textarea style={{...inp,resize:"vertical"}} rows={3} value={f.descripcion} onChange={e=>set("descripcion",e.target.value)} placeholder="Detalles adicionales..."/>
      </div>
      <div>
        <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>📷 Foto de referencia</label>
        <input type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files[0];if(!f)return;resizePhoto(f,d=>set("foto",d));}} style={{...inp,padding:"7px",cursor:"pointer"}}/>
        {f.foto && (
          <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10}}>
            <img src={f.foto} alt="" style={{height:70,width:100,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}`}}/>
            <button onClick={()=>set("foto",null)} style={{...btn(C.dangerLight,C.danger,"#FCA5A5"),padding:"5px 12px",fontSize:12}}>✕ Quitar</button>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap",padding:"0.75rem 1rem",background:"#F9FAFB",borderRadius:10,border:`1px solid ${C.border}`}}>
        {[["limpieza","🧹 Requiere limpieza post-trabajo"],["recurrente","🔁 Tarea mensual"],["huespedAlerta","⚠️ Hay huésped en el depto"]].map(([k,lbl])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",fontWeight:500}}>
            <input type="checkbox" checked={!!f[k]} onChange={e=>set(k,e.target.checked)} style={{width:16,height:16,accentColor:C.blue}}/>{lbl}
          </label>
        ))}
      </div>
      <div style={{display:"flex",gap:"0.75rem",justifyContent:"flex-end",paddingTop:"0.5rem",borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn()}>Cancelar</button>
        <button onClick={()=>{if(!f.titulo.trim())return;onSave(f);onClose();}}
          style={{...btn(C.blue,"#fff",C.blue),padding:"10px 24px",fontSize:15,fontWeight:700}}>
          {tarea?"Guardar cambios":"✚ Crear tarea"}
        </button>
      </div>
    </div>
  );
}

// ── Modal Iniciar ─────────────────────────────────────────────────────────────
function ModalIniciar({tarea,onConfirm,onClose}){
  const [fecha,setFecha]=useState(tarea.fecha||TODAY);
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:3500,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#fff",borderRadius:16,padding:"1.5rem",width:"100%",maxWidth:360,boxShadow:C.shadowLg}}>
        <h3 style={{margin:"0 0 0.75rem",fontSize:16,fontWeight:700}}>▶ Iniciar tarea</h3>
        <p style={{margin:"0 0 0.75rem",fontSize:13,color:C.textMuted}}>"{tarea.titulo}"</p>
        <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Fecha de inicio</label>
        <input type="date" style={{...inp,marginBottom:"1rem"}} value={fecha} onChange={e=>setFecha(e.target.value)}/>
        <div style={{display:"flex",gap:"0.75rem",justifyContent:"flex-end"}}>
          <button onClick={onClose} style={btn()}>Cancelar</button>
          <button onClick={()=>{onConfirm(fecha);onClose();}} style={{...btn(C.blue,"#fff",C.blue),padding:"9px 22px"}}>▶ Iniciar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Depto ───────────────────────────────────────────────────────────────
function ModalDepto({edificio,depto,tareas,onClose}){
  const todas=tareas.filter(t=>t.edificio===edificio&&t.depto===depto);
  const activas=todas.filter(t=>t.estado!=="Completada");
  const comp=todas.filter(t=>t.estado==="Completada");
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",backdropFilter:"blur(2px)"}}>
      <div style={{background:"#1E293B",borderRadius:20,padding:"1.5rem",width:"100%",maxWidth:580,maxHeight:"88vh",overflowY:"auto",boxShadow:C.shadowLg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
          <div>
            <p style={{margin:0,fontSize:19,fontWeight:700,color:"#fff"}}>🏠 {edificio} · Dpto {depto}</p>
            <p style={{margin:"2px 0 0",fontSize:12,color:"#94A3B8"}}>{todas.length} registro{todas.length!==1?"s":""} totales</p>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,width:32,height:32,fontSize:16,cursor:"pointer",color:"#fff"}}>✕</button>
        </div>
        {activas.length>0&&(
          <div style={{marginBottom:"1.25rem"}}>
            <p style={{margin:"0 0 0.6rem",fontSize:11,fontWeight:700,color:"#FCA5A5",textTransform:"uppercase",letterSpacing:"0.06em"}}>🔴 Activas ({activas.length})</p>
            {activas.map(t=>{
              const urg=urgStyle(t.urgencia),est=estColor(t.estado);
              return(
                <div key={t.id} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",marginBottom:6,borderLeft:`3px solid ${urg.dot}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                    <p style={{margin:0,fontWeight:600,fontSize:14,color:"#fff"}}>{t.titulo}</p>
                    <div style={{display:"flex",gap:5}}>
                      <Badge label={t.urgencia} bg={urg.bg} text={urg.text} border={urg.border}/>
                      <Badge label={t.estado} bg={est.bg} text={est.text} border={est.border}/>
                    </div>
                  </div>
                  <p style={{margin:"4px 0 0",fontSize:11,color:"#94A3B8"}}>🔧 {t.tipo} · 📅 {fmtDate(t.fecha)} · 👤 {t.asignado}</p>
                </div>
              );
            })}
          </div>
        )}
        {comp.length>0&&(
          <div>
            <p style={{margin:"0 0 0.6rem",fontSize:11,fontWeight:700,color:"#6EE7B7",textTransform:"uppercase",letterSpacing:"0.06em"}}>✅ Historial ({comp.length})</p>
            {comp.map(t=>(
              <div key={t.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 12px",marginBottom:5,borderLeft:"3px solid #10B981"}}>
                <p style={{margin:0,fontWeight:500,fontSize:13,color:"#94A3B8",textDecoration:"line-through"}}>{t.titulo}</p>
                <p style={{margin:"3px 0 0",fontSize:11,color:"#64748B"}}>🔧 {t.tipo} · 📅 {fmtDate(t.fecha)}{t.fechaFin?` → ${fmtDate(t.fechaFin)}`:""}</p>
              </div>
            ))}
          </div>
        )}
        {todas.length===0&&<div style={{textAlign:"center",padding:"2.5rem 0",color:"#64748B"}}><p style={{fontSize:36}}>🏠</p><p>Sin registros</p></div>}
      </div>
    </div>
  );
}

// ── Vista Semanal ─────────────────────────────────────────────────────────────
function VistaSemanal({tareas, onMoverTarea, onEdit, onQuitarDia, onEstado, onIniciar}){
  const [weekOff, setWeekOff] = useState(0);
  const [dragging, setDragging] = useState(null);
  const [editInline, setEditInline] = useState(null);
  const weekDays = getWeekDays(weekOff);
  const rangoLabel = `${fmtDate(weekDays[0])} — ${fmtDate(weekDays[6])}`;

  function onDragStart(e,t){ setDragging(t); e.dataTransfer.effectAllowed="move"; }
  function onDrop(e,iso){ e.preventDefault(); if(!dragging)return; onMoverTarea(dragging.id,iso); setDragging(null); }
  function onDragOver(e){ e.preventDefault(); }

  // Mini card dentro del calendario
  function MiniCard({t}){
    const urg = urgStyle(t.urgencia);
    const est = estColor(t.estado);
    return(
      <div draggable onDragStart={e=>onDragStart(e,t)}
        style={{background:"#fff",border:`1px solid ${C.border}`,borderLeft:`3px solid ${urg.dot}`,borderRadius:8,padding:"6px 8px",marginBottom:4,cursor:"grab",fontSize:11}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:3}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:"0 0 1px",fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>{t.titulo}</p>
            <p style={{margin:0,color:C.textMuted,fontSize:10}}>{t.edificio}·{t.depto}</p>
            <span style={pill(est.bg,est.text,est.border)}>{t.estado}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
            <button onClick={e=>{e.stopPropagation();setEditInline(t);}} title="Editar" style={{background:C.blueLight,border:"none",borderRadius:4,width:18,height:18,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
            {t.estado==="En curso"&&<button onClick={e=>{e.stopPropagation();onEstado(t.id,"Completada");}} title="Completar" style={{background:C.successLight,border:"none",borderRadius:4,width:18,height:18,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✔</button>}
            {(t.estado==="Pendiente"||t.estado==="Asignada")&&<button onClick={e=>{e.stopPropagation();onIniciar(t);}} title="Iniciar" style={{background:C.blueLight,border:"none",borderRadius:4,width:18,height:18,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>▶</button>}
            {t.fechaTrabajo&&<button onClick={e=>{e.stopPropagation();onQuitarDia(t.id);}} title="Quitar día" style={{background:"#F3F4F6",border:"none",borderRadius:4,width:18,height:18,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>↩</button>}
          </div>
        </div>
      </div>
    );
  }

  function DiaCol({iso}){
    const esHoy=iso===TODAY;
    const ts=tareas.filter(t=>t.estado!=="Completada"&&t.fechaTrabajo===iso);
    const d=new Date(iso+"T12:00:00");
    return(
      <div onDragOver={onDragOver} onDrop={e=>onDrop(e,iso)}
        style={{minHeight:160,background:esHoy?"#EFF6FF":"#F9FAFB",border:`2px ${esHoy?"solid "+C.blue:"dashed #D1D5DB"}`,borderRadius:12,padding:"8px 6px",transition:"all 0.15s"}}>
        <div style={{textAlign:"center",marginBottom:8}}>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:esHoy?C.blue:C.textMuted,textTransform:"uppercase"}}>{DIAS[d.getDay()]}</p>
          <p style={{margin:0,fontSize:13,fontWeight:esHoy?700:400,color:esHoy?C.blue:C.text}}>{d.getDate()}</p>
        </div>
        {ts.map(t=><MiniCard key={t.id} t={t}/>)}
        {ts.length===0&&<p style={{fontSize:10,color:C.textLight,textAlign:"center",marginTop:8}}>Sin tareas</p>}
      </div>
    );
  }

  const sinDia=sortDesc(tareas.filter(t=>t.estado!=="Completada"&&!t.fechaTrabajo));

  return(
    <div>
      {editInline&&(
        <Modal onClose={()=>setEditInline(null)} title={`Editar: ${editInline.titulo}`} wide>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:"1rem"}}>
            {editInline.estado!=="En curso"&&editInline.estado!=="Completada"&&(
              <button onClick={()=>{onIniciar(editInline);setEditInline(null);}} style={btn("#1D4ED8","#fff","#1D4ED8")}>▶ Iniciar</button>
            )}
            {editInline.estado==="En curso"&&<>
              <button onClick={()=>{onEstado(editInline.id,"Completada");setEditInline(null);}} style={btn("#059669","#fff","#059669")}>✔ Completar</button>
              <button onClick={()=>{onEstado(editInline.id,"Pausada");setEditInline(null);}} style={btn(C.warnLight,C.warn,"#FCD34D")}>⏸ Pausar</button>
            </>}
            {editInline.estado==="Pausada"&&<button onClick={()=>{onIniciar(editInline);setEditInline(null);}} style={btn("#1D4ED8","#fff","#1D4ED8")}>▶ Reanudar</button>}
          </div>
          <p style={{margin:"0 0 0.5rem",fontSize:13,color:C.textMuted}}>Para editar todos los campos, usá el botón ✏️ en la solapa Tareas.</p>
        </Modal>
      )}
      {/* Controles semana */}
      <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1rem"}}>
        <button onClick={()=>setWeekOff(o=>o-1)} style={{...btn(),padding:"7px 14px"}}>◀</button>
        <div style={{flex:1,textAlign:"center"}}>
          <p style={{margin:0,fontWeight:700,fontSize:15,color:C.text}}>{rangoLabel}</p>
        </div>
        <button onClick={()=>setWeekOff(0)} style={{...btn(weekOff===0?C.blue:"#fff",weekOff===0?"#fff":C.text,weekOff===0?C.blue:C.border),padding:"7px 14px",fontSize:12}}>Hoy</button>
        <button onClick={()=>setWeekOff(o=>o+1)} style={{...btn(),padding:"7px 14px"}}>▶</button>
      </div>
      <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:10,padding:"8px 14px",marginBottom:"1rem",fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:6}}>
        💡 Arrastrá tarjetas al día deseado. Usá los botones ▶ ✔ ✏️ para gestionar desde acá.
      </div>
      {/* Grid semana */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,marginBottom:"1.5rem"}}>
        {weekDays.map(iso=><DiaCol key={iso} iso={iso}/>)}
      </div>

      {/* Sin día asignado */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:"1rem",boxShadow:C.shadow}}>
        <p style={{margin:"0 0 0.75rem",fontWeight:700,fontSize:14,color:C.text}}>📋 Sin día asignado ({sinDia.length})</p>
        {sinDia.length===0
          ? <p style={{fontSize:13,color:C.textMuted}}>¡Todas las tareas tienen día asignado! 👍</p>
          : <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {sinDia.map(t=>{
              const urg=urgStyle(t.urgencia);
              return(
                <div key={t.id} draggable onDragStart={e=>onDragStart(e,t)}
                  style={{background:"#fff",border:`1.5px solid ${urg.border}`,borderLeft:`4px solid ${urg.dot}`,borderRadius:10,padding:"8px 12px",cursor:"grab",minWidth:160,maxWidth:220,boxShadow:C.shadow}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:4,alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <Badge label={t.urgencia} bg={urg.bg} text={urg.text} border={urg.border}/>
                      <p style={{margin:"4px 0 2px",fontWeight:700,fontSize:12,color:C.text,lineHeight:1.3}}>{t.titulo}</p>
                      <p style={{margin:0,color:C.textMuted,fontSize:11}}>{t.edificio} · {t.depto}</p>
                    </div>
                    <button onClick={()=>setEditInline(t)} style={{background:"#F3F4F6",border:"none",borderRadius:5,width:20,height:20,fontSize:10,cursor:"pointer"}}>✏️</button>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    </div>
  );
}

// ── Preventivo ────────────────────────────────────────────────────────────────
function Preventivo({edificios, prevData, savePrevData, showToast, tareasCompletadas}){
  const [verHist,setVerHist]=useState(false);
  const [newTarea,setNewTarea]=useState("");
  const tareas   = prevData?.tareas   || [];
  const meses    = prevData?.meses    || {};
  const historial= prevData?.historial|| [];
  const celdas   = meses[CURRENT_MONTH] || {};
  const allDeptos = [];
  Object.entries(edificios).forEach(([ed,ds])=>ds.forEach(dep=>allDeptos.push({ed,dep})));
  const celKey=(ed,dep,tarea)=>`${ed}|${dep}|${tarea}`;

  // Auto-tildado: si hay una tarea completada de ese depto+tipo en el mes actual
  useEffect(()=>{
    if(!tareasCompletadas?.length||!tareas.length) return;
    let changed=false;
    const newCeldas={...celdas};
    for(const {ed,dep} of allDeptos){
      for(const tarea of tareas){
        const k=celKey(ed,dep,tarea);
        if(newCeldas[k]?.done) continue;
        // Buscar tarea completada de ese edificio+depto en el mes actual
        const match=tareasCompletadas.find(t=>
          t.edificio===ed && t.depto===dep && t.estado==="Completada" &&
          (t.fechaFin||t.fecha||"").startsWith(CURRENT_MONTH) &&
          (t.tipo===tarea||t.titulo?.toLowerCase().includes(tarea.toLowerCase()))
        );
        if(match){ newCeldas[k]={done:true,fecha:match.fechaFin||match.fecha||TODAY,autoTildado:true}; changed=true; }
      }
    }
    if(changed) savePrevData({...prevData,meses:{...meses,[CURRENT_MONTH]:newCeldas}});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tareasCompletadas]);

  function ultimaVez(ed,dep,tarea){
    const todos=Object.entries(meses).filter(([m])=>m!==CURRENT_MONTH).sort(([a],[b])=>b.localeCompare(a));
    const k=celKey(ed,dep,tarea);
    for(const [,cels] of todos){ if(cels[k]?.done&&cels[k]?.fecha) return cels[k].fecha; }
    return null;
  }
  async function toggleCelda(ed,dep,tarea){
    const k=celKey(ed,dep,tarea);
    const prev={...meses};
    if(!prev[CURRENT_MONTH]) prev[CURRENT_MONTH]={};
    if(prev[CURRENT_MONTH][k]?.done){delete prev[CURRENT_MONTH][k];await savePrevData({...prevData,meses:prev});return;}
    const ultima=ultimaVez(ed,dep,tarea);
    if(ultima){
      const dias=Math.floor((new Date(TODAY)-new Date(ultima))/86400000);
      if(dias<30){const ok=window.confirm(`⚠️ Ya se realizó el ${fmtDate(ultima)} (hace ${dias} días). ¿Marcar igual?`);if(!ok)return;}
    }
    prev[CURRENT_MONTH][k]={done:true,fecha:TODAY};
    await savePrevData({...prevData,meses:prev});
  }
  async function addTarea(){const t=newTarea.trim();if(!t||tareas.includes(t))return;await savePrevData({...prevData,tareas:[...tareas,t]});setNewTarea("");}
  async function cerrarMes(){
    const mesLabel=MONTHS[parseInt(CURRENT_MONTH.split("-")[1])-1]+" "+CURRENT_MONTH.split("-")[0];
    if(!window.confirm(`¿Cerrar ${mesLabel}?`))return;
    const snap={mes:CURRENT_MONTH,label:mesLabel,celdas:{...(meses[CURRENT_MONTH]||{})},tareas:[...tareas],deptos:allDeptos.map(({ed,dep})=>({ed,dep}))};
    const nm={...meses};delete nm[CURRENT_MONTH];
    await savePrevData({...prevData,historial:[...historial,snap],meses:nm});
    showToast("📋 Mes cerrado y archivado");
  }
  const total=allDeptos.length*tareas.length;
  const done=Object.values(celdas).filter(v=>v?.done).length;
  const pct=total>0?Math.round(done/total*100):0;
  const mesLabel=MONTHS[parseInt(CURRENT_MONTH.split("-")[1])-1]+" "+CURRENT_MONTH.split("-")[0];

  if(verHist) return(
    <div>
      <div style={{display:"flex",gap:"0.75rem",alignItems:"center",marginBottom:"1.25rem"}}>
        <button onClick={()=>setVerHist(false)} style={btn()}>← Volver</button>
        <p style={{margin:0,fontWeight:700,fontSize:16}}>📋 Historial preventivo</p>
      </div>
      {historial.length===0&&<p style={{color:C.textMuted,fontSize:14}}>Sin meses archivados aún.</p>}
      {[...historial].reverse().map((h,i)=>{
        const tot=(h.deptos||[]).length*(h.tareas||[]).length;
        const dn=Object.values(h.celdas||{}).filter(v=>v?.done).length;
        const p=tot>0?Math.round(dn/tot*100):0;
        return(
          <div key={i} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:"1rem 1.25rem",marginBottom:"0.75rem",boxShadow:C.shadow}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
              <p style={{margin:0,fontWeight:700,fontSize:15}}>{h.label}</p>
              <Badge label={`${p}% · ${dn}/${tot}`} bg={p===100?C.successLight:C.blueLight} text={p===100?C.success:C.blue} border={p===100?"#6EE7B7":"#93C5FD"}/>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"collapse",fontSize:11,minWidth:400}}>
                <thead><tr>
                  <th style={{padding:"5px 10px",background:"#F3F4F6",border:`1px solid ${C.border}`,textAlign:"left",fontWeight:700,color:C.textMuted,minWidth:120,position:"sticky",left:0}}>Depto</th>
                  {(h.tareas||[]).map(t=><th key={t} style={{padding:"5px 10px",background:"#F3F4F6",border:`1px solid ${C.border}`,fontWeight:700,color:C.textMuted,textAlign:"center",minWidth:90}}>{t}</th>)}
                </tr></thead>
                <tbody>
                  {(h.deptos||[]).map(({ed,dep},ri)=>(
                    <tr key={ri} style={{background:ri%2===0?"#fff":"#FAFAFA"}}>
                      <td style={{padding:"5px 10px",border:`1px solid ${C.border}`,fontWeight:600,color:C.text,position:"sticky",left:0,background:ri%2===0?"#fff":"#FAFAFA"}}>{ed}·{dep}</td>
                      {(h.tareas||[]).map(t=>{const v=h.celdas?.[`${ed}|${dep}|${t}`];return(<td key={t} style={{padding:"5px 8px",border:`1px solid ${C.border}`,textAlign:"center",background:v?.done?C.successLight:"#fff"}}>{v?.done?<span style={{color:C.success,fontSize:11}}>✓ {fmtDate(v.fecha)}</span>:<span style={{color:C.textLight}}>—</span>}</td>);})}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.75rem",marginBottom:"1.25rem"}}>
        <div>
          <p style={{margin:0,fontWeight:700,fontSize:18}}>🔧 Preventivo — {mesLabel}</p>
          <p style={{margin:"2px 0 0",fontSize:13,color:C.textMuted}}>{done} de {total} items completados · {pct}%</p>
        </div>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          <button onClick={()=>setVerHist(true)} style={btn()}>📋 Historial ({historial.length})</button>
          <button onClick={cerrarMes} style={btn(C.warnLight,C.warn,"#FCD34D")}>📦 Cerrar mes</button>
        </div>
      </div>
      {/* Barra de progreso */}
      <div style={{marginBottom:"1.25rem",background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",boxShadow:C.shadow}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:600,color:C.text}}>Progreso del mes</span>
          <span style={{fontSize:14,fontWeight:700,color:pct===100?C.success:C.blue}}>{pct}%</span>
        </div>
        <div style={{background:"#E5E7EB",borderRadius:99,height:12,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:pct===100?C.success:C.blue,borderRadius:99,transition:"width 0.5s"}}/>
        </div>
      </div>
      {/* Agregar tarea preventiva */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",marginBottom:"1.25rem",boxShadow:C.shadow}}>
        <p style={{margin:"0 0 0.75rem",fontWeight:600,fontSize:14}}>➕ Agregar tipo de tarea preventiva</p>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <input style={{...inp,flex:1}} placeholder="Ej: Revisión matafuegos, Limpieza tanque..." value={newTarea} onChange={e=>setNewTarea(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addTarea();}}/>
          <button onClick={addTarea} style={btn(C.blue,"#fff",C.blue)}>+ Agregar</button>
        </div>
        {tareas.length>0&&(
          <div style={{marginTop:"0.75rem",display:"flex",flexWrap:"wrap",gap:6}}>
            {tareas.map(t=>(
              <span key={t} style={{...pill(C.blueLight,C.blue,"#93C5FD"),display:"flex",alignItems:"center",gap:4}}>
                {t}<button onClick={async()=>{if(!window.confirm(`¿Eliminar "${t}"?`))return;const nm={};Object.entries(meses).forEach(([m,cels])=>{nm[m]={};Object.entries(cels).forEach(([k,v])=>{if(!k.endsWith(`|${t}`))nm[m][k]=v;});});await savePrevData({...prevData,tareas:tareas.filter(x=>x!==t),meses:nm});}} style={{background:"none",border:"none",cursor:"pointer",color:C.danger,fontSize:13,padding:0,lineHeight:1}}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>
      {tareas.length===0&&<div style={{textAlign:"center",padding:"3rem 0",color:C.textMuted}}><p style={{fontSize:40}}>📋</p><p>Agregá tipos de tarea arriba para armar la tabla mensual.</p></div>}
      {tareas.length>0&&(
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",boxShadow:C.shadow}}>
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"collapse",fontSize:12,width:"100%"}}>
              <thead>
                <tr>
                  <th style={{padding:"10px 14px",background:"#1E293B",border:`1px solid #334155`,textAlign:"left",fontWeight:700,color:"#94A3B8",minWidth:140,position:"sticky",left:0,zIndex:2}}>Depto</th>
                  {tareas.map(t=><th key={t} style={{padding:"10px 12px",background:"#1E293B",border:"1px solid #334155",fontWeight:700,color:"#fff",textAlign:"center",minWidth:100,fontSize:11}}>{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {allDeptos.map(({ed,dep},ri)=>(
                  <tr key={`${ed}-${dep}`} style={{background:ri%2===0?"#fff":"#F9FAFB"}}>
                    <td style={{padding:"8px 14px",border:`1px solid ${C.border}`,fontWeight:600,color:C.text,position:"sticky",left:0,zIndex:1,background:ri%2===0?"#fff":"#F9FAFB"}}>
                      <span style={{fontSize:10,color:C.textLight,fontWeight:400}}>{ed} · </span>{dep}
                    </td>
                    {tareas.map(tarea=>{
                      const k=celKey(ed,dep,tarea);
                      const val=celdas[k];
                      const isDone=val?.done;
                      return(
                        <td key={tarea} style={{padding:"6px 8px",border:`1px solid ${C.border}`,textAlign:"center",background:isDone?C.successLight:"#fff",cursor:"pointer",transition:"background 0.15s"}}
                          onClick={()=>toggleCelda(ed,dep,tarea)} title={isDone?`Realizado el ${fmtDate(val.fecha)}${val.autoTildado?" (auto)":""}`:""}>
                          {isDone
                            ?<div><div style={{color:C.success,fontWeight:800,fontSize:16}}>✓</div><div style={{fontSize:10,color:C.success}}>{fmtDate(val.fecha)}{val.autoTildado?" 🤖":""}</div></div>
                            :<div style={{width:22,height:22,border:`2px solid ${C.border}`,borderRadius:5,margin:"0 auto",background:"#F9FAFB"}}/>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Historial ─────────────────────────────────────────────────────────────────
function Historial({tareas, edificios, onEdit, onEstado, onDelete, onComentario, onIniciar}){
  const [filtro, setFiltro] = useState({edificio:"",depto:"",tipo:"",mes:""});
  const [expanded, setExpanded] = useState({});

  const completadas = tareas.filter(t=>t.estado==="Completada");

  // Filtrar
  const filtradas = completadas.filter(t=>{
    if(filtro.edificio && t.edificio!==filtro.edificio) return false;
    if(filtro.depto && t.depto!==filtro.depto) return false;
    if(filtro.tipo && t.tipo!==filtro.tipo) return false;
    if(filtro.mes && !(t.fechaFin||t.fecha||"").startsWith(filtro.mes)) return false;
    return true;
  });

  // Agrupar por mes
  const porMes = {};
  filtradas.forEach(t=>{
    const d = t.fechaFin||t.fechaCarga||t.fecha||TODAY;
    const mes = d.slice(0,7);
    if(!porMes[mes]) porMes[mes]=[];
    porMes[mes].push(t);
  });
  const mesesOrdenados = Object.keys(porMes).sort((a,b)=>b.localeCompare(a));

  const deptosParaFiltro = filtro.edificio ? (edificios[filtro.edificio]||[]) : [];

  // Meses únicos presentes
  const mesesDisponibles = [...new Set(completadas.map(t=>(t.fechaFin||t.fechaCarga||t.fecha||"").slice(0,7)).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
  const tiposDisponibles = [...new Set(completadas.map(t=>t.tipo).filter(Boolean))];

  const mesLabel = m => {
    const [y,mo] = m.split("-");
    return `${MONTHS[parseInt(mo)-1]} ${y}`;
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
        <p style={{margin:0,fontWeight:700,fontSize:16}}>📋 Historial — {completadas.length} tareas completadas</p>
      </div>

      {/* Filtros */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",marginBottom:"1rem",boxShadow:C.shadow}}>
        <p style={{margin:"0 0 0.6rem",fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Filtrar historial</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem"}}>
          <select style={{...inp,fontSize:13}} value={filtro.edificio} onChange={e=>setFiltro(p=>({...p,edificio:e.target.value,depto:""}))}>
            <option value="">Edificio (todos)</option>
            {Object.keys(edificios).map(o=><option key={o}>{o}</option>)}
          </select>
          <select style={{...inp,fontSize:13}} value={filtro.depto} onChange={e=>setFiltro(p=>({...p,depto:e.target.value}))} disabled={!filtro.edificio}>
            <option value="">Depto (todos)</option>
            {deptosParaFiltro.map(o=><option key={o}>{o}</option>)}
          </select>
          <select style={{...inp,fontSize:13}} value={filtro.mes} onChange={e=>setFiltro(p=>({...p,mes:e.target.value}))}>
            <option value="">Mes (todos)</option>
            {mesesDisponibles.map(m=><option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
          <select style={{...inp,fontSize:13}} value={filtro.tipo} onChange={e=>setFiltro(p=>({...p,tipo:e.target.value}))}>
            <option value="">Tipo (todos)</option>
            {tiposDisponibles.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        {(filtro.edificio||filtro.depto||filtro.mes||filtro.tipo)&&(
          <button onClick={()=>setFiltro({edificio:"",depto:"",tipo:"",mes:""})} style={{...btn(),marginTop:"0.5rem",fontSize:12,padding:"5px 12px",color:C.danger,borderColor:"#FCA5A5"}}>✕ Limpiar filtros</button>
        )}
      </div>

      {filtradas.length===0
        ? <div style={{textAlign:"center",padding:"3rem",color:C.textMuted}}><p style={{fontSize:40}}>📭</p><p>No hay tareas completadas con esos filtros.</p></div>
        : mesesOrdenados.map(mes=>{
          const ts=porMes[mes];
          const isOpen=expanded[mes]!==false; // default abierto
          return(
            <div key={mes} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,marginBottom:"0.75rem",overflow:"hidden",boxShadow:C.shadow}}>
              <div onClick={()=>setExpanded(p=>({...p,[mes]:!isOpen}))}
                style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:isOpen?"#F0FDF4":"#fff",borderBottom:isOpen?`1px solid ${C.border}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>📅</span>
                  <div>
                    <p style={{margin:0,fontWeight:700,fontSize:15,color:C.text}}>{mesLabel(mes)}</p>
                    <p style={{margin:0,fontSize:12,color:C.textMuted}}>{ts.length} tarea{ts.length!==1?"s":""} completada{ts.length!==1?"s":""}</p>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Badge label={`${ts.length} completadas`} bg={C.successLight} text={C.success} border="#6EE7B7"/>
                  <span style={{color:C.textMuted,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                </div>
              </div>
              {isOpen&&(
                <div style={{padding:"0.75rem"}}>
                  {ts.map(t=><TareaCard key={t.id} t={t} onEdit={onEdit} onEstado={onEstado} onDelete={onDelete} onComentario={onComentario} onIniciar={onIniciar}/>)}
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}

// ── App Principal ─────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [tareas,setTareasState]=useState([]);
  const [edificios,setEdificiosState]=useState(EDIFICIOS_INIT);
  const [tipos,setTiposState]=useState(TIPOS_INIT);
  const [personal,setPersonalState]=useState(PERSONAL_INIT);
  const [prevData,setPrevDataState]=useState({tareas:[],meses:{},historial:[]});
  const [showForm,setShowForm]=useState(false);
  const [editando,setEditando]=useState(null);
  const [filtro,setFiltro]=useState({edificio:"",depto:"",urgencia:"",estado:"",tipo:"",asignado:""});
  const [newEdificio,setNewEdificio]=useState("");
  const [newDepto,setNewDepto]=useState({ed:"QDB",nombre:""});
  const [newTipo,setNewTipo]=useState("");
  const [newPersonal,setNewPersonal]=useState("");
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [procesadosIds,setProcesadosIds]=useState(new Set());
  const [deptoModal,setDeptoModal]=useState(null);
  const [iniciarModal,setIniciarModal]=useState(null);

  const nextId=useRef(Date.now());
  const unsubs=useRef([]);
  const procesadosRef=useRef(new Set());

  const showToast=(msg,tipo="ok")=>{setToast({msg,tipo});setTimeout(()=>setToast(null),4000);};

  const saveTareas=useCallback(async v=>{
    const d=dedup(v);
    setTareasState(d);
    try{await aSet("alma_tasks",d);}catch(e){console.error(e);}
  },[]);
  const saveEdificios=useCallback(async v=>{setEdificiosState(v);try{await aSet("alma_edificios",v);}catch(e){console.error(e);};},[]);
  const saveTipos=useCallback(async v=>{setTiposState(v);try{await aSet("alma_tipos",v);}catch(e){console.error(e);};},[]);
  const savePersonal=useCallback(async v=>{setPersonalState(v);try{await aSet("alma_personal",v);}catch(e){console.error(e);};},[]);
  const savePrevData=useCallback(async v=>{setPrevDataState(v);try{await aSet("alma_preventivo",v);}catch(e){console.error(e);};},[]);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try{
        await loadFirebase();
        const [t,e,ti,pv,proc,pers]=await Promise.all([
          aGet("alma_tasks"),aGet("alma_edificios"),aGet("alma_tipos"),
          aGet("alma_preventivo"),aGet("alma_procesados"),aGet("alma_personal"),
        ]);
        if(!mounted)return;
        if(t)setTareasState(dedup(t));
        if(e)setEdificiosState(e);
        if(ti)setTiposState(ti);
        if(pv)setPrevDataState(pv);
        if(proc){procesadosRef.current=new Set(proc);setProcesadosIds(new Set(proc));}
        if(pers)setPersonalState(pers);

        const u1=aListen("alma_tasks",d=>{if(mounted&&d)setTareasState(dedup(d));});
        const u2=aListen("alma_preventivo",d=>{if(mounted&&d)setPrevDataState(d);});
        unsubs.current.push(u1,u2);
        setLoading(false);
        checkReportes();
        const iv=setInterval(checkReportes,60000);
        unsubs.current.push(()=>clearInterval(iv));
      }catch(err){console.error(err);if(mounted)setLoading(false);}
    })();
    return()=>{mounted=false;unsubs.current.forEach(u=>typeof u==="function"&&u());};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const checkReportes=useCallback(async()=>{
    try{
      const reps=await lGet("lim_reports");
      if(!reps||!Array.isArray(reps))return;
      const nuevos=reps.filter(r=>r.comentario?.trim()&&!procesadosRef.current.has(String(r.id)));
      if(!nuevos.length)return;
      let tareasAct=await aGet("alma_tasks")||[];
      tareasAct=dedup(tareasAct);
      for(const rep of nuevos){
        if(procesadosRef.current.has(String(rep.id)))continue;
        procesadosRef.current.add(String(rep.id));
        await aSet("alma_procesados",Array.from(procesadosRef.current));
        setProcesadosIds(new Set(procesadosRef.current));
        const res=clasificarReporte(rep.comentario);
        if(!res.esMantenimiento)continue;
        // Anti-duplicado: mismo reporteId
        if(tareasAct.some(t=>String(t.reporteId)===String(rep.id)))continue;
        let ed="",dep="";
        const m=(rep.depto||"").trim().match(/^(QDB|H475|qdb|h475)\s*(.+)$/i);
        if(m){ed=m[1].toUpperCase();dep=m[2].trim();}else{ed="H475";dep=(rep.depto||"").trim();}
        const titulo=capitalizar(rep.comentario.slice(0,60));
        // Anti-duplicado: mismo título+edificio+depto activo
        if(tareasAct.some(t=>t.titulo===titulo&&t.edificio===ed&&t.depto===dep&&t.estado!=="Completada"))continue;
        const nt={
          id:Date.now()+Math.random(),
          titulo,edificio:ed,depto:dep,tipo:res.tipo||"General",
          asignado:"Yo",urgencia:res.urgencia||"Media",estado:"Pendiente",
          fechaCarga:rep.fecha||TODAY,fecha:rep.fecha||TODAY,fechaFin:"",
          descripcion:`Reportado por: ${rep.asignado||"Personal"}`,
          materiales:"",comentario:"",
          limpieza:false,recurrente:false,huespedAlerta:false,
          historial:[`Migrada automáticamente el ${new Date().toLocaleDateString("es-AR")}`],
          origen:"reporte",reporteId:rep.id,fotoReporte:rep.foto||null,foto:null,
        };
        tareasAct=[...tareasAct,nt];
        showToast(`🔗 Nueva tarea: ${nt.titulo}`);
      }
      const final=dedup(tareasAct);
      await aSet("alma_tasks",final);
      setTareasState(final);
    }catch(e){console.error(e);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const enviarLimpieza=useCallback(async tarea=>{
    if(!tarea.limpieza||!tarea.fechaFin)return;
    try{
      const lt=await lGet("lim_tasks")||[];
      if(lt.some(t=>t._almaId===tarea.id))return;
      const n={id:Date.now(),_almaId:tarea.id,depto:`${tarea.edificio} ${tarea.depto}`,fecha:tarea.fechaFin,tipo:"Otro",descripcion:`🔧 Post-mantenimiento: ${tarea.titulo}`,comentario:"Limpieza tras mantenimiento",asignado:"",completado:false,ingresos:[],minutosOtro:null,libre:false};
      const {doc,setDoc}=window._fb;
      await setDoc(doc(dbLimp,"limpiezas","lim_tasks"),{value:JSON.stringify([...lt,n])});
      showToast("🧹 Tarea de limpieza enviada");
    }catch(e){console.error(e);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const saveTarea=useCallback(async f=>{
    const hoy=new Date().toLocaleDateString("es-AR");
    let lista;
    if(editando){
      lista=tareas.map(t=>{
        if(t.id!==editando.id)return t;
        return {...f,id:t.id,origen:t.origen,fotoReporte:t.fotoReporte,reporteId:t.reporteId,fechaCarga:t.fechaCarga||TODAY,historial:[...(t.historial||[]),`Editada el ${hoy}`]};
      });
    }else{
      // Anti-duplicado manual
      const isDup=tareas.some(t=>t.titulo.trim()===f.titulo.trim()&&t.edificio===f.edificio&&t.depto===f.depto&&t.estado!=="Completada");
      if(isDup){showToast("⚠️ Ya existe una tarea igual para ese depto","err");return;}
      const nt={...f,id:nextId.current++,fechaCarga:TODAY,historial:[`Creada el ${hoy}`]};
      lista=[...tareas,nt];
    }
    await saveTareas(lista);setEditando(null);
  },[editando,tareas,saveTareas,showToast]);

  const cambiarEstado=useCallback(async(id,nuevoEstado,fechaInicio)=>{
    const lista=tareas.map(t=>{
      if(t.id!==id)return t;
      const h=[...(t.historial||[]),`${new Date().toLocaleDateString("es-AR")} → ${nuevoEstado}`];
      const upd={...t,estado:nuevoEstado,historial:h};
      if(fechaInicio)upd.fecha=fechaInicio;
      if(nuevoEstado==="Completada"){
        upd.fechaFin=upd.fechaFin||TODAY;
        if(t.limpieza)enviarLimpieza(upd);
      }
      return upd;
    });
    await saveTareas(lista);
  },[tareas,saveTareas,enviarLimpieza]);

  const confirmarIniciar=useCallback(async(tarea,fechaInicio)=>{
    await cambiarEstado(tarea.id,"En curso",fechaInicio);
  },[cambiarEstado]);

  const eliminarTarea=useCallback(async id=>{
    if(!window.confirm("¿Eliminar esta tarea?"))return;
    await saveTareas(tareas.filter(t=>t.id!==id));
  },[tareas,saveTareas]);

  const guardarComentario=useCallback(async(id,comentario)=>{
    await saveTareas(tareas.map(t=>t.id===id?{...t,comentario}:t));
    showToast("💬 Comentario guardado");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tareas,saveTareas]);

  const moverTarea=useCallback(async(id,fechaTrabajo)=>{
    const lista=tareas.map(t=>{
      if(t.id!==id)return t;
      const nuevoEstado=t.estado==="Pendiente"?"Asignada":t.estado;
      return {...t,fechaTrabajo,estado:nuevoEstado,historial:[...(t.historial||[]),`Asignada al ${fmtDate(fechaTrabajo)}`]};
    });
    await saveTareas(lista);
  },[tareas,saveTareas]);

  const quitarDia=useCallback(async id=>{
    const lista=tareas.map(t=>{
      if(t.id!==id)return t;
      const {fechaTrabajo:_,...rest}=t;
      return {...rest,estado:t.estado==="Asignada"?"Pendiente":t.estado};
    });
    await saveTareas(lista);
  },[tareas,saveTareas]);

  // Derived
  const activas = sortDesc(dedup(tareas.filter(t=>t.estado!=="Completada")));
  const completadas = sortDesc(dedup(tareas.filter(t=>t.estado==="Completada")));
  const urgentes = activas.filter(t=>t.urgencia==="Urgente");
  const enCurso  = activas.filter(t=>t.estado==="En curso");
  const huesped  = activas.filter(t=>t.huespedAlerta);

  // Filtro tareas
  const tareasF=sortDesc(dedup(tareas.filter(t=>{
    if(t.estado==="Completada")return false;
    if(filtro.edificio&&t.edificio!==filtro.edificio)return false;
    if(filtro.depto&&t.depto!==filtro.depto)return false;
    if(filtro.urgencia&&t.urgencia!==filtro.urgencia)return false;
    if(filtro.tipo&&t.tipo!==filtro.tipo)return false;
    if(filtro.asignado&&t.asignado!==filtro.asignado)return false;
    if(filtro.estado){
      if(filtro.estado==="Pendiente")return t.estado==="Pendiente"||!t.estado;
      return t.estado===filtro.estado;
    }
    return true;
  })));

  const deptosParaFiltro=filtro.edificio?(edificios[filtro.edificio]||[]):[];

  // Próximos 7 días (solo activas, NO completadas)
  const proximos7 = (() => {
    const fin=new Date(); fin.setDate(fin.getDate()+7);
    const finStr=fin.toISOString().slice(0,10);
    return sortDesc(activas.filter(t=>t.fecha>=TODAY&&t.fecha<=finStr));
  })();

  const TABS=[
    {id:"dashboard",icon:"🏠",label:"Inicio"},
    {id:"tareas",icon:"✅",label:"Tareas"},
    {id:"semanal",icon:"📆",label:"Organización"},
    {id:"preventivo",icon:"🔧",label:"Preventivo"},
    {id:"edificios",icon:"🏢",label:"Edificios"},
    {id:"historial",icon:"📋",label:"Historial"},
    {id:"config",icon:"⚙️",label:"Config"},
  ];

  if(loading)return(
    <div style={{fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg}}>
      <div style={{fontSize:52,marginBottom:16}}>🔧</div>
      <p style={{fontSize:20,fontWeight:800,color:C.blue,margin:"0 0 4px"}}>AlmaDesk</p>
      <p style={{color:C.textMuted,fontSize:14,margin:0}}>Conectando a Firebase...</p>
      <div style={{width:36,height:36,border:"4px solid #DBEAFE",borderTop:"4px solid "+C.blue,borderRadius:"50%",animation:"spin 1s linear infinite",marginTop:24}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",maxWidth:1020,margin:"0 auto",paddingBottom:"3rem",background:C.bg,minHeight:"100vh"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      {toast&&<Toast msg={toast.msg} tipo={toast.tipo}/>}
      {deptoModal&&<ModalDepto edificio={deptoModal.edificio} depto={deptoModal.depto} tareas={tareas} onClose={()=>setDeptoModal(null)}/>}
      {iniciarModal&&<ModalIniciar tarea={iniciarModal} onConfirm={fecha=>confirmarIniciar(iniciarModal,fecha)} onClose={()=>setIniciarModal(null)}/>}
      {showForm&&(
        <Modal onClose={()=>{setShowForm(false);setEditando(null);}} wide title={editando?"Editar tarea":"Nueva tarea"}>
          <TareaForm tarea={editando} edificios={edificios} tipos={tipos} personal={personal}
            onSave={saveTarea} onClose={()=>{setShowForm(false);setEditando(null);}}/>
        </Modal>
      )}

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#1E3A8A,#2563EB)",padding:"1.25rem 1.5rem",borderRadius:"0 0 20px 20px",marginBottom:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
          <div>
            <p style={{margin:0,fontWeight:800,fontSize:22,color:"#fff",letterSpacing:"-0.5px"}}>🔧 AlmaDesk</p>
            <p style={{margin:"2px 0 0",fontSize:12,color:"rgba(255,255,255,0.7)"}}>
              {new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </p>
          </div>
          <div style={{display:"flex",gap:"1.25rem",textAlign:"center"}}>
            {[
              {label:"Urgentes",val:urgentes.length,col:"#FCA5A5"},
              {label:"En curso",val:enCurso.length,col:"#93C5FD"},
              {label:"Pendientes",val:tareas.filter(t=>t.estado==="Pendiente").length,col:"#FCD34D"},
              {label:"Completadas",val:completadas.length,col:"#6EE7B7"},
            ].map(c=>(
              <div key={c.label}>
                <p style={{margin:0,fontSize:24,fontWeight:800,color:c.col}}>{c.val}</p>
                <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.7)"}}>{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,padding:"0 1rem",marginBottom:"1rem",flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 16px",borderRadius:24,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s",
              background:tab===t.id?C.blue:"#fff",color:tab===t.id?"#fff":C.text,
              border:tab===t.id?"none":`1px solid ${C.border}`,
              boxShadow:tab===t.id?"0 2px 8px rgba(37,99,235,0.3)":C.shadow}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"0 1rem"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1rem"}}>
              {[
                {label:"Pendientes",val:tareas.filter(t=>t.estado==="Pendiente").length,bg:"#F9FAFB",text:C.text,border:C.border,icon:"🕐"},
                {label:"En curso",val:enCurso.length,bg:C.blueLight,text:C.blue,border:"#93C5FD",icon:"▶"},
                {label:"Urgentes",val:urgentes.length,bg:"#FEF2F2",text:C.danger,border:"#FCA5A5",icon:"🔴"},
                {label:"Completadas",val:completadas.length,bg:C.successLight,text:C.success,border:"#6EE7B7",icon:"✅"},
              ].map(c=>(
                <div key={c.label} style={{background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:14,padding:"1.25rem",textAlign:"center",boxShadow:C.shadow}}>
                  <p style={{margin:"0 0 4px",fontSize:24}}>{c.icon}</p>
                  <p style={{margin:"0 0 3px",fontSize:28,fontWeight:800,color:c.text}}>{c.val}</p>
                  <p style={{margin:0,fontSize:12,color:c.text,fontWeight:500,opacity:0.8}}>{c.label}</p>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
              {/* Urgentes */}
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:"1rem",boxShadow:C.shadow}}>
                <p style={{margin:"0 0 0.75rem",fontWeight:700,fontSize:14,color:C.danger,display:"flex",alignItems:"center",gap:6}}><span>🔴</span> Urgentes activas</p>
                {urgentes.length===0
                  ? <p style={{color:C.textMuted,fontSize:13}}>Sin urgencias activas ✓</p>
                  : urgentes.map(t=>(
                    <div key={t.id} style={{padding:"8px 10px",background:"#FEF2F2",borderRadius:10,marginBottom:6,borderLeft:`3px solid ${C.danger}`}}>
                      <p style={{margin:"0 0 2px",fontWeight:700,fontSize:13,color:C.text}}>{t.titulo}</p>
                      <p style={{margin:0,fontSize:11,color:C.textMuted}}>🏢 {t.edificio}·{t.depto} · 👤 {t.asignado}</p>
                    </div>
                  ))
                }
              </div>
              {/* Con huésped */}
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:"1rem",boxShadow:C.shadow}}>
                <p style={{margin:"0 0 0.75rem",fontWeight:700,fontSize:14,color:C.warn,display:"flex",alignItems:"center",gap:6}}><span>⚠️</span> Con huésped</p>
                {huesped.length===0
                  ? <p style={{color:C.textMuted,fontSize:13}}>Sin alertas de huésped ✓</p>
                  : huesped.map(t=>(
                    <div key={t.id} style={{padding:"8px 10px",background:C.warnLight,borderRadius:10,marginBottom:6,borderLeft:`3px solid ${C.warn}`}}>
                      <p style={{margin:"0 0 2px",fontWeight:700,fontSize:13,color:C.text}}>{t.titulo}</p>
                      <p style={{margin:0,fontSize:11,color:C.textMuted}}>🏢 {t.edificio}·{t.depto}</p>
                    </div>
                  ))
                }
              </div>
              {/* En curso */}
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:"1rem",boxShadow:C.shadow}}>
                <p style={{margin:"0 0 0.75rem",fontWeight:700,fontSize:14,color:C.blue,display:"flex",alignItems:"center",gap:6}}><span>▶</span> En ejecución</p>
                {enCurso.length===0
                  ? <p style={{color:C.textMuted,fontSize:13}}>Nada en ejecución actualmente.</p>
                  : enCurso.map(t=>(
                    <div key={t.id} style={{padding:"8px 10px",background:C.blueLight,borderRadius:10,marginBottom:6,borderLeft:`3px solid ${C.blue}`}}>
                      <p style={{margin:"0 0 2px",fontWeight:700,fontSize:13,color:C.text}}>{t.titulo}</p>
                      <p style={{margin:0,fontSize:11,color:C.textMuted}}>👤 {t.asignado} · 📅 {fmtDate(t.fecha)}</p>
                    </div>
                  ))
                }
              </div>
              {/* Próximos 7 días — SOLO activas */}
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:"1rem",boxShadow:C.shadow}}>
                <p style={{margin:"0 0 0.75rem",fontWeight:700,fontSize:14,color:C.text,display:"flex",alignItems:"center",gap:6}}><span>📅</span> Próximos 7 días</p>
                {proximos7.length===0
                  ? <p style={{color:C.textMuted,fontSize:13}}>Sin tareas programadas próximamente.</p>
                  : proximos7.map(t=>(
                    <div key={t.id} style={{padding:"8px 10px",background:"#F9FAFB",borderRadius:10,marginBottom:6,borderLeft:`3px solid ${urgStyle(t.urgencia).dot}`}}>
                      <p style={{margin:"0 0 2px",fontWeight:700,fontSize:13,color:C.text}}>{t.titulo}</p>
                      <p style={{margin:0,fontSize:11,color:C.textMuted}}>🏢 {t.edificio}·{t.depto} · 📅 {fmtDate(t.fecha)}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ── TAREAS ── */}
        {tab==="tareas"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <p style={{margin:0,fontWeight:700,fontSize:16}}>Tareas activas <span style={{color:C.textMuted,fontWeight:400}}>({tareasF.length})</span></p>
              <button onClick={()=>{setEditando(null);setShowForm(true);}} style={{...btn(C.blue,"#fff",C.blue),fontWeight:700,padding:"10px 20px"}}>✚ Nueva tarea</button>
            </div>
            {/* Filtros */}
            <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",marginBottom:"1rem",boxShadow:C.shadow}}>
              <p style={{margin:"0 0 0.6rem",fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Filtros</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.6rem",marginBottom:"0.5rem"}}>
                <select style={{...inp,fontSize:13}} value={filtro.edificio} onChange={e=>setFiltro(p=>({...p,edificio:e.target.value,depto:""}))}>
                  <option value="">Edificio (todos)</option>
                  {Object.keys(edificios).map(o=><option key={o}>{o}</option>)}
                </select>
                <select style={{...inp,fontSize:13}} value={filtro.depto} onChange={e=>setFiltro(p=>({...p,depto:e.target.value}))} disabled={!filtro.edificio}>
                  <option value="">Dpto (todos)</option>
                  {deptosParaFiltro.map(o=><option key={o}>{o}</option>)}
                </select>
                <select style={{...inp,fontSize:13}} value={filtro.estado} onChange={e=>setFiltro(p=>({...p,estado:e.target.value}))}>
                  <option value="">Estado (todos)</option>
                  {["Pendiente","Asignada","En curso","Pausada"].map(o=><option key={o}>{o}</option>)}
                </select>
                <select style={{...inp,fontSize:13}} value={filtro.urgencia} onChange={e=>setFiltro(p=>({...p,urgencia:e.target.value}))}>
                  <option value="">Urgencia (todos)</option>
                  {URGENCIAS.map(u=><option key={u.label}>{u.label}</option>)}
                </select>
                <select style={{...inp,fontSize:13}} value={filtro.tipo} onChange={e=>setFiltro(p=>({...p,tipo:e.target.value}))}>
                  <option value="">Tipo (todos)</option>
                  {tipos.map(o=><option key={o}>{o}</option>)}
                </select>
                <select style={{...inp,fontSize:13}} value={filtro.asignado} onChange={e=>setFiltro(p=>({...p,asignado:e.target.value}))}>
                  <option value="">Asignado (todos)</option>
                  {personal.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              {Object.values(filtro).some(Boolean)&&(
                <button onClick={()=>setFiltro({edificio:"",depto:"",urgencia:"",estado:"",tipo:"",asignado:""})}
                  style={{...btn(),fontSize:12,padding:"5px 12px",color:C.danger,borderColor:"#FCA5A5"}}>✕ Limpiar filtros</button>
              )}
            </div>
            {tareasF.length===0
              ? <div style={{textAlign:"center",padding:"3rem",color:C.textMuted}}><p style={{fontSize:40}}>✅</p><p>No hay tareas con esos filtros.</p></div>
              : tareasF.map(t=><TareaCard key={t.id} t={t}
                  onEdit={tt=>{setEditando(tt);setShowForm(true);}}
                  onEstado={cambiarEstado} onDelete={eliminarTarea}
                  onComentario={guardarComentario} onIniciar={tt=>setIniciarModal(tt)}/>)
            }
          </div>
        )}

        {/* ── ORGANIZACIÓN ── */}
        {tab==="semanal"&&(
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"1.25rem",boxShadow:C.shadow}}>
            <VistaSemanal tareas={activas} onMoverTarea={moverTarea}
              onEdit={tt=>{setEditando(tt);setShowForm(true);}}
              onQuitarDia={quitarDia} onEstado={cambiarEstado}
              onIniciar={tt=>setIniciarModal(tt)}/>
          </div>
        )}

        {/* ── PREVENTIVO ── */}
        {tab==="preventivo"&&(
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"1.25rem",boxShadow:C.shadow}}>
            <Preventivo edificios={edificios} prevData={prevData} savePrevData={savePrevData} showToast={showToast} tareasCompletadas={completadas}/>
          </div>
        )}

        {/* ── EDIFICIOS ── */}
        {tab==="edificios"&&(
          <div>
            {Object.entries(edificios).map(([ed,ds])=>(
              <div key={ed} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"1.25rem",marginBottom:"0.75rem",boxShadow:C.shadow}}>
                <p style={{margin:"0 0 1rem",fontWeight:700,fontSize:16}}>🏢 {ed} <span style={{color:C.textMuted,fontWeight:400,fontSize:13}}>({ds.length} deptos)</span></p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"0.5rem"}}>
                  {ds.map(d=>{
                    const alerta=tareas.some(t=>t.edificio===ed&&t.depto===d&&t.huespedAlerta&&t.estado!=="Completada");
                    const ts=tareas.filter(t=>t.edificio===ed&&t.depto===d&&t.estado!=="Completada");
                    const urg=ts.some(t=>t.urgencia==="Urgente");
                    const desdeRep=ts.some(t=>t.origen==="reporte");
                    const histCount=tareas.filter(t=>t.edificio===ed&&t.depto===d&&t.estado==="Completada").length;
                    return(
                      <div key={d} onClick={()=>setDeptoModal({edificio:ed,depto:d})}
                        style={{background:urg?"#FEF2F2":alerta?"#FEF3C7":desdeRep?"#FFFBEB":"#F9FAFB",
                          border:`1.5px solid ${urg?"#FCA5A5":alerta?"#FCD34D":desdeRep?"#FCD34D":C.border}`,
                          borderRadius:12,padding:"0.75rem",textAlign:"center",cursor:"pointer",transition:"all 0.15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=C.shadowMd;}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                        <p style={{margin:"0 0 3px",fontWeight:700,fontSize:14,color:C.text}}>{d}</p>
                        {urg&&<p style={{margin:"0 0 2px",fontSize:10,color:C.danger,fontWeight:600}}>🔴 URGENTE</p>}
                        {alerta&&<p style={{margin:"0 0 2px",fontSize:10,color:C.warn,fontWeight:600}}>⚠ Huésped</p>}
                        {desdeRep&&<p style={{margin:"0 0 2px",fontSize:10,color:C.warn,fontWeight:600}}>🔗 Reporte</p>}
                        {ts.length>0
                          ? <Badge label={`${ts.length} activa${ts.length>1?"s":""}`} bg={urg?"#FEE2E2":C.blueLight} text={urg?C.danger:C.blue} border={urg?"#FCA5A5":"#93C5FD"}/>
                          : <span style={{fontSize:11,color:C.success,fontWeight:600}}>✓ Libre</span>
                        }
                        {histCount>0&&<p style={{margin:"4px 0 0",fontSize:10,color:C.textLight}}>📋 {histCount} completada{histCount>1?"s":""}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab==="historial"&&(
          <Historial tareas={tareas} edificios={edificios}
            onEdit={tt=>{setEditando(tt);setShowForm(true);}}
            onEstado={cambiarEstado} onDelete={eliminarTarea}
            onComentario={guardarComentario} onIniciar={tt=>setIniciarModal(tt)}/>
        )}

        {/* ── CONFIG ── */}
        {tab==="config"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            {/* Edificios */}
            <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"1.25rem",boxShadow:C.shadow}}>
              <p style={{margin:"0 0 1rem",fontWeight:700,fontSize:15}}>🏢 Edificios y departamentos</p>
              {/* Import CSV */}
              <div style={{background:C.blueLight,border:`1px solid #93C5FD`,borderRadius:10,padding:"0.75rem",marginBottom:"1rem"}}>
                <p style={{margin:"0 0 4px",fontSize:12,fontWeight:700,color:C.blue}}>📂 Importar desde CSV</p>
                <p style={{margin:"0 0 6px",fontSize:11,color:C.textMuted}}>Columnas: <b>Edificio</b> y <b>Departamento</b></p>
                <input type="file" accept=".csv" onChange={async e=>{
                  const file=e.target.files[0];if(!file)return;
                  const text=await file.text();
                  const lines=text.trim().split(/\r?\n/);
                  if(lines.length<2){showToast("CSV vacío","err");return;}
                  const delim=lines[0].includes(";")?";":",";
                  const headers=lines[0].split(delim).map(h=>h.trim().toLowerCase().replace(/"/g,""));
                  const iEd=headers.findIndex(h=>h.includes("edif")||h==="ed");
                  const iDep=headers.findIndex(h=>h.includes("dep")||h.includes("apt")||h.includes("unidad")||h.includes("unit")||h.includes("hab"));
                  if(iEd===-1||iDep===-1){showToast("No encontré columnas Edificio y Departamento","err");e.target.value="";return;}
                  const upd=JSON.parse(JSON.stringify(edificios));
                  let nuevos=0,dup=0;
                  lines.slice(1).forEach(line=>{
                    if(!line.trim())return;
                    const cols=line.split(delim).map(c=>c.trim().replace(/"/g,""));
                    const ed=cols[iEd]?.trim().toUpperCase(),dep=cols[iDep]?.trim();
                    if(!ed||!dep)return;
                    if(!upd[ed])upd[ed]=[];
                    if(upd[ed].includes(dep)){dup++;return;}
                    upd[ed].push(dep);nuevos++;
                  });
                  await saveEdificios(upd);
                  showToast(`✅ ${nuevos} deptos importados${dup>0?`, ${dup} omitidos`:""}`);
                  e.target.value="";
                }} style={{...inp,padding:"5px",fontSize:12,cursor:"pointer"}}/>
              </div>
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.6rem"}}>
                <input style={{...inp,flex:1,fontSize:13}} placeholder="Nuevo edificio (ej: MAD)" value={newEdificio} onChange={e=>setNewEdificio(e.target.value)}/>
                <button onClick={async()=>{
                  if(!newEdificio.trim())return;
                  const k=newEdificio.trim().toUpperCase();
                  if(edificios[k]){showToast("Ya existe","err");return;}
                  await saveEdificios({...edificios,[k]:[]});setNewEdificio("");
                }} style={btn(C.blue,"#fff",C.blue)}>+ Edificio</button>
              </div>
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem",flexWrap:"wrap"}}>
                <select style={{...inp,width:"auto",flex:"0 0 auto",fontSize:13}} value={newDepto.ed} onChange={e=>setNewDepto(p=>({...p,ed:e.target.value}))}>
                  {Object.keys(edificios).map(b=><option key={b}>{b}</option>)}
                </select>
                <input style={{...inp,flex:1,fontSize:13}} placeholder="Número o nombre del dpto" value={newDepto.nombre} onChange={e=>setNewDepto(p=>({...p,nombre:e.target.value}))}/>
                <button onClick={async()=>{
                  if(!newDepto.nombre.trim())return;
                  const dep=newDepto.nombre.trim();
                  if((edificios[newDepto.ed]||[]).includes(dep)){showToast("Ya existe","err");return;}
                  await saveEdificios({...edificios,[newDepto.ed]:[...(edificios[newDepto.ed]||[]),dep]});
                  setNewDepto(p=>({...p,nombre:""}));
                }} style={btn(C.success,"#fff",C.success)}>+ Dpto</button>
              </div>
              {Object.entries(edificios).map(([ed,ds])=>(
                <div key={ed} style={{marginBottom:"0.75rem",background:"#F9FAFB",borderRadius:10,padding:"0.75rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <p style={{margin:0,fontWeight:700,fontSize:13}}>{ed} <span style={{color:C.textMuted,fontWeight:400}}>({ds.length})</span></p>
                    <button onClick={async()=>{if(!window.confirm(`¿Eliminar ${ed}?`))return;const u={...edificios};delete u[ed];await saveEdificios(u);}} style={{...btn("#FEF2F2",C.danger,"#FCA5A5"),padding:"3px 8px",fontSize:11}}>🗑️</button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {ds.map(d=>(
                      <span key={d} style={{...pill("#F3F4F6",C.text,C.border),display:"flex",alignItems:"center",gap:4,fontSize:12}}>
                        {d}<button onClick={async()=>await saveEdificios({...edificios,[ed]:edificios[ed].filter(x=>x!==d)})} style={{background:"none",border:"none",cursor:"pointer",color:C.danger,fontSize:11,padding:0,lineHeight:1}}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {/* Tipos */}
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"1.25rem",boxShadow:C.shadow}}>
                <p style={{margin:"0 0 0.75rem",fontWeight:700,fontSize:15}}>🔧 Tipos de tarea</p>
                <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.75rem"}}>
                  <input style={{...inp,flex:1,fontSize:13}} placeholder="Nuevo tipo..." value={newTipo} onChange={e=>setNewTipo(e.target.value)}/>
                  <button onClick={async()=>{if(!newTipo.trim())return;await saveTipos([...tipos,newTipo.trim()]);setNewTipo("");}} style={btn(C.purple,"#fff",C.purple)}>+ Agregar</button>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {tipos.map(t=>(
                    <span key={t} style={{...pill(C.purpleLight,C.purple,"#C4B5FD"),display:"flex",alignItems:"center",gap:4,fontSize:12}}>
                      {t}<button onClick={async()=>await saveTipos(tipos.filter(x=>x!==t))} style={{background:"none",border:"none",cursor:"pointer",color:C.danger,fontSize:11,padding:0}}>✕</button>
                    </span>
                  ))}
                </div>
              </div>
              {/* Personal */}
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"1.25rem",boxShadow:C.shadow}}>
                <p style={{margin:"0 0 0.75rem",fontWeight:700,fontSize:15}}>👤 Personal / Asignados</p>
                <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.75rem"}}>
                  <input style={{...inp,flex:1,fontSize:13}} placeholder="Nombre o rol..." value={newPersonal} onChange={e=>setNewPersonal(e.target.value)}/>
                  <button onClick={async()=>{const n=newPersonal.trim();if(!n||personal.includes(n))return;await savePersonal([...personal,n]);setNewPersonal("");}} style={btn(C.blue,"#fff",C.blue)}>+ Agregar</button>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {personal.map(p=>(
                    <span key={p} style={{...pill(C.blueLight,C.blue,"#93C5FD"),display:"flex",alignItems:"center",gap:4,fontSize:12}}>
                      {p}<button onClick={async()=>{if(!window.confirm(`¿Eliminar a "${p}"?`))return;await savePersonal(personal.filter(x=>x!==p));}} style={{background:"none",border:"none",cursor:"pointer",color:C.danger,fontSize:11,padding:0}}>✕</button>
                    </span>
                  ))}
                </div>
              </div>
              {/* Integraciones */}
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"1.25rem",boxShadow:C.shadow}}>
                <p style={{margin:"0 0 0.75rem",fontWeight:700,fontSize:15}}>🔗 Integraciones</p>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[
                    {bg:C.successLight,text:C.success,border:"#6EE7B7",label:"✅ Firebase AlmaDesk conectado"},
                    {bg:C.successLight,text:C.success,border:"#6EE7B7",label:"✅ App Limpieza (lectura) conectada"},
                    {bg:C.blueLight,text:C.blue,border:"#93C5FD",label:"🔄 Sincronización: cada 60 segundos"},
                  ].map((s,i)=>(
                    <div key={i} style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:s.text,fontWeight:500}}>{s.label}</div>
                  ))}
                  <div style={{background:C.warnLight,border:`1px solid #FCD34D`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.warn,fontWeight:500,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>🔗 Reportes procesados: {procesadosIds.size}</span>
                    <button onClick={async()=>{
                      if(!window.confirm("¿Reprocesar reportes? Solo crea tareas nuevas."))return;
                      procesadosRef.current=new Set();setProcesadosIds(new Set());
                      await aSet("alma_procesados",[]);
                      showToast("🔄 Reprocesando...");
                      setTimeout(checkReportes,2000);
                    }} style={{...btn(C.warnLight,C.warn,"#FCD34D"),fontSize:11,padding:"4px 10px"}}>🔄 Reprocesar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

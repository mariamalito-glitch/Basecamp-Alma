// ── AlmaDesk · versión actualizada ────────────────────────────────────────────
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
  {label:"Urgente",bg:"#FCEBEB",text:"#A32D2D",border:"#F09595"},
  {label:"Media",  bg:"#FAEEDA",text:"#854F0B",border:"#EF9F27"},
  {label:"Baja",   bg:"#EAF3DE",text:"#3B6D11",border:"#97C459"},
];
const TIPOS_INIT = ["Eléctrica","Sanitaria","Pintura","Obra mayor","Albañilería","Herrería","Gas","Limpieza","Cerrajería","General","Otro"];
// Estados ahora incluye "Asignada"
const ESTADOS = ["Pendiente","Asignada","En curso","Pausada","Completada"];
const PERSONAL_INIT = ["Yo","Mantenimiento Alma Rentals","Obra"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_CORTO = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

const FMT_DATE = d => { if(!d) return "—"; const [y,m,dd]=d.split("-"); return `${dd}/${m}/${y}`; };
const TODAY = new Date().toISOString().slice(0,10);
const CURRENT_MONTH = TODAY.slice(0,7);

const S = {
  card:    {background:"#fff",border:"1px solid #e2e0d8",borderRadius:14,padding:"1rem 1.25rem",marginBottom:"1rem"},
  section: {background:"#f7f6f2",border:"1px solid #ebe9e2",borderRadius:16,padding:"1.5rem",marginBottom:"1.25rem"},
  label:   {fontSize:12,color:"#888",marginBottom:4,display:"block",fontWeight:500,textTransform:"uppercase",letterSpacing:"0.04em"},
  input:   {width:"100%",boxSizing:"border-box",fontSize:14,padding:"8px 10px",borderRadius:8,border:"1px solid #dddbd3",background:"#fff",color:"#222"},
  btn:     (bg,col)=>({background:bg||"#fff",color:col||"#333",border:`1px solid ${bg||"#dddbd3"}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:500,fontSize:14,display:"inline-flex",alignItems:"center",gap:6}),
  tag:     (bg,col,border)=>({background:bg,color:col,border:`1px solid ${border}`,borderRadius:20,fontSize:12,fontWeight:500,padding:"2px 10px",whiteSpace:"nowrap"}),
};

const urgStyle = u => URGENCIAS.find(x=>x.label===u)||URGENCIAS[2];
const estStyle = e => {
  if(e==="Completada") return {bg:"#EAF3DE",text:"#3B6D11",border:"#97C459"};
  if(e==="En curso")   return {bg:"#E6F1FB",text:"#185FA5",border:"#85B7EB"};
  if(e==="Pausada")    return {bg:"#FAEEDA",text:"#854F0B",border:"#EF9F27"};
  if(e==="Asignada")   return {bg:"#F3E8FF",text:"#6B21A8",border:"#C084FC"};
  return {bg:"#F1EFE8",text:"#5F5E5A",border:"#B4B2A9"};
};
const sortDesc = arr => [...arr].sort((a,b)=>{
  const fa=a.fechaCarga||a.fecha||"";
  const fb=b.fechaCarga||b.fecha||"";
  return fb.localeCompare(fa);
});

// Deduplicar tareas por id
const deduplicar = arr => {
  const seen = new Set();
  return arr.filter(t => {
    const k = String(t.id);
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

function clasificarReporte(texto) {
  const t=(texto||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const noMante=["olvido","olvide","perdido","perdida","objeto","ropa","vajilla","vaso","vasos","taza","plato","cubierto","falta reponer","reponer","amenities","toalla falta","sabana","papel higienico","shampoo","jabon","sucio","sucia","limpieza","mancha","olor","basura","mugre"];
  // Si hay palabras de mantenimiento estructural, no las filtramos aunque suenen a limpieza
  const forzarMante=["flojo","floja","salido","salida","caido","caida","suelto","suelta","roto","rota","desprendido","desprendida","caída","aflojado","torcido","rajadura","grieta","quebrado","quebrada"];
  const esForzado = forzarMante.some(p=>t.includes(p));
  if(!esForzado) {
  for(const p of noMante) if(t.includes(p)) return {esMantenimiento:false};
  }
  const checks=[
    {words:["sin luz","no hay luz","no anda la luz","disyuntor","tablero","tomacorriente","enchufe","lampara","electricidad","electrico","calefactor","aire acondicionado","no enfria","no calienta"],tipo:"Eléctrica",urgFn:w=>w==="sin luz"||w==="no hay luz"},
    {words:["sin agua","no sale agua","perdida de agua","inundacion","canilla","caño","pileta","inodoro","ducha","gotea","presion","desague","humedad","calefon","termotanque","baño"],tipo:"Sanitaria",urgFn:w=>w==="sin agua"||w==="no sale agua"||w==="inundacion"},
    {words:["olor a gas","escape de gas","gas","garrafa","hornalla","cocina no anda"],tipo:"Gas",urgFn:w=>w==="olor a gas"||w==="escape de gas"},
    {words:["caja fuerte","cerradura","no abre","no cierra","traba","cerrojo","puerta trabada","candado","pomo","llave"],tipo:"Cerrajería",urgFn:()=>false},
    {words:["caido","roto","rajado","rajadura","grieta","pared","techo","piso","baldosa","azulejo","estante","madera","bisagra","ventana rota","vidrio","persiana","espejo"],tipo:"Albañilería",urgFn:()=>false},
    {words:["reja","baranda","barandal","oxidado"],tipo:"Herrería",urgFn:()=>false},
    {words:["no funciona","no anda","no sirve","daño","dañado","falla","desprendido","caída","flojo","floja","salido","salida","caido","caída","caida","suelto","suelta","roto","rota","quebrado","quebrada","desprendido","desprendida","aflojado","torcido"],tipo:"General",urgFn:()=>false},
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
  const r=new FileReader();
  r.onload=ev=>{
    const img=new Image(); img.src=ev.target.result;
    img.onload=()=>{
      const MAX=800,c=document.createElement("canvas");
      let w=img.width,h=img.height;
      if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
      c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);
      cb(c.toDataURL("image/jpeg",0.72));
    };
  };
  r.readAsDataURL(file);
}

function getWeekDays(baseDate,offset){
  const d=new Date(baseDate+"T12:00:00");
  const dow=d.getDay();
  const lunes=new Date(d); lunes.setDate(d.getDate()-(dow===0?6:dow-1)+(offset*7));
  return Array.from({length:7},(_,i)=>{
    const x=new Date(lunes); x.setDate(lunes.getDate()+i);
    return x.toISOString().slice(0,10);
  });
}

function Modal({onClose,children,wide}){
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(10,10,20,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#fff",borderRadius:18,padding:"2rem",width:"100%",maxWidth:wide?820:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 12px 48px rgba(0,0,0,0.25)"}}>
        {children}
      </div>
    </div>
  );
}

// Modal para elegir fecha de inicio al comenzar tarea
function ModalIniciarFecha({tarea, onConfirm, onClose}){
  const [fecha, setFecha] = useState(tarea.fecha || TODAY);
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(10,10,20,0.65)",zIndex:3500,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#fff",borderRadius:18,padding:"2rem",width:"100%",maxWidth:380,boxShadow:"0 12px 48px rgba(0,0,0,0.25)"}}>
        <h3 style={{margin:"0 0 1rem",fontSize:16,fontWeight:600}}>▶ Iniciar tarea</h3>
        <p style={{margin:"0 0 0.75rem",fontSize:14,color:"#555"}}>¿Desde qué fecha comienza el trabajo?</p>
        <label style={S.label}>Fecha de inicio</label>
        <input type="date" style={{...S.input,marginBottom:"1.25rem"}} value={fecha} onChange={e=>setFecha(e.target.value)}/>
        <div style={{display:"flex",gap:"0.75rem",justifyContent:"flex-end"}}>
          <button onClick={onClose} style={S.btn()}>Cancelar</button>
          <button onClick={()=>{onConfirm(fecha);onClose();}} style={{...S.btn("#185FA5","#fff"),padding:"9px 22px"}}>▶ Iniciar</button>
        </div>
      </div>
    </div>
  );
}

function ModalDepto({edificio,depto,tareas,onClose}){
  const todas=tareas.filter(t=>t.edificio===edificio&&t.depto===depto);
  const activas=todas.filter(t=>t.estado!=="Completada");
  const comp=todas.filter(t=>t.estado==="Completada");
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(8,20,45,0.82)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
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
            <p style={{margin:"0 0 0.75rem",fontSize:12,fontWeight:700,color:"#F09595",textTransform:"uppercase",letterSpacing:"0.06em"}}>🔴 Activas ({activas.length})</p>
            {activas.map(t=>{
              const urg=urgStyle(t.urgencia),est=estStyle(t.estado);
              return(
                <div key={t.id} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"0.875rem 1rem",marginBottom:"0.5rem",borderLeft:`4px solid ${urg.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                    <p style={{margin:0,fontWeight:600,fontSize:14,color:"#fff"}}>{t.titulo}</p>
                    <div style={{display:"flex",gap:6}}>
                      <span style={{...S.tag(urg.bg,urg.text,urg.border),fontSize:11}}>{t.urgencia}</span>
                      <span style={{...S.tag(est.bg,est.text,est.border),fontSize:11}}>{t.estado}</span>
                    </div>
                  </div>
                  <p style={{margin:"4px 0 0",fontSize:12,color:"#8BAFD4"}}>🔧 {t.tipo} | 📅 {FMT_DATE(t.fecha)} | 👤 {t.asignado}</p>
                  {(t.fotoReporte||t.foto)&&<img src={t.fotoReporte||t.foto} alt="foto" style={{marginTop:8,maxWidth:180,borderRadius:8,cursor:"zoom-in"}} onClick={()=>window.open(t.fotoReporte||t.foto,"_blank")}/>}
                </div>
              );
            })}
          </div>
        )}
        {comp.length>0&&(
          <div>
            <p style={{margin:"0 0 0.75rem",fontSize:12,fontWeight:700,color:"#97C459",textTransform:"uppercase",letterSpacing:"0.06em"}}>✅ Historial ({comp.length})</p>
            {comp.map(t=>(
              <div key={t.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"0.75rem 1rem",marginBottom:"0.5rem",borderLeft:"4px solid #97C459"}}>
                <p style={{margin:0,fontWeight:500,fontSize:14,color:"#b0c8e0",textDecoration:"line-through",opacity:0.8}}>{t.titulo}</p>
                <p style={{margin:"4px 0 0",fontSize:12,color:"#6A8FAF"}}>🔧 {t.tipo} | 📅 {FMT_DATE(t.fecha)}{t.fechaFin?` → ${FMT_DATE(t.fechaFin)}`:""} | 👤 {t.asignado}</p>
              </div>
            ))}
          </div>
        )}
        {todas.length===0&&<div style={{textAlign:"center",padding:"2.5rem 0",color:"#8BAFD4"}}><p style={{fontSize:36}}>🏠</p><p style={{fontSize:15,marginTop:8}}>Sin registros</p></div>}
      </div>
    </div>
  );
}

function OrigenBadge({origen}){
  if(!origen) return null;
  const cfg={reporte:{bg:"#FFF3E0",color:"#E65100",border:"#FFB74D",label:"🔗 Desde Reporte"},limpieza:{bg:"#E8F5E9",color:"#1B5E20",border:"#66BB6A",label:"🧹 Post-mantenimiento"}};
  const c=cfg[origen]; if(!c) return null;
  return <span style={{...S.tag(c.bg,c.color,c.border),fontSize:11}}>{c.label}</span>;
}

function TareaCard({t,onEdit,onEstado,onDelete,onComentario,onIniciar}){
  const urg=urgStyle(t.urgencia),est=estStyle(t.estado);
  const [open,setOpen]=useState(false);
  const [com,setCom]=useState(t.comentario||"");
  const foto=t.foto||t.fotoReporte||null;

  // Distintivo de día asignado
  const tienesDia = !!t.fechaTrabajo;

  return(
    <div style={{
      ...S.card,
      borderLeft:`5px solid ${urg.border}`,
      background: tienesDia ? "#F5F0FF" : "#fff",
      border: tienesDia ? "1.5px solid #C084FC" : "1px solid #e2e0d8",
    }}>
      {tienesDia && (
        <div style={{marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
          <span style={{...S.tag("#F3E8FF","#6B21A8","#C084FC"),fontSize:11}}>📅 Asignada: {FMT_DATE(t.fechaTrabajo)}</span>
        </div>
      )}
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
            🏢 {t.edificio} · {t.depto||"—"} | 👤 {t.asignado} | 📅 {FMT_DATE(t.fecha)}{t.fechaFin?` → ${FMT_DATE(t.fechaFin)}`:""}
          </p>
          {t.fechaCarga&&<p style={{margin:"2px 0 0",fontSize:11,color:"#bbb"}}>Cargada: {FMT_DATE(t.fechaCarga)}</p>}
          {t.materiales&&<p style={{margin:"2px 0 0",fontSize:13,color:"#888"}}>🔧 {t.materiales}</p>}
          {foto&&<img src={foto} alt="foto" style={{marginTop:8,maxWidth:160,borderRadius:8,border:"1px solid #e2e0d8",cursor:"zoom-in",display:"block"}} onClick={()=>window.open(foto,"_blank")}/>}
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
          <div style={{marginBottom:"0.75rem"}}>
            <label style={S.label}>💬 Comentario interno</label>
            <textarea style={{...S.input,resize:"vertical",fontSize:13}} rows={2} value={com} onChange={e=>setCom(e.target.value)} placeholder="Notas internas..."/>
            <button onClick={()=>onComentario(t.id,com)} style={{...S.btn("#185FA5","#fff"),marginTop:6,padding:"5px 14px",fontSize:12}}>💾 Guardar</button>
          </div>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
            {/* Iniciar — abre modal para elegir fecha de inicio */}
            {t.estado!=="En curso"&&t.estado!=="Completada"&&(
              <button onClick={()=>onIniciar(t)} style={S.btn("#185FA5","#fff")}>▶ Iniciar</button>
            )}
            {t.estado==="En curso"&&<>
              <button onClick={()=>onEstado(t.id,"Completada")} style={S.btn("#3B6D11","#fff")}>✔ Finalizar</button>
              <button onClick={()=>onEstado(t.id,"Pausada")} style={S.btn("#854F0B","#fff")}>⏸ Pausar</button>
            </>}
            {t.estado==="Pausada"&&<button onClick={()=>onIniciar(t)} style={S.btn("#185FA5","#fff")}>▶ Reanudar</button>}
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

function TareaForm({tarea,edificios,tipos,personal,onSave,onClose}){
  const blank={titulo:"",edificio:"QDB",depto:"",tipo:"General",asignado:"Yo",urgencia:"Baja",
    estado:"Pendiente",fechaCarga:TODAY,fecha:"",fechaFin:"",descripcion:"",materiales:"",comentario:"",
    foto:null,limpieza:false,recurrente:false,huespedAlerta:false,historial:[]};
  const [f,setF]=useState(tarea?{...tarea,fechaCarga:tarea.fechaCarga||tarea.fecha||TODAY,fecha:tarea.fecha||""}:blank);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const deptos=edificios[f.edificio]||[];
  function handleFoto(e){const file=e.target.files[0];if(!file)return;resizePhoto(file,data=>set("foto",data));}
  return(
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
              {personal.map(p=><option key={p}>{p}</option>)}
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
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem"}}>
          <div><label style={S.label}>📋 Fecha de carga</label>
            <input type="date" style={{...S.input,background:"#f7f6f2",color:"#aaa"}} value={f.fechaCarga} readOnly/>
            <p style={{margin:"2px 0 0",fontSize:11,color:"#aaa"}}>Automática</p>
          </div>
          <div><label style={S.label}>🔧 Fecha inicio de tarea</label>
            <input type="date" style={S.input} value={f.fecha} onChange={e=>set("fecha",e.target.value)}/>
          </div>
          <div><label style={S.label}>✅ Fecha de fin (opcional)</label>
            <input type="date" style={S.input} value={f.fechaFin} onChange={e=>set("fechaFin",e.target.value)}/>
          </div>
        </div>
        <div><label style={S.label}>Materiales</label>
          <input style={S.input} value={f.materiales} onChange={e=>set("materiales",e.target.value)} placeholder="Ej: pintura blanca..."/>
        </div>
        <div><label style={S.label}>Descripción / Notas</label>
          <textarea style={{...S.input,resize:"vertical"}} rows={2} value={f.descripcion} onChange={e=>set("descripcion",e.target.value)}/>
        </div>
        <div><label style={S.label}>💬 Comentario interno</label>
          <textarea style={{...S.input,resize:"vertical"}} rows={2} value={f.comentario||""} onChange={e=>set("comentario",e.target.value)} placeholder="Notas internas..."/>
        </div>
        <div>
          <label style={S.label}>📷 Foto de referencia</label>
          <input type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{...S.input,padding:"6px",cursor:"pointer"}}/>
          {f.foto&&(
            <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10}}>
              <img src={f.foto} alt="preview" style={{maxWidth:120,borderRadius:8,border:"1px solid #dddbd3"}}/>
              <button onClick={()=>set("foto",null)} style={{...S.btn("#FCEBEB","#A32D2D"),fontSize:12,padding:"4px 10px",border:"1px solid #F09595"}}>✕ Quitar</button>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:"2rem",flexWrap:"wrap",padding:"0.75rem 1rem",background:"#f7f6f2",borderRadius:10}}>
          {[["limpieza","🧹 Requiere limpieza"],["recurrente","🔁 Mensual"],["huespedAlerta","⚠️ Huésped"]].map(([k,lbl])=>(
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

function VistaSemanal({tareas,onMoverTarea,onEdit,onQuitarDia}){
  const [weekOff,setWeekOff]=useState(0);
  const [arrastrando,setArrastrando]=useState(null);
  const weekDays=getWeekDays(TODAY,weekOff);
  const labelSem=`${FMT_DATE(weekDays[0])} — ${FMT_DATE(weekDays[6])}`;

  function onDragStart(e,tarea){setArrastrando(tarea);e.dataTransfer.effectAllowed="move";}
  function onDrop(e,iso){e.preventDefault();if(!arrastrando)return;onMoverTarea(arrastrando.id,iso);setArrastrando(null);}
  function onDragOver(e){e.preventDefault();}

  function MiniCard({t}){
    const urg=urgStyle(t.urgencia);
    const esObra=t.asignado==="Obra";
    return(
      <div draggable onDragStart={e=>onDragStart(e,t)}
        style={{background:esObra?"#2D1B69":urg.bg,border:`1.5px solid ${esObra?"#7C5CBF":urg.border}`,borderRadius:8,padding:"5px 7px",marginBottom:4,cursor:"grab",fontSize:11}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:4}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:"0 0 1px",fontWeight:600,color:esObra?"#C9B8FF":urg.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</p>
            <p style={{margin:0,color:esObra?"#A084E8":urg.text,opacity:0.85,fontSize:10}}>{t.edificio} · {t.depto}</p>
          </div>
          <div style={{display:"flex",gap:2,flexShrink:0}}>
            <button title="Editar" onClick={e=>{e.stopPropagation();onEdit(t);}} style={{background:"rgba(255,255,255,0.25)",border:"none",borderRadius:5,width:20,height:20,fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
            {t.fechaTrabajo&&<button title="Quitar día" onClick={e=>{e.stopPropagation();onQuitarDia(t.id);}} style={{background:"rgba(255,255,255,0.25)",border:"none",borderRadius:5,width:20,height:20,fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>↩</button>}
          </div>
        </div>
      </div>
    );
  }

  function DiaCol({iso}){
    const esHoy=iso===TODAY;
    // Solo tareas con fechaTrabajo en este día
    const tsAsig=tareas.filter(t=>t.estado!=="Completada"&&t.fechaTrabajo===iso);
    const obra=tsAsig.filter(t=>t.asignado==="Obra");
    const resto=tsAsig.filter(t=>t.asignado!=="Obra");
    return(
      <div onDragOver={onDragOver} onDrop={e=>onDrop(e,iso)}
        style={{minHeight:180,background:esHoy?"#E6F1FB":"#f7f6f2",border:`2px ${esHoy?"solid #185FA5":"dashed #dddbd3"}`,borderRadius:12,padding:"0.5rem",transition:"background 0.15s"}}>
        <p style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:esHoy?"#185FA5":"#888",textAlign:"center"}}>
          {DIAS_CORTO[new Date(iso+"T12:00:00").getDay()]}<br/>
          <span style={{fontSize:11,fontWeight:400}}>{FMT_DATE(iso)}</span>
        </p>
        {resto.length>0&&<div style={{marginBottom:4}}>
          <p style={{margin:"0 0 3px",fontSize:9,fontWeight:700,color:"#185FA5",textTransform:"uppercase",borderBottom:"1px solid #c5d9ef",paddingBottom:2}}>🔧 Manten.</p>
          {resto.map(t=><MiniCard key={t.id} t={t}/>)}
        </div>}
        {obra.length>0&&<div>
          <p style={{margin:"0 0 3px",fontSize:9,fontWeight:700,color:"#9B7DD4",textTransform:"uppercase",borderBottom:"1px solid #7C5CBF",paddingBottom:2}}>🏗️ Obra</p>
          {obra.map(t=><MiniCard key={t.id} t={t}/>)}
        </div>}
        {tsAsig.length===0&&<p style={{fontSize:11,color:"#bbb",textAlign:"center",marginTop:8}}>Sin tareas</p>}
      </div>
    );
  }

  // Pendientes SIN fechaTrabajo asignada (no se muestran las que ya tienen día)
  const sinDia=tareas.filter(t=>t.estado!=="Completada"&&!t.fechaTrabajo);
  const sinDiaResto=sinDia.filter(t=>t.asignado!=="Obra");
  const sinDiaObra=sinDia.filter(t=>t.asignado==="Obra");

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.25rem",flexWrap:"wrap"}}>
        <button onClick={()=>setWeekOff(o=>o-1)} style={S.btn()}>◀</button>
        <p style={{margin:0,fontWeight:500,fontSize:15,flex:1,textAlign:"center"}}>📅 {labelSem}</p>
        <button onClick={()=>setWeekOff(0)} style={{...S.btn(weekOff===0?"#185FA5":undefined,weekOff===0?"#fff":undefined),fontSize:13,padding:"6px 14px"}}>Hoy</button>
        <button onClick={()=>setWeekOff(o=>o+1)} style={S.btn()}>▶</button>
      </div>
      <div style={{background:"#fff8e1",border:"1px solid #FFE082",borderRadius:12,padding:"0.75rem 1rem",marginBottom:"1rem",fontSize:13,color:"#795548"}}>
        💡 Arrastrá las tareas hacia el día. ✏️ edita, ↩ quita el día asignado.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:"1.5rem"}}>
        {weekDays.map(iso=><DiaCol key={iso} iso={iso}/>)}
      </div>
      <div>
        <p style={{margin:"0 0 0.75rem",fontWeight:600,fontSize:14,color:"#555"}}>📋 Pendientes sin día asignado ({sinDia.length})</p>
        {sinDiaResto.length>0&&<div style={{marginBottom:"0.75rem"}}>
          <p style={{margin:"0 0 0.5rem",fontSize:12,fontWeight:600,color:"#185FA5"}}>🔧 Mantenimiento ({sinDiaResto.length})</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {sinDiaResto.map(t=>{
              const urg=urgStyle(t.urgencia);
              return(
                <div key={t.id} draggable onDragStart={e=>onDragStart(e,t)}
                  style={{background:urg.bg,border:`1px solid ${urg.border}`,borderRadius:8,padding:"6px 10px",cursor:"grab",fontSize:12,maxWidth:200}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:4}}>
                    <div>
                      <p style={{margin:"0 0 2px",fontWeight:600,color:urg.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>{t.titulo}</p>
                      <p style={{margin:0,color:urg.text,opacity:0.8,fontSize:11}}>{t.edificio} · {t.depto}</p>
                    </div>
                    <button onClick={e=>{e.stopPropagation();onEdit(t);}} style={{background:"rgba(0,0,0,0.08)",border:"none",borderRadius:4,width:18,height:18,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>}
        {sinDiaObra.length>0&&<div>
          <p style={{margin:"0 0 0.5rem",fontSize:12,fontWeight:600,color:"#9B7DD4"}}>🏗️ Obra ({sinDiaObra.length})</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {sinDiaObra.map(t=>(
              <div key={t.id} draggable onDragStart={e=>onDragStart(e,t)}
                style={{background:"#2D1B69",border:"1px solid #7C5CBF",borderRadius:8,padding:"6px 10px",cursor:"grab",fontSize:12,maxWidth:200}}>
                <p style={{margin:"0 0 2px",fontWeight:600,color:"#C9B8FF",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</p>
                <p style={{margin:0,color:"#A084E8",fontSize:11}}>{t.edificio} · {t.depto}</p>
              </div>
            ))}
          </div>
        </div>}
        {sinDia.length===0&&<p style={{fontSize:13,color:"#aaa"}}>Todas las tareas tienen día asignado 👍</p>}
      </div>
    </div>
  );
}

// ── Preventivo ────────────────────────────────────────────────────────────────
function Preventivo({edificios, prevData, savePrevData, showToast}){
  const [verHist, setVerHist] = useState(false);
  const [newTarea, setNewTarea] = useState("");
  const tareas   = prevData?.tareas   || [];
  const meses    = prevData?.meses    || {};
  const historial= prevData?.historial|| [];
  const celdas   = meses[CURRENT_MONTH] || {};
  const allDeptos = [];
  Object.entries(edificios).forEach(([ed, ds]) => ds.forEach(dep => allDeptos.push({ed, dep})));
  const celKey = (ed, dep, tarea) => `${ed}|${dep}|${tarea}`;
  function ultimaVezRealizada(ed, dep, tarea) {
    const mesesAnteriores = Object.entries(meses).filter(([m]) => m !== CURRENT_MONTH).sort(([a],[b]) => b.localeCompare(a));
    const k = celKey(ed, dep, tarea);
    for (const [, cels] of mesesAnteriores) { if (cels[k]?.done && cels[k]?.fecha) return cels[k].fecha; }
    const hist = [...historial].sort((a,b) => b.mes.localeCompare(a.mes));
    for (const h of hist) { if (h.celdas?.[k]?.done && h.celdas[k]?.fecha) return h.celdas[k].fecha; }
    return null;
  }
  async function toggleCelda(ed, dep, tarea) {
    const k = celKey(ed, dep, tarea);
    const prev = {...meses};
    if (!prev[CURRENT_MONTH]) prev[CURRENT_MONTH] = {};
    if (prev[CURRENT_MONTH][k]?.done) { delete prev[CURRENT_MONTH][k]; await savePrevData({...prevData, meses: prev}); return; }
    const ultima = ultimaVezRealizada(ed, dep, tarea);
    if (ultima) {
      const diasDesde = Math.floor((new Date(TODAY) - new Date(ultima)) / 86400000);
      if (diasDesde < 30) { const ok = window.confirm(`⚠️ Aviso: ya se realizó el ${FMT_DATE(ultima)} (hace ${diasDesde} días). ¿Marcar igual?`); if (!ok) return; }
    }
    prev[CURRENT_MONTH][k] = {done: true, fecha: TODAY};
    await savePrevData({...prevData, meses: prev});
  }
  async function addTarea() {
    const t = newTarea.trim();
    if (!t || tareas.includes(t)) return;
    await savePrevData({...prevData, tareas: [...tareas, t]});
    setNewTarea("");
  }
  async function removeTarea(t) {
    if (!window.confirm(`¿Eliminar la columna "${t}"?`)) return;
    const newMeses = {};
    Object.entries(meses).forEach(([m, cels]) => { newMeses[m] = {}; Object.entries(cels).forEach(([k, v]) => { if (!k.endsWith(`|${t}`)) newMeses[m][k] = v; }); });
    await savePrevData({...prevData, tareas: tareas.filter(x => x !== t), meses: newMeses});
  }
  async function cerrarMes() {
    const mesLabel = MONTHS[parseInt(CURRENT_MONTH.split("-")[1]) - 1] + " " + CURRENT_MONTH.split("-")[0];
    if (!window.confirm(`¿Cerrar ${mesLabel}?`)) return;
    const snapshot = { mes: CURRENT_MONTH, label: mesLabel, celdas: {...(meses[CURRENT_MONTH] || {})}, tareas: [...tareas], deptos: allDeptos.map(({ed, dep}) => ({ed, dep})) };
    const newMeses = {...meses}; delete newMeses[CURRENT_MONTH];
    await savePrevData({...prevData, historial: [...historial, snapshot], meses: newMeses});
    showToast("📋 Mes cerrado y archivado");
  }
  const total = allDeptos.length * tareas.length;
  const done  = Object.values(celdas).filter(v => v?.done).length;
  const pct   = total > 0 ? Math.round(done / total * 100) : 0;
  const mesLabel = MONTHS[parseInt(CURRENT_MONTH.split("-")[1]) - 1] + " " + CURRENT_MONTH.split("-")[0];

  if (verHist) return (
    <div>
      <div style={{display:"flex",gap:"0.75rem",alignItems:"center",marginBottom:"1.25rem"}}>
        <button onClick={()=>setVerHist(false)} style={S.btn()}>← Volver</button>
        <p style={{margin:0,fontWeight:600,fontSize:16}}>📋 Historial preventivo</p>
      </div>
      {historial.length === 0 && <p style={{color:"#888",fontSize:14}}>Sin meses archivados aún.</p>}
      {[...historial].reverse().map((h, i) => {
        const tot = (h.deptos||[]).length * (h.tareas||[]).length;
        const dn  = Object.values(h.celdas||{}).filter(v=>v?.done).length;
        const p   = tot > 0 ? Math.round(dn/tot*100) : 0;
        return (
          <div key={i} style={{...S.card, marginBottom:"0.75rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
              <p style={{margin:0,fontWeight:600,fontSize:15}}>{h.label}</p>
              <span style={S.tag(p===100?"#EAF3DE":"#E6F1FB",p===100?"#3B6D11":"#185FA5",p===100?"#97C459":"#85B7EB")}>{p}% · {dn}/{tot}</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"collapse",fontSize:11,minWidth:400}}>
                <thead><tr>
                  <th style={{padding:"5px 10px",background:"#f7f6f2",border:"1px solid #e2e0d8",textAlign:"left",fontWeight:600,color:"#555",minWidth:110,position:"sticky",left:0,zIndex:1}}>Departamento</th>
                  {(h.tareas||[]).map(t=>(<th key={t} style={{padding:"5px 10px",background:"#f7f6f2",border:"1px solid #e2e0d8",fontWeight:600,color:"#555",textAlign:"center",minWidth:90}}>{t}</th>))}
                </tr></thead>
                <tbody>
                  {(h.deptos||[]).map(({ed,dep},ri)=>(
                    <tr key={ri} style={{background:ri%2===0?"#fff":"#fafaf8"}}>
                      <td style={{padding:"5px 10px",border:"1px solid #e2e0d8",fontWeight:500,color:"#444",position:"sticky",left:0,background:ri%2===0?"#fff":"#fafaf8",zIndex:1}}>{ed} · {dep}</td>
                      {(h.tareas||[]).map(t=>{ const v = h.celdas?.[`${ed}|${dep}|${t}`]; return (<td key={t} style={{padding:"5px 10px",border:"1px solid #e2e0d8",textAlign:"center",background:v?.done?"#EAF3DE":"#fff"}}>{v?.done?<span style={{color:"#3B6D11",fontSize:11}}>✓ {FMT_DATE(v.fecha)}</span>:<span style={{color:"#ddd",fontSize:14}}>—</span>}</td>); })}
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

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.75rem",marginBottom:"1.25rem"}}>
        <div>
          <p style={{margin:0,fontWeight:700,fontSize:18}}>🔧 Preventivo — {mesLabel}</p>
          <p style={{margin:"2px 0 0",fontSize:13,color:"#888"}}>{done} de {total} tareas completadas este mes</p>
        </div>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          <button onClick={()=>setVerHist(true)} style={S.btn()}>📋 Historial ({historial.length})</button>
          <button onClick={cerrarMes} style={{...S.btn("#854F0B","#fff")}}>📦 Cerrar mes</button>
        </div>
      </div>
      <div style={{marginBottom:"1.25rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:13,color:"#555",fontWeight:500}}>Progreso del mes</span>
          <span style={{fontSize:13,fontWeight:700,color:pct===100?"#3B6D11":"#185FA5"}}>{pct}%</span>
        </div>
        <div style={{background:"#e2e0d8",borderRadius:99,height:10,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:pct===100?"#3B6D11":"#185FA5",borderRadius:99,transition:"width 0.4s"}}/>
        </div>
      </div>
      <div style={{...S.section,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
        <p style={{margin:"0 0 0.75rem",fontWeight:500,fontSize:14}}>➕ Agregar tarea al preventivo</p>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <input style={{...S.input,flex:1}} placeholder="Ej: Revisión matafuegos..." value={newTarea} onChange={e=>setNewTarea(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addTarea();}}/>
          <button onClick={addTarea} style={{...S.btn("#185FA5","#fff"),whiteSpace:"nowrap"}}>+ Agregar</button>
        </div>
        {tareas.length > 0 && (
          <div style={{marginTop:"0.75rem",display:"flex",flexWrap:"wrap",gap:6}}>
            {tareas.map(t=>(<span key={t} style={{...S.tag("#E6F1FB","#185FA5","#85B7EB"),display:"flex",alignItems:"center",gap:4}}>{t}<button onClick={()=>removeTarea(t)} style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:13,padding:0,lineHeight:1}}>✕</button></span>))}
          </div>
        )}
      </div>
      {tareas.length === 0 && (<div style={{textAlign:"center",padding:"3rem 0",color:"#aaa"}}><p style={{fontSize:32,marginBottom:8}}>📋</p><p style={{fontSize:15}}>Agregá tareas arriba para armar la tabla preventiva.</p></div>)}
      {tareas.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",fontSize:13,width:"100%",minWidth:400+tareas.length*110}}>
            <thead><tr>
              <th style={{padding:"8px 12px",background:"#1C2B45",border:"1px solid #2E4A6E",textAlign:"left",fontWeight:600,color:"#8BAFD4",minWidth:130,position:"sticky",left:0,zIndex:2}}>Departamento</th>
              {tareas.map(t=>(<th key={t} style={{padding:"8px 12px",background:"#1C2B45",border:"1px solid #2E4A6E",fontWeight:600,color:"#fff",textAlign:"center",minWidth:110}}>{t}</th>))}
            </tr></thead>
            <tbody>
              {allDeptos.map(({ed, dep}, ri) => (
                <tr key={`${ed}-${dep}`} style={{background:ri%2===0?"#fff":"#fafaf8"}}>
                  <td style={{padding:"7px 12px",border:"1px solid #e2e0d8",fontWeight:600,color:"#333",fontSize:13,position:"sticky",left:0,zIndex:1,background:ri%2===0?"#fff":"#fafaf8"}}>
                    <span style={{fontSize:11,color:"#aaa",fontWeight:400}}>{ed} · </span>{dep}
                  </td>
                  {tareas.map(tarea => {
                    const k = celKey(ed, dep, tarea);
                    const val = celdas[k];
                    const isDone = val?.done;
                    return (
                      <td key={tarea} style={{padding:"6px 8px",border:"1px solid #e2e0d8",textAlign:"center",background:isDone?"#EAF3DE":"#fff",cursor:"pointer",transition:"background 0.15s"}}
                        onClick={()=>toggleCelda(ed, dep, tarea)} title={isDone?`Realizado el ${FMT_DATE(val.fecha)}`:"Clic para marcar"}>
                        {isDone?(<div><div style={{color:"#3B6D11",fontWeight:700,fontSize:15}}>✓</div><div style={{fontSize:10,color:"#5a9a3a"}}>{FMT_DATE(val.fecha)}</div></div>):(<div style={{width:20,height:20,border:"2px solid #dddbd3",borderRadius:4,margin:"0 auto",background:"#f7f6f2"}}/>)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const [filtroHist,setFiltroHist]=useState({edificio:"",depto:""});
  const [newEdificio,setNewEdificio]=useState("");
  const [newDepto,setNewDepto]=useState({ed:"QDB",nombre:""});
  const [newTipo,setNewTipo]=useState("");
  const [newPersonal,setNewPersonal]=useState("");
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [procesadosIds,setProcesadosIds]=useState(new Set());
  const [deptoModal,setDeptoModal]=useState(null);
  const [iniciarModal,setIniciarModal]=useState(null); // tarea a iniciar

  const nextId=useRef(Date.now());
  const unsubs=useRef([]);
  const procesadosRef=useRef(new Set());

  const showToast=(msg,tipo="ok")=>{setToast({msg,tipo});setTimeout(()=>setToast(null),4000);};

  const saveTareas=useCallback(async v=>{
    const dedup=deduplicar(v);
    setTareasState(dedup);
    try{await aSet("alma_tasks",dedup);}catch(e){console.error(e);}
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
        if(!mounted) return;
        if(t) setTareasState(deduplicar(t));
        if(e) setEdificiosState(e);
        if(ti) setTiposState(ti);
        if(pv) setPrevDataState(pv);
        if(proc){procesadosRef.current=new Set(proc);setProcesadosIds(new Set(proc));}
        if(pers) setPersonalState(pers);

        // Retroactivo: asegurar que todas las tareas migradas de reportes tengan origen="reporte"
        if(t) {
          const repsData = await lGet("lim_reports").catch(()=>null);
          const repIds = new Set((repsData||[]).map(r=>String(r.id)));
          let changed = false;
          const tFixed = deduplicar(t).map(task => {
            if(task.reporteId && task.origen !== "reporte") { changed=true; return {...task, origen:"reporte"}; }
            // Si tiene historial con "Migrada automáticamente" y no tiene origen
            if(!task.origen && task.historial?.some(h=>h.includes("Migrada automáticamente"))) {
              changed=true; return {...task, origen:"reporte"};
            }
            return task;
          });
          if(changed) { await aSet("alma_tasks", tFixed); setTareasState(tFixed); }
        }

        const u1=aListen("alma_tasks",d=>{if(mounted&&d)setTareasState(deduplicar(d));});
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
      if(!reps||!Array.isArray(reps)) return;
      const nuevos=reps.filter(r=>r.comentario?.trim()&&!procesadosRef.current.has(String(r.id)));
      if(!nuevos.length) return;
      let tareasAct=await aGet("alma_tasks")||[];
      tareasAct=deduplicar(tareasAct);
      for(const rep of nuevos){
        if(procesadosRef.current.has(String(rep.id))) continue;
        procesadosRef.current.add(String(rep.id));
        await aSet("alma_procesados",Array.from(procesadosRef.current));
        setProcesadosIds(new Set(procesadosRef.current));
        const res=clasificarReporte(rep.comentario);
        if(!res.esMantenimiento) continue;
        // Evitar duplicados: mismo reporteId O mismo título+edificio+depto
        if(tareasAct.some(t=>t.reporteId===rep.id)) continue;
        let ed="",dep="";
        const m=(rep.depto||"").trim().match(/^(QDB|H475|qdb|h475)\s*(.+)$/i);
        if(m){ed=m[1].toUpperCase();dep=m[2].trim();}else{ed="H475";dep=(rep.depto||"").trim();}
        const titulo=capitalizar(rep.comentario.slice(0,60));
        // Verificar duplicado por título+edificio+depto
        if(tareasAct.some(t=>t.titulo===titulo&&t.edificio===ed&&t.depto===dep)) continue;
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
      const final=deduplicar(tareasAct);
      await aSet("alma_tasks",final);
      setTareasState(final);
    }catch(e){console.error(e);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const enviarLimpieza=useCallback(async tarea=>{
    if(!tarea.limpieza||!tarea.fechaFin) return;
    try{
      const lt=await lGet("lim_tasks")||[];
      if(lt.some(t=>t._almaId===tarea.id)) return;
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
        if(t.id!==editando.id) return t;
        const h=[...(t.historial||[]),`Editada el ${hoy}`];
        return {...f,id:t.id,origen:t.origen,fotoReporte:t.fotoReporte,reporteId:t.reporteId,fechaCarga:t.fechaCarga||TODAY,historial:h};
      });
    }else{
      // Verificar duplicado por título+edificio+depto antes de agregar
      const isDup=tareas.some(t=>t.titulo.trim()===f.titulo.trim()&&t.edificio===f.edificio&&t.depto===f.depto&&t.estado!=="Completada");
      if(isDup){showToast("⚠️ Ya existe una tarea igual (mismo título, edificio y dpto)","err");return;}
      const nt={...f,id:nextId.current++,fechaCarga:TODAY,historial:[`Creada el ${hoy}`]};
      lista=[...tareas,nt];
    }
    await saveTareas(lista);setEditando(null);
  },[editando,tareas,saveTareas,showToast]);

  const cambiarEstado=useCallback(async(id,nuevoEstado,fechaInicio)=>{
    const lista=tareas.map(t=>{
      if(t.id!==id) return t;
      const h=[...(t.historial||[]),`${new Date().toLocaleDateString("es-AR")} — Estado: ${nuevoEstado}`];
      const upd={...t,estado:nuevoEstado,historial:h};
      if(fechaInicio) upd.fecha=fechaInicio;
      if(nuevoEstado==="Completada"&&t.limpieza) enviarLimpieza(upd);
      return upd;
    });
    await saveTareas(lista);
  },[tareas,saveTareas,enviarLimpieza]);

  // Iniciar tarea: abre modal para elegir fecha
  const handleIniciar=useCallback((tarea)=>{
    setIniciarModal(tarea);
  },[]);

  const confirmarIniciar=useCallback(async(tarea,fechaInicio)=>{
    await cambiarEstado(tarea.id,"En curso",fechaInicio);
  },[cambiarEstado]);

  const eliminarTarea=useCallback(async id=>await saveTareas(tareas.filter(t=>t.id!==id)),[tareas,saveTareas]);

  const guardarComentario=useCallback(async(id,comentario)=>{
    await saveTareas(tareas.map(t=>t.id===id?{...t,comentario}:t));
    showToast("💬 Comentario guardado");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tareas,saveTareas]);

  const moverTarea=useCallback(async(id,fechaTrabajo)=>{
    // Al asignar un día, cambiar estado a "Asignada" si estaba Pendiente
    const lista=tareas.map(t=>{
      if(t.id!==id) return t;
      const nuevoEstado=t.estado==="Pendiente"?"Asignada":t.estado;
      const h=[...(t.historial||[]),`Asignada al ${FMT_DATE(fechaTrabajo)}`];
      return {...t,fechaTrabajo,estado:nuevoEstado,historial:h};
    });
    await saveTareas(lista);
  },[tareas,saveTareas]);

  const quitarDiaTarea=useCallback(async id=>{
    const lista=tareas.map(t=>{
      if(t.id!==id) return t;
      const {fechaTrabajo:_,...rest}=t;
      // Si estaba Asignada, volver a Pendiente
      const nuevoEstado=t.estado==="Asignada"?"Pendiente":t.estado;
      return {...rest,estado:nuevoEstado};
    });
    await saveTareas(lista);
  },[tareas,saveTareas]);

  const tareasActivas=sortDesc(deduplicar(tareas.filter(t=>t.estado!=="Completada")));
  const tareasComp   =sortDesc(deduplicar(tareas.filter(t=>t.estado==="Completada")));
  const urgentes     =sortDesc(tareasActivas.filter(t=>t.urgencia==="Urgente"));
  const enCurso      =sortDesc(tareas.filter(t=>t.estado==="En curso"));
  const huesped      =sortDesc(tareas.filter(t=>t.huespedAlerta&&t.estado!=="Completada"));

  // Filtro tareas activas
  const tareasF=sortDesc(deduplicar(tareas.filter(t=>{
    if(t.estado==="Completada") return false;
    if(filtro.edificio&&t.edificio!==filtro.edificio) return false;
    if(filtro.depto&&t.depto!==filtro.depto) return false;
    if(filtro.urgencia&&t.urgencia!==filtro.urgencia) return false;
    if(filtro.tipo&&t.tipo!==filtro.tipo) return false;
    if(filtro.asignado&&t.asignado!==filtro.asignado) return false;
    if(filtro.estado){
      if(filtro.estado==="Pendiente") return t.estado==="Pendiente"||(!t.estado);
      return t.estado===filtro.estado;
    }
    return true;
  })));

  // Deptos del edificio filtrado (para filtro de tareas y historial)
  const deptosParaFiltro = filtro.edificio ? (edificios[filtro.edificio]||[]) : [];
  const deptosParaHistFiltro = filtroHist.edificio ? (edificios[filtroHist.edificio]||[]) : [];

  // Filtro historial
  const tareasHistF=sortDesc(deduplicar(tareas.filter(t=>{
    if(t.estado!=="Completada") return false;
    if(filtroHist.edificio&&t.edificio!==filtroHist.edificio) return false;
    if(filtroHist.depto&&t.depto!==filtroHist.depto) return false;
    return true;
  })));

  const TABS=[
    {id:"dashboard",icon:"🏠",label:"Dashboard"},
    {id:"tareas",icon:"✅",label:"Tareas"},
    {id:"semanal",icon:"📆",label:"Organización"},
    {id:"preventivo",icon:"🔧",label:"Preventivo"},
    {id:"edificios",icon:"🏢",label:"Edificios"},
    {id:"historial",icon:"📋",label:"Historial"},
    {id:"config",icon:"⚙️",label:"Config"},
  ];

  if(loading) return(
    <div style={{fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#f4f3ef"}}>
      <div style={{fontSize:48,marginBottom:16}}>🔧</div>
      <p style={{fontSize:18,fontWeight:700,color:"#185FA5"}}>AlmaDesk</p>
      <p style={{color:"#888",fontSize:14,marginTop:4}}>Conectando...</p>
      <div style={{width:36,height:36,border:"4px solid #E6F1FB",borderTop:"4px solid #185FA5",borderRadius:"50%",animation:"spin 1s linear infinite",marginTop:20}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:960,margin:"0 auto",paddingBottom:"3rem",background:"#f4f3ef",minHeight:"100vh"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast&&<div style={{position:"fixed",top:14,right:14,zIndex:9999,background:toast.tipo==="err"?"#c0392b":"#185FA5",color:"#fff",borderRadius:10,padding:"10px 18px",fontSize:14,fontWeight:600,boxShadow:"0 4px 18px rgba(0,0,0,.2)",maxWidth:380}}>{toast.msg}</div>}
      {deptoModal&&<ModalDepto edificio={deptoModal.edificio} depto={deptoModal.depto} tareas={tareas} onClose={()=>setDeptoModal(null)}/>}
      {iniciarModal&&<ModalIniciarFecha tarea={iniciarModal} onConfirm={fecha=>confirmarIniciar(iniciarModal,fecha)} onClose={()=>setIniciarModal(null)}/>}

      <div style={{background:"linear-gradient(135deg,#0C447C,#185FA5)",padding:"1.25rem 2rem",borderRadius:"0 0 20px 20px",marginBottom:"1.25rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
          <div>
            <p style={{margin:0,fontWeight:700,fontSize:24,color:"#fff",letterSpacing:"-0.5px"}}>🔧 AlmaDesk</p>
            <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,0.75)"}}>Alma Rentals · {new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
          </div>
          <div style={{display:"flex",gap:"1.5rem",textAlign:"center"}}>
            {[
              {label:"Urgentes",val:urgentes.length,col:"#F09595"},
              {label:"En curso",val:enCurso.length,col:"#85B7EB"},
              {label:"Pendientes",val:tareas.filter(t=>t.estado==="Pendiente").length,col:"#FFB74D"}
            ].map(c=>(
              <div key={c.label}><p style={{margin:0,fontSize:22,fontWeight:700,color:c.col}}>{c.val}</p><p style={{margin:0,fontSize:12,color:"rgba(255,255,255,0.75)"}}>{c.label}</p></div>
            ))}
          </div>
        </div>
      </div>

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

        {/* ── DASHBOARD ── */}
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
                    <p style={{margin:0,fontSize:12,color:"#888"}}>🏢 {t.edificio} · {t.depto} | 👤 {t.asignado}</p>
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
                  const ts=sortDesc(tareasActivas.filter(t=>t.fecha>=TODAY&&t.fecha<=finStr));
                  if(!ts.length) return <p style={{color:"#888",fontSize:14}}>Sin tareas próximas.</p>;
                  return ts.map(t=>(
                    <div key={t.id} style={{padding:"8px 10px",background:t.origen==="reporte"?"#FFF3E0":"#fff",borderRadius:8,marginBottom:6,borderLeft:`4px solid ${t.origen==="reporte"?"#FFB74D":urgStyle(t.urgencia).border}`}}>
                      <p style={{margin:0,fontWeight:500,fontSize:14}}>{t.titulo}</p>
                      <p style={{margin:0,fontSize:12,color:"#888"}}>🏢 {t.edificio} · {FMT_DATE(t.fecha)}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── TAREAS ── */}
        {tab==="tareas"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <p style={{margin:0,fontWeight:500,fontSize:16}}>Tareas activas ({tareasF.length})</p>
              <button onClick={()=>{setEditando(null);setShowForm(true);}} style={{...S.btn("#185FA5","#fff"),fontSize:15,padding:"9px 20px"}}>+ Nueva tarea</button>
            </div>
            <div style={{...S.section,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
              <p style={{margin:"0 0 0.75rem",fontSize:13,fontWeight:500,color:"#888"}}>FILTROS</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem",marginBottom:"0.5rem"}}>
                <div>
                  <select style={{...S.input,fontSize:13}} value={filtro.edificio} onChange={e=>setFiltro(p=>({...p,edificio:e.target.value,depto:""}))}>
                    <option value="">Edificio (todos)</option>
                    {Object.keys(edificios).map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <select style={{...S.input,fontSize:13}} value={filtro.depto} onChange={e=>setFiltro(p=>({...p,depto:e.target.value}))} disabled={!filtro.edificio}>
                    <option value="">Dpto / Sector (todos)</option>
                    {deptosParaFiltro.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <select style={{...S.input,fontSize:13}} value={filtro.estado} onChange={e=>setFiltro(p=>({...p,estado:e.target.value}))}>
                    <option value="">Estado (todos)</option>
                    {["Pendiente","Asignada","En curso","Pausada"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <select style={{...S.input,fontSize:13}} value={filtro.urgencia} onChange={e=>setFiltro(p=>({...p,urgencia:e.target.value}))}>
                    <option value="">Urgencia (todos)</option>
                    {URGENCIAS.map(u=><option key={u.label}>{u.label}</option>)}
                  </select>
                </div>
                <div>
                  <select style={{...S.input,fontSize:13}} value={filtro.tipo} onChange={e=>setFiltro(p=>({...p,tipo:e.target.value}))}>
                    <option value="">Tipo (todos)</option>
                    {tipos.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <select style={{...S.input,fontSize:13}} value={filtro.asignado} onChange={e=>setFiltro(p=>({...p,asignado:e.target.value}))}>
                    <option value="">Asignado (todos)</option>
                    {personal.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {tareasF.length===0
              ?<p style={{textAlign:"center",color:"#888",marginTop:"2rem",fontSize:15}}>No hay tareas con esos filtros.</p>
              :tareasF.map(t=><TareaCard key={t.id} t={t} onEdit={tt=>{setEditando(tt);setShowForm(true);}} onEstado={cambiarEstado} onDelete={eliminarTarea} onComentario={guardarComentario} onIniciar={handleIniciar}/>)
            }
          </div>
        )}

        {/* ── ORGANIZACIÓN ── */}
        {tab==="semanal"&&(
          <div style={S.section}>
            <VistaSemanal tareas={tareasActivas} onMoverTarea={moverTarea} onEdit={tt=>{setEditando(tt);setShowForm(true);}} onQuitarDia={quitarDiaTarea}/>
          </div>
        )}

        {/* ── PREVENTIVO ── */}
        {tab==="preventivo"&&(
          <div style={S.section}>
            <Preventivo edificios={edificios} prevData={prevData} savePrevData={savePrevData} showToast={showToast}/>
          </div>
        )}

        {/* ── EDIFICIOS ── */}
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
                    return(
                      <div key={d} onClick={()=>setDeptoModal({edificio:ed,depto:d})}
                        style={{background:alerta?"#FAECE7":urg?"#FCEBEB":desdeRep?"#FFF3E0":"#fff",border:`1.5px solid ${alerta?"#F5C4B3":urg?"#F09595":desdeRep?"#FFB74D":"#dddbd3"}`,borderRadius:10,padding:"0.75rem",textAlign:"center",cursor:"pointer",transition:"transform 0.15s,box-shadow 0.15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.12)";}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}>
                        <p style={{margin:"0 0 4px",fontWeight:600,fontSize:15}}>{d}</p>
                        {alerta&&<p style={{margin:"0 0 2px",fontSize:11,color:"#993C1D"}}>⚠ Huésped</p>}
                        {desdeRep&&<p style={{margin:"0 0 2px",fontSize:11,color:"#E65100"}}>🔗 Reporte</p>}
                        {ts.length>0?<span style={S.tag(urg?"#FCEBEB":"#E6F1FB",urg?"#A32D2D":"#185FA5",urg?"#F09595":"#85B7EB")}>{ts.length} activa{ts.length>1?"s":""}</span>:<span style={{fontSize:12,color:"#aaa"}}>Libre</span>}
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

        {/* ── HISTORIAL ── */}
        {tab==="historial"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
              <p style={{margin:0,fontWeight:500,fontSize:16}}>Historial de tareas completadas ({tareasHistF.length})</p>
            </div>
            {/* Filtros de historial */}
            <div style={{...S.section,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
              <p style={{margin:"0 0 0.75rem",fontSize:13,fontWeight:500,color:"#888"}}>FILTRAR HISTORIAL</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
                <select style={{...S.input,fontSize:13}} value={filtroHist.edificio} onChange={e=>setFiltroHist(p=>({...p,edificio:e.target.value,depto:""}))}>
                  <option value="">Edificio (todos)</option>
                  {Object.keys(edificios).map(o=><option key={o}>{o}</option>)}
                </select>
                <select style={{...S.input,fontSize:13}} value={filtroHist.depto} onChange={e=>setFiltroHist(p=>({...p,depto:e.target.value}))} disabled={!filtroHist.edificio}>
                  <option value="">Departamento (todos)</option>
                  {deptosParaHistFiltro.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {tareasHistF.length===0
              ?<p style={{textAlign:"center",color:"#888",fontSize:15,marginTop:"2rem"}}>Aún no hay completadas con esos filtros.</p>
              :tareasHistF.map(t=><TareaCard key={t.id} t={t} onEdit={tt=>{setEditando(tt);setShowForm(true);}} onEstado={cambiarEstado} onDelete={eliminarTarea} onComentario={guardarComentario} onIniciar={handleIniciar}/>)
            }
          </div>
        )}

        {/* ── CONFIG ── */}
        {tab==="config"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            <div style={S.section}>
              <p style={{margin:"0 0 1rem",fontWeight:500,fontSize:15}}>🏢 Edificios y departamentos</p>
              <div style={{background:"#E6F1FB",border:"1px solid #85B7EB",borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem"}}>
                <p style={{margin:"0 0 6px",fontSize:13,fontWeight:600,color:"#185FA5"}}>📂 Importar desde CSV</p>
                <p style={{margin:"0 0 8px",fontSize:12,color:"#555"}}>Columnas: <b>Edificio</b> y <b>Departamento</b></p>
                <input type="file" accept=".csv" onChange={async e=>{
                  const file=e.target.files[0];if(!file)return;
                  const text=await file.text();
                  const lines=text.trim().split(/\r?\n/);
                  if(lines.length<2){showToast("CSV vacío","err");return;}
                  const delim=lines[0].includes(";")?";":",";
                  const headers=lines[0].split(delim).map(h=>h.trim().toLowerCase().replace(/"/g,""));
                  const iEd=headers.findIndex(h=>h.includes("edif")||h.includes("build")||h==="ed");
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
                  showToast(`✅ ${nuevos} deptos importados${dup>0?`, ${dup} duplicados omitidos`:""}`);
                  e.target.value="";
                }} style={{...S.input,padding:"6px",fontSize:13,cursor:"pointer"}}/>
              </div>
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.75rem"}}>
                <input style={{...S.input,flex:1}} placeholder="Nuevo edificio" value={newEdificio} onChange={e=>setNewEdificio(e.target.value)}/>
                <button onClick={async()=>{
                  if(!newEdificio.trim())return;
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
                  if(!newDepto.nombre.trim())return;
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
                    <button onClick={async()=>{if(!window.confirm(`¿Eliminar ${ed}?`))return;const u={...edificios};delete u[ed];await saveEdificios(u);}} style={{...S.btn("#FCEBEB","#A32D2D"),padding:"3px 8px",fontSize:11,border:"1px solid #F09595"}}>🗑️</button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {ds.map(d=>(
                      <span key={d} style={{...S.tag("#F1EFE8","#444","#B4B2A9"),display:"flex",alignItems:"center",gap:4}}>
                        {d}<button onClick={async()=>await saveEdificios({...edificios,[ed]:edificios[ed].filter(x=>x!==d)})} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:12,padding:0}}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              <div style={S.section}>
                <p style={{margin:"0 0 1rem",fontWeight:500,fontSize:15}}>🔧 Tipos de tarea</p>
                <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem"}}>
                  <input style={{...S.input,flex:1}} placeholder="Nuevo tipo" value={newTipo} onChange={e=>setNewTipo(e.target.value)}/>
                  <button onClick={async()=>{if(!newTipo.trim())return;await saveTipos([...tipos,newTipo.trim()]);setNewTipo("");}} style={S.btn("#534AB7","#fff")}>+ Agregar</button>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {tipos.map(t=>(
                    <span key={t} style={{...S.tag("#EEEDFE","#534AB7","#AFA9EC"),display:"flex",alignItems:"center",gap:4}}>
                      {t}<button onClick={async()=>await saveTipos(tipos.filter(x=>x!==t))} style={{background:"none",border:"none",cursor:"pointer",color:"#534AB7",fontSize:12,padding:0}}>✕</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Gestión de personal */}
              <div style={S.section}>
                <p style={{margin:"0 0 1rem",fontWeight:500,fontSize:15}}>👤 Personal / Asignados</p>
                <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem"}}>
                  <input style={{...S.input,flex:1}} placeholder="Nombre o rol" value={newPersonal} onChange={e=>setNewPersonal(e.target.value)}/>
                  <button onClick={async()=>{
                    const n=newPersonal.trim();
                    if(!n||personal.includes(n))return;
                    await savePersonal([...personal,n]);setNewPersonal("");
                  }} style={S.btn("#185FA5","#fff")}>+ Agregar</button>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {personal.map(p=>(
                    <span key={p} style={{...S.tag("#E6F1FB","#185FA5","#85B7EB"),display:"flex",alignItems:"center",gap:4}}>
                      {p}
                      <button onClick={async()=>{
                        if(!window.confirm(`¿Eliminar a "${p}" de los asignados? Las tareas existentes no se modifican.`))return;
                        await savePersonal(personal.filter(x=>x!==p));
                      }} style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:12,padding:0}}>✕</button>
                    </span>
                  ))}
                </div>
              </div>

              <div style={S.section}>
                <p style={{margin:"0 0 0.75rem",fontWeight:500,fontSize:14}}>🔗 Estado de integraciones</p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{background:"#EAF3DE",border:"1px solid #97C459",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#3B6D11"}}>✅ Firebase AlmaDesk conectado</div>
                  <div style={{background:"#EAF3DE",border:"1px solid #97C459",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#3B6D11"}}>✅ App de Limpieza (solo lectura) conectada</div>
                  <div style={{background:"#E6F1FB",border:"1px solid #85B7EB",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#185FA5"}}>🔄 Polling: cada 60 segundos</div>
                  <div style={{background:"#FFF3E0",border:"1px solid #FFB74D",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#E65100",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>🔗 Procesados: {procesadosIds.size}</span>
                    <button onClick={async()=>{
                      if(!window.confirm("¿Reprocesar? Solo crea tareas que no existan aún."))return;
                      procesadosRef.current=new Set();setProcesadosIds(new Set());
                      await aSet("alma_procesados",[]);
                      showToast("✅ Reprocesando...");
                      setTimeout(checkReportes,2000);
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
          <TareaForm tarea={editando} edificios={edificios} tipos={tipos} personal={personal} onSave={saveTarea} onClose={()=>{setShowForm(false);setEditando(null);}}/>
        </Modal>
      )}
    </div>
  );
}

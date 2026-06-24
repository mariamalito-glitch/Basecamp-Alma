import { useState, useEffect, useRef, useCallback } from "react";

/* ════════════════════════════════════════════════════════════════
   CONFIG FIREBASE — reemplazá si corresponde
   ════════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════════
   CONSTANTES
   ════════════════════════════════════════════════════════════════ */
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
const ESTADOS_BOARD = ["Pendiente","Asignada","En curso","Pausada"];
const PERSONAL_INIT = ["Yo","Emiliano","Mauro","Mantenimiento Alma Rentals","Obra"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

const TODAY = new Date().toISOString().slice(0,10);
const CURRENT_MONTH = TODAY.slice(0,7);

/* ════════════════════════════════════════════════════════════════
   HISTORIAL INICIAL — restaurado + tareas de "TAREAS EMILIANO 24-06"
   (origen: documentos Word entregados; sirve como historial de trabajo)
   ════════════════════════════════════════════════════════════════ */
const HIST_INICIAL = [
  { id:1, titulo:"Colgar modem", edificio:"H475", depto:"1011", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 8390045# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:2, titulo:"Colgar modem / Colgar espejo / Limpieza de rejilla", edificio:"H475", depto:"1015", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 3821107# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:3, titulo:"Colgar modem", edificio:"H475", depto:"411", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 4163981#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:4, titulo:"Colgar modem", edificio:"H475", depto:"413", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 716685# · Horario: ANTES 12HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:5, titulo:"Colgar modem", edificio:"H475", depto:"104", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 5552219#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:6, titulo:"Colgar modem", edificio:"H475", depto:"405", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 5067028#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:7, titulo:"Colgar modem", edificio:"H475", depto:"409", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 2571112#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:8, titulo:"Colgar modem", edificio:"H475", depto:"1010", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 1964885# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:9, titulo:"Colgar espejo", edificio:"H475", depto:"3406", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 1409229#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:10, titulo:"Topes de alacena", edificio:"H475", depto:"1507", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 1352196#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:11, titulo:"Recolocar percheros baño", edificio:"H475", depto:"404", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 8822242#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:12, titulo:"Mampara salida", edificio:"H475", depto:"1514", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 0904217#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:13, titulo:"Llevar 1 colchón / Colgar tele de oficina / Poner black out en ventana", edificio:"H475", depto:"0311", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Código: 2779150#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:14, titulo:"Ruido puerta mampara", edificio:"H475", depto:"2508", tipo:"General", asignado:"Emiliano", urgencia:"Media", estado:"Completada", fechaCarga:"2025-06-03", fecha:"2025-06-03", fechaFin:"2025-06-03", descripcion:"Horario: HUÉSPED IN HOUSE", materiales:"", comentario:"", huespedAlerta:true, historial:["Importada del historial Word"] },
  { id:15, titulo:"Colgar modem / Nivelación de puertas", edificio:"H475", depto:"1004", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 6762806#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:16, titulo:"Colgar modem", edificio:"H475", depto:"208", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 2206405# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:17, titulo:"Colgar modem / Colgar espejo / Topes de alacena / Nivelación de puertas", edificio:"H475", depto:"1507", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 3409520#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:18, titulo:"Colgar modem / Nivelación de puertas", edificio:"H475", depto:"1005", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 1776203#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:19, titulo:"Colgar modem", edificio:"H475", depto:"1006", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 1560955# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:20, titulo:"Colgar modem", edificio:"H475", depto:"404", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 0834372#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:21, titulo:"Colgar modem / Estante bajo mesada caído / Nivelación de puertas", edificio:"H475", depto:"313", tipo:"Albañilería", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 0199682#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:22, titulo:"Tapa inodoro floja", edificio:"H475", depto:"1011", tipo:"Sanitaria", asignado:"Emiliano", urgencia:"Media", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 722080# · Horario: POST 11 PRE 15", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:23, titulo:"Tapa inodoro floja", edificio:"H475", depto:"1015", tipo:"Sanitaria", asignado:"Emiliano", urgencia:"Media", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 9768097# · Horario: POST 11", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:24, titulo:"Cajón de cubierto flojo", edificio:"H475", depto:"206", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 8069056#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:25, titulo:"Luz heladera", edificio:"H475", depto:"306", tipo:"Eléctrica", asignado:"Emiliano", urgencia:"Media", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 9831393#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:26, titulo:"Mover heladera a unidad 412", edificio:"H475", depto:"311", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"Código: 6124179#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:27, titulo:"Cortina roller", edificio:"H475", depto:"1012", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-05-20", fecha:"2025-05-20", fechaFin:"2025-05-20", descripcion:"", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:28, titulo:"Colgar modem", edificio:"H475", depto:"1007", tipo:"General", asignado:"Mauro", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 6454774#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:29, titulo:"Colgar modem", edificio:"H475", depto:"1504", tipo:"General", asignado:"Mauro", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 3910689# · Horario: ANTES 12HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:30, titulo:"Resolver modem y tapa", edificio:"H475", depto:"3508", tipo:"General", asignado:"Mauro", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 2466#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:31, titulo:"Colgar espejo", edificio:"H475", depto:"1510", tipo:"General", asignado:"Mauro", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 2491679# · Horario: ANTES 12HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:32, titulo:"Visagra bajomesada (comprar visagra nueva)", edificio:"H475", depto:"416", tipo:"Albañilería", asignado:"Mauro", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 4515097#", materiales:"Visagra nueva", comentario:"", historial:["Importada del historial Word"] },
  { id:33, titulo:"Tapar salida de lavavajillas", edificio:"H475", depto:"1012", tipo:"Sanitaria", asignado:"Mauro", urgencia:"Media", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 9339567# · Horario: POST 11 ANTES 14HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:34, titulo:"Olor a cloaca", edificio:"H475", depto:"1512", tipo:"Sanitaria", asignado:"Mauro", urgencia:"Media", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 860905# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:35, titulo:"Olor a cloaca", edificio:"H475", depto:"112", tipo:"Sanitaria", asignado:"Mauro", urgencia:"Media", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 96398511#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:36, titulo:"Olor a cloaca", edificio:"H475", depto:"1513", tipo:"Sanitaria", asignado:"Mauro", urgencia:"Media", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 2626712# · Horario: POST 11 ANTES 14HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:37, titulo:"Olor a cloaca", edificio:"H475", depto:"1005", tipo:"Sanitaria", asignado:"Mauro", urgencia:"Media", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:38, titulo:"Tapa inodoro floja", edificio:"H475", depto:"1011", tipo:"Sanitaria", asignado:"Mauro", urgencia:"Media", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 3821107# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:39, titulo:"Colocar sifón", edificio:"H475", depto:"412", tipo:"Sanitaria", asignado:"Mauro", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:40, titulo:"Tapa de freezer / Limpieza de rejillas", edificio:"QDB", depto:"32.2 RIO", tipo:"General", asignado:"Mauro", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 547903#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:41, titulo:"Limpieza de rejillas", edificio:"QDB", depto:"12.1 RIO", tipo:"General", asignado:"Mauro", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-10", fecha:"2025-06-10", fechaFin:"2025-06-10", descripcion:"Código: 305894#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:42, titulo:"No carga mochila", edificio:"H475", depto:"1510", tipo:"Eléctrica", asignado:"Emiliano", urgencia:"Media", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"Código: 8380160#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:43, titulo:"Canilla floja", edificio:"H475", depto:"3313", tipo:"Sanitaria", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"Código: 1472056#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:44, titulo:"Canilla de cocina", edificio:"H475", depto:"105", tipo:"Sanitaria", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"Código: 7914139#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:45, titulo:"Canilla de cocina", edificio:"H475", depto:"1502", tipo:"Sanitaria", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:46, titulo:"Tapa inodoro floja", edificio:"H475", depto:"1015", tipo:"Sanitaria", asignado:"Emiliano", urgencia:"Media", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"Código: 5778324# · Horario: PRE 12HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:47, titulo:"Madera abajo del horno", edificio:"H475", depto:"205", tipo:"Albañilería", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"Código: 1572011# · Horario: POST 11 PRE 13HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:48, titulo:"Tapar salida de lavavajillas / Colgar espejo", edificio:"H475", depto:"1012", tipo:"Sanitaria", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"Código: 0625814# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:49, titulo:"Mudar sillón", edificio:"H475", depto:"1006", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"Código: 9827357# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:50, titulo:"Puerta de entrada", edificio:"H475", depto:"1014", tipo:"Herrería", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"Código: 7780945# · Horario: POST 11HS", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:51, titulo:"Corrediza descalzada", edificio:"H475", depto:"405", tipo:"Albañilería", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-17", fecha:"2025-06-17", fechaFin:"2025-06-17", descripcion:"Código: 3902322#", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  // — Sumadas desde "TAREAS EMILIANO 24-06.docx" —
  { id:52, titulo:"Topes de alacena", edificio:"H475", depto:"1508", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-24", fecha:"2025-06-24", fechaFin:"2025-06-24", descripcion:"Resuelto (clave general 140610#)", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:53, titulo:"Visagra bajomesada", edificio:"H475", depto:"416", tipo:"Albañilería", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-24", fecha:"2025-06-24", fechaFin:"2025-06-24", descripcion:"Resuelto", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:54, titulo:"Madera horno arriba y rollers", edificio:"H475", depto:"3513", tipo:"Albañilería", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-24", fecha:"2025-06-24", fechaFin:"2025-06-24", descripcion:"Resuelto", materiales:"", comentario:"", historial:["Importada del historial Word"] },
  { id:55, titulo:"Cajón de los cubiertos salido", edificio:"H475", depto:"206", tipo:"General", asignado:"Emiliano", urgencia:"Baja", estado:"Completada", fechaCarga:"2025-06-24", fecha:"2025-06-24", fechaFin:"2025-06-24", descripcion:"Resuelto", materiales:"", comentario:"", historial:["Importada del historial Word"] },
];

/* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */
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
  const noMante=["olvido","olvide","perdido","perdida","objeto","ropa","vajilla","vaso","vasos","taza","plato","cubierto","falta reponer","reponer","amenities","toalla falta","sabana","papel higienico","shampoo","jabon","sucio","sucia","limpieza","mancha","basura","mugre"];
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

// ── Parser de documento Word/texto pegado → tareas estructuradas ──────────────
function parsearTextoTareas(texto) {
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const tareas = [];
  let edificioActual = "";
  let tareaActual = "";
  let personaActual = "";
  let fechaActual = TODAY;

  for (const l of lineas) {
    const mn = l.match(/TAREAS\s+(\w+)/i);
    if (mn) personaActual = mn[1].charAt(0).toUpperCase() + mn[1].slice(1).toLowerCase();
    const mf = l.match(/(\d{1,2})[\/\-_](\d{1,2})/);
    if (mf) {
      const now = new Date();
      fechaActual = `${now.getFullYear()}-${String(mf[2]).padStart(2,"0")}-${String(mf[1]).padStart(2,"0")}`;
    }
  }

  for (const l of lineas) {
    const lu = l.toUpperCase();
    if (lu.includes("HUERGO") || lu.includes("H475")) { edificioActual = "H475"; tareaActual = ""; continue; }
    if (lu.includes("QDB")) { edificioActual = "QDB"; tareaActual = ""; continue; }
    if (!edificioActual) continue;
    if (/^CLAVE/i.test(l) || /^LISTADO/i.test(l)) continue;

    const esDepto = /^\d{3,4}[\s\-–]/.test(l) || /^[A-Z0-9]+\.[0-9]+\s+RIO/.test(l);
    if (!esDepto && !l.includes("#") && l.length > 3 && !/^POST\s/i.test(l)) {
      tareaActual = l.replace(/^\*+|\*+$/g, "").replace(/\*/g, "").trim();
      continue;
    }

    const m = l.match(/^([0-9]{3,4}|[A-Z0-9]+\.[0-9]+\s+RIO)[\s\-–]+(.*)/);
    if (m) {
      const depto = m[1].trim();
      const resto = m[2];
      const codMatch = resto.match(/(\d{4,}#)/);
      const codigo = codMatch ? codMatch[1] : "";
      const horMatch = resto.match(/(POST\s+\d+HS|ANTES\s+DE\s+LAS\s+\d+HS|PRE\s+\d+HS|ANTES\s+\d+HS|HUÉSPED|HUESPED)/i);
      const horario = horMatch ? horMatch[1].toUpperCase() : "";
      if (tareaActual && edificioActual && depto) {
        tareas.push({
          titulo: tareaActual,
          edificio: edificioActual,
          depto,
          tipo: "General",
          asignado: personaActual || "Emiliano",
          urgencia: "Baja",
          estado: "Pendiente",
          fechaCarga: fechaActual,
          fecha: fechaActual,
          fechaFin: "",
          descripcion: [codigo ? `Código: ${codigo}` : "", horario ? `Horario: ${horario}` : ""].filter(Boolean).join(" · "),
          materiales: "",
          comentario: "",
          limpieza: false,
          recurrente: false,
          huespedAlerta: horario.includes("HUESPED") || horario.includes("HUÉSPED"),
          historial: ["Importada desde documento"],
        });
      }
    }
  }
  return tareas;
}

/* ════════════════════════════════════════════════════════════════
   FIREBASE
   ════════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ════════════════════════════════════════════════════════════════ */
const C = {
  bg: "#F8F7F4", card: "#FFFFFF", border: "#E5E3DC",
  blue: "#2563EB", blueLight: "#EFF6FF",
  text: "#111827", textMuted: "#6B7280", textLight: "#9CA3AF",
  danger: "#DC2626", dangerLight: "#FEF2F2",
  success: "#059669", successLight: "#ECFDF5",
  warn: "#D97706", warnLight: "#FFFBEB",
  purple: "#7C3AED", purpleLight: "#F5F3FF",
  teal: "#0D9488", tealLight: "#F0FDFA",
  shadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)",
  shadowLg: "0 10px 25px rgba(0,0,0,0.12)",
};
const SECTION_ACCENT = {
  dashboard: {c:"#2563EB", bg:"#EFF6FF", border:"#93C5FD"},
  tareas:    {c:"#2563EB", bg:"#EFF6FF", border:"#93C5FD"},
  semanal:   {c:"#7C3AED", bg:"#F5F3FF", border:"#C4B5FD"},
  cargar:    {c:"#0EA5E9", bg:"#F0F9FF", border:"#7DD3FC"},
  preventivo:{c:"#0D9488", bg:"#F0FDFA", border:"#5EEAD4"},
  edificios: {c:"#D97706", bg:"#FFFBEB", border:"#FCD34D"},
  historial: {c:"#059669", bg:"#ECFDF5", border:"#6EE7B7"},
  reportes:  {c:"#DC2626", bg:"#FEF2F2", border:"#FCA5A5"},
  informes:  {c:"#4B5563", bg:"#F3F4F6", border:"#D1D5DB"},
  config:    {c:"#374151", bg:"#F3F4F6", border:"#D1D5DB"},
};

const inp = {width:"100%",boxSizing:"border-box",fontSize:14,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"#fff",color:C.text,outline:"none"};
const btn = (bg,col,bd)=>({background:bg||"#fff",color:col||C.text,border:`1.5px solid ${bd||bg||C.border}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:500,fontSize:14,display:"inline-flex",alignItems:"center",gap:6,transition:"opacity 0.15s"});
const pill = (bg,col,bd)=>({background:bg,color:col,border:`1px solid ${bd}`,borderRadius:20,fontSize:11,fontWeight:600,padding:"3px 10px",whiteSpace:"nowrap",display:"inline-block"});

/* ════════════════════════════════════════════════════════════════
   COMPONENTES BASE
   ════════════════════════════════════════════════════════════════ */
function Badge({label,bg,text,border}){ return <span style={pill(bg,text,border)}>{label}</span>; }

function Toast({msg,tipo}){
  return(
    <div style={{position:"fixed",top:16,right:16,zIndex:9999,background:tipo==="err"?"#DC2626":"#1D4ED8",color:"#fff",borderRadius:10,padding:"12px 20px",fontSize:14,fontWeight:600,boxShadow:C.shadowLg,maxWidth:380,display:"flex",alignItems:"center",gap:8}}>
      <span>{tipo==="err"?"⚠️":"✅"}</span>{msg}
    </div>
  );
}

function Modal({onClose,children,wide,title,accent}){
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",backdropFilter:"blur(2px)"}}>
      <div style={{background:"#fff",borderRadius:20,padding:"0",width:"100%",maxWidth:wide?860:580,maxHeight:"92vh",overflowY:"auto",boxShadow:C.shadowLg,borderTop:accent?`5px solid ${accent}`:"none"}}>
        {title&&(
          <div style={{padding:"1.25rem 1.5rem",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>{title}</h2>
            <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.textMuted,lineHeight:1,padding:"2px 6px",borderRadius:6}}>✕</button>
          </div>
        )}
        <div style={{padding:"1.5rem"}}>{children}</div>
      </div>
    </div>
  );
}

function SectionHeader({icon,title,subtitle,accentKey,right}){
  const a = SECTION_ACCENT[accentKey];
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.75rem",
      marginBottom:"1.25rem",paddingBottom:"0.85rem",borderBottom:`2px solid ${a.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:a.bg,border:`1px solid ${a.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{icon}</div>
        <div>
          <p style={{margin:0,fontWeight:800,fontSize:17,color:C.text}}>{title}</p>
          {subtitle&&<p style={{margin:"1px 0 0",fontSize:12.5,color:C.textMuted}}>{subtitle}</p>}
        </div>
      </div>
      {right&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{right}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TARJETA / MINI-CARD DE TAREA
   ════════════════════════════════════════════════════════════════ */
function TareaCard({t, onEdit, onEstado, onDelete, onComentario, onIniciar}){
  const [open, setOpen] = useState(false);
  const [com, setCom] = useState(t.comentario||"");
  const urg = urgStyle(t.urgencia);
  const est = estColor(t.estado);
  const foto = t.foto||t.fotoReporte||null;
  const esComp = t.estado==="Completada";

  return(
    <div style={{background:"#fff", border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden",
      marginBottom:10, boxShadow:C.shadow, borderLeft:`4px solid ${urg.dot}`, opacity: esComp ? 0.75 : 1}}>
      <div style={{padding:"12px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:7}}>
              <Badge label={t.urgencia} bg={urg.bg} text={urg.text} border={urg.border}/>
              <Badge label={t.estado} bg={est.bg} text={est.text} border={est.border}/>
              <Badge label={t.tipo} bg="#F3F4F6" text="#374151" border="#D1D5DB"/>
              {t.huespedAlerta && <Badge label="⚠ Huésped" bg="#FEF2F2" text="#991B1B" border="#FCA5A5"/>}
              {t.recurrente && <Badge label="🔁 Mensual" bg="#DBEAFE" text="#1E40AF" border="#93C5FD"/>}
              {t.origen==="reporte" && <Badge label="🔗 Reporte" bg="#FEF3C7" text="#92400E" border="#FCD34D"/>}
              {t.limpieza && <Badge label="🧹 Limpieza" bg="#EDE9FE" text="#5B21B6" border="#C4B5FD"/>}
            </div>
            <p style={{margin:"0 0 5px",fontWeight:700,fontSize:15,color:C.text,lineHeight:1.3,textDecoration: esComp ? "line-through" : "none"}}>{t.titulo}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:"10px 16px",fontSize:12,color:C.textMuted}}>
              <span>🏢 <strong style={{color:C.text}}>{t.edificio}</strong> · {t.depto||"—"}</span>
              <span>👤 <strong style={{color:C.text}}>{t.asignado}</strong></span>
              {t.fecha && <span>📅 {fmtDate(t.fecha)}{t.fechaFin?` → ${fmtDate(t.fechaFin)}`:""}</span>}
              {t.materiales && <span>🔧 {t.materiales}</span>}
            </div>
          </div>
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
      {open && (
        <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 16px",background:"#FAFAF9"}}>
          {t.descripcion && <p style={{fontSize:13,margin:"0 0 10px",color:C.textMuted,lineHeight:1.5}}>{t.descripcion}</p>}
          {foto && <img src={foto} alt="foto" style={{marginBottom:10,maxWidth:"100%",maxHeight:200,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}`,cursor:"zoom-in",display:"block"}} onClick={()=>window.open(foto,"_blank")}/>}
          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:4}}>💬 Comentario interno</label>
            <textarea style={{...inp,resize:"vertical",fontSize:13,minHeight:56}} rows={2} value={com} onChange={e=>setCom(e.target.value)} placeholder="Notas internas..."/>
            <button onClick={()=>onComentario(t.id,com)} style={{...btn(C.blue,"#fff",C.blue),marginTop:5,padding:"5px 13px",fontSize:12}}>💾 Guardar nota</button>
          </div>
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

function TareaMini({t, onClick}){
  const urg = urgStyle(t.urgencia);
  return(
    <div onClick={onClick} style={{background:"#fff",border:`1px solid ${C.border}`,borderLeft:`3px solid ${urg.dot}`,borderRadius:10,padding:"9px 11px",marginBottom:8,cursor:"pointer",boxShadow:C.shadow}}>
      <div style={{display:"flex",gap:5,marginBottom:5,flexWrap:"wrap"}}>
        <Badge label={t.urgencia} bg={urg.bg} text={urg.text} border={urg.border}/>
        {t.huespedAlerta && <Badge label="⚠" bg="#FEF2F2" text="#991B1B" border="#FCA5A5"/>}
        {t.origen==="reporte" && <Badge label="🔗" bg="#FEF3C7" text="#92400E" border="#FCD34D"/>}
      </div>
      <p style={{margin:"0 0 3px",fontWeight:700,fontSize:13,color:C.text,lineHeight:1.3}}>{t.titulo}</p>
      <p style={{margin:0,fontSize:11,color:C.textMuted}}>🏢 {t.edificio}·{t.depto} · 👤 {t.asignado}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FORMULARIO DE TAREA
   ════════════════════════════════════════════════════════════════ */
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
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5}}>Edificio</label>
          <select style={inp} value={f.edificio} onChange={e=>{set("edificio",e.target.value);set("depto","");}}>
            {Object.keys(edificios).map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
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
        <input type="file" accept="image/*" capture="environment" onChange={e=>{const fl=e.target.files[0];if(!fl)return;resizePhoto(fl,d=>set("foto",d));}} style={{...inp,padding:"7px",cursor:"pointer"}}/>
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

/* ════════════════════════════════════════════════════════════════
   VISTA SEMANAL — con impresión de planilla del día
   ════════════════════════════════════════════════════════════════ */
function PlanillaImprimible({tareas, fecha, persona, onClose}){
  const ts = tareas.filter(t => (t.fechaTrabajo||t.fecha)===fecha && (persona==="Todos"||t.asignado===persona) && t.estado!=="Completada");
  const urgentes = ts.filter(t=>t.urgencia==="Urgente");
  const resto = ts.filter(t=>t.urgencia!=="Urgente");
  return(
    <Modal onClose={onClose} wide title="Planilla para entregar al personal" accent={SECTION_ACCENT.semanal.c}>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"0.75rem"}}>
        <button onClick={()=>window.print()} style={btn(C.blue,"#fff",C.blue)}>🖨️ Imprimir</button>
      </div>
      <div id="print-area">
        <h2 style={{margin:"0 0 2px",fontSize:18}}>Tareas — {persona} — {fmtDate(fecha)}</h2>
        <p style={{margin:"0 0 12px",fontSize:12,color:C.textMuted}}>{ts.length} tareas · Edificios: {[...new Set(ts.map(t=>t.edificio))].join(", ")||"—"}</p>
        {urgentes.length>0&&(
          <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,padding:"8px 12px",marginBottom:10,fontWeight:700,color:"#991B1B",fontSize:13}}>
            ⚡ URGENTES: {urgentes.map(t=>`${t.edificio} ${t.depto} — ${t.titulo}`).join(" / ")}
          </div>
        )}
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{background:"#F3F4F6"}}>
            {["Edif.","Depto","Tarea","Detalle","Asignado","✓"].map(h=>(
              <th key={h} style={{padding:"6px 8px",textAlign:"left",fontSize:11,borderBottom:"1px solid #E5E7EB"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[...urgentes,...resto].map(t=>(
              <tr key={t.id} style={{borderBottom:"1px solid #F3F4F6"}}>
                <td style={{padding:"6px 8px",fontWeight:600}}>{t.edificio}</td>
                <td style={{padding:"6px 8px",fontWeight:600}}>{t.depto}</td>
                <td style={{padding:"6px 8px"}}>{t.titulo}</td>
                <td style={{padding:"6px 8px",fontSize:11,color:C.textMuted}}>{t.descripcion||"—"}{t.materiales?` · Materiales: ${t.materiales}`:""}</td>
                <td style={{padding:"6px 8px"}}>{t.asignado}</td>
                <td style={{padding:"6px 8px"}}>☐</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ts.length===0&&<p style={{color:C.textMuted,fontSize:13}}>Sin tareas para esta fecha/persona.</p>}
      </div>
      <style>{`@media print { body > *:not(#print-area) { display:none !important } #print-area{ display:block !important } }`}</style>
    </Modal>
  );
}

function VistaSemanal({tareas, personal, onMoverTarea, onEdit, onQuitarDia, onEstado, onIniciar}){
  const [weekOff, setWeekOff] = useState(0);
  const [dragging, setDragging] = useState(null);
  const [editInline, setEditInline] = useState(null);
  const [printSel, setPrintSel] = useState(null); // {fecha, persona}
  const weekDays = getWeekDays(weekOff);
  const rangoLabel = `${fmtDate(weekDays[0])} — ${fmtDate(weekDays[6])}`;
  const a = SECTION_ACCENT.semanal;

  function onDragStart(e,t){ setDragging(t); e.dataTransfer.effectAllowed="move"; }
  function onDrop(e,iso){ e.preventDefault(); if(!dragging)return; onMoverTarea(dragging.id,iso); setDragging(null); }
  function onDragOver(e){ e.preventDefault(); }

  function MiniCard({t}){
    const urg = urgStyle(t.urgencia);
    const est = estColor(t.estado);
    return(
      <div draggable onDragStart={e=>onDragStart(e,t)}
        style={{background:"#fff",border:`1px solid ${C.border}`,borderLeft:`3px solid ${urg.dot}`,borderRadius:8,padding:"6px 8px",marginBottom:4,cursor:"grab",fontSize:11}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:3}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:"0 0 1px",fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>{t.titulo}</p>
            <p style={{margin:0,color:C.textMuted,fontSize:10}}>{t.edificio}·{t.depto} · {t.asignado}</p>
            <span style={pill(est.bg,est.text,est.border)}>{t.estado}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
            <button onClick={e=>{e.stopPropagation();setEditInline(t);}} title="Editar" style={{background:C.blueLight,border:"none",borderRadius:4,width:18,height:18,fontSize:9,cursor:"pointer"}}>✏️</button>
            {t.estado==="En curso"&&<button onClick={e=>{e.stopPropagation();onEstado(t.id,"Completada");}} title="Completar" style={{background:C.successLight,border:"none",borderRadius:4,width:18,height:18,fontSize:9,cursor:"pointer"}}>✔</button>}
            {(t.estado==="Pendiente"||t.estado==="Asignada")&&<button onClick={e=>{e.stopPropagation();onIniciar(t);}} title="Iniciar" style={{background:C.blueLight,border:"none",borderRadius:4,width:18,height:18,fontSize:9,cursor:"pointer"}}>▶</button>}
            {t.fechaTrabajo&&<button onClick={e=>{e.stopPropagation();onQuitarDia(t.id);}} title="Quitar día" style={{background:"#F3F4F6",border:"none",borderRadius:4,width:18,height:18,fontSize:9,cursor:"pointer"}}>↩</button>}
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
        style={{minHeight:170,background:esHoy?a.bg:"#F9FAFB",border:`2px ${esHoy?"solid "+a.c:"dashed #D1D5DB"}`,borderRadius:12,padding:"8px 6px",transition:"all 0.15s"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{textAlign:"left"}}>
            <p style={{margin:0,fontSize:11,fontWeight:700,color:esHoy?a.c:C.textMuted,textTransform:"uppercase"}}>{DIAS[d.getDay()]}</p>
            <p style={{margin:0,fontSize:13,fontWeight:esHoy?700:400,color:esHoy?a.c:C.text}}>{d.getDate()}</p>
          </div>
          {ts.length>0&&(
            <button onClick={()=>setPrintSel({fecha:iso,persona:"Todos"})} title="Imprimir planilla del día" style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:6,width:22,height:22,fontSize:11,cursor:"pointer"}}>🖨️</button>
          )}
        </div>
        {ts.map(t=><MiniCard key={t.id} t={t}/>)}
        {ts.length===0&&<p style={{fontSize:10,color:C.textLight,textAlign:"center",marginTop:8}}>Sin tareas</p>}
      </div>
    );
  }

  const sinDia=sortDesc(tareas.filter(t=>t.estado!=="Completada"&&!t.fechaTrabajo));

  return(
    <div>
      {printSel&&<PlanillaImprimible tareas={tareas} fecha={printSel.fecha} persona={printSel.persona} onClose={()=>setPrintSel(null)}/>}
      {editInline&&(
        <Modal onClose={()=>setEditInline(null)} title={`Editar: ${editInline.titulo}`} wide accent={a.c}>
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
          <p style={{margin:"0 0 0.5rem",fontSize:13,color:C.textMuted}}>Para editar todos los campos, usá el botón ✏️ en la pestaña Tareas.</p>
        </Modal>
      )}
      <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1rem",flexWrap:"wrap"}}>
        <button onClick={()=>setWeekOff(o=>o-1)} style={{...btn(),padding:"7px 14px"}}>◀</button>
        <div style={{flex:1,textAlign:"center"}}><p style={{margin:0,fontWeight:700,fontSize:15,color:C.text}}>{rangoLabel}</p></div>
        <button onClick={()=>setWeekOff(0)} style={{...btn(weekOff===0?a.c:"#fff",weekOff===0?"#fff":C.text,weekOff===0?a.c:C.border),padding:"7px 14px",fontSize:12}}>Hoy</button>
        <button onClick={()=>setWeekOff(o=>o+1)} style={{...btn(),padding:"7px 14px"}}>▶</button>
        <button onClick={()=>setPrintSel({fecha:TODAY,persona:"Todos"})} style={btn(a.c,"#fff",a.c)}>🖨️ Planilla de hoy</button>
      </div>
      <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:10,padding:"8px 14px",marginBottom:"1rem",fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:6}}>
        💡 Arrastrá tarjetas al día deseado. Usá el ícono 🖨️ en cada día para imprimir la planilla que le entregás al personal.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,marginBottom:"1.5rem"}}>
        {weekDays.map(iso=><DiaCol key={iso} iso={iso}/>)}
      </div>
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

/* ════════════════════════════════════════════════════════════════
   CARGAR DOCUMENTO — parser de Word/texto
   ════════════════════════════════════════════════════════════════ */
function CargarDocumento({onImportar, showToast}){
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  function procesar(){
    const p = parsearTextoTareas(texto);
    setPreview(p);
    setShowPreview(true);
    if(p.length===0) showToast("No se detectaron tareas. Revisá el formato.","err");
  }

  return(
    <div>
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",marginBottom:"1rem",boxShadow:C.shadow}}>
        <p style={{margin:"0 0 0.5rem",fontWeight:700,fontSize:15}}>Pegá el texto del documento (Word / mail / lista)</p>
        <p style={{margin:"0 0 0.75rem",fontSize:13,color:C.textMuted}}>
          Formato esperado: encabezado <code>TAREAS [PERSONA] (MANTENIMIENTO) [DD/MM]</code>, luego <code>HUERGO</code> o <code>QDB</code>,
          después el nombre de la tarea en una línea, y debajo cada depto con su código: <code>1011 – 8390045# (POST 11HS)</code>.
          El sistema reconoce automáticamente persona, fecha, edificio, depto, código y horario.
        </p>
        <textarea
          style={{...inp,resize:"vertical",minHeight:220,fontFamily:"monospace",fontSize:12}}
          placeholder={"TAREAS EMILIANO (MANTENIMIENTO) 24/06 (8HS)\n\nHUERGO\n\nTOPES DE ALACENA\n1508 - 1234567#\n\nVISAGRA BAJOMESADA\n416 - 7654321#"}
          value={texto}
          onChange={e=>setTexto(e.target.value)}
        />
        <div style={{display:"flex",gap:6,marginTop:"0.75rem",justifyContent:"flex-end"}}>
          <button onClick={()=>{setTexto("");setPreview([]);setShowPreview(false);}} style={btn()}>Limpiar</button>
          <button onClick={procesar} style={btn(SECTION_ACCENT.cargar.c,"#fff",SECTION_ACCENT.cargar.c)}>🔎 Procesar texto</button>
        </div>
      </div>

      {showPreview && preview.length>0 && (
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",boxShadow:C.shadow}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
            <p style={{margin:0,fontWeight:700}}>{preview.length} tareas detectadas</p>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{setShowPreview(false);setPreview([]);}} style={btn()}>Cancelar</button>
              <button onClick={()=>{onImportar(preview);setPreview([]);setShowPreview(false);setTexto("");}} style={btn(C.success,"#fff",C.success)}>✔ Importar todas</button>
            </div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#F3F4F6"}}>
              {["Asignado","Fecha","Edif.","Depto","Tarea","Detalle"].map(h=><th key={h} style={{padding:"5px 8px",textAlign:"left",fontSize:11,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {preview.map((t,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"5px 8px"}}>{t.asignado}</td>
                  <td style={{padding:"5px 8px"}}>{fmtDate(t.fechaCarga)}</td>
                  <td style={{padding:"5px 8px"}}>{t.edificio}</td>
                  <td style={{padding:"5px 8px",fontWeight:600}}>{t.depto}</td>
                  <td style={{padding:"5px 8px"}}>{t.titulo}</td>
                  <td style={{padding:"5px 8px",fontSize:11,color:C.textMuted}}>{t.descripcion||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PREVENTIVO
   ════════════════════════════════════════════════════════════════ */
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
  const a = SECTION_ACCENT.preventivo;

  useEffect(()=>{
    if(!tareasCompletadas?.length||!tareas.length) return;
    let changed=false;
    const newCeldas={...celdas};
    for(const {ed,dep} of allDeptos){
      for(const tarea of tareas){
        const k=celKey(ed,dep,tarea);
        if(newCeldas[k]?.done) continue;
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
              <Badge label={`${p}% · ${dn}/${tot}`} bg={p===100?C.successLight:a.bg} text={p===100?C.success:a.c} border={p===100?"#6EE7B7":a.border}/>
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
        <p style={{margin:0,fontSize:13,color:C.textMuted}}>{done} de {total} items completados</p>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          <button onClick={()=>setVerHist(true)} style={btn()}>📋 Historial ({historial.length})</button>
          <button onClick={cerrarMes} style={btn(C.warnLight,C.warn,"#FCD34D")}>📦 Cerrar mes</button>
        </div>
      </div>
      <div style={{marginBottom:"1.25rem",background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",boxShadow:C.shadow}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:600,color:C.text}}>Progreso de {mesLabel}</span>
          <span style={{fontSize:14,fontWeight:700,color:pct===100?C.success:a.c}}>{pct}%</span>
        </div>
        <div style={{background:"#E5E7EB",borderRadius:99,height:12,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:pct===100?C.success:a.c,borderRadius:99,transition:"width 0.5s"}}/>
        </div>
      </div>
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",marginBottom:"1.25rem",boxShadow:C.shadow}}>
        <p style={{margin:"0 0 0.75rem",fontWeight:600,fontSize:14}}>➕ Agregar tipo de tarea preventiva</p>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <input style={{...inp,flex:1}} placeholder="Ej: Revisión matafuegos, Limpieza tanque..." value={newTarea} onChange={e=>setNewTarea(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addTarea();}}/>
          <button onClick={addTarea} style={btn(a.c,"#fff",a.c)}>+ Agregar</button>
        </div>
        {tareas.length>0&&(
          <div style={{marginTop:"0.75rem",display:"flex",flexWrap:"wrap",gap:6}}>
            {tareas.map(t=>(
              <span key={t} style={{...pill(a.bg,a.c,a.border),display:"flex",alignItems:"center",gap:4}}>
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
                        <td key={tarea} style={{padding:"6px 8px",border:`1px solid ${C.border}`,textAlign:"center",background:isDone?C.successLight:"#fff",cursor:"pointer"}}
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

/* ════════════════════════════════════════════════════════════════
   HISTORIAL
   ════════════════════════════════════════════════════════════════ */
function Historial({tareas, edificios, onEdit, onEstado, onDelete, onComentario, onIniciar}){
  const [filtro, setFiltro] = useState({edificio:"",depto:"",tipo:"",mes:""});
  const [expanded, setExpanded] = useState({});
  const completadas = tareas.filter(t=>t.estado==="Completada");
  const filtradas = completadas.filter(t=>{
    if(filtro.edificio && t.edificio!==filtro.edificio) return false;
    if(filtro.depto && t.depto!==filtro.depto) return false;
    if(filtro.tipo && t.tipo!==filtro.tipo) return false;
    if(filtro.mes && !(t.fechaFin||t.fecha||"").startsWith(filtro.mes)) return false;
    return true;
  });
  const porMes = {};
  filtradas.forEach(t=>{
    const d = t.fechaFin||t.fechaCarga||t.fecha||TODAY;
    const mes = d.slice(0,7);
    if(!porMes[mes]) porMes[mes]=[];
    porMes[mes].push(t);
  });
  const mesesOrdenados = Object.keys(porMes).sort((a,b)=>b.localeCompare(a));
  const deptosParaFiltro = filtro.edificio ? (edificios[filtro.edificio]||[]) : [];
  const mesesDisponibles = [...new Set(completadas.map(t=>(t.fechaFin||t.fechaCarga||t.fecha||"").slice(0,7)).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
  const tiposDisponibles = [...new Set(completadas.map(t=>t.tipo).filter(Boolean))];
  const mesLabel = m => { const [y,mo] = m.split("-"); return `${MONTHS[parseInt(mo)-1]} ${y}`; };

  return(
    <div>
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
          const isOpen=expanded[mes]!==false;
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

/* ════════════════════════════════════════════════════════════════
   REPORTES (Limpieza → Mantenimiento)
   ════════════════════════════════════════════════════════════════ */
function Reportes({tareas, procesadosIds, onReprocesar}){
  const a = SECTION_ACCENT.reportes;
  const [reportesCrudos, setReportesCrudos] = useState([]);
  useEffect(()=>{ (async()=>{ try{ const r = await lGet("lim_reports"); setReportesCrudos(Array.isArray(r)?r:[]); }catch{ setReportesCrudos([]); } })(); },[]);

  return(
    <div>
      <div style={{background:a.bg,border:`1px solid ${a.border}`,borderRadius:10,padding:"10px 14px",marginBottom:"1.25rem",fontSize:13,color:"#991B1B",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <span>🔗 Reportes que vienen de la app de Limpieza. El clasificador detecta cuáles son de mantenimiento y crea la tarea automáticamente.</span>
        <button onClick={onReprocesar} style={{...btn("#fff",a.c,a.border),fontSize:12,padding:"5px 12px"}}>🔄 Reprocesar todos</button>
      </div>
      {reportesCrudos.map(rep=>{
        const yaTiene = tareas.some(t=>String(t.reporteId)===String(rep.id));
        const tareaVinc = tareas.find(t=>String(t.reporteId)===String(rep.id));
        const clasif = clasificarReporte(rep.comentario);
        return(
          <div key={rep.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem 1.25rem",marginBottom:"0.75rem",boxShadow:C.shadow,
            borderLeft:`4px solid ${clasif.esMantenimiento ? a.c : C.textLight}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                  <Badge label={rep.depto} bg="#F3F4F6" text={C.text} border={C.border}/>
                  <Badge label={fmtDate(rep.fecha)} bg="#F3F4F6" text={C.textMuted} border={C.border}/>
                  {clasif.esMantenimiento
                    ? <Badge label={`🔧 ${clasif.tipo}`} bg={a.bg} text={a.c} border={a.border}/>
                    : <Badge label="🧹 No es mantenimiento" bg="#F3F4F6" text={C.textMuted} border={C.border}/>}
                </div>
                <p style={{margin:"0 0 4px",fontSize:14,color:C.text}}>"{rep.comentario}"</p>
                <p style={{margin:0,fontSize:11,color:C.textLight}}>Reportado por {rep.asignado||"Personal de limpieza"}</p>
              </div>
              <div>
                {clasif.esMantenimiento
                  ? (yaTiene
                    ? <Badge label={`✅ Tarea creada (${tareaVinc?.estado})`} bg={C.successLight} text={C.success} border="#6EE7B7"/>
                    : <Badge label="⏳ Procesando..." bg={C.warnLight} text={C.warn} border="#FCD34D"/>)
                  : <Badge label="— Sin acción" bg="#F3F4F6" text={C.textLight} border={C.border}/>
                }
              </div>
            </div>
          </div>
        );
      })}
      {reportesCrudos.length===0&&<div style={{textAlign:"center",padding:"3rem",color:C.textMuted}}><p style={{fontSize:40}}>📭</p><p>No hay reportes de limpieza pendientes.</p></div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   INFORMES — reporte mensual imprimible (personal / edificio / preventivo)
   ════════════════════════════════════════════════════════════════ */
function Informes({tareas, personal, edificios, prevData}){
  const [mes, setMes] = useState(CURRENT_MONTH);
  const [tipo, setTipo] = useState("personal"); // personal | edificio | preventivo
  const a = SECTION_ACCENT.informes;

  const completadasMes = tareas.filter(t=>t.estado==="Completada" && (t.fechaFin||t.fecha||"").startsWith(mes));
  const porPersona = {};
  completadasMes.forEach(t=>{ (porPersona[t.asignado]=porPersona[t.asignado]||[]).push(t); });
  const porEdificio = {};
  completadasMes.forEach(t=>{ (porEdificio[t.edificio]=porEdificio[t.edificio]||[]).push(t); });

  const allDeptos = [];
  Object.entries(edificios).forEach(([ed,ds])=>ds.forEach(dep=>allDeptos.push({ed,dep})));
  const prevTareas = prevData?.tareas||[];
  const prevCeldas = (prevData?.meses||{})[mes] || {};
  const prevTotal = allDeptos.length*prevTareas.length;
  const prevDone = Object.values(prevCeldas).filter(v=>v?.done).length;
  const prevPct = prevTotal>0?Math.round(prevDone/prevTotal*100):0;

  const mesesDisponibles = [...new Set(tareas.filter(t=>t.estado==="Completada").map(t=>(t.fechaFin||t.fecha||"").slice(0,7)).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
  if(!mesesDisponibles.includes(CURRENT_MONTH)) mesesDisponibles.unshift(CURRENT_MONTH);
  const mesLabel = m => { const [y,mo]=m.split("-"); return `${MONTHS[parseInt(mo)-1]} ${y}`; };

  return(
    <div>
      <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",marginBottom:"1.25rem",alignItems:"center"}}>
        <select style={{...inp,width:"auto"}} value={mes} onChange={e=>setMes(e.target.value)}>
          {mesesDisponibles.map(m=><option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <div style={{display:"flex",gap:4}}>
          {[["personal","👤 Por persona"],["edificio","🏢 Por edificio/obra"],["preventivo","🔧 Preventivo"]].map(([k,lbl])=>(
            <button key={k} onClick={()=>setTipo(k)} style={{...btn(tipo===k?a.c:"#fff",tipo===k?"#fff":C.text,tipo===k?a.c:C.border)}}>{lbl}</button>
          ))}
        </div>
        <div style={{flex:1}}/>
        <button onClick={()=>window.print()} style={btn(C.blue,"#fff",C.blue)}>🖨️ Imprimir informe</button>
      </div>

      <div id="print-area" style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:"1.5rem",boxShadow:C.shadow}}>
        <h2 style={{margin:"0 0 4px",fontSize:18}}>Informe mensual — {mesLabel(mes)}</h2>
        <p style={{margin:"0 0 1rem",fontSize:12,color:C.textMuted}}>
          {tipo==="personal" && "Tareas completadas por persona"}
          {tipo==="edificio" && "Tareas completadas por edificio / obra"}
          {tipo==="preventivo" && "Avance del plan preventivo mensual"}
        </p>

        {tipo==="personal" && (
          Object.keys(porPersona).length===0
            ? <p style={{color:C.textMuted,fontSize:13}}>Sin tareas completadas este mes.</p>
            : Object.entries(porPersona).map(([p,ts])=>(
              <div key={p} style={{marginBottom:"1.25rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <p style={{margin:0,fontWeight:700,fontSize:14}}>👤 {p}</p>
                  <Badge label={`${ts.length} completadas`} bg={C.successLight} text={C.success} border="#6EE7B7"/>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:"#F3F4F6"}}>
                    {["Fecha","Edif.","Depto","Tarea","Tipo"].map(h=><th key={h} style={{padding:"4px 8px",textAlign:"left",fontSize:11,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ts.map(t=>(
                      <tr key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:"4px 8px"}}>{fmtDate(t.fechaFin||t.fecha)}</td>
                        <td style={{padding:"4px 8px"}}>{t.edificio}</td>
                        <td style={{padding:"4px 8px",fontWeight:600}}>{t.depto}</td>
                        <td style={{padding:"4px 8px"}}>{t.titulo}</td>
                        <td style={{padding:"4px 8px",color:C.textMuted}}>{t.tipo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
        )}

        {tipo==="edificio" && (
          Object.keys(porEdificio).length===0
            ? <p style={{color:C.textMuted,fontSize:13}}>Sin tareas completadas este mes.</p>
            : Object.entries(porEdificio).map(([ed,ts])=>(
              <div key={ed} style={{marginBottom:"1.25rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <p style={{margin:0,fontWeight:700,fontSize:14}}>🏢 {ed}</p>
                  <Badge label={`${ts.length} completadas`} bg={C.successLight} text={C.success} border="#6EE7B7"/>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:"#F3F4F6"}}>
                    {["Fecha","Depto","Tarea","Tipo","Asignado"].map(h=><th key={h} style={{padding:"4px 8px",textAlign:"left",fontSize:11,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ts.map(t=>(
                      <tr key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:"4px 8px"}}>{fmtDate(t.fechaFin||t.fecha)}</td>
                        <td style={{padding:"4px 8px",fontWeight:600}}>{t.depto}</td>
                        <td style={{padding:"4px 8px"}}>{t.titulo}</td>
                        <td style={{padding:"4px 8px",color:C.textMuted}}>{t.tipo}</td>
                        <td style={{padding:"4px 8px"}}>{t.asignado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
        )}

        {tipo==="preventivo" && (
          prevTareas.length===0
            ? <p style={{color:C.textMuted,fontSize:13}}>No hay tipos de tarea preventiva configurados.</p>
            : <>
              <div style={{marginBottom:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600}}>Avance general</span>
                  <span style={{fontWeight:700,color:prevPct===100?C.success:a.c}}>{prevPct}% ({prevDone}/{prevTotal})</span>
                </div>
                <div style={{background:"#E5E7EB",borderRadius:99,height:10,overflow:"hidden"}}>
                  <div style={{width:`${prevPct}%`,height:"100%",background:prevPct===100?C.success:a.c}}/>
                </div>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr>
                  <th style={{padding:"5px 8px",background:"#F3F4F6",border:`1px solid ${C.border}`,textAlign:"left"}}>Depto</th>
                  {prevTareas.map(t=><th key={t} style={{padding:"5px 8px",background:"#F3F4F6",border:`1px solid ${C.border}`,textAlign:"center"}}>{t}</th>)}
                </tr></thead>
                <tbody>
                  {allDeptos.map(({ed,dep},ri)=>(
                    <tr key={`${ed}-${dep}`} style={{background:ri%2===0?"#fff":"#FAFAFA"}}>
                      <td style={{padding:"5px 8px",border:`1px solid ${C.border}`,fontWeight:600}}>{ed}·{dep}</td>
                      {prevTareas.map(t=>{
                        const v = prevCeldas[`${ed}|${dep}|${t}`];
                        return <td key={t} style={{padding:"5px 8px",border:`1px solid ${C.border}`,textAlign:"center",background:v?.done?C.successLight:"#fff"}}>{v?.done?"✓":"—"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
        )}
      </div>
      <style>{`@media print { body > *:not(#print-area) { display:none !important } #print-area{ display:block !important } }`}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   APP PRINCIPAL
   ════════════════════════════════════════════════════════════════ */
export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [tareas,setTareasState]=useState([]);
  const [edificios,setEdificiosState]=useState(EDIFICIOS_INIT);
  const [tipos,setTiposState]=useState(TIPOS_INIT);
  const [personal,setPersonalState]=useState(PERSONAL_INIT);
  const [prevData,setPrevDataState]=useState({tareas:[],meses:{},historial:[]});
  const [showForm,setShowForm]=useState(false);
  const [editando,setEditando]=useState(null);
  const [filtro,setFiltro]=useState({edificio:"",depto:"",urgencia:"",tipo:"",asignado:""});
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
        // Si no hay tareas guardadas en Firebase todavía, sembramos con el historial inicial
        if(t && t.length>0){ setTareasState(dedup(t)); }
        else { setTareasState(HIST_INICIAL); await aSet("alma_tasks", HIST_INICIAL); }
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
        if(tareasAct.some(t=>String(t.reporteId)===String(rep.id)))continue;
        let ed="",dep="";
        const m=(rep.depto||"").trim().match(/^(QDB|H475|qdb|h475)\s*(.+)$/i);
        if(m){ed=m[1].toUpperCase();dep=m[2].trim();}else{ed="H475";dep=(rep.depto||"").trim();}
        const titulo=capitalizar(rep.comentario.slice(0,60));
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

  const reprocesarReportes=useCallback(async()=>{
    procesadosRef.current=new Set();
    setProcesadosIds(new Set());
    await aSet("alma_procesados",[]);
    showToast("🔄 Reprocesando reportes...");
    setTimeout(checkReportes,1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[checkReportes]);

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
      const isDup=tareas.some(t=>t.titulo.trim()===f.titulo.trim()&&t.edificio===f.edificio&&t.depto===f.depto&&t.estado!=="Completada");
      if(isDup){showToast("⚠️ Ya existe una tarea igual para ese depto","err");return;}
      const nt={...f,id:nextId.current++,fechaCarga:TODAY,historial:[`Creada el ${hoy}`]};
      lista=[...tareas,nt];
    }
    await saveTareas(lista);setEditando(null);
  },[editando,tareas,saveTareas]);

  const importarTareas=useCallback(async(nuevasTareas)=>{
    const hoy=new Date().toLocaleDateString("es-AR");
    const conId = nuevasTareas.map(t=>({...t,id:nextId.current++}));
    await saveTareas([...tareas,...conId]);
    showToast(`✅ ${conId.length} tarea(s) importada(s)`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tareas,saveTareas]);

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

  const tareasF=sortDesc(dedup(tareas.filter(t=>{
    if(t.estado==="Completada")return false;
    if(filtro.edificio&&t.edificio!==filtro.edificio)return false;
    if(filtro.depto&&t.depto!==filtro.depto)return false;
    if(filtro.urgencia&&t.urgencia!==filtro.urgencia)return false;
    if(filtro.tipo&&t.tipo!==filtro.tipo)return false;
    if(filtro.asignado&&t.asignado!==filtro.asignado)return false;
    return true;
  })));

  const deptosParaFiltro=filtro.edificio?(edificios[filtro.edificio]||[]):[];

  const proximos7 = (() => {
    const fin=new Date(); fin.setDate(fin.getDate()+7);
    const finStr=fin.toISOString().slice(0,10);
    return sortDesc(activas.filter(t=>t.fecha>=TODAY&&t.fecha<=finStr));
  })();

  const TABS=[
    {id:"dashboard",icon:"🏠",label:"Inicio"},
    {id:"tareas",icon:"✅",label:"Tareas"},
    {id:"semanal",icon:"📆",label:"Organización"},
    {id:"cargar",icon:"📄",label:"Cargar doc"},
    {id:"preventivo",icon:"🔧",label:"Preventivo"},
    {id:"reportes",icon:"🔗",label:"Reportes limpieza"},
    {id:"edificios",icon:"🏢",label:"Edificios"},
    {id:"historial",icon:"📋",label:"Historial"},
    {id:"informes",icon:"🖨️",label:"Informes"},
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
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",maxWidth:1080,margin:"0 auto",paddingBottom:"3rem",background:C.bg,minHeight:"100vh"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      {toast&&<Toast msg={toast.msg} tipo={toast.tipo}/>}
      {deptoModal&&<ModalDepto edificio={deptoModal.edificio} depto={deptoModal.depto} tareas={tareas} onClose={()=>setDeptoModal(null)}/>}
      {iniciarModal&&<ModalIniciar tarea={iniciarModal} onConfirm={fecha=>confirmarIniciar(iniciarModal,fecha)} onClose={()=>setIniciarModal(null)}/>}
      {showForm&&(
        <Modal onClose={()=>{setShowForm(false);setEditando(null);}} wide title={editando?"Editar tarea":"Nueva tarea"} accent={SECTION_ACCENT.tareas.c}>
          <TareaForm tarea={editando} edificios={edificios} tipos={tipos} personal={personal}
            onSave={saveTarea} onClose={()=>{setShowForm(false);setEditando(null);}}/>
        </Modal>
      )}

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

      <div style={{display:"flex",gap:4,padding:"0 1rem",marginBottom:"1rem",flexWrap:"wrap"}}>
        {TABS.map(t=>{
          const a = SECTION_ACCENT[t.id];
          const activo = tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"8px 16px",borderRadius:24,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s",
                background:activo?a.c:"#fff",color:activo?"#fff":C.text,
                border:activo?"none":`1px solid ${C.border}`,
                boxShadow:activo?C.shadowMd:C.shadow}}>
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      <div style={{padding:"0 1rem"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div>
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

        {/* ── TAREAS — Kanban ── */}
        {tab==="tareas"&&(
          <div>
            <SectionHeader icon="✅" accentKey="tareas" title="Tareas activas" subtitle={`${tareasF.length} en el tablero`}
              right={<button onClick={()=>{setEditando(null);setShowForm(true);}} style={{...btn(C.blue,"#fff",C.blue),fontWeight:700,padding:"10px 20px"}}>✚ Nueva tarea</button>}/>
            <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",marginBottom:"1.25rem",boxShadow:C.shadow}}>
              <p style={{margin:"0 0 0.6rem",fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Filtros</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"0.6rem"}}>
                <select style={{...inp,fontSize:13}} value={filtro.edificio} onChange={e=>setFiltro(p=>({...p,edificio:e.target.value,depto:""}))}>
                  <option value="">Edificio (todos)</option>
                  {Object.keys(edificios).map(o=><option key={o}>{o}</option>)}
                </select>
                <select style={{...inp,fontSize:13}} value={filtro.depto} onChange={e=>setFiltro(p=>({...p,depto:e.target.value}))} disabled={!filtro.edificio}>
                  <option value="">Dpto (todos)</option>
                  {deptosParaFiltro.map(o=><option key={o}>{o}</option>)}
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
                <button onClick={()=>setFiltro({edificio:"",depto:"",urgencia:"",tipo:"",asignado:""})}
                  style={{...btn(),fontSize:12,padding:"5px 12px",marginTop:8,color:C.danger,borderColor:"#FCA5A5"}}>✕ Limpiar filtros</button>
              )}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.85rem"}}>
              {ESTADOS_BOARD.map(estado=>{
                const col = tareasF.filter(t=>t.estado===estado);
                const est = estColor(estado);
                return(
                  <div key={estado} style={{background:"#F3F4F6",borderRadius:14,padding:"0.75rem",minHeight:200}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",padding:"0 0.25rem"}}>
                      <span style={{fontWeight:700,fontSize:13,color:est.text}}>{estado}</span>
                      <span style={{...pill(est.bg,est.text,est.border)}}>{col.length}</span>
                    </div>
                    {col.length===0
                      ? <p style={{fontSize:11,color:C.textLight,textAlign:"center",marginTop:"1.5rem"}}>Sin tareas</p>
                      : col.map(t=><TareaMini key={t.id} t={t} onClick={()=>{setEditando(t);setShowForm(true);}}/>)
                    }
                  </div>
                );
              })}
            </div>

            <p style={{margin:"1.75rem 0 0.75rem",fontWeight:700,fontSize:14,color:C.text}}>📋 Vista detallada</p>
            {tareasF.length===0
              ? <div style={{textAlign:"center",padding:"2rem",color:C.textMuted}}><p style={{fontSize:32}}>✅</p><p>No hay tareas con esos filtros.</p></div>
              : tareasF.map(t=><TareaCard key={t.id} t={t}
                  onEdit={tt=>{setEditando(tt);setShowForm(true);}}
                  onEstado={cambiarEstado} onDelete={eliminarTarea}
                  onComentario={guardarComentario} onIniciar={tt=>setIniciarModal(tt)}/>)
            }
          </div>
        )}

        {/* ── ORGANIZACIÓN ── */}
        {tab==="semanal"&&(
          <div>
            <SectionHeader icon="📆" accentKey="semanal" title="Organización semanal" subtitle="Arrastrá tareas a los días e imprimí la planilla para el personal"/>
            <VistaSemanal tareas={activas} personal={personal} onMoverTarea={moverTarea}
              onEdit={tt=>{setEditando(tt);setShowForm(true);}}
              onQuitarDia={quitarDia} onEstado={cambiarEstado}
              onIniciar={tt=>setIniciarModal(tt)}/>
          </div>
        )}

        {/* ── CARGAR DOC ── */}
        {tab==="cargar"&&(
          <div>
            <SectionHeader icon="📄" accentKey="cargar" title="Cargar documento" subtitle="Pegá el texto de un Word/lista y el sistema detecta las tareas"/>
            <CargarDocumento onImportar={importarTareas} showToast={showToast}/>
          </div>
        )}

        {/* ── PREVENTIVO ── */}
        {tab==="preventivo"&&(
          <div>
            <SectionHeader icon="🔧" accentKey="preventivo" title={`Preventivo — ${MONTHS[parseInt(CURRENT_MONTH.split("-")[1])-1]} ${CURRENT_MONTH.split("-")[0]}`} subtitle="Checklist mensual de mantenimiento preventivo por depto"/>
            <Preventivo edificios={edificios} prevData={prevData} savePrevData={savePrevData} showToast={showToast} tareasCompletadas={completadas}/>
          </div>
        )}

        {/* ── REPORTES LIMPIEZA ── */}
        {tab==="reportes"&&(
          <div>
            <SectionHeader icon="🔗" accentKey="reportes" title="Reportes de limpieza" subtitle="Clasificador automático: convierte reportes relevantes en tareas"/>
            <Reportes tareas={tareas} procesadosIds={procesadosIds} onReprocesar={reprocesarReportes}/>
          </div>
        )}

        {/* ── EDIFICIOS ── */}
        {tab==="edificios"&&(
          <div>
            <SectionHeader icon="🏢" accentKey="edificios" title="Edificios y departamentos" subtitle="Tocá un depto para ver su historial completo"/>
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
                          borderRadius:12,padding:"0.75rem",textAlign:"center",cursor:"pointer",transition:"all 0.15s"}}>
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
          <div>
            <SectionHeader icon="📋" accentKey="historial" title="Historial" subtitle={`${completadas.length} tareas completadas en total (incluye historial Word importado)`}/>
            <Historial tareas={tareas} edificios={edificios}
              onEdit={tt=>{setEditando(tt);setShowForm(true);}}
              onEstado={cambiarEstado} onDelete={eliminarTarea}
              onComentario={guardarComentario} onIniciar={tt=>setIniciarModal(tt)}/>
          </div>
        )}

        {/* ── INFORMES ── */}
        {tab==="informes"&&(
          <div>
            <SectionHeader icon="🖨️" accentKey="informes" title="Informes mensuales" subtitle="Reportes imprimibles: por persona, por edificio/obra y avance del preventivo"/>
            <Informes tareas={tareas} personal={personal} edificios={edificios} prevData={prevData}/>
          </div>
        )}

        {/* ── CONFIG ── */}
        {tab==="config"&&(
          <div>
            <SectionHeader icon="⚙️" accentKey="config" title="Configuración" subtitle="Edificios, tipos de tarea, personal e integraciones"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"1.25rem",boxShadow:C.shadow}}>
                <p style={{margin:"0 0 1rem",fontWeight:700,fontSize:15}}>🏢 Edificios y departamentos</p>
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
                <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,padding:"1.25rem",boxShadow:C.shadow}}>
                  <p style={{margin:"0 0 0.75rem",fontWeight:700,fontSize:15}}>🔗 Integraciones</p>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{background:C.successLight,border:`1px solid #6EE7B7`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.success,fontWeight:500}}>✅ Firebase AlmaDesk conectado</div>
                    <div style={{background:C.successLight,border:`1px solid #6EE7B7`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.success,fontWeight:500}}>✅ App Limpieza (lectura) conectada</div>
                    <div style={{background:C.blueLight,border:`1px solid #93C5FD`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.blue,fontWeight:500}}>🔄 Sincronización: cada 60 segundos</div>
                    <div style={{background:C.warnLight,border:`1px solid #FCD34D`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.warn,fontWeight:500,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>🔗 Reportes procesados: {procesadosIds.size}</span>
                      <button onClick={reprocesarReportes} style={{...btn(C.warnLight,C.warn,"#FCD34D"),fontSize:11,padding:"4px 10px"}}>🔄 Reprocesar</button>
                    </div>
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

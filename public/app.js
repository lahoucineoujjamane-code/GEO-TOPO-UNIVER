/* ============================================================
   GeoTopo Pro v2 — moteur modulaire
   Chaque module est isolé dans un try/catch: une panne n'arrête
   jamais toute l'application.
   ============================================================ */
"use strict";

/* ---------- 0. Garde-fou global ---------- */
function fatal(msg){
  const bar=document.getElementById("fatal");
  if(bar){ bar.style.display="block"; bar.textContent += msg+"\n"; }
}
window.addEventListener("error", e=>fatal("⚠ "+(e.error?e.error.message:e.message)+(e.lineno?(" @"+e.lineno):"")));
window.addEventListener("unhandledrejection", e=>fatal("⚠ async: "+(e.reason&&e.reason.message?e.reason.message:e.reason)));

// exécute une fonction d'init en isolant ses erreurs
function safe(name, fn){ try{ fn(); }catch(err){ console.error(name,err); fatal(name+": "+err.message); } }

/* ---------- 1. i18n ---------- */
const I18N={
 fr:{t_draw:"Dessin",t_coords:"Coordonnées",t_convert:"Conversion",t_io:"Fichiers",t_elev:"Altitudes",t_list:"Éléments",
   h_draw:"Dessiner",point:"Point",line:"Ligne",polygon:"Polygone",rect:"Rectangle",circle:"Cercle",edit:"Éditer",
   h_modify:"Modifier",undo:"Annuler",delete:"Supprimer",clear:"Tout effacer",h_measure:"Mesure",distance:"Distance",area:"Surface",
   h_crs:"Système de coordonnées",move_map:"Déplacez la carte…",h_goto:"Aller à un point",goto_add:"Aller / Ajouter point",
   h_batch:"Conversion par lot",batch_help:"Collez des coordonnées (une par ligne) : « X Y » ou « X,Y » ou « nom,X,Y ».",
   from_crs:"Système source",to_crs:"Système cible",input_coords:"Coordonnées à convertir",convert_btn:"Convertir",copy:"Copier",
   h_import:"Importer",import_file:"Importer un fichier",import_formats:"Formats : KML, GeoJSON, CSV, GPX, DXF",
   h_export:"Exporter",export_note:"L'export DXF/CSV utilise le système choisi dans l'onglet Coordonnées.",
   h_elev:"Altitudes / Topographie",elev_help:"Sélectionnez un élément, choisissez le type, puis calculez. Nécessite Internet.",
   elev_src:"Source d'élévation",elev_type:"Type d'analyse",et_vert:"Altitude des sommets",et_prof:"Profil en long (ligne)",
   et_grid:"Grille déblai/remblai (polygone)",n_points:"Nombre de points",grid_step:"Pas de grille (m)",
   et_contour:"Courbes de niveau (polygone)",c_step:"Équidistance des courbes (m)",c_res:"Résolution de la grille (m)",
   contour_done:"%n courbes générées",contour_kml:"KML",contours:"Courbes",
   ref_lvl:"Niveau de référence (m, vide = moyenne)",elev_calc:"Calculer les altitudes",
   h_list:"Éléments dessinés",no_feat:"Aucun élément. Dessinez sur la carte.",h_vertices:"Sommets",copy_coords:"Copier les coordonnées",
   crs_help:"Ex : « Lambert », « UTM 29 », « 26192 », « 4326 »…",add_custom:"➕ Ajouter un système personnalisé (proj4)",
   pt:"pt",drawing:"en cours…",click_close:"Tracez, puis appuyez sur Terminer",finish:"Terminer",cancel:"Annuler",
   added:"Point ajouté",deleted:"Élément supprimé",cleared:"Tout effacé",nothing_undo:"Rien à annuler",undone:"Dernier élément annulé",
   bad_xy:"Coordonnées invalides",imported:"%n élément(s) importé(s)",no_export:"Aucun élément à exporter",exported:"Exporté : ",
   copied:"Copié",center:"Centre",radius:"Rayon",sel_first:"Sélectionnez ou dessinez un élément d'abord",
   need_line:"Sélectionnez une ligne",need_poly:"Sélectionnez un polygone",fetching:"Récupération des altitudes…",
   done:"Terminé",elev_fail:"Échec",min:"Min",max:"Max",mean:"Moyenne",length:"Longueur",gain:"Dénivelé +",
   cut:"Déblai",fill:"Remblai",net:"Net",points:"Points",cell:"Maille",ref:"Réf.",dist_m:"Distance (m)",alt_m:"Altitude (m)",
   vertex:"Sommet",select_feat:"Touchez un élément pour voir ses sommets.",too_many:"Trop de points (%n) — augmentez le pas",
   loading_crs:"Chargement du système…",crs_notfound:"Système introuvable",no_lines_dxf:"Aucune entité exploitable",
   tap_delete:"Touchez un élément pour le supprimer",map_loaded:"Carte prête"},
 en:{t_draw:"Draw",t_coords:"Coordinates",t_convert:"Convert",t_io:"Files",t_elev:"Elevation",t_list:"Features",
   h_draw:"Draw",point:"Point",line:"Line",polygon:"Polygon",rect:"Rectangle",circle:"Circle",edit:"Edit",
   h_modify:"Modify",undo:"Undo",delete:"Delete",clear:"Clear all",h_measure:"Measure",distance:"Distance",area:"Area",
   h_crs:"Coordinate system",move_map:"Move the map…",h_goto:"Go to a point",goto_add:"Go / Add point",
   h_batch:"Batch conversion",batch_help:"Paste coordinates (one per line): \"X Y\" or \"X,Y\" or \"name,X,Y\".",
   from_crs:"Source system",to_crs:"Target system",input_coords:"Coordinates to convert",convert_btn:"Convert",copy:"Copy",
   h_import:"Import",import_file:"Import a file",import_formats:"Formats: KML, GeoJSON, CSV, GPX, DXF",
   h_export:"Export",export_note:"DXF/CSV export uses the system chosen in the Coordinates tab.",
   h_elev:"Elevation / Topography",elev_help:"Select a feature, choose the type, then compute. Requires Internet.",
   elev_src:"Elevation source",elev_type:"Analysis type",et_vert:"Vertex elevations",et_prof:"Elevation profile (line)",
   et_grid:"Cut/fill grid (polygon)",n_points:"Number of points",grid_step:"Grid step (m)",
   et_contour:"Contour lines (polygon)",c_step:"Contour interval (m)",c_res:"Grid resolution (m)",
   contour_done:"%n contours generated",contour_kml:"KML",contours:"Contours",
   ref_lvl:"Reference level (m, blank = mean)",elev_calc:"Compute elevations",
   h_list:"Drawn features",no_feat:"No features. Draw on the map.",h_vertices:"Vertices",copy_coords:"Copy coordinates",
   crs_help:"E.g. \"Lambert\", \"UTM 29\", \"26192\", \"4326\"…",add_custom:"➕ Add custom system (proj4)",
   pt:"pt",drawing:"drawing…",click_close:"Draw, then tap Finish",finish:"Finish",cancel:"Cancel",
   added:"Point added",deleted:"Feature deleted",cleared:"All cleared",nothing_undo:"Nothing to undo",undone:"Last feature undone",
   bad_xy:"Invalid coordinates",imported:"%n feature(s) imported",no_export:"No features to export",exported:"Exported: ",
   copied:"Copied",center:"Center",radius:"Radius",sel_first:"Select or draw a feature first",
   need_line:"Select a line",need_poly:"Select a polygon",fetching:"Fetching elevations…",
   done:"Done",elev_fail:"Failed",min:"Min",max:"Max",mean:"Mean",length:"Length",gain:"Gain +",
   cut:"Cut",fill:"Fill",net:"Net",points:"Points",cell:"Cell",ref:"Ref.",dist_m:"Distance (m)",alt_m:"Elevation (m)",
   vertex:"Vertex",select_feat:"Tap a feature to see its vertices.",too_many:"Too many points (%n) — increase step",
   loading_crs:"Loading system…",crs_notfound:"System not found",no_lines_dxf:"No usable entity",
   tap_delete:"Tap a feature to delete it",map_loaded:"Map ready"}
};
let LANG=localStorage.getItem("gtp_lang")||"fr";
const t=k=>(I18N[LANG][k]!==undefined?I18N[LANG][k]:k);
function applyLang(){
  document.documentElement.lang=LANG;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k=el.getAttribute("data-i18n"); if(I18N[LANG][k]!==undefined) el.textContent=I18N[LANG][k];
  });
  const lb=document.getElementById("btnLang"); if(lb) lb.textContent=(LANG==="fr"?"EN":"FR");
}

/* ---------- 2. Toast ---------- */
let toastT;
function toast(msg,err){
  const el=document.getElementById("toast"); if(!el) return;
  el.textContent=msg; el.className="toast show"+(err?" err":"");
  clearTimeout(toastT); toastT=setTimeout(()=>el.className="toast",2600);
}

/* ---------- 3. CRS engine (proj4 + EPSG mondial via epsg.io) ---------- */
const CRS = (()=>{
  // systèmes de base toujours présents
  const base=[
    {code:"EPSG:4326",name:"WGS84 — Lat/Lon",def:"+proj=longlat +datum=WGS84 +no_defs",geo:true},
    {code:"EPSG:3857",name:"Web Mercator",def:"+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs"},
    {code:"EPSG:26191",name:"Maroc — Lambert Nord (Zone 1)",def:"+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs"},
    {code:"EPSG:26192",name:"Maroc — Lambert Sud (Zone 2)",def:"+proj=lcc +lat_1=29.7 +lat_0=29.7 +lon_0=-5.4 +k_0=0.999615596 +x_0=500000 +y_0=300000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs"},
    {code:"EPSG:26194",name:"Maroc — Lambert Sahara (Zone 4)",def:"+proj=lcc +lat_1=26.1 +lat_0=26.1 +lon_0=-5.4 +k_0=0.999616304 +x_0=1200000 +y_0=400000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs"},
  ];
  // UTM mondial
  for(let z=1;z<=60;z++){
    base.push({code:"EPSG:"+(32600+z),name:"UTM "+z+"N (WGS84)",def:"+proj=utm +zone="+z+" +datum=WGS84 +units=m +no_defs"});
    base.push({code:"EPSG:"+(32700+z),name:"UTM "+z+"S (WGS84)",def:"+proj=utm +zone="+z+" +south +datum=WGS84 +units=m +no_defs"});
  }
  // systèmes personnalisés enregistrés
  const custom=JSON.parse(localStorage.getItem("gtp_custom_crs")||"[]");
  // cache des systèmes récupérés depuis epsg.io
  const cache=JSON.parse(localStorage.getItem("gtp_crs_cache")||"{}");

  const all=new Map();
  function register(c){
    if(!c||!c.code||!c.def) return;
    try{ proj4.defs(c.code,c.def); all.set(c.code,c); }catch(e){ console.warn("CRS def fail",c.code,e); }
  }
  base.forEach(register); custom.forEach(register);
  Object.values(cache).forEach(register);

  function get(code){ return all.get(code); }
  function list(){ return [...all.values()]; }
  function isGeo(code){ const c=all.get(code); return c&&(c.geo|| /longlat/.test(c.def)); }

  // recherche locale
  function search(q){
    q=q.trim().toLowerCase();
    if(!q) return list().slice(0,40);
    const num=q.replace(/[^0-9]/g,"");
    return list().filter(c=>{
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
        (num && c.code.includes(num));
    }).slice(0,60);
  }

  // récupère un EPSG quelconque depuis epsg.io si absent
  async function fetchEPSG(code){
    const num=String(code).replace(/[^0-9]/g,"");
    if(!num) throw new Error("code invalide");
    const full="EPSG:"+num;
    if(all.has(full)) return all.get(full);
    const res=await fetch("https://epsg.io/"+num+".proj4");
    if(!res.ok) throw new Error("HTTP "+res.status);
    const def=(await res.text()).trim();
    if(!def||def.length<10||/<|html/i.test(def)) throw new Error("def introuvable");
    // récupère le nom
    let name=full;
    try{ const r2=await fetch("https://epsg.io/?q="+num+"&format=json");
      const j=await r2.json(); if(j&&j.results&&j.results[0]) name=j.results[0].name; }catch(_){}
    const c={code:full,name:name,def:def};
    register(c);
    cache[full]=c; localStorage.setItem("gtp_crs_cache",JSON.stringify(cache));
    return c;
  }
  function addCustom(code,name,def){
    const c={code:code,name:name||code,def:def};
    register(c);
    custom.push(c); localStorage.setItem("gtp_custom_crs",JSON.stringify(custom));
    return c;
  }
  // conversion : renvoie [x,y] dans le code cible depuis lng/lat WGS84
  function fromWGS(lng,lat,code){ return code==="EPSG:4326"?[lng,lat]:proj4("EPSG:4326",code,[lng,lat]); }
  function toWGS(x,y,code){ return code==="EPSG:4326"?[x,y]:proj4(code,"EPSG:4326",[x,y]); }

  return {get,list,isGeo,search,fetchEPSG,addCustom,fromWGS,toWGS};
})();

/* ---------- 4. Map ---------- */
const BASEMAPS={
  osm:{name:"OpenStreetMap",make:()=>L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"})},
  topo:{name:"OpenTopoMap",make:()=>L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,attribution:"© OpenTopoMap"})},
  sat:{name:"Satellite (Esri)",make:()=>L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"© Esri"})},
};
const map=L.map("map",{zoomControl:false,center:[28.987,-10.057],zoom:12});
L.control.zoom({position:"topright"}).addTo(map);
let baseLayer=null, baseKey="osm";
function setBase(key){
  if(baseLayer) map.removeLayer(baseLayer);
  baseKey=key; baseLayer=BASEMAPS[key].make();
  let errs=0; baseLayer.on("tileerror",()=>{ if(++errs>8&&key!=="osm"){errs=0;toast("Source indisponible → OSM",true);setBase("osm");} });
  // Keep contour + GPS + goto layers on top after basemap change
  setTimeout(()=>{
    if(contourLayer) contourLayer.bringToFront&&contourLayer.bringToFront();
    if(gpsLayer)     gpsLayer.bringToFront&&gpsLayer.bringToFront();
    if(gotoLayer)    gotoLayer.bringToFront&&gotoLayer.bringToFront();
  },300);
  baseLayer.addTo(map);
}
setBase("osm");

const drawn=new L.FeatureGroup().addTo(map);
let selectedLayer=null, deleteMode=false, featSeq=0;
let contourLayer=null, lastContours=null;   // déclaré tôt: utilisé par dClear
let activeDrawer=null;                        // déclaré tôt: utilisé par cancelDraw
const COLORS=["#1fd1a8","#3b82f6","#f5a623","#ef4444","#a855f7","#10b981","#ec4899"];
let activeCRS="EPSG:4326";

// ── Separate layers — each independent ──
// gpsLayer      : GPS current position (btnLocate + GPS Live)
// gotoLayer     : "Aller à" markers
// contourLayer  : Courbes de niveau (never cleared by dClear)
// drawn         : User drawings only (affected by dClear)
let gpsLayer   = null;  // L.layerGroup for GPS marker + accuracy circle
let gotoLayer  = null;  // L.layerGroup for goto markers

/* ---------- 5. Tabs + bottom sheet ---------- */
safe("tabs",()=>{
  const tabs=document.getElementById("tabs");
  tabs.addEventListener("click",e=>{
    const tab=e.target.closest(".tab"); if(!tab) return;
    const pane=tab.getAttribute("data-pane");
    tabs.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x===tab));
    document.querySelectorAll(".pane").forEach(p=>p.classList.toggle("on",p.getAttribute("data-pane")===pane));
    const sheet=document.getElementById("sheet");
    if(sheet.classList.contains("half")===false && sheet.classList.contains("full")===false) setSheet("half");
  });
});

let sheetState="half";
function setSheet(s){
  const sh=document.getElementById("sheet");
  sh.classList.remove("half","full"); sheetState=s;
  if(s==="half") sh.classList.add("half");
  else if(s==="full") sh.classList.add("full");
  setTimeout(()=>map.invalidateSize(),300);
}
safe("sheet-drag",()=>{
  const grip=document.getElementById("grip");
  let startY=0,startState="half",dragging=false;
  const onStart=y=>{dragging=true;startY=y;startState=sheetState;};
  const onMove=y=>{ if(!dragging) return; };
  const onEnd=y=>{
    if(!dragging) return; dragging=false;
    const dy=y-startY;
    if(dy<-40){ setSheet(startState==="half"?"full":"full"); }
    else if(dy>40){ setSheet(startState==="full"?"half":"closed"); }
  };
  grip.addEventListener("touchstart",e=>onStart(e.touches[0].clientY),{passive:true});
  grip.addEventListener("touchend",e=>onEnd(e.changedTouches[0].clientY));
  grip.addEventListener("mousedown",e=>{onStart(e.clientY);
    const mu=ev=>{onEnd(ev.clientY);document.removeEventListener("mouseup",mu);};
    document.addEventListener("mouseup",mu);});
  grip.addEventListener("click",()=>{ setSheet(sheetState==="half"?"full":"half"); });
});

/* ---------- 6. Top bar buttons ---------- */
safe("topbar",()=>{
  document.getElementById("btnLang").onclick=()=>{ LANG=LANG==="fr"?"en":"fr"; localStorage.setItem("gtp_lang",LANG); applyLang(); refreshAll(); };
  document.getElementById("btnLocate").onclick=()=>locateGPS();
  function locateGPS(){
    if(!navigator.geolocation){
      toast(LANG==="fr"?"Géolocalisation indisponible":"Geolocation unavailable",true); return;
    }
    const btn=document.getElementById("btnLocate");
    if(btn){btn.classList.add("on");btn.textContent="⌛";}
    navigator.geolocation.getCurrentPosition(
      p=>{
        if(btn){btn.classList.remove("on");btn.textContent="◎";}
        const lat=p.coords.latitude, lon=p.coords.longitude;
        const acc=p.coords.accuracy||5;
        // Use dedicated gpsLayer — never cleared by dClear
        if(!gpsLayer){ gpsLayer=L.layerGroup().addTo(map); }
        gpsLayer.clearLayers();
        // Accuracy circle
        L.circle([lat,lon],{
          radius:acc, color:"#1fd1a8", fillColor:"#1fd1a8",
          fillOpacity:0.08, weight:1.5, dashArray:"5,4"
        }).addTo(gpsLayer);
        // Position marker
        const ic=L.divIcon({className:"",
          html:'<div style="width:20px;height:20px;border-radius:50%;background:#1fd1a8;border:3px solid #fff;box-shadow:0 0 0 5px rgba(31,209,168,0.25),0 2px 10px rgba(0,0,0,0.5)"></div>',
          iconSize:[20,20],iconAnchor:[10,10]});
        const m=L.marker([lat,lon],{icon:ic,zIndexOffset:950}).addTo(gpsLayer);
        m.bindPopup(
          "<b>📡 "+(LANG==="fr"?"Ma position":"My position")+"</b><br>"+
          "Lat: <b>"+lat.toFixed(8)+"°</b><br>"+
          "Lon: <b>"+lon.toFixed(8)+"°</b><br>"+
          "Précision: ±"+acc.toFixed(0)+"m"
        ).openPopup();
        map.flyTo([lat,lon],17,{duration:1.2});
        toast("📡 "+lat.toFixed(5)+", "+lon.toFixed(5)+" ±"+acc.toFixed(0)+"m");
      },
      e=>{
        if(btn){btn.classList.remove("on");btn.textContent="◎";}
        const msgs={1:"Permission refusée",2:"Signal GPS indisponible",3:"Délai dépassé"};
        toast((msgs[e.code]||"GPS: "+e.message)+" — réessayez en extérieur",true);
      },
      {enableHighAccuracy:true, timeout:20000, maximumAge:10000}
    );
  }
  const layerNames=Object.keys(BASEMAPS);
  document.getElementById("btnLayers").onclick=()=>{
    const i=layerNames.indexOf(baseKey); const next=layerNames[(i+1)%layerNames.length];
    setBase(next); toast(BASEMAPS[next].name);
  };
});

/* ---------- 7. Drawing ---------- */
const drawCtl=new L.Control.Draw({edit:{featureGroup:drawn},draw:{
  polyline:{shapeOptions:{color:"#3b82f6",weight:3}},
  polygon:{allowIntersection:false,shapeOptions:{color:"#1fd1a8",weight:2}},
  rectangle:{shapeOptions:{color:"#f5a623",weight:2}},
  circle:{shapeOptions:{color:"#a855f7",weight:2}},
  marker:true,circlemarker:false}});
map.addControl(drawCtl);

function labelFor(type){return ({marker:t("point"),polyline:t("line"),polygon:t("polygon"),rectangle:t("rect"),circle:t("circle")})[type]||type;}
function register(layer,type){
  featSeq++; layer._gid=featSeq; layer._gtype=type;
  layer._gcolor=(layer.options&&layer.options.color)||COLORS[featSeq%COLORS.length];
  layer._gname=labelFor(type)+" "+featSeq;
  drawn.addLayer(layer); bindLayer(layer); renderList();
  // Auto-show coords in list pane with active CRS
  selectedLayer=layer;
  showVertices(layer);
  // Switch to list tab
  document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("on");});
  document.querySelectorAll(".pane").forEach(function(p){p.classList.remove("on");});
  var listTab=document.querySelector('.tab[data-pane="list"]');
  var listPane=document.querySelector('.pane[data-pane="list"]');
  if(listTab) listTab.classList.add("on");
  if(listPane) listPane.classList.add("on");
  // Expand sheet
  var sheet=document.getElementById("sheet");
  if(sheet&&sheet.className==="sheet peek") sheet.className="sheet half";
}
function bindLayer(layer){
  const del=LANG==="fr"?"Supprimer":"Delete";
  layer.bindPopup(`<b>${layer._gname}</b><br>${describe(layer)}<br><button onclick="window.__del(${layer._gid})" style="margin-top:6px;background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:600">🗑 ${del}</button>`);
  layer.off("click").on("click",()=>{ if(deleteMode) removeById(layer._gid); else selectFeature(layer); });
}
window.__del=id=>removeById(id);
function removeById(id){ drawn.eachLayer(l=>{if(l._gid===id) drawn.removeLayer(l);}); if(selectedLayer&&selectedLayer._gid===id) selectedLayer=null; renderList(); toast(t("deleted")); }

map.on(L.Draw.Event.CREATED,e=>{ live=null; hideLive(); activeDrawer=null; hideDrawCtl(); register(e.layer,e.layerType); toast(labelFor(e.layerType)+" ✓"); });
map.on(L.Draw.Event.EDITED,()=>{ drawn.eachLayer(bindLayer); renderList(); if(selectedLayer) showVertices(selectedLayer); });
map.on("draw:drawstop",()=>{ activeDrawer=null; hideDrawCtl(); });

function startDraw(kind){
  cancelDraw();                       // annule tout dessin en cours d'abord
  if(deleteMode) toggleDelete(false);
  const H={marker:L.Draw.Marker,polyline:L.Draw.Polyline,polygon:L.Draw.Polygon,rectangle:L.Draw.Rectangle,circle:L.Draw.Circle}[kind];
  activeDrawer=new H(map,drawCtl.options.draw[kind]);
  activeDrawer.enable();
  // bouton Terminer seulement utile pour ligne/polygone (multi-points)
  showDrawCtl(kind==="polyline"||kind==="polygon");
  toast(t("click_close"));
}
// termine le tracé en cours (ferme la forme) sans viser le 1er point
function finishDraw(){
  if(!activeDrawer){ hideDrawCtl(); return; }
  try{
    if(typeof activeDrawer.completeShape==="function") activeDrawer.completeShape();
    else if(typeof activeDrawer._finishShape==="function") activeDrawer._finishShape();
    else activeDrawer.disable();
  }catch(e){ try{activeDrawer.disable();}catch(_){ } }
  activeDrawer=null; hideDrawCtl();
}
// annule complètement le tracé en cours
function cancelDraw(){
  if(activeDrawer){ try{activeDrawer.disable();}catch(_){ } activeDrawer=null; }
  live=null; hideLive(); hideDrawCtl();
}
function showDrawCtl(canFinish){
  const bar=document.getElementById("drawCtl"); if(!bar) return;
  bar.style.display="flex";
  document.getElementById("drawFinish").style.display=canFinish?"flex":"none";
}
function hideDrawCtl(){ const bar=document.getElementById("drawCtl"); if(bar) bar.style.display="none"; }

safe("draw-tools",()=>{
  document.getElementById("dPoint").onclick=()=>startDraw("marker");
  document.getElementById("dLine").onclick=()=>startDraw("polyline");
  document.getElementById("dPoly").onclick=()=>startDraw("polygon");
  document.getElementById("dRect").onclick=()=>startDraw("rectangle");
  document.getElementById("dCircle").onclick=()=>startDraw("circle");

  // boutons flottants Terminer / Annuler le tracé
  document.getElementById("drawFinish").onclick=()=>finishDraw();
  document.getElementById("drawCancel").onclick=()=>{ cancelDraw(); toast(LANG==="fr"?"Tracé annulé":"Drawing cancelled"); };

  let editH=null;
  document.getElementById("dEdit").onclick=function(){
    cancelDraw();
    if(deleteMode) toggleDelete(false);
    this.classList.toggle("on");
    if(this.classList.contains("on")){ editH=new L.EditToolbar.Edit(map,{featureGroup:drawn}); editH.enable(); }
    else if(editH){ editH.save(); editH.disable(); editH=null; drawn.eachLayer(bindLayer); renderList(); }
  };
  document.getElementById("dDelete").onclick=()=>{ cancelDraw(); toggleDelete(); };
  document.getElementById("dClear").onclick=()=>{
    cancelDraw();
    // Only clear USER DRAWINGS — contour, GPS, goto layers are NOT affected
    drawn.clearLayers();
    selectedLayer=null;
    renderList();
    toast(t("cleared"));
    // contourLayer stays visible intentionally
  };

  // Separate explicit contour delete button
  const btnDelContour=document.getElementById("dClearContour");
  if(btnDelContour){
    btnDelContour.onclick=()=>{
      if(contourLayer){ map.removeLayer(contourLayer); contourLayer=null; lastContours=null; lastElev=null; }
      const er=document.getElementById("elevResult"); if(er) er.innerHTML="";
      const es=document.getElementById("elevStatus"); if(es){es.textContent="";es.className="status";}
      // Hide contour delete button
      const btnDC2=document.getElementById("dClearContour");
      if(btnDC2) btnDC2.style.display="none";
      toast(LANG==="fr"?"Courbes de niveau supprimées":"Contour lines removed");
    };
  }
  document.getElementById("dUndo").onclick=()=>{
    // si un tracé est en cours: annuler le tracé (priorité)
    if(activeDrawer){ cancelDraw(); toast(LANG==="fr"?"Tracé annulé":"Drawing cancelled"); return; }
    const ls=drawn.getLayers(); if(!ls.length){toast(t("nothing_undo"));return;}
    let last=ls[0]; ls.forEach(l=>{if((l._gid||0)>(last._gid||0))last=l;});
    drawn.removeLayer(last); if(selectedLayer===last)selectedLayer=null; renderList(); toast(t("undone"));
  };
});
function toggleDelete(force){
  deleteMode=(force===undefined)?!deleteMode:force;
  document.getElementById("dDelete").classList.toggle("on",deleteMode);
  document.getElementById("map").style.cursor=deleteMode?"crosshair":"";
  if(deleteMode) toast(t("tap_delete"));
}

/* ---------- 8. Measure ---------- */
let unitMode=localStorage.getItem("gtp_units")||"metric";
function fmtLen(m){ if(unitMode==="imperial"){const ft=m*3.28084;return ft>5280?(ft/5280).toFixed(3)+" mi":ft.toFixed(1)+" ft";} return m>1000?(m/1000).toFixed(3)+" km":m.toFixed(1)+" m"; }
function fmtArea(m2){ if(unitMode==="imperial"){const ac=m2/4046.86;return ac>1?ac.toFixed(3)+" ac":(m2*10.7639).toFixed(0)+" ft²";} return m2>10000?(m2/10000).toFixed(3)+" ha":m2.toFixed(1)+" m²"; }
function lineLen(lls){let s=0;for(let i=1;i<lls.length;i++)s+=map.distance(lls[i-1],lls[i]);return s;}
function ringArea(lls){const R=6378137;let a=0,n=lls.length;for(let i=0;i<n;i++){const p1=lls[i],p2=lls[(i+1)%n];a+=(p2.lng-p1.lng)*Math.PI/180*(2+Math.sin(p1.lat*Math.PI/180)+Math.sin(p2.lat*Math.PI/180));}return Math.abs(a*R*R/2);}
let measureStop=null;
function startMeasure(kind){
  if(measureStop) measureStop();
  const pts=[],tmp=L.layerGroup().addTo(map);
  const chip=document.getElementById("liveChip"); chip.className="livechip warn"; chip.style.display="block";
  function redraw(){
    tmp.clearLayers(); pts.forEach(p=>L.circleMarker(p,{radius:4,color:"#f5a623"}).addTo(tmp));
    if(kind==="dist"&&pts.length>=2){L.polyline(pts,{color:"#f5a623",dashArray:"6 4"}).addTo(tmp);chip.innerHTML="<b>"+t("distance")+"</b> "+fmtLen(lineLen(pts));}
    if(kind==="area"&&pts.length>=3){L.polygon(pts,{color:"#f5a623",fillOpacity:.15,dashArray:"6 4"}).addTo(tmp);chip.innerHTML="<b>"+t("area")+"</b> "+fmtArea(ringArea(pts));}
  }
  const onClick=e=>{pts.push(e.latlng);redraw();};
  const stop=()=>{map.off("click",onClick);map.off("dblclick",stop);map.doubleClickZoom.enable();
    setTimeout(()=>{tmp.remove();chip.style.display="none";chip.className="livechip";},3500);
    document.getElementById("mDist").classList.remove("on");document.getElementById("mArea").classList.remove("on");measureStop=null;};
  map.doubleClickZoom.disable(); map.on("click",onClick); map.on("dblclick",stop); measureStop=stop;
  chip.innerHTML=t("click_close");
}
safe("measure",()=>{
  document.getElementById("mDist").onclick=function(){document.getElementById("mArea").classList.remove("on");this.classList.add("on");startMeasure("dist");};
  document.getElementById("mArea").onclick=function(){document.getElementById("mDist").classList.remove("on");this.classList.add("on");startMeasure("area");};
  const ub=document.getElementById("mUnits");
  function updU(){document.getElementById("unitLbl").textContent=unitMode==="metric"?"m / ha":"ft / ac";}
  ub.onclick=()=>{unitMode=unitMode==="metric"?"imperial":"metric";localStorage.setItem("gtp_units",unitMode);updU();if(selectedLayer)showVertices(selectedLayer);renderList();};
  updU();
});

/* ---------- 9. Coordinates panel + live ---------- */
function fmtCoord(x,y,code){const g=CRS.isGeo(code);return [g?x.toFixed(6):x.toFixed(2),g?y.toFixed(6):y.toFixed(2)];}
function updateCoordOut(lat,lng){
  const [x,y]=CRS.fromWGS(lng,lat,activeCRS); const [fx,fy]=fmtCoord(x,y,activeCRS);
  const box=document.getElementById("coordOut"); if(!box) return;
  box.innerHTML=`<div><span class="k">WGS84:</span> <span class="v">${lat.toFixed(6)}, ${lng.toFixed(6)}</span></div>
    <div><span class="k">${activeCRS}</span></div>
    <div><span class="k">X/E:</span> <span class="v">${fx}</span></div>
    <div><span class="k">Y/N:</span> <span class="v">${fy}</span></div>`;
}
map.on("mousemove",e=>{ if(live===null) updateCoordOut(e.latlng.lat,e.latlng.lng); });
map.on("click",e=>{ if(!measureStop&&live===null) updateCoordOut(e.latlng.lat,e.latlng.lng); });

// live drawing coords
let live=null,liveCursor=null;
map.on("draw:drawstart",()=>{live=[];liveCursor=null;showLive();});
map.on("draw:drawvertex",e=>{live=[];if(e&&e.layers&&e.layers.eachLayer)e.layers.eachLayer(l=>{if(l.getLatLng){const p=l.getLatLng();live.push([p.lng,p.lat]);}});showLive();});
map.on("draw:drawstop",()=>{live=null;liveCursor=null;hideLive();if(selectedLayer)showVertices(selectedLayer);});
map.on("mousemove",e=>{if(live!==null){liveCursor=[e.latlng.lng,e.latlng.lat];showLive();}});
function hideLive(){const c=document.getElementById("liveChip");if(c&&!measureStop){c.style.display="none";}}
function showLive(){
  if(live===null) return;
  const chip=document.getElementById("liveChip"); chip.className="livechip"; chip.style.display="block";
  const all=[...live]; if(liveCursor) all.push(liveCursor);
  if(!all.length){chip.innerHTML=t("click_close");return;}
  const last=all[all.length-1]; const [x,y]=CRS.fromWGS(last[0],last[1],activeCRS); const [fx,fy]=fmtCoord(x,y,activeCRS);
  chip.innerHTML=`<b>${live.length} ${t("pt")}</b> &nbsp; ${CRS.isGeo(activeCRS)?"Lon":"X"}: ${fx} &nbsp; ${CRS.isGeo(activeCRS)?"Lat":"Y"}: ${fy}`;
  // table live in list pane
  showVertexTable(all.map(v=>[v[1],v[0]]),true);
}
safe("goto",()=>{
  document.getElementById("goBtn").onclick=()=>{
    const xv=parseFloat(document.getElementById("gX").value);
    const yv=parseFloat(document.getElementById("gY").value);
    if(isNaN(xv)||isNaN(yv)){toast(t("bad_xy"),true);return;}
    let lng,lat;
    try{[lng,lat]=CRS.toWGS(xv,yv,activeCRS);}
    catch(e){toast(t("bad_xy"),true);return;}
    if(!isFinite(lng)||!isFinite(lat)||Math.abs(lat)>90||Math.abs(lng)>180){
      toast(t("bad_xy"),true);return;
    }
    // Use dedicated gotoLayer — persists, not cleared by dClear
    if(!gotoLayer){ gotoLayer=L.layerGroup().addTo(map); }
    gotoLayer.clearLayers(); // replace previous goto marker
    const ic=L.divIcon({className:"",
      html:'<div style="position:relative"><div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#f5a623;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 10px rgba(0,0,0,0.5)"></div></div>',
      iconSize:[22,28],iconAnchor:[11,28]});
    const m=L.marker([lat,lng],{icon:ic,zIndexOffset:800}).addTo(gotoLayer);
    // Build coord display in current CRS
    const geo=CRS.isGeo(activeCRS);
    const xDisp=geo?lng.toFixed(8):xv.toFixed(3);
    const yDisp=geo?lat.toFixed(8):yv.toFixed(3);
    const crsName=(CRS.get(activeCRS)||{name:activeCRS}).name||activeCRS;
    m.bindPopup(
      "<b>🎯 "+(LANG==="fr"?"Point cible":"Target point")+"</b><br>"+
      (geo?"Lat":"X")+": <b>"+yDisp+"</b><br>"+
      (geo?"Lon":"Y")+": <b>"+xDisp+"</b><br>"+
      "<small style='color:#666'>SCR: "+crsName+"</small>"
    ).openPopup();
    map.flyTo([lat,lng],16,{duration:1.0});
    toast(t("added")+" — "+(geo?lat.toFixed(5)+", "+lng.toFixed(5):"X:"+xv.toFixed(0)+" Y:"+yv.toFixed(0)));
  };
});

/* ---------- 10. Describe / list / vertices ---------- */
function getVertices(layer){
  if(layer instanceof L.Marker){const p=layer.getLatLng();return [[p.lng,p.lat]];}
  if(layer instanceof L.Circle){const c=layer.getLatLng();return [[c.lng,c.lat]];}
  if(layer instanceof L.Polygon){return layer.getLatLngs()[0].map(p=>[p.lng,p.lat]);}
  if(layer instanceof L.Polyline){return layer.getLatLngs().map(p=>[p.lng,p.lat]);}
  return [];
}
function describe(layer){
  if(layer instanceof L.Marker){const p=layer.getLatLng();return p.lat.toFixed(6)+", "+p.lng.toFixed(6);}
  if(layer instanceof L.Circle){return "r = "+fmtLen(layer.getRadius());}
  if(layer instanceof L.Polygon){return t("area")+": "+fmtArea(ringArea(layer.getLatLngs()[0]));}
  if(layer instanceof L.Polyline){return t("distance")+": "+fmtLen(lineLen(layer.getLatLngs()));}
  return "";
}
function selectFeature(layer){
  selectedLayer=layer;
  if(layer.getBounds) map.fitBounds(layer.getBounds(),{maxZoom:16}); else if(layer.getLatLng) map.setView(layer.getLatLng(),16);
  // switch to list tab
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x.getAttribute("data-pane")==="list"));
  document.querySelectorAll(".pane").forEach(p=>p.classList.toggle("on",p.getAttribute("data-pane")==="list"));
  showVertices(layer); renderList();
}
function renderList(){
  const box=document.getElementById("flist"); if(!box) return;
  const ls=drawn.getLayers(); const fc=document.getElementById("fcount"); if(fc) fc.textContent=ls.length;
  if(!ls.length){box.innerHTML=`<div class="empty">${t("no_feat")}</div>`;document.getElementById("vertexWrap").style.display="none";return;}
  box.innerHTML="";
  ls.forEach(layer=>{
    const it=document.createElement("div"); it.className="item"+(selectedLayer===layer?" sel":"");
    it.innerHTML=`<span class="dot" style="background:${layer._gcolor}"></span>
      <span class="nm">${layer._gname} <small>— ${describe(layer)}</small></span><span class="del">✕</span>`;
    it.querySelector(".nm").onclick=()=>selectFeature(layer);
    it.querySelector(".del").onclick=()=>removeById(layer._gid);
    box.appendChild(it);
  });
  if(selectedLayer&&drawn.hasLayer(selectedLayer)) showVertices(selectedLayer);
}
function showVertexTable(latlngs,isLive){
  const box=document.getElementById("vertexBox"),wrap=document.getElementById("vertexWrap"),vc=document.getElementById("vCrs");
  if(!box) return; wrap.style.display="block";
  if(vc) vc.textContent="("+activeCRS+")"+(isLive?" • "+t("drawing"):"");
  const g=CRS.isGeo(activeCRS);
  let rows="";
  latlngs.forEach((p,i)=>{const [x,y]=CRS.fromWGS(p[1],p[0],activeCRS);const [fx,fy]=fmtCoord(x,y,activeCRS);rows+=`<tr><td class="idx">${i+1}</td><td>${fx}</td><td>${fy}</td></tr>`;});
  box.innerHTML=`<div class="dtable"><div class="scroll"><table><thead><tr><th>#</th><th>${g?"Lon":"X/E"}</th><th>${g?"Lat":"Y/N"}</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function showVertices(layer){
  if(!layer||!drawn.hasLayer(layer)){document.getElementById("vertexWrap").style.display="none";return;}
  const verts=getVertices(layer); showVertexTable(verts.map(v=>[v[1],v[0]]),false);
  // circle radius row
  if(layer instanceof L.Circle){
    const box=document.getElementById("vertexBox");
    box.insertAdjacentHTML("beforeend",`<div class="note">${t("radius")}: ${fmtLen(layer.getRadius())}</div>`);
  }
  window.__lastVerts=verts;
}
safe("copyVerts",()=>{
  document.getElementById("copyVerts").onclick=()=>{
    if(!window.__lastVerts||!window.__lastVerts.length) return;
    const g=CRS.isGeo(activeCRS); const head="#\t"+(g?"Lon\tLat":"X\tY");
    const lines=window.__lastVerts.map((p,i)=>{const [x,y]=CRS.fromWGS(p[0],p[1],activeCRS);const [fx,fy]=fmtCoord(x,y,activeCRS);return (i+1)+"\t"+fx+"\t"+fy;});
    copyText([head,...lines].join("\n"));
  };
});
function copyText(txt){
  const done=()=>toast(t("copied"));
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(()=>fb());
  else fb();
  function fb(){const ta=document.createElement("textarea");ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(_){}ta.remove();done();}
}

/* ---------- 11. CRS picker modal ---------- */
let crsTarget="active"; // active | src | dst
safe("crs-picker",()=>{
  const modal=document.getElementById("crsModal"),results=document.getElementById("crsResults"),search=document.getElementById("crsSearch");
  function open(target){crsTarget=target;modal.style.display="block";search.value="";render(CRS.search(""));search.focus();}
  function close(){modal.style.display="none";}
  function render(items){
    results.innerHTML=items.map(c=>`<div class="item" data-code="${c.code}" style="display:flex;gap:10px;padding:11px;border:1px solid var(--line);border-radius:10px;margin-bottom:6px;cursor:pointer">
      <span style="flex:1"><b>${c.name}</b><br><small style="color:var(--muted)">${c.code}</small></span></div>`).join("")
      || `<div class="empty">${t("crs_notfound")}</div>`;
    results.querySelectorAll("[data-code]").forEach(el=>el.onclick=()=>pick(el.getAttribute("data-code")));
  }
  function pick(code){ setCRS(crsTarget,code); close(); }
  let searchT;
  search.oninput=()=>{
    clearTimeout(searchT);
    const q=search.value.trim();
    const local=CRS.search(q); render(local);
    // si numérique et absent localement → epsg.io
    const num=q.replace(/[^0-9]/g,"");
    if(num.length>=4 && !CRS.get("EPSG:"+num)){
      searchT=setTimeout(async()=>{
        document.getElementById("batchStatus");
        try{ await CRS.fetchEPSG(num); render(CRS.search(q)); }catch(e){ /* reste sur local */ }
      },600);
    }
  };
  document.getElementById("crsChip").onclick=()=>open("active");
  document.getElementById("srcChip").onclick=()=>open("src");
  document.getElementById("dstChip").onclick=()=>open("dst");
  document.getElementById("crsClose").onclick=close;
  modal.onclick=e=>{if(e.target===modal)close();};
  document.getElementById("crsCustom").onclick=()=>{
    const code=prompt("Code (ex: EPSG:99999 ou MY:CRS):"); if(!code)return;
    const def=prompt("Définition proj4 (ex: +proj=utm +zone=29 ...):"); if(!def)return;
    const name=prompt("Nom affiché:")||code;
    try{ CRS.addCustom(code.trim(),name.trim(),def.trim()); toast("✓ "+name); }catch(e){ toast("proj4 invalide",true); }
  };
  window.__openCRS=open;
});
function setCRS(target,code){
  const c=CRS.get(code); if(!c) return;
  if(target==="active"){activeCRS=code;document.getElementById("crsName").textContent=c.name;updateCoordOut(map.getCenter().lat,map.getCenter().lng);if(selectedLayer)showVertices(selectedLayer);}
  else if(target==="src"){document.getElementById("srcName").textContent=c.name;document.getElementById("srcChip").dataset.code=code;}
  else if(target==="dst"){document.getElementById("dstName").textContent=c.name;document.getElementById("dstChip").dataset.code=code;}
}

/* ---------- 12. Batch conversion (TWCC-style) ---------- */
safe("batch",()=>{
  document.getElementById("srcChip").dataset.code="EPSG:4326";
  document.getElementById("dstChip").dataset.code="EPSG:32629";
  document.getElementById("dstName").textContent="UTM 29N (WGS84)";
  let lastRows=[];
  document.getElementById("batchRun").onclick=()=>{
    const src=document.getElementById("srcChip").dataset.code||"EPSG:4326";
    const dst=document.getElementById("dstChip").dataset.code||"EPSG:4326";
    const txt=document.getElementById("batchIn").value.trim();
    const st=document.getElementById("batchStatus");
    if(!txt){st.className="status err";st.textContent=t("bad_xy");return;}
    const lines=txt.split(/\r?\n/).filter(l=>l.trim());
    const out=[]; let ok=0,bad=0;
    lines.forEach(line=>{
      const parts=line.split(/[,;\t ]+/).filter(s=>s!=="");
      let name="",a,b;
      if(parts.length>=3 && isNaN(parseFloat(parts[0]))){name=parts[0];a=parseFloat(parts[1]);b=parseFloat(parts[2]);}
      else {a=parseFloat(parts[0]);b=parseFloat(parts[1]);}
      if(isNaN(a)||isNaN(b)){bad++;out.push({name,err:true,raw:line});return;}
      try{
        const [lng,lat]=CRS.toWGS(a,b,src);
        const [x,y]=CRS.fromWGS(lng,lat,dst);
        const [fx,fy]=fmtCoord(x,y,dst);
        out.push({name,x:fx,y:fy}); ok++;
      }catch(e){bad++;out.push({name,err:true,raw:line});}
    });
    lastRows=out;
    const g=CRS.isGeo(dst);
    let rows=out.map((r,i)=>r.err?`<tr><td class="idx">${i+1}</td><td colspan="2" style="color:var(--red)">${t("bad_xy")}</td></tr>`:`<tr><td class="idx">${r.name||i+1}</td><td>${r.x}</td><td>${r.y}</td></tr>`).join("");
    document.getElementById("batchResult").innerHTML=`<div class="dtable"><div class="scroll"><table><thead><tr><th>#</th><th>${g?"Lon":"X"}</th><th>${g?"Lat":"Y"}</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    st.className="status ok"; st.textContent=`✓ ${ok} ${t("done")}${bad?(" • "+bad+" ✗"):""}`;
    document.getElementById("batchExport").style.display="grid";
  };
  function batchText(){
    const dst=document.getElementById("dstChip").dataset.code||"EPSG:4326";const g=CRS.isGeo(dst);
    const head="name\t"+(g?"lon\tlat":"x\ty");
    return [head,...lastRows.filter(r=>!r.err).map((r,i)=>(r.name||(i+1))+"\t"+r.x+"\t"+r.y)].join("\n");
  }
  document.getElementById("batchCopy").onclick=()=>{if(lastRows.length)copyText(batchText());};
  document.getElementById("batchCsv").onclick=()=>{if(lastRows.length)download("conversion.csv",batchText().replace(/\t/g,","),"text/csv");};
});

/* ---------- 13. Import / Export ---------- */
function download(name,content,mime){const b=new Blob([content],{type:mime||"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);}
function featuresToGeoJSON(){
  const fs=[];
  drawn.eachLayer(l=>{
    let g=null;
    if(l instanceof L.Marker){const p=l.getLatLng();g={type:"Point",coordinates:[p.lng,p.lat]};}
    else if(l instanceof L.Circle){const c=l.getLatLng(),r=l.getRadius(),pts=[];for(let i=0;i<=64;i++){const an=i/64*2*Math.PI,dx=r*Math.cos(an),dy=r*Math.sin(an);pts.push([c.lng+dx/(111320*Math.cos(c.lat*Math.PI/180)),c.lat+dy/111320]);}g={type:"Polygon",coordinates:[pts]};}
    else if(l instanceof L.Polygon){const r=l.getLatLngs()[0].map(p=>[p.lng,p.lat]);r.push(r[0]);g={type:"Polygon",coordinates:[r]};}
    else if(l instanceof L.Polyline){g={type:"LineString",coordinates:l.getLatLngs().map(p=>[p.lng,p.lat])};}
    if(g)fs.push({type:"Feature",properties:{name:l._gname},geometry:g});
  });
  return {type:"FeatureCollection",features:fs};
}
function toKML(gj){const esc=s=>String(s).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]));let p="";gj.features.forEach(f=>{const n=esc(f.properties.name||""),g=f.geometry;if(g.type==="Point")p+=`<Placemark><name>${n}</name><Point><coordinates>${g.coordinates[0]},${g.coordinates[1]},0</coordinates></Point></Placemark>`;else if(g.type==="LineString")p+=`<Placemark><name>${n}</name><LineString><coordinates>${g.coordinates.map(c=>c[0]+","+c[1]+",0").join(" ")}</coordinates></LineString></Placemark>`;else if(g.type==="Polygon")p+=`<Placemark><name>${n}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${g.coordinates[0].map(c=>c[0]+","+c[1]+",0").join(" ")}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;});return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${p}</Document></kml>`;}
function toCSV(gj){let o="name,type,longitude,latitude\n";gj.features.forEach(f=>{const g=f.geometry,n=(f.properties.name||"").replace(/,/g," "),cs=g.type==="Point"?[g.coordinates]:(g.type==="LineString"?g.coordinates:g.coordinates[0]);cs.forEach(c=>o+=`${n},${g.type},${c[0]},${c[1]}\n`);});return o;}
function toGPX(gj){let w="",tr="";gj.features.forEach(f=>{const g=f.geometry,n=f.properties.name||"";if(g.type==="Point")w+=`<wpt lat="${g.coordinates[1]}" lon="${g.coordinates[0]}"><name>${n}</name></wpt>`;else{const cs=g.type==="LineString"?g.coordinates:g.coordinates[0];tr+=`<trk><name>${n}</name><trkseg>${cs.map(c=>`<trkpt lat="${c[1]}" lon="${c[0]}"></trkpt>`).join("")}</trkseg></trk>`;}});return `<?xml version="1.0"?>\n<gpx version="1.1" creator="GeoTopo Pro" xmlns="http://www.topografix.com/GPX/1/1">${w}${tr}</gpx>`;}
function toDXF(gj){
  const code=activeCRS,H=["0","SECTION","2","ENTITIES"];
  function P(lng,lat){return CRS.fromWGS(lng,lat,code);}
  // 1) éléments dessinés (couche DESSIN)
  gj.features.forEach(f=>{const g=f.geometry;
    if(g.type==="Point"){const[x,y]=P(...g.coordinates);H.push("0","POINT","8","DESSIN","10",x,"20",y,"30","0");}
    else if(g.type==="LineString"){H.push("0","LWPOLYLINE","8","DESSIN","90",g.coordinates.length,"70","0");g.coordinates.forEach(c=>{const[x,y]=P(...c);H.push("10",x,"20",y);});}
    else if(g.type==="Polygon"){const r=g.coordinates[0];H.push("0","LWPOLYLINE","8","DESSIN","90",r.length,"70","1");r.forEach(c=>{const[x,y]=P(...c);H.push("10",x,"20",y);});}
  });
  // 2) courbes de niveau (couche CONTOUR_xxx) si calculées
  if(lastContours && lastContours.levels){
    lastContours.levels.forEach(Lv=>{ Lv.segs.forEach(s=>{
      const [x1,y1]=P(s[0][1],s[0][0]); const [x2,y2]=P(s[1][1],s[1][0]);
      H.push("0","POLYLINE","8","CONTOUR_"+Lv.lv,"66","1","70","8");
      H.push("0","VERTEX","8","CONTOUR_"+Lv.lv,"10",x1,"20",y1,"30",Lv.lv,"70","32");
      H.push("0","VERTEX","8","CONTOUR_"+Lv.lv,"10",x2,"20",y2,"30",Lv.lv,"70","32");
      H.push("0","SEQEND");
    });});
  }
  // 3) points d'altitude (couche ALTITUDES) si calculés
  if(lastElev && lastElev.rows){
    lastElev.rows.forEach(r=>{ if(r.z==null)return; H.push("0","POINT","8","ALTITUDES","10",r.x,"20",r.y,"30",r.z);
      // texte de cote
      H.push("0","TEXT","8","ALTITUDES","10",r.x,"20",r.y,"30",r.z,"40","2","1",String(r.z.toFixed(1)));
    });
  }
  H.push("0","ENDSEC","0","EOF");return H.join("\n");
}
function toPDF(gj){const{jsPDF}=window.jspdf;const doc=new jsPDF();doc.setFontSize(16);doc.text("GeoTopo Pro — Export",14,18);doc.setFontSize(9);doc.text("CRS: "+activeCRS+"   "+new Date().toLocaleString(),14,25);let y=34;doc.setFontSize(8);doc.text("Name",14,y);doc.text("Type",70,y);doc.text("X",100,y);doc.text("Y",150,y);y+=4;doc.line(14,y,196,y);y+=5;gj.features.forEach(f=>{const g=f.geometry,c0=g.type==="Point"?g.coordinates:(g.type==="LineString"?g.coordinates[0]:g.coordinates[0][0]);const[x,yy]=CRS.fromWGS(c0[0],c0[1],activeCRS);const gg=CRS.isGeo(activeCRS);doc.text(String(f.properties.name||""),14,y);doc.text(String(g.type),70,y);doc.text(gg?x.toFixed(6):x.toFixed(2),100,y);doc.text(gg?yy.toFixed(6):yy.toFixed(2),150,y);y+=6;if(y>280){doc.addPage();y=20;}});doc.save("geotopo.pdf");}

safe("io",()=>{
  document.getElementById("impBtn").onclick=()=>document.getElementById("impFile").click();
  document.getElementById("impFile").onchange=function(){const f=this.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{importText(f.name,r.result);}catch(e){toast("Import: "+e.message,true);}this.value="";};r.readAsText(f);};
  document.querySelectorAll("[data-exp]").forEach(b=>b.onclick=()=>{
    const gj=featuresToGeoJSON(); if(!gj.features.length){toast(t("no_export"),true);return;}
    const fmt=b.getAttribute("data-exp");
    try{
      if(fmt==="geojson")download("geotopo.geojson",JSON.stringify(gj,null,2),"application/json");
      else if(fmt==="kml")download("geotopo.kml",toKML(gj),"application/vnd.google-earth.kml+xml");
      else if(fmt==="csv")download("geotopo.csv",toCSV(gj),"text/csv");
      else if(fmt==="gpx")download("geotopo.gpx",toGPX(gj),"application/gpx+xml");
      else if(fmt==="dxf")download("geotopo.dxf",toDXF(gj),"application/dxf");
      else if(fmt==="pdf")toPDF(gj);
      toast(t("exported")+fmt.toUpperCase());
    }catch(e){toast("Export: "+e.message,true);}
  });
});
function addGeoJSON(gj){let n=0;L.geoJSON(gj,{onEachFeature:(f,layer)=>{register(layer,layer instanceof L.Marker?"marker":(layer instanceof L.Polygon?"polygon":"polyline"));if(f.properties&&f.properties.name)layer._gname=f.properties.name;n++;},pointToLayer:(f,ll)=>L.marker(ll)});if(n)try{map.fitBounds(drawn.getBounds(),{maxZoom:16,padding:[30,30]});}catch(_){}return n;}
function importText(name,text){
  const ext=name.split(".").pop().toLowerCase(); let n=0;
  if(ext==="geojson"||ext==="json") n=addGeoJSON(JSON.parse(text));
  else if(ext==="kml"||ext==="gpx"){const lib=window.toGeoJSON;if(!lib){toast("Lib KML/GPX non chargée",true);return;}const xml=new DOMParser().parseFromString(text,"text/xml");if(xml.querySelector("parsererror")){toast("Fichier invalide",true);return;}n=addGeoJSON(ext==="kml"?lib.kml(xml):lib.gpx(xml));}
  else if(ext==="csv"||ext==="txt"){n=importCSV(text);if(!n){toast("CSV: colonnes lon/lat introuvables",true);return;}}
  else if(ext==="dxf"){n=importDXF(text);if(!n){toast(t("no_lines_dxf"),true);return;}}
  else{toast("Format ."+ext+" non supporté",true);return;}
  toast(t("imported").replace("%n",n)); renderList();
}
function importCSV(text){
  const lines=text.trim().split(/\r?\n/);if(lines.length<2)return 0;
  const head=lines[0].toLowerCase().split(/[;,\t]/).map(s=>s.trim());
  const li=head.findIndex(h=>/lon|lng|x|easting/.test(h)),la=head.findIndex(h=>/lat|y|northing/.test(h)),ni=head.findIndex(h=>/name|nom|label/.test(h));
  if(li<0||la<0)return 0; let n=0;
  for(let i=1;i<lines.length;i++){const c=lines[i].split(/[;,\t]/);const x=parseFloat(c[li]),y=parseFloat(c[la]);if(isNaN(x)||isNaN(y))continue;let lng=x,lat=y;if(activeCRS!=="EPSG:4326"&&(Math.abs(x)>180||Math.abs(y)>90)){[lng,lat]=CRS.toWGS(x,y,activeCRS);}const m=L.marker([lat,lng]);register(m,"marker");if(ni>=0&&c[ni])m._gname=c[ni].trim();n++;}
  if(n)try{map.fitBounds(drawn.getBounds(),{maxZoom:16,padding:[30,30]});}catch(_){}return n;
}
function importDXF(text){
  const lines=text.split(/\r?\n/).map(s=>s.trim());const pairs=[];for(let i=0;i+1<lines.length;i+=2)pairs.push([lines[i],lines[i+1]]);
  let n=0,i=0;function proj(x,y){return activeCRS==="EPSG:4326"?[x,y]:CRS.toWGS(x,y,activeCRS);}
  while(i<pairs.length){const[g,v]=pairs[i];
    if(g==="0"&&(v==="LWPOLYLINE"||v==="POLYLINE")){const verts=[];i++;while(i<pairs.length&&pairs[i][0]!=="0"){if(pairs[i][0]==="10"){const x=parseFloat(pairs[i][1]);let y=NaN;if(pairs[i+1]&&pairs[i+1][0]==="20")y=parseFloat(pairs[i+1][1]);if(!isNaN(x)&&!isNaN(y)){const[lng,lat]=proj(x,y);verts.push([lat,lng]);}}i++;}if(verts.length>=2){register(L.polyline(verts,{color:"#3b82f6"}),"polyline");n++;}continue;}
    if(g==="0"&&v==="POINT"){let x=NaN,y=NaN;i++;while(i<pairs.length&&pairs[i][0]!=="0"){if(pairs[i][0]==="10")x=parseFloat(pairs[i][1]);if(pairs[i][0]==="20")y=parseFloat(pairs[i][1]);i++;}if(!isNaN(x)&&!isNaN(y)){const[lng,lat]=proj(x,y);register(L.marker([lat,lng]),"marker");n++;}continue;}
    i++;}
  if(n)try{map.fitBounds(drawn.getBounds(),{maxZoom:16,padding:[30,30]});}catch(_){}return n;
}

/* ---------- 14. Elevation ---------- */
let elevChart=null,lastElev=null;
// fetch avec timeout pour éviter le gel
async function fetchT(url,opts,ms){
  const ctrl=new AbortController(); const id=setTimeout(()=>ctrl.abort(),ms||15000);
  try{ return await fetch(url,Object.assign({signal:ctrl.signal},opts||{})); }
  finally{ clearTimeout(id); }
}
async function fetchElev(latlngs,dataset){
  const errs=[];
  // 1) Open-Meteo — HTTPS, CORS ok, rapide, fiable
  try{return await openMeteo(latlngs);}catch(e){errs.push("Open-Meteo: "+(e.name==="AbortError"?"timeout":e.message));}
  // 2) OpenTopoData (permet de choisir SRTM/ASTER/Mapzen)
  try{return await otd(latlngs,dataset);}catch(e){errs.push("OpenTopoData: "+(e.name==="AbortError"?"timeout":e.message));}
  // 3) Open-Elevation
  try{return await openElev(latlngs);}catch(e){errs.push("Open-Elevation: "+(e.name==="AbortError"?"timeout":e.message));}
  throw new Error(errs.join(" | "));
}
async function openMeteo(latlngs){
  const out=[];
  for(let i=0;i<latlngs.length;i+=100){
    const b=latlngs.slice(i,i+100);
    const lat=b.map(p=>p[0].toFixed(6)).join(","), lng=b.map(p=>p[1].toFixed(6)).join(",");
    const res=await fetchT("https://api.open-meteo.com/v1/elevation?latitude="+lat+"&longitude="+lng,{},15000);
    if(!res.ok)throw new Error("HTTP "+res.status);
    const j=await res.json();
    if(!j.elevation)throw new Error("no data");
    j.elevation.forEach(z=>out.push(z));
  }
  return out;
}
async function otd(latlngs,ds){const out=[];for(let i=0;i<latlngs.length;i+=100){const b=latlngs.slice(i,i+100);if(i>0)await new Promise(r=>setTimeout(r,1100));const res=await fetchT("https://api.opentopodata.org/v1/"+ds+"?locations="+b.map(p=>p[0].toFixed(6)+","+p[1].toFixed(6)).join("|"),{},15000);if(!res.ok)throw new Error("HTTP "+res.status);const j=await res.json();if(j.status!=="OK")throw new Error(j.error||j.status);j.results.forEach(r=>out.push(r.elevation));}return out;}
async function openElev(latlngs){const out=[];for(let i=0;i<latlngs.length;i+=200){const b=latlngs.slice(i,i+200);const res=await fetchT("https://api.open-elevation.com/api/v1/lookup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({locations:b.map(p=>({latitude:p[0],longitude:p[1]}))})},15000);if(!res.ok)throw new Error("HTTP "+res.status);const j=await res.json();if(!j.results)throw new Error("no results");j.results.forEach(r=>out.push(r.elevation));}return out;}
function sampleLine(lls,n){const pts=lls.map(p=>[p.lat,p.lng]),seg=[],cum=[];let tot=0;for(let i=1;i<pts.length;i++){const d=map.distance(pts[i-1],pts[i]);seg.push(d);tot+=d;}const out=[];for(let s=0;s<n;s++){const target=tot*s/(n-1);let acc=0,k=0;while(k<seg.length-1&&acc+seg[k]<target){acc+=seg[k];k++;}const f=seg[k]?(target-acc)/seg[k]:0,a=pts[k],b=pts[Math.min(k+1,pts.length-1)];out.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);cum.push(target);}return{pts:out,dist:cum,total:tot};}
function pip(lat,lng,ring){let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=ring[i].lng,yi=ring[i].lat,xj=ring[j].lng,yj=ring[j].lat;if(((yi>lat)!==(yj>lat))&&(lng<(xj-xi)*(lat-yi)/(yj-yi)+xi))c=!c;}return c;}
function eStat(s,e,b){const el=document.getElementById("elevStatus");el.textContent=s||"";el.className="status"+(e?" err":b?" busy":" ok");}
function statsArr(a){const v=a.filter(x=>x!=null);if(!v.length)return null;return{min:Math.min(...v),max:Math.max(...v),mean:v.reduce((x,y)=>x+y,0)/v.length,n:v.length};}

safe("elev",()=>{
  document.getElementById("elevType").onchange=function(){document.getElementById("profOpt").style.display=this.value==="profile"?"block":"none";document.getElementById("gridOpt").style.display=this.value==="grid"?"block":"none";document.getElementById("contourOpt").style.display=this.value==="contour"?"block":"none";};
  document.getElementById("elevRun").onclick=async()=>{
    if(!selectedLayer||!drawn.hasLayer(selectedLayer)){const ls=drawn.getLayers();if(!ls.length){eStat(t("sel_first"),true);return;}let last=ls[0];ls.forEach(l=>{if((l._gid||0)>(last._gid||0))last=l;});selectedLayer=last;showVertices(last);}
    const ds=document.getElementById("elevSrc").value,type=document.getElementById("elevType").value,code=activeCRS;
    eStat(t("fetching"),false,true);document.getElementById("elevResult").innerHTML="";document.getElementById("elevChart").style.display="none";document.getElementById("elevExp").style.display="none";
    try{
      if(type==="vertices"){
        const verts=getVertices(selectedLayer).map(v=>[v[1],v[0]]);const el=await fetchElev(verts,ds);
        const rows=verts.map((v,i)=>{const[x,y]=CRS.fromWGS(v[1],v[0],code);return{i:i+1,x,y,z:el[i]};});
        lastElev={type:"vertices",code,rows};renderElevTable(rows,code);buildChart(rows.map((r,i)=>i+1),rows.map(r=>r.z),t("vertex"),t("alt_m"));document.getElementById("elevExp").style.display="grid";
      }else if(type==="profile"){
        if(!(selectedLayer instanceof L.Polyline)||selectedLayer instanceof L.Polygon){eStat(t("need_line"),true);return;}
        const n=Math.max(2,Math.min(200,parseInt(document.getElementById("nSamples").value)||50)),s=sampleLine(selectedLayer.getLatLngs(),n),el=await fetchElev(s.pts,ds);
        const rows=s.pts.map((p,i)=>{const[x,y]=CRS.fromWGS(p[1],p[0],code);return{i:i+1,dist:s.dist[i],x,y,z:el[i]};});
        lastElev={type:"profile",code,rows};profileSummary(rows,s.total);buildChart(rows.map(r=>r.dist.toFixed(0)),rows.map(r=>r.z),t("dist_m"),t("alt_m"));document.getElementById("elevExp").style.display="grid";
      }else if(type==="grid"){
        if(!(selectedLayer instanceof L.Polygon)){eStat(t("need_poly"),true);return;}
        const ring=selectedLayer.getLatLngs()[0],b=selectedLayer.getBounds(),step=Math.max(10,parseInt(document.getElementById("gridStep").value)||30);
        const latC=(b.getNorth()+b.getSouth())/2,dLat=step/111320,dLng=step/(111320*Math.cos(latC*Math.PI/180)),grid=[];
        for(let lat=b.getSouth();lat<=b.getNorth();lat+=dLat)for(let lng=b.getWest();lng<=b.getEast();lng+=dLng)if(pip(lat,lng,ring))grid.push([lat,lng]);
        if(!grid.length){eStat(t("need_poly"),true);return;}
        if(grid.length>800){eStat(t("too_many").replace("%n",grid.length),true);return;}
        const el=await fetchElev(grid,ds);const rows=grid.map((p,i)=>{const[x,y]=CRS.fromWGS(p[1],p[0],code);return{i:i+1,x,y,z:el[i]};}).filter(r=>r.z!=null);
        lastElev={type:"grid",code,rows,step};gridSummary(rows,step);document.getElementById("elevExp").style.display="grid";
      }else if(type==="contour"){
        if(!(selectedLayer instanceof L.Polygon)){eStat(LANG==="fr"?"Sélectionnez un polygone ou rectangle":"Select a polygon or rectangle",true);return;}
        await computeContours(selectedLayer,ds,code);
        document.getElementById("elevExp").style.display="grid";
        return; // computeContours met déjà son propre message de succès
      }
      eStat("✓ "+t("done"));
    }catch(e){eStat(t("elev_fail")+" — "+(e.message||e),true);}
  };
  document.getElementById("elevCsv").onclick=()=>{
    if(!lastElev)return;
    if(lastElev.type==="contour"){ // export GeoJSON des courbes
      const feats=[];
      lastElev.contours.levels.forEach(L=>L.segs.forEach(s=>feats.push({type:"Feature",properties:{elevation:L.lv},geometry:{type:"LineString",coordinates:[[s[0][1],s[0][0]],[s[1][1],s[1][0]]]}})));
      download("courbes_niveau.geojson",JSON.stringify({type:"FeatureCollection",features:feats}),"application/json");toast(t("exported")+"GeoJSON");return;
    }
    const g=CRS.isGeo(lastElev.code);let csv=lastElev.type==="profile"?"i,dist_m,"+(g?"lon,lat":"x,y")+",z\n":"i,"+(g?"lon,lat":"x,y")+",z\n";lastElev.rows.forEach(r=>{csv+=lastElev.type==="profile"?`${r.i},${r.dist.toFixed(2)},${r.x},${r.y},${r.z!=null?r.z.toFixed(2):""}\n`:`${r.i},${r.x},${r.y},${r.z!=null?r.z.toFixed(2):""}\n`;});download("elevations.csv",csv,"text/csv");toast(t("exported")+"CSV");
  };
  document.getElementById("elevDxf").onclick=()=>{
    if(!lastElev)return;const H=["0","SECTION","2","ENTITIES"];
    if(lastElev.type==="contour"){ // polylignes 3D par niveau, dans le CRS choisi
      lastElev.contours.levels.forEach(Lv=>{ Lv.segs.forEach(s=>{
        const [x1,y1]=CRS.fromWGS(s[0][1],s[0][0],lastElev.code);const [x2,y2]=CRS.fromWGS(s[1][1],s[1][0],lastElev.code);
        H.push("0","POLYLINE","8","CONTOUR_"+Lv.lv,"66","1","70","8");
        H.push("0","VERTEX","8","CONTOUR_"+Lv.lv,"10",x1,"20",y1,"30",Lv.lv,"70","32");
        H.push("0","VERTEX","8","CONTOUR_"+Lv.lv,"10",x2,"20",y2,"30",Lv.lv,"70","32");
        H.push("0","SEQEND");
      });});
      H.push("0","ENDSEC","0","EOF");download("courbes_niveau.dxf",H.join("\n"),"application/dxf");toast(t("exported")+"DXF");return;
    }
    lastElev.rows.forEach(r=>{if(r.z==null)return;H.push("0","POINT","8","ELEV","10",r.x,"20",r.y,"30",r.z);});if(lastElev.type==="profile"){H.push("0","POLYLINE","8","PROFILE","66","1","70","8");lastElev.rows.filter(r=>r.z!=null).forEach(r=>H.push("0","VERTEX","8","PROFILE","10",r.x,"20",r.y,"30",r.z,"70","32"));H.push("0","SEQEND");}H.push("0","ENDSEC","0","EOF");download("elevations_3d.dxf",H.join("\n"),"application/dxf");toast(t("exported")+"DXF 3D");
  };
});
async function computeContours(poly,ds,code){
  const ring=poly.getLatLngs()[0], b=poly.getBounds();
  const res=Math.max(15,parseInt(document.getElementById("contourRes").value)||40);
  const interval=Math.max(1,parseInt(document.getElementById("contourStep").value)||10);
  const latC=(b.getNorth()+b.getSouth())/2, dLat=res/111320, dLng=res/(111320*Math.cos(latC*Math.PI/180));
  const lats=[],lngs=[];
  for(let lat=b.getSouth();lat<=b.getNorth()+dLat;lat+=dLat) lats.push(lat);
  for(let lng=b.getWest();lng<=b.getEast()+dLng;lng+=dLng) lngs.push(lng);
  const nR=lats.length,nC=lngs.length;
  if(nR*nC>800){ eStat(t("too_many").replace("%n",nR*nC),true); return; }
  eStat((LANG==="fr"?"Récupération de ":"Fetching ")+(nR*nC)+" points…",false,true);
  const pts=[]; for(let r=0;r<nR;r++)for(let c=0;c<nC;c++)pts.push([lats[r],lngs[c]]);
  let el;
  try{ el=await fetchElev(pts,ds); }
  catch(e){ eStat(t("elev_fail")+" — "+(e.message||e),true); return; }
  // grid of elevations
  const Z=[]; let k=0,zmin=Infinity,zmax=-Infinity;
  for(let r=0;r<nR;r++){Z[r]=[];for(let c=0;c<nC;c++){const z=el[k++];Z[r][c]=z;if(z!=null){if(z<zmin)zmin=z;if(z>zmax)zmax=z;}}}
  if(!isFinite(zmin)){ eStat(t("elev_fail"),true); return; }
  // contour levels
  const levels=[]; const start=Math.ceil(zmin/interval)*interval;
  for(let lv=start;lv<=zmax;lv+=interval) levels.push(lv);
  // marching squares per cell → line segments grouped by level
  const segsByLevel={};
  function interp(z1,z2,p1,p2,lv){const t=(lv-z1)/(z2-z1);return [p1[0]+(p2[0]-p1[0])*t,p1[1]+(p2[1]-p1[1])*t];}
  for(let r=0;r<nR-1;r++)for(let c=0;c<nC-1;c++){
    const z00=Z[r][c],z10=Z[r][c+1],z11=Z[r+1][c+1],z01=Z[r+1][c];
    if([z00,z10,z11,z01].some(v=>v==null))continue;
    const P={tl:[lats[r],lngs[c]],tr:[lats[r],lngs[c+1]],br:[lats[r+1],lngs[c+1]],bl:[lats[r+1],lngs[c]]};
    levels.forEach(lv=>{
      const edges=[];
      // top edge (tl-tr)
      if((z00<lv)!==(z10<lv))edges.push(interp(z00,z10,P.tl,P.tr,lv));
      // right edge (tr-br)
      if((z10<lv)!==(z11<lv))edges.push(interp(z10,z11,P.tr,P.br,lv));
      // bottom edge (br-bl)
      if((z11<lv)!==(z01<lv))edges.push(interp(z11,z01,P.br,P.bl,lv));
      // left edge (bl-tl)
      if((z01<lv)!==(z00<lv))edges.push(interp(z01,z00,P.bl,P.tl,lv));
      if(edges.length>=2){ (segsByLevel[lv]=segsByLevel[lv]||[]).push([edges[0],edges[1]]); }
    });
  }
  // color ramp by elevation
  function colorFor(lv){const tt=(lv-zmin)/Math.max(1,(zmax-zmin));
    // bleu(bas)→vert→jaune→rouge(haut)
    const stops=[[0,"#2563eb"],[.33,"#10b981"],[.66,"#f5a623"],[1,"#ef4444"]];
    let a=stops[0],b2=stops[stops.length-1];
    for(let i=0;i<stops.length-1;i++){if(tt>=stops[i][0]&&tt<=stops[i+1][0]){a=stops[i];b2=stops[i+1];break;}}
    const f=(tt-a[0])/Math.max(.0001,(b2[0]-a[0]));
    const ca=hex(a[1]),cb=hex(b2[1]);
    return "rgb("+Math.round(ca[0]+(cb[0]-ca[0])*f)+","+Math.round(ca[1]+(cb[1]-ca[1])*f)+","+Math.round(ca[2]+(cb[2]-ca[2])*f)+")";
  }
  function hex(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  // draw
  if(contourLayer) map.removeLayer(contourLayer);
  contourLayer=L.layerGroup().addTo(map);
  let count=0;
  lastContours={levels:[],code};
  Object.keys(segsByLevel).map(Number).sort((a,b)=>a-b).forEach(lv=>{
    const col=colorFor(lv); const segs=segsByLevel[lv];
    const major = lv%(interval*5)===0;
    segs.forEach(s=>{ L.polyline([[s[0][0],s[0][1]],[s[1][0],s[1][1]]],{color:col,weight:major?3.5:2,opacity:1}).addTo(contourLayer); });
    if(major && segs[0]){ L.marker([segs[0][0][0],segs[0][0][1]],{icon:L.divIcon({className:"",html:`<span style="background:rgba(13,20,33,.85);color:${col};padding:2px 6px;border-radius:4px;font:700 11px monospace">${lv}</span>`})}).addTo(contourLayer); }
    lastContours.levels.push({lv,col,segs}); count++;
  });
  if(count===0){
    eStat(LANG==="fr"?"Aucune courbe à Δ"+interval+"m (terrain plat ?). Réduisez l'équidistance.":"No contour at Δ"+interval+"m (flat terrain?). Reduce the interval.",true);
    return;
  }
  // amener la vue sur le polygone pour voir les courbes immédiatement
  try{ map.fitBounds(poly.getBounds(),{maxZoom:16,padding:[20,20]}); }catch(_){}
  // s'assurer que les courbes sont au-dessus
  contourLayer.bringToFront&&contourLayer.bringToFront();
  // Show explicit contour delete button
  const btnDC=document.getElementById("dClearContour");
  if(btnDC) btnDC.style.display="flex";
  eStat("✓ "+t("contour_done").replace("%n",count)+" ("+zmin.toFixed(0)+"–"+zmax.toFixed(0)+" m)");
  document.getElementById("elevResult").innerHTML=`<div class="kv"><div><span class="k">${t("min")}/${t("max")}:</span> <span class="v">${zmin.toFixed(1)} / ${zmax.toFixed(1)} m</span></div><div><span class="k">${t("contours")}:</span> <span class="v">${count}</span> (Δ ${interval} m)</div></div>`;
  document.getElementById("elevExp").style.display="grid";
  lastElev={type:"contour",code,contours:lastContours};
}

function renderElevTable(rows,code){const g=CRS.isGeo(code);let h=`<div class="dtable"><div class="scroll"><table><thead><tr><th>#</th><th>${g?"Lon":"X"}</th><th>${g?"Lat":"Y"}</th><th>Z(m)</th></tr></thead><tbody>`;rows.forEach(r=>{const[fx,fy]=fmtCoord(r.x,r.y,code);h+=`<tr><td class="idx">${r.i}</td><td>${fx}</td><td>${fy}</td><td>${r.z!=null?r.z.toFixed(1):"—"}</td></tr>`;});document.getElementById("elevResult").innerHTML=h+"</tbody></table></div></div>";}
function profileSummary(rows,total){const s=statsArr(rows.map(r=>r.z));if(!s)return;let gain=0;for(let i=1;i<rows.length;i++)if(rows[i].z!=null&&rows[i-1].z!=null&&rows[i].z>rows[i-1].z)gain+=rows[i].z-rows[i-1].z;document.getElementById("elevResult").innerHTML=`<div class="kv"><div><span class="k">${t("min")}:</span> <span class="v">${s.min.toFixed(1)} m</span> <span class="k">${t("max")}:</span> <span class="v">${s.max.toFixed(1)} m</span></div><div><span class="k">${t("mean")}:</span> <span class="v">${s.mean.toFixed(1)} m</span></div><div><span class="k">${t("length")}:</span> <span class="v">${total.toFixed(1)} m</span></div><div><span class="k">${t("gain")}:</span> <span class="v">${gain.toFixed(1)} m</span></div></div>`;}
function gridSummary(rows,step){const s=statsArr(rows.map(r=>r.z));if(!s)return;let ref=parseFloat(document.getElementById("refLvl").value);if(isNaN(ref))ref=s.mean;const cell=step*step;let cut=0,fill=0;rows.forEach(r=>{const d=r.z-ref;if(d>0)cut+=d*cell;else fill+=-d*cell;});document.getElementById("elevResult").innerHTML=`<div class="kv"><div><span class="k">${t("points")}:</span> <span class="v">${s.n}</span> <span class="k">${t("cell")}:</span> <span class="v">${step}×${step}m</span></div><div><span class="k">${t("min")}/${t("max")}:</span> <span class="v">${s.min.toFixed(1)}/${s.max.toFixed(1)} m</span></div><div><span class="k">${t("ref")}:</span> <span class="v">${ref.toFixed(1)} m</span></div><div><span class="k">${t("cut")}:</span> <span class="v">${cut.toFixed(0)} m³</span></div><div><span class="k">${t("fill")}:</span> <span class="v">${fill.toFixed(0)} m³</span></div><div><span class="k">${t("net")}:</span> <span class="v">${(cut-fill).toFixed(0)} m³</span></div></div>`;}
function buildChart(labels,data,xl,yl){const cv=document.getElementById("elevChart");if(typeof Chart==="undefined"){cv.style.display="none";return;}cv.style.display="block";if(elevChart)elevChart.destroy();elevChart=new Chart(cv,{type:"line",data:{labels,datasets:[{label:yl,data,borderColor:"#1fd1a8",backgroundColor:"rgba(31,209,168,.15)",fill:true,tension:.25,pointRadius:2}]},options:{plugins:{legend:{labels:{color:"#8294b5"}}},scales:{x:{title:{display:true,text:xl,color:"#8294b5"},ticks:{color:"#8294b5",maxTicksLimit:8}},y:{title:{display:true,text:yl,color:"#8294b5"},ticks:{color:"#8294b5"}}}}});}

/* ---------- 15. refresh + init ---------- */
function refreshAll(){renderList();updateCoordOut(map.getCenter().lat,map.getCenter().lng);if(selectedLayer)showVertices(selectedLayer);}
safe("init",()=>{
  // Initialize persistent layers
  if(!gpsLayer)  gpsLayer  = L.layerGroup().addTo(map);
  if(!gotoLayer) gotoLayer = L.layerGroup().addTo(map);
  applyLang();
  setCRS("active","EPSG:4326");
  updateCoordOut(map.getCenter().lat,map.getCenter().lng);
  renderList();
  setTimeout(()=>map.invalidateSize(),400);
  toast(t("map_loaded"));
});


/* ============================================================
   ADDON — Nouvelles fonctionnalites GeoTopo Pro v2
   ============================================================ */

/* 1. GPS TEMPS REEL */
/* ── GPS TEMPS RÉEL ── */
var _gpsWatchId=null, _gpsTrail=[], _gpsLayer=null, _gpsMarker=null, _gpsOn=false;
var _gpsIcon=null;

function toggleGPS(){
  if(_gpsOn) stopGPS(); else startGPS();
}

function startGPS(){
  if(!navigator.geolocation){
    alert("GPS non disponible sur cet appareil");
    return;
  }
  _gpsOn=true;
  _gpsTrail=[];
  var btn=document.getElementById("btnGPSRT");
  var chip=document.getElementById("gpsChip");
  if(btn){btn.style.background="var(--accent)";btn.style.color="var(--accent-d)";btn.textContent="⊗";}
  if(chip){chip.style.display="block";chip.textContent="📡 GPS: recherche...";}

  if(!_gpsIcon){
    _gpsIcon=L.divIcon({
      className:"",
      html:'<div style="width:20px;height:20px;border-radius:50%;background:#1fd1a8;border:3px solid #fff;box-shadow:0 0 0 5px rgba(31,209,168,0.3),0 2px 8px rgba(0,0,0,0.5)"></div>',
      iconSize:[20,20],iconAnchor:[10,10]
    });
  }

  _gpsWatchId=navigator.geolocation.watchPosition(
    function(pos){
      var lat=pos.coords.latitude;
      var lon=pos.coords.longitude;
      var acc=Math.round(pos.coords.accuracy||0);
      var spd=pos.coords.speed ? (pos.coords.speed*3.6).toFixed(1)+" km/h" : "";

      // Update marker
      if(!_gpsMarker){
        _gpsMarker=L.marker([lat,lon],{icon:_gpsIcon,zIndexOffset:1000}).addTo(map);
      } else {
        _gpsMarker.setLatLng([lat,lon]);
      }

      // Update trail
      _gpsTrail.push([lat,lon]);
      if(_gpsLayer) map.removeLayer(_gpsLayer);
      if(_gpsTrail.length>1){
        _gpsLayer=L.polyline(_gpsTrail,{color:"#1fd1a8",weight:4,opacity:0.85}).addTo(map);
      }

      // Update chip
      var chip=document.getElementById("gpsChip");
      if(chip){
        chip.innerHTML="📡 "+lat.toFixed(6)+", "+lon.toFixed(6)+
          "<br><small style='color:#94a3b8'>Précision: ±"+acc+"m"+(spd?" · "+spd:"")+"</small>";
      }

      // Center map on first fix
      if(_gpsTrail.length===1) map.setView([lat,lon],17);
    },
    function(err){
      var chip=document.getElementById("gpsChip");
      var msg="";
      if(err.code===1) msg="Permission refusée";
      else if(err.code===2) msg="Position indisponible";
      else if(err.code===3) msg="Délai dépassé";
      else msg=err.message;
      if(chip) chip.innerHTML="❌ GPS: "+msg;
      toast("GPS: "+msg, true);
    },
    {enableHighAccuracy:true, maximumAge:3000, timeout:30000}
  );
}

function stopGPS(){
  if(_gpsWatchId!==null){
    navigator.geolocation.clearWatch(_gpsWatchId);
    _gpsWatchId=null;
  }
  _gpsOn=false;
  var btn=document.getElementById("btnGPSRT");
  var chip=document.getElementById("gpsChip");
  if(btn){btn.style.background="";btn.style.color="";btn.textContent="📡";}
  if(chip){chip.style.display="none";}

  // Save trail as feature
  if(_gpsTrail.length>1){
    var ly=L.polyline(_gpsTrail,{color:"#1fd1a8",weight:3}).addTo(drawn);
    try{register(ly,"polyline");ly._gname="Trace GPS";}catch(e){}
    renderList();
    toast("Trace GPS sauvegardée ("+_gpsTrail.length+" points)");
  }
  if(_gpsMarker){map.removeLayer(_gpsMarker);_gpsMarker=null;}
  if(_gpsLayer){map.removeLayer(_gpsLayer);_gpsLayer=null;}
  _gpsTrail=[];
}

safe("gps_realtime", () => {
  // GPS buttons already in HTML, functions already global above
  // Nothing needed here
});


/* 2. ITINERAIRE A vers B */
safe("routing", () => {
  let routeLayer=null, ptA=null, ptB=null, markerA=null, markerB=null, routeCoords=[], picking=null;
  const tabs=document.getElementById("tabs");
  const routeTab=document.createElement("div");
  routeTab.className="tab"; routeTab.dataset.pane="route";
  routeTab.innerHTML='<span>&#x1F9ED;</span> Itineraire';
  tabs.appendChild(routeTab);
  const sb=document.getElementById("sheetbody");
  const rPane=document.createElement("div");
  rPane.className="pane"; rPane.dataset.pane="route";
  rPane.innerHTML='<h4>Itineraire A &rarr; B</h4><p class="note">Appuyez sur "Point A" ou "Point B" puis touchez la carte.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px"><button class="btn sm" id="pickA" style="border-color:#3b82f6;color:#3b82f6">A Point depart</button><button class="btn sm" id="pickB" style="border-color:#ef4444;color:#ef4444">B Point arrivee</button></div><div id="routePts" style="font:12px ui-monospace,monospace;color:var(--muted);margin-bottom:8px;min-height:28px"></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px"><button class="btn sm" onclick="calcRoute(\'driving\')">&#x1F697; Route</button><button class="btn sm" onclick="calcRoute(\'walking\')">&#x1F6B6; Marche</button><button class="btn sm" onclick="calcRoute(\'cycling\')">&#x1F6B4; Velo</button></div><div id="routeStatus" class="status"></div><div id="routeInfo" class="kv" style="margin-top:8px;display:none"></div><div class="btnrow two" id="routeExp" style="display:none;margin-top:8px"><button class="btn sm" onclick="exportRoute(\'gpx\')">GPX</button><button class="btn sm" onclick="exportRoute(\'kml\')">KML</button></div><button class="btn" id="clearRoute" style="margin-top:8px;display:none" onclick="clearRouteAll()">Effacer itineraire</button>';
  sb.appendChild(rPane);
  routeTab.onclick=()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.remove("on"));document.querySelectorAll(".pane").forEach(p=>p.classList.remove("on"));routeTab.classList.add("on");rPane.classList.add("on");};
  const icoA=L.divIcon({className:"",html:'<div style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.5)">A</div>',iconSize:[22,22],iconAnchor:[11,11]});
  const icoB=L.divIcon({className:"",html:'<div style="width:22px;height:22px;border-radius:50%;background:#ef4444;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.5)">B</div>',iconSize:[22,22],iconAnchor:[11,11]});
  document.getElementById("pickA").onclick=()=>{picking="A";toast("Touchez la carte pour point A");};
  document.getElementById("pickB").onclick=()=>{picking="B";toast("Touchez la carte pour point B");};
  map.on("click",e=>{
    if(!picking)return;
    const{lat,lng}=e.latlng;
    if(picking==="A"){ptA=[lat,lng];if(markerA)map.removeLayer(markerA);markerA=L.marker([lat,lng],{icon:icoA}).addTo(map);}
    else{ptB=[lat,lng];if(markerB)map.removeLayer(markerB);markerB=L.marker([lat,lng],{icon:icoB}).addTo(map);}
    picking=null;
    const el=document.getElementById("routePts");
    if(el) el.innerHTML=(ptA?'<span style="color:#3b82f6">A: '+ptA[0].toFixed(5)+", "+ptA[1].toFixed(5)+"</span>":"A: --")+"<br>"+(ptB?'<span style="color:#ef4444">B: '+ptB[0].toFixed(5)+", "+ptB[1].toFixed(5)+"</span>":"B: --");
  });
  window.calcRoute=async function(mode){
    if(!ptA||!ptB){toast("Placez d'abord A et B",true);return;}
    const st=document.getElementById("routeStatus");
    st.className="status busy";st.textContent="Calcul...";
    if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
    try{
      const url="https://router.project-osrm.org/route/v1/"+mode+"/"+ptA[1]+","+ptA[0]+";"+ptB[1]+","+ptB[0]+"?overview=full&geometries=geojson";
      const r=await fetch(url);const d=await r.json();
      if(!d.routes||!d.routes[0]){st.className="status err";st.textContent="Aucun itineraire";return;}
      const rt=d.routes[0];
      routeCoords=rt.geometry.coordinates.map(c=>[c[1],c[0]]);
      routeLayer=L.polyline(routeCoords,{color:"#3b82f6",weight:5,opacity:.85}).addTo(map);
      map.fitBounds(routeLayer.getBounds(),{padding:[30,30]});
      st.className="status ok";st.textContent="Itineraire calcule";
      const ri=document.getElementById("routeInfo");ri.style.display="block";
      ri.innerHTML='<div><span class="k">Distance:</span> <span class="v">'+(rt.distance/1000).toFixed(2)+' km</span></div><div><span class="k">Duree:</span> <span class="v">'+Math.round(rt.duration/60)+' min</span></div>';
      document.getElementById("routeExp").style.display="grid";
      document.getElementById("clearRoute").style.display="flex";
    }catch(e){st.className="status err";st.textContent="Erreur: "+e.message;}
  };
  window.clearRouteAll=function(){
    if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
    if(markerA){map.removeLayer(markerA);markerA=null;}
    if(markerB){map.removeLayer(markerB);markerB=null;}
    ptA=ptB=null;routeCoords=[];
    const el=document.getElementById("routePts");if(el)el.innerHTML="";
    const st=document.getElementById("routeStatus");if(st)st.textContent="";
    const ri=document.getElementById("routeInfo");if(ri)ri.style.display="none";
    const re=document.getElementById("routeExp");if(re)re.style.display="none";
    const cr=document.getElementById("clearRoute");if(cr)cr.style.display="none";
    toast("Itineraire efface");
  };
  window.exportRoute=function(fmt){
    if(!routeCoords.length)return;
    if(fmt==="gpx"){const g='<?xml version="1.0"?><gpx version="1.1" creator="GeoTopo Pro"><trk><name>Itineraire</name><trkseg>'+routeCoords.map(c=>'<trkpt lat="'+c[0]+'" lon="'+c[1]+'"></trkpt>').join("")+"</trkseg></trk></gpx>";download("itineraire.gpx",g,"application/gpx+xml");}
    else{const k='<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Itineraire</name><LineString><coordinates>'+routeCoords.map(c=>c[1]+","+c[0]+",0").join(" ")+"</coordinates></LineString></Placemark></Document></kml>";download("itineraire.kml",k,"application/vnd.google-earth.kml+xml");}
    toast("Exporte");
  };
});

/* 3. NUMEROS DES BORNES */
safe("vertex_labels", () => {
  let labelLayer=null;
  const dp=document.querySelector('[data-pane="draw"]');
  if(!dp)return;
  const sect=document.createElement("div");
  sect.innerHTML='<h4 style="margin-top:16px">Bornes</h4><div class="grid"><div class="tool" id="showBornes"><span class="ic">&#x1F522;</span><span>N&#xB0; Bornes</span></div><div class="tool" id="hideBornes"><span class="ic">&#x1F441;</span><span>Masquer</span></div><div class="tool" id="exportBornes"><span class="ic">&#x1F4CB;</span><span>CSV</span></div></div>';
  dp.appendChild(sect);
  document.getElementById("showBornes").onclick=()=>{
    if(labelLayer)map.removeLayer(labelLayer);
    labelLayer=L.layerGroup().addTo(map);
    let n=0;
    drawn.eachLayer(layer=>{
      let ll=null;
      if(layer instanceof L.Polygon||layer instanceof L.Polyline){ll=layer.getLatLngs();if(Array.isArray(ll[0]))ll=ll[0];}
      if(!ll)return;
      ll.forEach((p,i)=>{
        L.marker([p.lat,p.lng],{icon:L.divIcon({className:"",html:'<div style="background:#f5a623;color:#111;border:2px solid #fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;box-shadow:0 2px 6px rgba(0,0,0,.5)">'+(i+1)+"</div>",iconSize:[20,20],iconAnchor:[10,10]}),interactive:false}).addTo(labelLayer);
        n++;
      });
    });
    if(!n)toast("Dessinez un polygone d'abord",true);else toast(n+" borne(s) affichee(s)");
  };
  document.getElementById("hideBornes").onclick=()=>{if(labelLayer){map.removeLayer(labelLayer);labelLayer=null;}toast("Masque");};
  document.getElementById("exportBornes").onclick=()=>{
    let csv="Borne,Lat,Lon\n",n=1;
    drawn.eachLayer(layer=>{
      let ll=null;
      if(layer instanceof L.Polygon||layer instanceof L.Polyline){ll=layer.getLatLngs();if(Array.isArray(ll[0]))ll=ll[0];}
      if(!ll)return;
      ll.forEach(p=>{csv+=n+","+p.lat.toFixed(8)+","+p.lng.toFixed(8)+"\n";n++;});
    });
    if(n===1){toast("Aucun sommet",true);return;}
    download("bornes.csv",csv,"text/csv");toast("Bornes exportees");
  };
});

/* 4. IMPRESSION SATELLITE + PDF */
safe("print_pdf", () => {
  const btn=document.createElement("button");
  btn.className="icobtn";btn.title="Imprimer / PDF";btn.textContent="&#x1F5A8;";
  document.querySelector(".topbar").appendChild(btn);
  btn.onclick=()=>{
    const menu=document.createElement("div");
    menu.style.cssText="position:fixed;top:60px;right:12px;z-index:3000;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.5);min-width:200px";
    menu.innerHTML='<div style="font:700 12px system-ui;color:var(--muted);padding:4px 8px 8px">Exporter</div><button class="btn sm" id="mi1" style="margin-bottom:6px">&#x1F5A8; Imprimer carte</button><button class="btn sm" id="mi2" style="margin-bottom:6px">&#x1F4C4; PDF donnees</button><button class="btn sm" id="mi3">&#x2715; Fermer</button>';
    document.body.appendChild(menu);
    document.getElementById("mi3").onclick=()=>menu.remove();
    document.getElementById("mi1").onclick=()=>{menu.remove();printSat();};
    document.getElementById("mi2").onclick=()=>{menu.remove();pdfData();};
  };

  function printSat(){
    const sh=document.getElementById("sheet"),tp=document.querySelector(".topbar"),lc=document.getElementById("liveChip"),gc=document.getElementById("gpsChip");
    [sh,tp,lc,gc].forEach(e=>{if(e)e.style.display="none";});
    setTimeout(()=>{window.print();setTimeout(()=>{[sh,tp,lc,gc].forEach(e=>{if(e)e.style.display="";});},800);},300);
  }

  function pdfData(){
    const J=window.jspdf||window;
    if(!J||!J.jsPDF){toast("PDF non pret, reessayez",true);return;}
    const doc=new J.jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    doc.setFontSize(15);doc.setTextColor(31,209,168);doc.text("GeoTopo Pro",14,14);
    doc.setFontSize(8);doc.setTextColor(130,148,181);
    const c=map.getCenter();
    doc.text("Centre: "+c.lat.toFixed(6)+", "+c.lng.toFixed(6)+" | Zoom: "+map.getZoom()+" | "+new Date().toLocaleString(),14,21);
    let y=30;
    doc.setFillColor(28,40,64);doc.rect(14,y,270,7,"F");
    doc.setTextColor(234,240,250);doc.setFontSize(8);
    doc.text("Element",16,y+5);doc.text("Type",80,y+5);doc.text("Lat",130,y+5);doc.text("Lon",175,y+5);doc.text("Info",225,y+5);
    y+=9;let row=0;
    drawn.eachLayer(layer=>{
      let name=layer._name||("Element "+(row+1)),type="",lat="--",lon="--",info="";
      if(layer instanceof L.Circle&&!(layer instanceof L.CircleMarker)){const ll=layer.getLatLng();lat=ll.lat.toFixed(5);lon=ll.lng.toFixed(5);type="Cercle";info="R="+layer.getRadius().toFixed(0)+"m";}
      else if(layer instanceof L.Marker||layer instanceof L.CircleMarker){const ll=layer.getLatLng();lat=ll.lat.toFixed(5);lon=ll.lng.toFixed(5);type="Point";}
      else if(layer instanceof L.Polygon){type="Polygone";const pts=layer.getLatLngs()[0]||[];info=pts.length+" bornes";const b=layer.getBounds();lat=b.getCenter().lat.toFixed(5);lon=b.getCenter().lng.toFixed(5);}
      else if(layer instanceof L.Polyline){type="Ligne";const pts=layer.getLatLngs();info=pts.length+" pts";const b=layer.getBounds();lat=b.getCenter().lat.toFixed(5);lon=b.getCenter().lng.toFixed(5);}
      if(row%2===0){doc.setFillColor(20,29,46);doc.rect(14,y,270,7,"F");}
      doc.setTextColor(234,240,250);
      doc.text(name.substring(0,20),16,y+5);doc.text(type,80,y+5);doc.text(lat,130,y+5);doc.text(lon,175,y+5);doc.text(info,225,y+5);
      y+=7;row++;
      if(y>190){doc.addPage();y=20;}
    });
    // Bornes table
    let bRow=0;
    drawn.eachLayer(layer=>{
      if(!(layer instanceof L.Polygon||layer instanceof L.Polyline))return;
      let ll=layer.getLatLngs();if(Array.isArray(ll[0]))ll=ll[0];
      if(!ll.length)return;
      if(bRow===0){
        if(y>170){doc.addPage();y=20;}
        doc.setFillColor(4,35,29);doc.rect(14,y,270,7,"F");
        doc.setTextColor(31,209,168);doc.setFontSize(8);
        doc.text("N° Borne",16,y+5);doc.text("Lat",80,y+5);doc.text("Lon",150,y+5);
        y+=9;
      }
      ll.forEach((p,i)=>{
        if(bRow%2===0){doc.setFillColor(13,20,33);doc.rect(14,y,270,7,"F");}
        doc.setTextColor(234,240,250);
        doc.text("Borne "+(i+1),16,y+5);doc.text(p.lat.toFixed(7),80,y+5);doc.text(p.lng.toFixed(7),150,y+5);
        y+=7;bRow++;if(y>190){doc.addPage();y=20;}
      });
    });
    doc.setFontSize(7);doc.setTextColor(80,80,100);doc.text("GeoTopo Pro",14,206);
    doc.save("geotopo_export.pdf");toast("PDF exporte");
  }
});

/* Print CSS */
(()=>{const s=document.createElement("style");s.textContent="@media print{.topbar,.sheet,#gpsChip,#drawCtl,.toast,.fatal,#liveChip{display:none!important}#map{position:fixed!important;inset:0!important}}";document.head.appendChild(s);})();


/* ============================================================
   PLAN PRO DXF — Export Plan de Situation professionnel
   Format AutoCAD R12 ASCII avec:
   - Calques: LIMITE, BORNES, TEXTES, COTES, CARTOUCHE, NORD, TABLEAU
   - Numéros de bornes (B1, B2...) avec cercle
   - Étiquettes de côtes sur chaque segment
   - Tableau des coordonnées des bornes
   - Cartouche complet (nom, ref, surface, echelle...)
   - Flèche Nord
   ============================================================ */

safe("dxf_plan_pro", () => {

function exportPlanDXF(){
  var polys=[];
  drawn.eachLayer(function(l){if(l instanceof L.Polygon)polys.push(l);});
  if(!polys.length){toast("Dessinez d'abord un polygone",true);return;}
  var poly=polys[polys.length-1];
  var g=function(id,def){var e=document.getElementById(id);return(e&&e.value)||def||"";};
  var demandeur=g("infoDemandeur","---"),refFon=g("infoRef","N.I."),sise=g("infoSise","---");
  var propDite=g("infoProp","---"),cni=g("infoCNI","---"),crsLabel=g("infoCRS","Lambert Maroc S");
  var topo=g("infoTopographe","---"),echelle=parseInt(g("infoEchelle","5000"))||5000;
  var prefix=g("infoBornePrefix","B"),reseau=g("infoReseau","102");
  var commune=g("infoCommune","");
  var lls=poly.getLatLngs()[0];
  if(lls.length>1){var f=lls[0],la=lls[lls.length-1];
    if(Math.abs(f.lat-la.lat)<1e-8&&Math.abs(f.lng-la.lng)<1e-8)lls=lls.slice(0,-1);}
  var code=activeCRS;
  var bornes=lls.map(function(ll,i){
    var p=CRS.fromWGS(ll.lng,ll.lat,code);
    return[prefix+(i+1),p[0],p[1]];
  });
  var isGeo=CRS.isGeo(code);
  var n=bornes.length;
  var xs=bornes.map(function(b){return b[1];}),ys=bornes.map(function(b){return b[2];});
  var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs);
  var minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
  var W=maxX-minX,H=maxY-minY;
  var area=0;
  for(var i=0;i<n;i++){var j=(i+1)%n;area+=xs[i]*ys[j]-xs[j]*ys[i];}
  area=Math.abs(area/2);
  var ha=Math.floor(area/10000),ar=Math.floor((area%10000)/100),ca=Math.floor(area%100);
  var areaStr=ha+"ha "+String(ar).padStart(2,"0")+"a "+String(ca).padStart(2,"0")+"ca";
  var ref2=Math.min(W,H)||Math.max(W,H)||1000;
  var TH=ref2/40,TH2=ref2/55,TH3=ref2/80,TH4=ref2/100,RB=ref2/120;
  var cxPoly=xs.reduce(function(s,v){return s+v;},0)/n;
  var cyPoly=ys.reduce(function(s,v){return s+v;},0)/n;

  var LL=[];
  function w(){for(var i=0;i<arguments.length;i++)LL.push(String(arguments[i]));}
  function LINE(ly,x1,y1,x2,y2,col){col=col||7;
    w(0,"LINE",8,ly,10,x1.toFixed(3),20,y1.toFixed(3),30,"0.0",
      11,x2.toFixed(3),21,y2.toFixed(3),31,"0.0",62,col);}
  function CIRCLE(ly,cx,cy,r,col){col=col||7;
    w(0,"CIRCLE",8,ly,10,cx.toFixed(3),20,cy.toFixed(3),30,"0.0",40,r.toFixed(3),62,col);}
  function TEXT(ly,x,y,h,txt,ang,col,ha,va){
    ang=ang||0;col=col||7;ha=ha===undefined?1:ha;va=va===undefined?2:va;
    var s=String(txt).replace(/[\r\n]/g," ").substring(0,80);
    w(0,"TEXT",8,ly,10,x.toFixed(3),20,y.toFixed(3),30,"0.0",
      40,h.toFixed(3),1,s,50,ang.toFixed(2),72,ha,73,va,
      11,x.toFixed(3),21,y.toFixed(3),31,"0.0",62,col);}
  function POLY(ly,pts,closed,col){col=col||7;
    w(0,"POLYLINE",8,ly,66,1,70,closed?"1":"0",62,col);
    pts.forEach(function(p){w(0,"VERTEX",8,ly,10,p[0].toFixed(3),20,p[1].toFixed(3),30,"0.0");});
    w(0,"SEQEND",8,ly);}
  function RECT(ly,x1,y1,x2,y2,col){POLY(ly,[[x1,y1],[x2,y1],[x2,y2],[x1,y2]],true,col);}

  var pad=Math.max(W,H)*0.15;
  w(0,"SECTION",2,"HEADER",
    9,"$ACADVER",1,"AC1009",9,"$INSBASE",10,"0.0",20,"0.0",30,"0.0",
    9,"$EXTMIN",10,(minX-pad).toFixed(1),20,(minY-pad).toFixed(1),30,"0.0",
    9,"$EXTMAX",10,(maxX+W*0.8).toFixed(1),20,(maxY+H*0.15).toFixed(1),30,"0.0",
    9,"$LUNITS",70,2,9,"$LUPREC",70,3,9,"$MEASUREMENT",70,1,0,"ENDSEC");
  w(0,"SECTION",2,"TABLES");
  w(0,"TABLE",2,"LTYPE",70,1,0,"LTYPE",2,"CONTINUOUS",70,0,3,"Solid",72,65,73,0,40,"0.0",0,"ENDTAB");
  var lyrs=[["LIMITE",1],["BORNES",3],["NUM_BORNES",7],["COTES",4],["CARTOUCHE",7],["TABLEAU",3],["NORD",2],["GRILLE",8]];
  w(0,"TABLE",2,"LAYER",70,lyrs.length);
  lyrs.forEach(function(lr){w(0,"LAYER",2,lr[0],70,0,62,lr[1],6,"CONTINUOUS");});
  w(0,"ENDTAB");
  w(0,"TABLE",2,"STYLE",70,1,0,"STYLE",2,"STANDARD",70,0,40,"0.0",41,"1.0",50,"0.0",71,0,42,TH4.toFixed(3),3,"txt",4,"",0,"ENDTAB");
  w(0,"ENDSEC");
  w(0,"SECTION",2,"BLOCKS",0,"ENDSEC");
  w(0,"SECTION",2,"ENTITIES");

  // LIMITE
  POLY("LIMITE",bornes.map(function(b){return[b[1],b[2]];}),true,1);

  // BORNES - small circles + number outside only
  bornes.forEach(function(b,i){
    var x=b[1],y=b[2];
    CIRCLE("BORNES",x,y,RB,3);
    var prev=bornes[(i-1+n)%n],nxt=bornes[(i+1)%n];
    var dx=x-(prev[1]+nxt[1])/2,dy=y-(prev[2]+nxt[2])/2;
    var dl=Math.sqrt(dx*dx+dy*dy)||1;
    var ox=x+(dx/dl)*RB*3.5,oy=y+(dy/dl)*RB*3.5;
    TEXT("NUM_BORNES",ox,oy,TH4,b[0],0,7);
  });

  // COTES
  for(var i=0;i<n;i++){
    var j=(i+1)%n;
    var x1=bornes[i][1],y1=bornes[i][2],x2=bornes[j][1],y2=bornes[j][2];
    var d=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
    var mx=(x1+x2)/2,my=(y1+y2)/2;
    var ang=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
    var perp=(ang+90)*Math.PI/180;
    var toCx=cxPoly-mx,toCy=cyPoly-my;
    var dot=toCx*Math.cos(perp)+toCy*Math.sin(perp);
    var sign=dot>0?1:-1;
    var COFF=Math.min(ref2/25,d*0.35);
    var cox=mx+sign*COFF*Math.cos(perp),coy=my+sign*COFF*Math.sin(perp);
    var tk=RB*0.8;
    LINE("COTES",x1-tk*Math.cos(perp),y1-tk*Math.sin(perp),x1+tk*Math.cos(perp),y1+tk*Math.sin(perp),4);
    LINE("COTES",x2-tk*Math.cos(perp),y2-tk*Math.sin(perp),x2+tk*Math.cos(perp),y2+tk*Math.sin(perp),4);
    var la=ang;if(la>90||la<-90)la+=180;
    TEXT("COTES",cox,coy,TH4,d.toFixed(2)+"m",la,4);
  }

  // CARTOUCHE
  var CX=maxX+W*0.05,CY=maxY,CW=W*0.55,RH=TH3*2.0;
  var cart=[
    ["ROYAUME DU MAROC",TH2,7],["PROVINCE GUELMIM",TH3,7],
    ["COMMUNE "+commune.toUpperCase(),TH3,7],["",RH*0.3,7],
    ["PLAN  DE  SITUATION",TH2,1],["",RH*0.3,7],
    ["Demande par :",TH4,8],["  "+demandeur,TH4,7],
    ["Ref. fonciere : "+refFon,TH4,7],
    ["Sise : "+sise,TH4,7],
    ["Propriete : "+propDite,TH4,7],
    ["C.N.I. : "+cni,TH4,7],["",RH*0.3,7],
    ["Surface : "+areaStr,TH3,3],
    ["Echelle : 1/"+echelle,TH3,7],
    ["Systeme : "+crsLabel,TH4,7],["",RH*0.3,7],
    ["Topographe :",TH4,8],["  "+topo,TH4,7],
    ["Date : "+new Date().toLocaleDateString("fr-FR"),TH4,7]
  ];
  var CH=cart.length*RH+RH;
  RECT("CARTOUCHE",CX,CY,CX+CW,CY-CH,7);
  RECT("CARTOUCHE",CX-RB*0.5,CY+RB*0.5,CX+CW+RB*0.5,CY-CH-RB*0.5,7);
  [2,4,12,14].forEach(function(ri){
    LINE("CARTOUCHE",CX,CY-RH*(ri+0.5),CX+CW,CY-RH*(ri+0.5),7);
  });
  var cy2=CY-RH*0.75;
  cart.forEach(function(row){
    if(row[0].trim())TEXT("CARTOUCHE",CX+CW/2,cy2,row[1],row[0],0,row[2]);
    cy2-=RH;
  });

  // TABLEAU
  var TX=minX,TY0=minY-H*0.04;
  var cB=TH3*5,cX=TH3*12,cY=TH3*12,TBW=cB+cX+cY,TRH=TH3*2.0;
  TEXT("TABLEAU",TX+TBW/2,TY0+TH3*2.5,TH3,"LISTE DES COORDONNEES",0,3);
  TEXT("TABLEAU",TX+TBW/2,TY0+TH4*1.5,TH4,"Reseau regional Num "+reseau,0,7);
  RECT("TABLEAU",TX,TY0,TX+TBW,TY0-TRH,3);
  LINE("TABLEAU",TX+cB,TY0,TX+cB,TY0-TRH,3);
  LINE("TABLEAU",TX+cB+cX,TY0,TX+cB+cX,TY0-TRH,3);
  TEXT("TABLEAU",TX+cB/2,TY0-TRH*0.4,TH4,"BORNES",0,3);
  TEXT("TABLEAU",TX+cB+cX/2,TY0-TRH*0.4,TH4,"X",0,3);
  TEXT("TABLEAU",TX+cB+cX+cY/2,TY0-TRH*0.4,TH4,"Y",0,3);
  bornes.forEach(function(b,i){
    var ry=TY0-TRH*(i+2);
    RECT("TABLEAU",TX,ry+TRH,TX+TBW,ry,7);
    LINE("TABLEAU",TX+cB,ry+TRH,TX+cB,ry,7);
    LINE("TABLEAU",TX+cB+cX,ry+TRH,TX+cB+cX,ry,7);
    var xFmt=isGeo?b[1].toFixed(6):b[1].toFixed(3);
    var yFmt=isGeo?b[2].toFixed(6):b[2].toFixed(3);
    TEXT("TABLEAU",TX+cB/2,ry+TRH*0.35,TH4,b[0],0,7,1);
    TEXT("TABLEAU",TX+cB+cX-TH4*0.3,ry+TRH*0.35,TH4,xFmt,0,7,4);
    TEXT("TABLEAU",TX+cB+cX+cY-TH4*0.3,ry+TRH*0.35,TH4,yFmt,0,7,4);
  });
  LINE("TABLEAU",TX,TY0-TRH*(n+1),TX+TBW,TY0-TRH*(n+1),7);

  // NORD
  var NX=maxX+W*0.04,NY=maxY-H*0.3,NS=Math.min(W,H)*0.07;
  CIRCLE("NORD",NX,NY,NS,2);
  POLY("NORD",[[NX,NY+NS],[NX-NS*0.22,NY-NS*0.1],[NX+NS*0.22,NY-NS*0.1]],true,2);
  POLY("NORD",[[NX,NY-NS],[NX-NS*0.22,NY-NS*0.1],[NX+NS*0.22,NY-NS*0.1]],true,7);
  LINE("NORD",NX,NY-NS*1.05,NX,NY+NS*1.05,2);
  TEXT("NORD",NX,NY+NS+TH4,TH3,"N",0,2);
  TEXT("NORD",NX,NY-NS-TH3*1.2,TH4,"T.N.",0,2);

  // GRILLE
  var raw=Math.max(W,H)/6;
  var mag=Math.pow(10,Math.floor(Math.log10(raw||1)));
  var gs=Math.round(raw/mag)*mag||100;
  var gx0=Math.floor(minX/gs)*gs,gy0=Math.floor(minY/gs)*gs;
  var tk2=RB*1.5;
  for(var gx=gx0;gx<=maxX+gs;gx+=gs){
    for(var gy=gy0;gy<=maxY+gs;gy+=gs){
      if(gx>=minX-W*.02&&gx<=maxX+W*.02&&gy>=minY-H*.02&&gy<=maxY+H*.02){
        LINE("GRILLE",gx-tk2,gy,gx+tk2,gy,8);
        LINE("GRILLE",gx,gy-tk2,gx,gy+tk2,8);
        TEXT("GRILLE",gx+tk2*.5,gy+tk2*.3,TH4*.75,"X="+Math.round(gx),0,8,0,0);
        TEXT("GRILLE",gx+tk2*.5,gy-tk2*1.5,TH4*.75,"Y="+Math.round(gy),0,8,0,0);
      }
    }
  }

  w(0,"ENDSEC",0,"EOF");
  var dxfStr=LL.join("\n");
  var fname="Plan_"+refFon.replace(/[^a-zA-Z0-9]/g,"_")+".dxf";
  download(fname,dxfStr,"application/dxf");
  toast("DXF Plan Pro: "+n+" bornes — "+areaStr);
}

function hookDXFBtn(){
  var btn=document.getElementById("btnDXFPlan");
  if(btn&&!btn._dxfHooked){btn._dxfHooked=true;btn.onclick=exportPlanDXF;}
}
hookDXFBtn();setTimeout(hookDXFBtn,800);

}); // end safe dxf_plan_pro

/*
  app.js
  Motor del Simulador de Seguridad: arma cada intento (mezclando preguntas y opciones),
  dibuja la pregunta según su tipo, califica, controla el temporizador y las tres
  pantallas (inicio / examen / resultados), y maneja el reintento de preguntas falladas.

  No contiene texto de preguntas: todo el contenido vive en preguntas.js, que debe
  cargarse ANTES que este archivo (define las variables globales TOPICS y QUESTION_BANK
  que aquí se usan de solo lectura).
*/
(function(){
"use strict";

// Busca los metadatos (nombre, color) de un tema por su id.
function topicOf(id){ for(var i=0;i<TOPICS.length;i++){ if(TOPICS[i].id===id) return TOPICS[i]; } return TOPICS[0]; }
var ALL_IDS = QUESTION_BANK.map(function(q){return q.id;});

// ---------- utils ----------

// Fisher-Yates: devuelve una copia del arreglo en orden aleatorio.
function shuffle(arr){
  var a = arr.slice();
  for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
}
var ACCENT_MAP = {'á':'a','à':'a','ä':'a','â':'a','é':'e','è':'e','ë':'e','ê':'e','í':'i','ì':'i','ï':'i','î':'i','ó':'o','ò':'o','ö':'o','ô':'o','ú':'u','ù':'u','ü':'u','û':'u','ñ':'n'};
function stripAccents(s){
  var out='';
  for(var i=0;i<s.length;i++){
    var c=s.charAt(i).toLowerCase();
    out += ACCENT_MAP[c] || c;
  }
  return out;
}
// Normaliza texto para comparar respuestas de "completar": sin acentos, minúsculas y sin puntuación.
function normalize(s){
  return stripAccents((s||'').toString()).trim().replace(/[^\w\s]/g,'').replace(/\s+/g,' ');
}
// Helper para crear elementos DOM sin escribir HTML a mano (evita fugas de XSS con texto de usuario).
function el(tag, props, children){
  var e = document.createElement(tag);
  if(props){
    for(var k in props){
      if(k==='class') e.className = props[k];
      else if(k==='text') e.textContent = props[k];
      else if(k.indexOf('on')===0 && typeof props[k]==='function') e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    }
  }
  (children||[]).forEach(function(c){ if(c) e.appendChild(c); });
  return e;
}
function fmtTime(sec){ var m=Math.floor(sec/60), s=sec%60; return (m<10?'0':'')+m+':'+(s<10?'0':'')+s; }

// ---------- state ----------
// Estado global del intento actual (examen completo o ronda de reintento).
var state = {
  qById:{}, answers:{}, order:[], index:0, mode:'exam',
  timeLeft:90*60, timerId:null, lastRetryStats:null
};

// Crea una copia "de ejecución" de una pregunta con sus opciones/pares ya mezclados.
function buildRuntimeFor(q){
  var rq = JSON.parse(JSON.stringify(q));
  if(rq.type==='mc'){
    var opts = rq.options.map(function(t,i){return {text:t, orig:i};});
    opts = shuffle(opts);
    rq.runtimeOptions = opts.map(function(o){return o.text;});
    rq.runtimeCorrect = opts.findIndex(function(o){return o.orig===rq.answerIndex;});
  } else if(rq.type==='vf'){
    var base = shuffle([{text:'Verdadero', val:true},{text:'Falso', val:false}]);
    rq.runtimeOptions = base.map(function(o){return o.text;});
    rq.runtimeCorrect = base.findIndex(function(o){return o.val===rq.answer;});
  } else if(rq.type==='match' || rq.type==='connect'){
    rq.runtimePairs = shuffle(rq.pairs);
    rq.runtimePool = shuffle(rq.pairs.map(function(p){return p.r;}));
  } else if(rq.type==='diagram'){
    rq.runtimePool = shuffle(rq.pool);
  }
  return rq;
}

// Califica una pregunta ya respondida (0..1). Sin "checked" no cuenta como respondida.
function questionScore(q, ans){
  if(!q || !ans || !ans.checked) return {score:0, status:'unanswered'};
  if(q.type==='mc' || q.type==='vf'){
    return ans.selected===q.runtimeCorrect ? {score:1,status:'correct'} : {score:0,status:'incorrect'};
  }
  if(q.type==='fill'){
    var norm = normalize(ans.text||'');
    var ok = q.answers.some(function(a){return normalize(a)===norm;});
    return {score: ok?1:0, status: ok?'correct':'incorrect'};
  }
  if(q.type==='match' || q.type==='diagram' || q.type==='connect'){
    var slots = q.type==='diagram' ? q.slots : q.runtimePairs;
    var total=slots.length, correct=0;
    slots.forEach(function(s,i){
      var key = q.type==='diagram' ? s.key : i;
      var target = q.type==='diagram' ? s.correct : s.r;
      var sel = ans.selections ? ans.selections[key] : null;
      if(sel===target) correct++;
    });
    var frac = total ? correct/total : 0;
    return {score:frac, status: frac===1?'correct':(frac>0?'partial':'incorrect')};
  }
  if(q.type==='open'){
    return {score: ans.knewIt ? 1 : 0, status: ans.knewIt ? 'correct' : 'incorrect'};
  }
  return {score:0,status:'unanswered'};
}
function getStatus(id){ return questionScore(state.qById[id], state.answers[id]).status; }
function isFailed(id){ return getStatus(id)!=='correct'; }

// ---------- start ----------
function renderTopicChips(){
  var wrap = document.getElementById('topic-chips'); wrap.innerHTML='';
  TOPICS.forEach(function(t){
    wrap.appendChild(el('span',{class:'topic-chip'},[
      el('span',{class:'dot', style:'background:var('+t.color+')'}),
      el('span',{text:t.short})
    ]));
  });
}
function showScreen(name){
  document.getElementById('screen-start').hidden = name!=='start';
  document.getElementById('screen-exam').hidden = name!=='exam';
  document.getElementById('screen-results').hidden = name!=='results';
  window.scrollTo(0,0);
}

// ---------- exam flow ----------

// Arranca un examen completo: baraja las 45 preguntas y arranca el temporizador de 90 min.
function startExam(){
  state.qById = {};
  QUESTION_BANK.forEach(function(q){ state.qById[q.id] = buildRuntimeFor(q); });
  state.answers = {};
  state.order = shuffle(ALL_IDS.slice());
  state.index = 0;
  state.mode = 'exam';
  state.lastRetryStats = null;
  state.timeLeft = 90*60;
  showScreen('exam');
  syncTopbarMode();
  renderPalette(); renderQuestion();
  if(state.timerId) clearInterval(state.timerId);
  state.timerId = setInterval(tick,1000);
  updateTimerDisplay();
}

// Arranca una ronda solo con las preguntas falladas (sin temporizador).
function startRetry(ids){
  ids.forEach(function(id){
    var orig = QUESTION_BANK.find(function(q){return q.id===id;});
    state.qById[id] = buildRuntimeFor(orig);
    state.answers[id] = {};
  });
  state.order = shuffle(ids.slice());
  state.index = 0;
  state.mode = 'retry';
  state.lastRetryStats = null;
  if(state.timerId){ clearInterval(state.timerId); state.timerId=null; }
  showScreen('exam');
  syncTopbarMode();
  renderPalette(); renderQuestion();
}

// Muestra u oculta el temporizador / la etiqueta de "Reintento" en la barra superior.
function syncTopbarMode(){
  var isRetry = state.mode==='retry';
  document.getElementById('timer').hidden = isRetry;
  document.getElementById('mode-pill').hidden = !isRetry;
  if(isRetry) document.getElementById('mode-pill').textContent = 'Reintento · '+state.order.length+' preguntas';
  document.getElementById('btn-finish-top').textContent = isRetry ? 'Terminar reintento' : 'Finalizar';
}

function tick(){
  state.timeLeft--;
  updateTimerDisplay();
  if(state.timeLeft<=0){ state.timeLeft=0; updateTimerDisplay(); finishExam(); }
}
function updateTimerDisplay(){
  var t = document.getElementById('timer');
  t.textContent = fmtTime(Math.max(0,state.timeLeft));
  t.classList.toggle('low', state.timeLeft<=300);
}

function ensureAns(id){ if(!state.answers[id]) state.answers[id]={}; return state.answers[id]; }

// Dibuja la cuadrícula de números: verde/rojo/ámbar según el estado de cada pregunta.
function renderPalette(){
  var grid = document.getElementById('palette-grid'); grid.innerHTML='';
  state.order.forEach(function(id, i){
    var st = getStatus(id);
    var btn = el('button',{class:'pnum', text:String(i+1), onclick:function(){ state.index=i; renderQuestion(); renderPalette(); }});
    if(st==='correct') btn.classList.add('p-correct');
    else if(st==='incorrect') btn.classList.add('p-incorrect');
    else if(st==='partial') btn.classList.add('p-partial');
    if(i===state.index) btn.classList.add('current');
    grid.appendChild(btn);
  });
}
document.getElementById('palette-toggle').addEventListener('click', function(){
  var grid = document.getElementById('palette-grid');
  var expanded = this.getAttribute('aria-expanded')==='true';
  this.setAttribute('aria-expanded', String(!expanded));
  grid.hidden = expanded;
});

function goNext(){
  if(state.index < state.order.length-1){ state.index++; renderQuestion(); renderPalette(); }
  else finishExam();
}
function feedbackTitle(status){
  return {correct:'✓ Correcto', incorrect:'✗ Incorrecto', partial:'≈ Parcialmente correcto'}[status] || '';
}

// Dibuja la pregunta actual completa (enunciado + interacción + retroalimentación si ya se respondió).
// Se re-ejecuta en cada interacción del usuario, así que cada bloque de tipo maneja su propio
// estado "checked" (bloqueado) leyendo/escribiendo directamente sobre el objeto `ans`.
function renderQuestion(){
  var id = state.order[state.index];
  var q = state.qById[id];
  var ans = ensureAns(id);
  var card = document.getElementById('qcard');
  card.innerHTML='';

  var t = topicOf(q.topic);
  var typeLabels = {mc:'Opción múltiple', vf:'Verdadero / Falso', fill:'Completar', match:'Relacionar', open:'Pregunta abierta', diagram:'Diagrama', connect:'Conectar'};

  card.appendChild(el('div',{class:'qmeta'},[
    el('span',{class:'qtag', style:'background:color-mix(in srgb, var('+t.color+') 18%, transparent); color:var('+t.color+')', text:t.short}),
    el('span',{class:'qtypepill', text:typeLabels[q.type]})
  ]));
  card.appendChild(el('div',{class:'qprompt', text:q.prompt}));

  var body = el('div',{class:'qbody'});
  card.appendChild(body);
  var footer = el('div',{});
  card.appendChild(footer);

  var letters = ['A','B','C','D'];

  // ---- MC / VF ----
  if(q.type==='mc' || q.type==='vf'){
    q.runtimeOptions.forEach(function(opt, i){
      var cls = 'opt-btn';
      if(ans.checked){
        cls += ' locked';
        if(i===q.runtimeCorrect) cls += ' correct-answer';
        else if(i===ans.selected) cls += ' wrong-answer';
      }
      var btn = el('button',{class:cls},[ el('span',{class:'letter', text:letters[i]||String(i+1)}), el('span',{text:opt}) ]);
      if(!ans.checked){
        btn.addEventListener('click', function(){ ans.selected=i; ans.checked=true; renderQuestion(); renderPalette(); });
      }
      body.appendChild(btn);
    });
    if(ans.checked){
      var st = questionScore(q, ans).status;
      footer.appendChild(el('div',{class:'feedback-panel '+st},[
        el('div',{class:'fb-title', text:feedbackTitle(st)}),
        el('div',{class:'fb-explain', text:q.explain})
      ]));
      footer.appendChild(el('button',{class:'next-btn', text: state.index===state.order.length-1 ? (state.mode==='retry'?'Terminar reintento':'Finalizar examen') : 'Siguiente →', onclick:goNext}));
    }
  }

  // ---- FILL ----
  else if(q.type==='fill'){
    var row = el('div',{class:'fill-row'});
    var input = el('input',{type:'text', class:'fill-input', id:'fill-'+q.id, autocomplete:'off', placeholder:'Escribe tu respuesta...'});
    input.value = ans.text || '';
    if(ans.checked){
      input.disabled = true;
      var okf = questionScore(q,ans).status==='correct';
      input.classList.add(okf?'correct-answer':'wrong-answer');
    }
    row.appendChild(input);
    body.appendChild(row);
    if(!ans.checked){
      body.appendChild(el('div',{class:'fill-hint', text:'No importan mayúsculas ni acentos. Presiona Enter o el botón para comprobar.'}));
      var checkBtn = el('button',{class:'check-btn', text:'Comprobar respuesta', disabled:'disabled'});
      checkBtn.disabled = !(ans.text && ans.text.trim());
      function doCheck(){ if(ans.text && ans.text.trim()){ ans.checked=true; renderQuestion(); renderPalette(); } }
      input.addEventListener('input', function(){ ans.text=input.value; checkBtn.disabled = !(ans.text && ans.text.trim()); });
      input.addEventListener('keydown', function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); doCheck(); } });
      checkBtn.addEventListener('click', doCheck);
      body.appendChild(checkBtn);
    } else {
      var stf = questionScore(q,ans).status;
      var fb = el('div',{class:'feedback-panel '+stf},[ el('div',{class:'fb-title', text:feedbackTitle(stf)}) ]);
      if(stf!=='correct') fb.appendChild(el('div',{class:'fb-explain'},[ el('b',{text:'Respuesta correcta: '}), document.createTextNode(q.answers[0]) ]));
      fb.appendChild(el('div',{class:'fb-explain', text:q.explain}));
      footer.appendChild(fb);
      footer.appendChild(el('button',{class:'next-btn', text: state.index===state.order.length-1 ? (state.mode==='retry'?'Terminar reintento':'Finalizar examen') : 'Siguiente →', onclick:goNext}));
    }
  }

  // ---- OPEN ---- (texto libre -> revela respuesta modelo -> el usuario se autoevalúa)
  else if(q.type==='open'){
    var ta = el('textarea',{class:'open-ta', id:'open-'+q.id, placeholder:'Escribe tu respuesta...'});
    ta.value = ans.text || '';
    body.appendChild(ta);

    if(!ans.checked){
      if(!ans.revealed){
        ta.addEventListener('input', function(){ ans.text=ta.value; revealBtn.disabled = !(ans.text && ans.text.trim()); });
        var revealBtn = el('button',{class:'check-btn', text:'Ver respuesta modelo y autoevaluarme'});
        revealBtn.disabled = !(ans.text && ans.text.trim());
        revealBtn.addEventListener('click', function(){ ans.revealed=true; renderQuestion(); });
        body.appendChild(revealBtn);
      } else {
        ta.disabled = true;
        body.appendChild(el('div',{class:'model-box'},[ el('b',{text:'Respuesta modelo: '}), document.createTextNode(q.model) ]));
        var sgRow = el('div',{class:'sg-row'});
        var yesBtn = el('button',{class:'sg-btn', text:'✓ La sabía'});
        var noBtn = el('button',{class:'sg-btn', text:'✗ No la sabía'});
        yesBtn.addEventListener('click', function(){ ans.knewIt=true; ans.checked=true; renderQuestion(); renderPalette(); });
        noBtn.addEventListener('click', function(){ ans.knewIt=false; ans.checked=true; renderQuestion(); renderPalette(); });
        sgRow.appendChild(yesBtn); sgRow.appendChild(noBtn);
        body.appendChild(sgRow);
      }
    } else {
      ta.disabled = true;
      body.appendChild(el('div',{class:'model-box'},[ el('b',{text:'Respuesta modelo: '}), document.createTextNode(q.model) ]));
      var sgRow2 = el('div',{class:'sg-row'});
      var yesBtn2 = el('button',{class:'sg-btn locked'+(ans.knewIt?' chosen-yes':''), text:'✓ La sabía'});
      var noBtn2 = el('button',{class:'sg-btn locked'+(ans.knewIt===false?' chosen-no':''), text:'✗ No la sabía'});
      sgRow2.appendChild(yesBtn2); sgRow2.appendChild(noBtn2);
      body.appendChild(sgRow2);
      var sto = ans.knewIt? 'correct':'incorrect';
      footer.appendChild(el('div',{class:'feedback-panel '+sto},[ el('div',{class:'fb-title', text: ans.knewIt? '✓ Marcada como sabida':'✗ Marcada como no sabida'}) ]));
      footer.appendChild(el('button',{class:'next-btn', text: state.index===state.order.length-1 ? (state.mode==='retry'?'Terminar reintento':'Finalizar examen') : 'Siguiente →', onclick:goNext}));
    }
  }

  // ---- MATCH ---- (relacionar con listas desplegables)
  else if(q.type==='match'){
    if(!ans.selections) ans.selections = {};
    var checkBtnM = el('button',{class:'check-btn', text:'Comprobar respuestas'});
    q.runtimePairs.forEach(function(pair, i){
      var rowCls = 'match-row';
      if(ans.checked) rowCls += (ans.selections[i]===pair.r ? ' row-correct' : ' row-incorrect');
      var row = el('div',{class:rowCls});
      row.appendChild(el('div',{class:'match-l'},[
        document.createTextNode(pair.l),
        (ans.checked ? el('span',{class:'row-mark '+(ans.selections[i]===pair.r?'ok':'bad'), text: ans.selections[i]===pair.r ? '✓ correcto' : ('✗ correcta: '+pair.r)}) : null)
      ]));
      var sel = el('select',{class:'match-sel', id:'match-'+q.id+'-'+i});
      sel.disabled = !!ans.checked;
      sel.appendChild(el('option',{value:'', text:'Selecciona...'}));
      q.runtimePool.forEach(function(opt){
        var o = el('option',{value:opt, text:opt});
        if(ans.selections[i]===opt) o.selected=true;
        sel.appendChild(o);
      });
      if(!ans.checked){
        sel.addEventListener('change', function(){
          ans.selections[i] = sel.value || null;
          var allFilled = q.runtimePairs.every(function(p,idx){ return !!ans.selections[idx]; });
          checkBtnM.disabled = !allFilled;
          renderPalette();
        });
      }
      row.appendChild(sel);
      body.appendChild(row);
    });
    if(!ans.checked){
      checkBtnM.disabled = !q.runtimePairs.every(function(p,idx){ return !!ans.selections[idx]; });
      checkBtnM.addEventListener('click', function(){ ans.checked=true; renderQuestion(); renderPalette(); });
      footer.appendChild(checkBtnM);
    } else {
      var stm = questionScore(q,ans).status;
      footer.appendChild(el('div',{class:'feedback-panel '+stm},[
        el('div',{class:'fb-title', text:feedbackTitle(stm)}),
        el('div',{class:'fb-explain', text:q.explain})
      ]));
      footer.appendChild(el('button',{class:'next-btn', text: state.index===state.order.length-1 ? (state.mode==='retry'?'Terminar reintento':'Finalizar examen') : 'Siguiente →', onclick:goNext}));
    }
  }

  // ---- DIAGRAM ---- (completar imagen: triángulo CIA o capas de defensa)
  else if(q.type==='diagram'){
    if(!ans.selections) ans.selections = {};
    var checkBtnD = el('button',{class:'check-btn', text:'Comprobar respuestas'});
    var dwrap = el('div',{class:'diagram-wrap'});

    function buildSelect(slot){
      var sel = el('select',{class:'diagram-sel', id:'diag-'+q.id+'-'+slot.key});
      sel.disabled = !!ans.checked;
      sel.appendChild(el('option',{value:'', text:'—'}));
      q.runtimePool.forEach(function(opt){
        var o = el('option',{value:opt, text:opt});
        if(ans.selections[slot.key]===opt) o.selected=true;
        sel.appendChild(o);
      });
      if(!ans.checked){
        sel.addEventListener('change', function(){
          ans.selections[slot.key] = sel.value || null;
          var allFilled = q.slots.every(function(s){ return !!ans.selections[s.key]; });
          checkBtnD.disabled = !allFilled;
          renderPalette();
        });
      }
      return sel;
    }
    function mark(slot){
      if(!ans.checked) return null;
      var ok = ans.selections[slot.key]===slot.correct;
      return el('span',{class:'row-mark '+(ok?'ok':'bad'), text: ok? '✓' : ('✗ '+slot.correct)});
    }

    if(q.diagramKind==='triangle'){
      var box = el('div',{class:'tri-box'});
      box.appendChild(el('div',{class:'tri-shape'}));
      q.slots.forEach(function(slot){
        var dot = el('div',{class:'tri-dot'});
        if(slot.pos==='top') dot.style.cssText='top:4%; left:50%;';
        if(slot.pos==='bl') dot.style.cssText='top:96%; left:4%;';
        if(slot.pos==='br') dot.style.cssText='top:96%; left:96%;';
        box.appendChild(dot);
        var selWrap = el('div',{class:'tri-sel-wrap '+slot.pos});
        selWrap.appendChild(buildSelect(slot));
        var m = mark(slot); if(m) selWrap.appendChild(m);
        box.appendChild(selWrap);
      });
      dwrap.appendChild(box);
    } else if(q.diagramKind==='layers'){
      var layers = el('div',{class:'layers'});
      q.slots.forEach(function(slot){
        var layerCls = 'layer';
        if(ans.checked) layerCls += (ans.selections[slot.key]===slot.correct ? ' row-correct' : ' row-incorrect');
        var layer = el('div',{class:layerCls});
        layer.appendChild(el('span',{class:'lbl', text:slot.label}));
        layer.appendChild(buildSelect(slot));
        var m2 = mark(slot); if(m2) layer.appendChild(m2);
        layers.appendChild(layer);
      });
      dwrap.appendChild(layers);
    }
    body.appendChild(dwrap);

    if(!ans.checked){
      checkBtnD.disabled = !q.slots.every(function(s){ return !!ans.selections[s.key]; });
      checkBtnD.addEventListener('click', function(){ ans.checked=true; renderQuestion(); renderPalette(); });
      footer.appendChild(checkBtnD);
    } else {
      var std = questionScore(q,ans).status;
      footer.appendChild(el('div',{class:'feedback-panel '+std},[
        el('div',{class:'fb-title', text:feedbackTitle(std)}),
        el('div',{class:'fb-explain', text:q.explain})
      ]));
      footer.appendChild(el('button',{class:'next-btn', text: state.index===state.order.length-1 ? (state.mode==='retry'?'Terminar reintento':'Finalizar examen') : 'Siguiente →', onclick:goNext}));
    }
  }

  // ---- CONNECT ---- (tocar un término de la izquierda y luego su concepto en la derecha)
  else if(q.type==='connect'){
    if(!ans.selections) ans.selections = {};
    var connPalette = ['--t-cia','--t-avr','--t-ia','--t-hackers','--t-leyes','--t-eh'];
    function connColor(ci){ return 'var('+connPalette[ci%connPalette.length]+')'; }
    // Devuelve el índice izquierdo que ya tiene unido este texto de la derecha (o null).
    function ownerOf(rightText){
      var found=null;
      Object.keys(ans.selections).forEach(function(k){ if(ans.selections[k]===rightText) found=Number(k); });
      return found;
    }

    body.appendChild(el('div',{class:'connect-hint', text: ans.checked ? 'Resultado de tus uniones:' : 'Toca un término de la izquierda y luego su concepto en la derecha para unirlos.'}));

    var cwrap = el('div',{class:'connect-wrap'});
    var colL = el('div',{class:'connect-col'});
    var colR = el('div',{class:'connect-col'});

    q.runtimePairs.forEach(function(pair, i){
      var isArmed = ans.armedLeft===i && !ans.checked;
      var isPaired = ans.selections[i]!=null;
      var lbtn = el('button',{class:'conn-btn'+(isArmed?' armed':'')},[ document.createTextNode(pair.l) ]);
      if(ans.checked){
        lbtn.classList.add('locked');
        var okl = ans.selections[i]===pair.r;
        lbtn.classList.add(okl?'correct-answer':'wrong-answer');
        lbtn.appendChild(el('span',{class:'conn-mark', text: okl ? '✓' : ('✗ correcta: '+pair.r)}));
      } else {
        if(isPaired && !isArmed){
          lbtn.style.borderColor = connColor(i);
          lbtn.style.background = 'color-mix(in srgb, '+connColor(i)+' 20%, var(--surface-2))';
        }
        lbtn.addEventListener('click', function(){
          ans.armedLeft = (ans.armedLeft===i) ? null : i; // tocar de nuevo cancela la selección
          renderQuestion();
        });
      }
      colL.appendChild(lbtn);
    });

    q.runtimePool.forEach(function(rightText){
      var owner = ownerOf(rightText);
      var rbtn = el('button',{class:'conn-btn'},[ document.createTextNode(rightText) ]);
      if(ans.checked){
        rbtn.classList.add('locked');
        var okr = owner!=null && q.runtimePairs[owner].r===rightText;
        rbtn.classList.add(okr?'correct-answer':'wrong-answer');
      } else {
        if(owner!=null){
          rbtn.style.borderColor = connColor(owner);
          rbtn.style.background = 'color-mix(in srgb, '+connColor(owner)+' 20%, var(--surface-2))';
        }
        rbtn.addEventListener('click', function(){
          if(ans.armedLeft==null) return; // primero hay que tocar un término de la izquierda
          var prevOwner = ownerOf(rightText);
          if(prevOwner!=null) delete ans.selections[prevOwner]; // libera la unión previa de este concepto
          ans.selections[ans.armedLeft] = rightText;
          ans.armedLeft = null;
          renderQuestion(); renderPalette();
        });
      }
      colR.appendChild(rbtn);
    });

    cwrap.appendChild(colL); cwrap.appendChild(colR);
    body.appendChild(cwrap);

    if(!ans.checked){
      var checkBtnC = el('button',{class:'check-btn', text:'Comprobar'});
      checkBtnC.disabled = Object.keys(ans.selections).length < q.runtimePairs.length;
      checkBtnC.addEventListener('click', function(){ ans.checked=true; ans.armedLeft=null; renderQuestion(); renderPalette(); });
      footer.appendChild(checkBtnC);
    } else {
      var stc = questionScore(q,ans).status;
      footer.appendChild(el('div',{class:'feedback-panel '+stc},[
        el('div',{class:'fb-title', text:feedbackTitle(stc)}),
        el('div',{class:'fb-explain', text:q.explain})
      ]));
      footer.appendChild(el('button',{class:'next-btn', text: state.index===state.order.length-1 ? (state.mode==='retry'?'Terminar reintento':'Finalizar examen') : 'Siguiente →', onclick:goNext}));
    }
  }

  var modeLbl = state.mode==='retry' ? 'Reintento · Pregunta ' : 'Pregunta ';
  document.getElementById('progress-txt').textContent = modeLbl+(state.index+1)+' / '+state.order.length;
  document.getElementById('btn-prev').disabled = state.index===0;
}

document.getElementById('btn-prev').addEventListener('click', function(){
  if(state.index>0){ state.index--; renderQuestion(); renderPalette(); }
});
document.getElementById('btn-skip').addEventListener('click', goNext);
document.getElementById('btn-finish-top').addEventListener('click', function(){
  if(confirm('¿Deseas terminar aquí?')) finishExam();
});
document.getElementById('btn-start').addEventListener('click', startExam);

// ---------- results ----------

// Detiene el temporizador (si corría) y pasa a la pantalla de resultados.
function finishExam(){
  if(state.mode==='retry'){
    var total=state.order.length, correct=0;
    state.order.forEach(function(id){ if(getStatus(id)==='correct') correct++; });
    state.lastRetryStats = {correct:correct, total:total};
  } else {
    state.lastRetryStats = null;
  }
  if(state.timerId){ clearInterval(state.timerId); state.timerId=null; }
  showScreen('results');
  renderResults();
}

// Calcula el % general y el % por tema, usando el intento más reciente de cada pregunta.
function computeScores(){
  var perTopic = {};
  TOPICS.forEach(function(t){ perTopic[t.id] = {sum:0,count:0}; });
  var totalSum=0;
  ALL_IDS.forEach(function(id){
    var q = state.qById[id];
    var r = questionScore(q, state.answers[id]);
    var topic = QUESTION_BANK.find(function(x){return x.id===id;}).topic;
    perTopic[topic].sum += r.score; perTopic[topic].count += 1;
    totalSum += r.score;
  });
  var topicPct = {};
  TOPICS.forEach(function(t){ var p=perTopic[t.id]; topicPct[t.id] = p.count? Math.round((p.sum/p.count)*100) : 0; });
  return {overall: Math.round((totalSum/ALL_IDS.length)*100), topicPct: topicPct};
}
function scoreMessage(pct){
  if(pct>=85) return 'Excelente dominio del temario. Sigue así.';
  if(pct>=70) return 'Buen desempeño. Repasa los temas con menor puntaje.';
  if(pct>=50) return 'Vas en camino, pero conviene reforzar varios temas.';
  return 'Necesitas repasar el temario con más profundidad antes del examen real.';
}

// Dibuja el resultado: puntaje general, barra "Reintentar falladas", desglose por tema y revisión.
function renderResults(){
  var s = computeScores();

  var banner = document.getElementById('retry-banner');
  if(state.lastRetryStats){
    banner.hidden = false;
    banner.textContent = 'Reintento terminado: acertaste '+state.lastRetryStats.correct+' de '+state.lastRetryStats.total+' esta vez.';
  } else banner.hidden = true;

  var big = document.getElementById('score-big');
  big.textContent = s.overall+'%';
  big.style.color = s.overall>=70 ? 'var(--success)' : (s.overall>=50 ? 'var(--warning)' : 'var(--danger)');
  document.getElementById('score-msg').textContent = scoreMessage(s.overall);
  document.getElementById('score-sub').textContent = ALL_IDS.length+' preguntas · calificación basada en tu intento más reciente de cada una.';

  var failed = ALL_IDS.filter(isFailed);
  var ctaWrap = document.getElementById('retry-cta-wrap');
  ctaWrap.innerHTML='';
  if(failed.length>0){
    var cta = el('div',{class:'retry-cta'},[
      el('div',{class:'rc-num', text:String(failed.length)}),
      el('div',{class:'rc-lbl', text: failed.length===1 ? 'pregunta pendiente por dominar' : 'preguntas pendientes por dominar'})
    ]);
    var rbtn = el('button',{class:'retry-btn', text:'Reintentar solo las falladas ('+failed.length+')'});
    rbtn.addEventListener('click', function(){ startRetry(failed); });
    cta.appendChild(rbtn);
    ctaWrap.appendChild(cta);
  } else {
    ctaWrap.appendChild(el('div',{class:'retry-cta done'},[
      el('div',{class:'rc-num', text:'0'}),
      el('div',{class:'rc-lbl', text:'preguntas pendientes — ¡dominas todo el temario!'})
    ]));
  }

  var barsList = document.getElementById('bars-list'); barsList.innerHTML='';
  TOPICS.forEach(function(t){
    var pct = s.topicPct[t.id];
    barsList.appendChild(el('div',{class:'bar-row'},[
      el('div',{class:'bar-top'},[ el('span',{text:t.name}), el('span',{class:'pct', text:pct+'%'}) ]),
      el('div',{class:'bar-track'},[ el('div',{class:'bar-fill', style:'width:'+pct+'%; background:var('+t.color+');'}) ])
    ]));
  });

  renderReview();
}

function statusLabel(st){ return {correct:'Correcta', incorrect:'Incorrecta', partial:'Parcial', unanswered:'Sin responder'}[st] || st; }

// Lista todas las preguntas agrupadas por tema, con tu respuesta, la correcta y la explicación.
function renderReview(){
  var list = document.getElementById('review-list'); list.innerHTML='';
  var currentTopic = null;

  QUESTION_BANK.forEach(function(orig){
    var q = state.qById[orig.id];
    var t = topicOf(q.topic);
    if(currentTopic!==t.id){
      currentTopic = t.id;
      list.appendChild(el('div',{class:'review-topic-h'},[ el('span',{class:'dot', style:'background:var('+t.color+')'}), el('span',{text:t.name}) ]));
    }
    var ans = state.answers[q.id] || {};
    var r = questionScore(q, ans);

    var card = el('div',{class:'rcard'});
    card.appendChild(el('div',{class:'rcard-top'},[
      el('div',{class:'rprompt', text:q.prompt}),
      el('span',{class:'rstatus '+r.status, text:statusLabel(r.status)})
    ]));

    if(q.type==='mc' || q.type==='vf'){
      var yourTxt = ans.checked && ans.selected!=null ? q.runtimeOptions[ans.selected] : '(sin responder)';
      card.appendChild(el('div',{class:'ranswer'},[
        document.createTextNode('Tu respuesta: '+yourTxt+'.'), el('br'),
        document.createTextNode('Respuesta correcta: '), el('b',{text:q.runtimeOptions[q.runtimeCorrect]})
      ]));
    } else if(q.type==='fill'){
      var yourTxt2 = ans.checked && ans.text ? ans.text : '(sin responder)';
      card.appendChild(el('div',{class:'ranswer'},[
        document.createTextNode('Tu respuesta: '+yourTxt2+'.'), el('br'),
        document.createTextNode('Respuesta correcta: '), el('b',{text:q.answers[0]})
      ]));
    } else if(q.type==='match' || q.type==='diagram' || q.type==='connect'){
      var slots = q.type==='diagram' ? q.slots : q.runtimePairs;
      var box = el('div',{class:'ranswer'});
      slots.forEach(function(sdef, i){
        var key = q.type==='diagram' ? sdef.key : i;
        var leftLabel = q.type==='diagram' ? sdef.label : sdef.l;
        var correct = q.type==='diagram' ? sdef.correct : sdef.r;
        var chosen = ans.checked && ans.selections ? ans.selections[key] : null;
        var ok = chosen===correct;
        var line = document.createElement('div');
        line.style.marginBottom='4px';
        line.innerHTML = '<b>'+leftLabel+':</b> '+(chosen? chosen : '(sin responder)')+(ok? ' ✓' : ' — correcta: '+correct);
        box.appendChild(line);
      });
      card.appendChild(box);
    } else if(q.type==='open'){
      card.appendChild(el('div',{class:'ranswer'},[
        document.createTextNode('Tu respuesta:'), el('br'),
        document.createTextNode(ans.text && ans.text.trim() ? ans.text : '(sin responder)')
      ]));
      card.appendChild(el('div',{class:'ranswer'},[ el('b',{text:'Respuesta modelo: '}), document.createTextNode(q.model) ]));
      if(ans.checked){
        card.appendChild(el('div',{class:'ranswer'},[ document.createTextNode(ans.knewIt ? 'Marcaste: la sabía.' : 'Marcaste: no la sabía.') ]));
      }
    }

    if(q.explain) card.appendChild(el('div',{class:'rexplain', text:q.explain}));
    list.appendChild(card);
  });
}

document.getElementById('btn-restart').addEventListener('click', restart);
document.getElementById('btn-restart-2').addEventListener('click', restart);
function restart(){
  if(state.timerId){ clearInterval(state.timerId); state.timerId=null; }
  showScreen('start');
}

// ---------- arranque ----------
renderTopicChips();
showScreen('start');

})();

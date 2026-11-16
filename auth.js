(() => {
  const SUPABASE_URL = 'https://gojtxyzlqueeaspynppr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_QrdKYVrqpzXlfWEMApTqGw_k1gRfaC1';
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  if (!client) { console.error('No se pudo cargar Supabase.'); return; }

  const header = document.querySelector('.site-header');
  const loginButton = document.createElement('button');
  loginButton.className = 'auth-open';
  loginButton.type = 'button';
  loginButton.textContent = 'Ingresar';
  header.appendChild(loginButton);

  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <section class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button class="auth-close" type="button" aria-label="Cerrar">×</button>
      <span class="eyebrow">CUENTA PLAYFORJA</span><h2 id="auth-title">ENTRÁ A LA FORJA</h2>
      <p class="auth-status" aria-live="polite">Iniciá sesión o creá tu cuenta.</p>
      <form class="auth-form">
        <label>Correo electrónico<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
        <label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
        <label class="auth-username" hidden>Nombre de jugador<input name="username" type="text" minlength="3" maxlength="24" autocomplete="nickname"></label>
        <div class="auth-actions"><button class="btn btn-gold" type="submit">Iniciar sesión</button><button class="auth-switch" type="button">Crear cuenta</button></div>
      </form>
      <button class="auth-logout" type="button" hidden>Cerrar sesión</button>
    </section>`;
  document.body.appendChild(modal);
  const form=modal.querySelector('form'), status=modal.querySelector('.auth-status');
  const submit=form.querySelector('[type=submit]'), username=form.querySelector('.auth-username');
  const switcher=modal.querySelector('.auth-switch'), close=modal.querySelector('.auth-close');
  const logout=modal.querySelector('.auth-logout');
  let mode='login', currentUser=null;

  function message(text,error=false){status.textContent=text;status.style.color=error?'#ff9a76':'#e8b84f';}
  function setMode(next){
    mode=next; username.hidden=mode!=='signup';
    submit.textContent=mode==='login'?'Iniciar sesión':'Crear cuenta';
    switcher.textContent=mode==='login'?'Crear cuenta':'Ya tengo cuenta';
    form.querySelector('[name=password]').autocomplete=mode==='login'?'current-password':'new-password';
    message(mode==='login'?'Iniciá sesión con tu correo.':'Creá tu cuenta PLAYFORJA.');
  }
  function show(){modal.hidden=false;document.body.classList.add('auth-opened');}
  function hide(){modal.hidden=true;document.body.classList.remove('auth-opened');}
  function sync(user){
    currentUser=user;
    loginButton.textContent=user?'Mi cuenta':'Ingresar';
    if(user) message('Sesión iniciada: '+user.email);
  }
  loginButton.addEventListener('click',async()=>{
    show();
    if(currentUser){message('Sesión activa: '+currentUser.email);logout.hidden=false;form.hidden=true;}
    else {logout.hidden=true;form.hidden=false;setMode('login');}
  });
  close.addEventListener('click',hide);
  modal.addEventListener('click',e=>{if(e.target===modal)hide();});
  switcher.addEventListener('click',()=>setMode(mode==='login'?'signup':'login'));
  form.addEventListener('submit',async e=>{
    e.preventDefault();submit.disabled=true;
    const data=new FormData(form),email=String(data.get('email')).trim(),password=String(data.get('password'));
    try{
      if(mode==='signup'){
        const usernameValue=String(data.get('username')||'').trim();
        if(usernameValue.length<3) throw new Error('El nombre de jugador debe tener al menos 3 caracteres.');
        const {data:result,error}=await client.auth.signUp({email,password,options:{data:{username:usernameValue}}});
        if(error) throw error;
        if(result.session){message('Cuenta creada. Ya podés entrar a PLAYFORJA.');}
        else message('Te enviamos un correo para confirmar tu cuenta. Revisá tu bandeja de entrada.');
      } else {
        const {data:result,error}=await client.auth.signInWithPassword({email,password});
        if(error) throw error;
        sync(result.user);message('¡Bienvenido! Tu sesión está activa.');hide();
      }
    }catch(err){message(err.message||'No se pudo completar la operación. Intentá nuevamente.',true);}
    finally{submit.disabled=false;}
  });
  logout.addEventListener('click',async()=>{
    const {error}=await client.auth.signOut();
    if(error){message('No se pudo cerrar sesión: '+error.message,true);return;}
    sync(null);form.reset();form.hidden=false;logout.hidden=true;setMode('login');message('Sesión cerrada correctamente.');
  });
  client.auth.onAuthStateChange((_event,session)=>sync(session?.user??null));
  client.auth.getSession().then(({data,error})=>{
    if(error) message('No se pudo recuperar la sesión: '+error.message,true);
    else {sync(data.session?.user??null);if(data.session?.user)setTimeout(loadAccountData,0);}
  });

  document.querySelectorAll('[data-platform-filter]').forEach(filter=>filter.addEventListener('click',()=>{
    document.querySelectorAll('[data-platform-filter]').forEach(el=>el.classList.toggle('active',el===filter));
    document.querySelectorAll('.game-card').forEach(card=>card.hidden=filter.dataset.platformFilter!=='Todos'&&card.dataset.platform!==filter.dataset.platformFilter);
  }));
  function showToast(text){const el=document.getElementById('toast');if(!el)return;el.textContent=text;el.classList.add('show');window.setTimeout(()=>el.classList.remove('show'),3200);}
  async function requireLogin(){
    if(currentUser) return true;
    show();form.hidden=false;logout.hidden=true;setMode('login');
    message('Para realizar esta acción, primero iniciá sesión.');
    return false;
  }
  async function refreshProfile(){
    if(!currentUser) return;
    const {data,error}=await client.from('profiles').select('pf_balance,xp,username').eq('id',currentUser.id).single();
    if(error){console.warn('No se pudo cargar el perfil:',error.message);return;}
    document.querySelectorAll('.balance strong').forEach(el=>el.textContent=Number(data.pf_balance).toLocaleString('es-AR')+' PF');
    const xp=Number(data.xp)||0,levels=[['BRONCE',0],['PLATA',500],['ORO',1200],['PLATINO',1750],['DIAMANTE',2500],['LEYENDA',3500]];
    let rank=0;for(let i=0;i<levels.length;i++)if(xp>=levels[i][1])rank=i;
    const next=levels[Math.min(rank+1,levels.length-1)],base=levels[rank][1],pct=rank===levels.length-1?100:Math.max(0,Math.min(100,Math.round((xp-base)/(next[1]-base)*100)));
    const rankTitle=document.querySelector('.rank-top h3'),rankPct=document.querySelector('.rank-top>strong'),rankBar=document.querySelector('.progress-track span');
    if(rankTitle)rankTitle.textContent=levels[rank][0]+' → '+next[0];if(rankPct)rankPct.innerHTML=pct+'<small>%</small>';if(rankBar)rankBar.style.width=pct+'%';
    document.querySelectorAll('.rank-labels span').forEach((el,i)=>el.classList.toggle('current',i===rank));
    const credits=document.querySelector('.credits-line');
    if(credits) credits.innerHTML='<span>MONEDAS PF <strong>'+Number(data.pf_balance).toLocaleString('es-AR')+'</strong></span><span>XP <strong>'+Number(data.xp).toLocaleString('es-AR')+'</strong></span>';
  }
  async function loadTournaments(){
    const {data,error}=await client.from('tournaments').select('*').order('created_at');
    if(error){console.warn('Torneos:',error.message);document.querySelectorAll('.game-card .join-btn').forEach(b=>{b.disabled=true;b.textContent='No disponible';});const host=document.getElementById('community-tournaments');if(host)host.innerHTML='<p class="empty-state">No se pudieron cargar los torneos reales. Revisá la conexión e intentá nuevamente.</p>';return;}
    const {data:counts,countError}=await client.from('tournament_public_counts').select('tournament_id,registration_count');
    let joinedIds=new Set();if(currentUser){const {data:joined}=await client.from('tournament_registrations').select('tournament_id').eq('user_id',currentUser.id);(joined||[]).forEach(row=>joinedIds.add(row.tournament_id));}
    const cards=[...document.querySelectorAll('.game-card:not([data-user-created])')];
    const seeded=data.filter(item=>!item.slug.startsWith('user-'));
    for(let i=0;i<Math.min(cards.length,seeded.length);i++){
      const item=seeded[i],card=cards[i],button=card.querySelector('.join-btn');
      card.dataset.platform=item.platform;
      const count=(counts||[]).find(row=>row.tournament_id===item.id)?.registration_count||0;
      card.querySelector('h3').textContent=item.title;
      card.querySelector('.pill').textContent=(item.is_demo?'MUESTRA · ':'')+item.platform+' · '+item.mode;
      card.querySelector('.card-meta span').textContent='Inscripciones';
      card.querySelector('.card-meta b').textContent=(count||0)+' de '+item.capacity+' anotados';
      card.querySelector('p').textContent=item.is_demo?'Torneo de demostración para probar inscripciones y cupos. Horario por confirmar.':'Inscripciones registradas en PLAYFORJA. Horario por confirmar.';
      button.disabled=item.status!=='open'||joinedIds.has(item.id);
      button.textContent=joinedIds.has(item.id)?'Ya estás unido':item.status==='full'?'Torneo lleno':'UNIRSE';
      button.dataset.tournamentId=item.id;
      button.onclick=async()=>{
        if(!await requireLogin()) return;
        button.disabled=true;
        const {data:result,error:joinError}=await client.rpc('join_tournament',{p_tournament_id:item.id});
        if(joinError){notifyError(joinError.message);button.disabled=false;return;}
        button.textContent=result.already_joined?'Ya estás unido':'Te uniste al torneo';
        showToast(result.already_joined?'Ya estabas anotado.':'Te uniste al torneo.');
        await loadTournaments();
      };
    }
    const userTournaments=data.filter(item=>item.slug.startsWith('user-'));
    const dynamicHost=document.getElementById('community-tournaments');
    if(dynamicHost){
      dynamicHost.innerHTML=userTournaments.map(item=>{
        const count=(counts||[]).find(row=>row.tournament_id===item.id)?.registered||0;
        return '<article class="game-card community-card" data-platform="'+escapeHtml(item.platform)+'" data-user-created="true"><div class="game-visual"><span class="game-symbol">✦</span><span class="game-label">COMUNIDAD PLAYFORJA</span></div><div class="card-content"><span class="pill">'+escapeHtml(item.platform)+' · '+escapeHtml(item.mode)+'</span><h3>'+escapeHtml(item.title)+'</h3><p>Torneo creado por un jugador de la comunidad.</p><div class="card-meta"><span>Cupos</span><b>'+count+' de '+item.capacity+' anotados</b></div><button class="btn btn-gold full community-join" data-id="'+item.id+'" '+(item.status!=='open'?'disabled':'')+'>'+(item.status==='full'?'Torneo lleno':'UNIRSE')+'</button></div></article>';
      }).join('');
      dynamicHost.querySelectorAll('.community-join').forEach(button=>button.addEventListener('click',async()=>{
        if(!await requireLogin())return;
        button.disabled=true;
        const {data:result,error}=await client.rpc('join_tournament',{p_tournament_id:button.dataset.id});
        if(error){notifyError(error.message);button.disabled=false;return;}
        showToast(result.already_joined?'Ya estabas anotado.':'Te uniste al torneo.');
        await loadTournaments();
      }));
    }
  }
  function notifyError(message){showToast(message.includes('TOURNAMENT_FULL')?'Torneo lleno.':message.includes('INSUFFICIENT_PF')?'No te alcanza el saldo de Monedas PF.':'No se pudo completar la acción: '+message);}
  async function loadFrames(){
    const {data,error}=await client.from('frames').select('*').eq('active',true);
    if(error){console.warn('Marcos:',error.message);document.querySelectorAll('.buy-btn').forEach(b=>{b.disabled=true;b.textContent='Catálogo no disponible';});return;}
    const owned=new Set();
    if(currentUser){
      const {data:ownedRows}=await client.from('user_frames').select('frame_id').eq('user_id',currentUser.id);
      (ownedRows||[]).forEach(row=>owned.add(row.frame_id));
    }
    const frameCardClass={'marco-leyenda':'frame-legend','marco-fuego':'frame-fire','marco-oro':'frame-gold','marco-diamante':'frame-diamond'};
    for(const item of (data||[])){
      const preview=document.querySelector('.'+frameCardClass[item.slug]);
      const card=preview?.closest('.frame-card');if(!card)continue;
      const button=card.querySelector('.buy-btn');
      card.querySelector('h3').textContent=item.name;
      card.querySelector('b').textContent=Number(item.price_pf).toLocaleString('es-AR')+' PF';
      button.textContent=owned.has(item.id)?'Desbloqueado':'CANJEAR';
      button.disabled=owned.has(item.id);
      button.onclick=async()=>{
        if(!await requireLogin()) return;
        button.disabled=true;
        const {data:result,error:buyError}=await client.rpc('purchase_frame',{p_frame_id:item.id});
        if(buyError){notifyError(buyError.message);button.disabled=false;return;}
        showToast(result.already_owned?'Ese marco ya es tuyo.':'Marco desbloqueado.');
        await refreshProfile();await loadFrames();
      };
    }
  }
  async function loadRooms(){
    const {data,error}=await client.from('rooms').select('*').order('created_at');
    if(error){console.warn('Salas:',error.message);document.getElementById('room-list').innerHTML='<p class="empty-state">No se pudieron cargar las salas reales. Revisá la conexión e intentá nuevamente.</p>';return;}
    const {data:counts,countError}=await client.from('room_public_counts').select('room_id,member_count');
    let joinedRooms=new Set();if(currentUser){const {data:joined}=await client.from('room_members').select('room_id').eq('user_id',currentUser.id);(joined||[]).forEach(row=>joinedRooms.add(row.room_id));}
    const cards=[...document.querySelectorAll('.room-card')];
    for(let i=0;i<Math.min(cards.length,data.length);i++){
      const item=data[i],card=cards[i],button=card.querySelector('.join-btn');
      if(!button) continue;
      card.querySelector('h3').textContent=item.name;
      card.querySelector('p').textContent=item.description;
      const count=(counts||[]).find(row=>row.room_id===item.id)?.member_count||0;
      card.querySelector('small').textContent=(count||0)+' de '+item.capacity+' jugadores'+(item.is_demo?' · sala de muestra':'');
      const statusBadge=card.querySelector('.status');
      if(statusBadge){statusBadge.textContent=item.is_demo?'● MUESTRA':item.status==='open'?'● ABIERTA':item.status==='full'?'● COMPLETA':'● CERRADA';statusBadge.classList.toggle('live',item.status==='open');statusBadge.classList.toggle('waiting',item.status!=='open');}
      button.textContent=joinedRooms.has(item.id)?'Ya estás en la sala':item.status==='full'?'Sala llena':item.status==='open'?'Unirse':'Cerrada';
      button.disabled=item.status!=='open'||joinedRooms.has(item.id);
      button.onclick=async()=>{
        if(!await requireLogin()) return;
        button.disabled=true;
        const {data:result,error:joinError}=await client.rpc('join_room',{p_room_id:item.id});
        if(joinError){notifyError(joinError.message);button.disabled=false;return;}
        showToast(result.already_joined?'Ya estás en esta sala.':'Te uniste a la sala.');
        await loadRooms();
      };
    }
  }

  const createTournamentButton=document.getElementById('create-tournament');
  if(createTournamentButton)createTournamentButton.addEventListener('click',async()=>{
    if(!await requireLogin())return;
    const game=document.getElementById('game-choice')?.value||'Torneo comunitario';
    const platform=document.querySelector('.platform.active')?.dataset.platform||'PC';
    createTournamentButton.disabled=true;
    const {data,error}=await client.rpc('create_tournament',{p_game:game,p_platform:platform});
    if(error){showToast(error.message.includes('TOO_MANY_OPEN_TOURNAMENTS')?'Ya tenés tres torneos abiertos. Cerrá uno antes de crear otro.':'No se pudo crear el torneo: '+error.message);createTournamentButton.disabled=false;return;}
    showToast('Torneo creado: '+data.title+'. Ya aparece en la lista de la comunidad.');
    createTournamentButton.disabled=false;
    await loadTournaments();
  });


  async function loadSeasons(){
    const {data,error}=await client.from('seasons').select('id,name,starts_at,ends_at,status').order('starts_at',{ascending:true});
    if(error){console.warn('Temporadas:',error.message);return;}
    const cards=[...document.querySelectorAll('.season-card')];
    for(let i=0;i<Math.min(cards.length,(data||[]).length);i++){
      const season=data[i],card=cards[i];
      card.querySelector('.season-number').textContent='TEMPORADA '+String(i+1).padStart(2,'0');
      card.querySelector('.pill').textContent=season.status==='finished'?'FINALIZADA':season.status==='active'?'EN CURSO':'PRÓXIMAMENTE';
      card.querySelector('h3').textContent=season.name;
      const dates=[season.starts_at,season.ends_at].filter(Boolean).map(value=>new Date(value).toLocaleDateString('es-AR'));
      card.querySelector('ul').innerHTML='<li>'+ (dates.length===2?'Desde '+dates[0]+' hasta '+dates[1]:'Fechas por anunciar')+'</li><li>Estado: '+(season.status==='finished'?'Finalizada':season.status==='active'?'En curso':'Próximamente')+'</li><li>Recompensa: consultar catálogo de marcos</li>';
    }
  }
  async function loadEvidence(){
    const host=document.getElementById('evidence-gallery');if(!host)return;
    const {data,error}=await client.from('evidence').select('id,title,description,image_url,created_at,owner_id').eq('validated',true).order('created_at',{ascending:false});
    if(error){host.textContent='No se pudieron cargar las evidencias: '+error.message;return;}
    if(!data?.length){host.innerHTML='<p class="evidence-empty">Todavía no hay capturas validadas publicadas. Esta galería solo muestra evidencias reales aprobadas por la comunidad.</p>';return;}
    host.innerHTML=data.map(item=>'<button type="button" class="evidence-item" data-evidence-id="'+item.id+'"><img loading="lazy" src="'+escapeHtml(item.image_url)+'" alt="'+escapeHtml(item.title)+'"><span>'+escapeHtml(item.title)+'</span><small>'+new Date(item.created_at).toLocaleDateString('es-AR')+'</small></button>').join('');
    host.querySelectorAll('.evidence-item').forEach(button=>button.addEventListener('click',()=>{
      const item=data.find(entry=>entry.id===button.dataset.evidenceId);if(!item)return;
      let dialog=document.getElementById('evidence-dialog');
      if(!dialog){dialog=document.createElement('dialog');dialog.id='evidence-dialog';dialog.className='evidence-dialog';document.body.appendChild(dialog);}
      dialog.innerHTML='<button type="button" class="evidence-close" aria-label="Cerrar">×</button><img src="'+escapeHtml(item.image_url)+'" alt="'+escapeHtml(item.title)+'"><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.description||'Evidencia validada')+'</p><small>'+new Date(item.created_at).toLocaleString('es-AR')+' · Jugador '+item.owner_id.slice(0,8)+'</small>';
      dialog.querySelector('button').onclick=()=>dialog.close();dialog.showModal();
    }));
  }

  let missionCategory='daily',missionCache=[];
  async function loadMissions(){
    const host=document.getElementById('mission-list');if(!host)return;
    if(!currentUser){host.innerHTML='<p class="mission-empty">Iniciá sesión para ver tus misiones. Tu progreso se guarda en tu cuenta.</p>';return;}
    host.innerHTML='<p class="mission-empty">Cargando tus misiones…</p>';
    const {data,error}=await client.rpc('get_my_missions');
    if(error){host.textContent='No se pudieron cargar las misiones: '+error.message;return;}
    missionCache=data||[];
    renderMissions();
  }
  function renderMissions(){
    const host=document.getElementById('mission-list');if(!host)return;
    const rows=missionCache.filter(m=>m.category===missionCategory);
    if(!rows.length){host.innerHTML='<p class="mission-empty">No hay misiones activas en esta categoría.</p>';return;}
    host.innerHTML=rows.map(m=>{
      const pct=Math.min(100,Math.round((m.progress/m.target)*100));
      const icons={'daily-win-3':'🏆','daily-elims-15':'⚔️','daily-team-30':'🤝','daily-room-5':'🎮','daily-tournament-join':'🏟️','daily-night-2':'🌙','daily-top3':'🥉','daily-games-5':'🎯','daily-win-no-deaths':'🔥','daily-invite-friend':'👥','weekly-win-10':'🏅','weekly-elims-50':'⚡','weekly-rank-up':'📈','weekly-daily-5':'📅','season-forja':'🔥','season-llama':'💎','season-antipro':'🛡️'};
      const claimed=!!m.claimed_at,complete=m.progress>=m.target,started=!!m.started_at;
      const label=claimed?'Reclamada':complete?'Reclamar':started?'Seguir':'Empezar';
      const disabled=claimed;
      return '<article class="mission-card mission-live"><div class="mission-card-top"><span class="mission-icon">'+(icons[m.slug]||'✦')+'</span><span class="mission-kicker">'+(m.category==='seasonal'?(m.period_key==='season-preview'?'PRETEMPORADA DE PRUEBA':'TEMPORADA ACTIVA'):({daily:'CADA DÍA',weekly:'CADA SEMANA'}[m.category]))+'</span><span class="mission-difficulty">'+m.difficulty+'</span></div><h3>'+escapeHtml(m.title)+'</h3><p>'+escapeHtml(m.description)+'</p><div class="mission-progress-label"><span>Progreso</span><b>'+m.progress+' / '+m.target+'</b></div><div class="mission-progress-track"><span style="width:'+pct+'%"></span></div><div class="mission-rewards"><b>+'+m.reward_xp+' XP</b><b>+'+m.reward_pf+' PF</b></div><button class="btn '+(complete?'btn-gold':'btn-outline')+' mission-action" data-id="'+m.user_mission_id+'" '+(disabled?'disabled':'')+'>'+label+'</button>'+(claimed?'<small class="mission-claimed">✓ Recompensa acreditada</small>':'')+'</article>';
    }).join('');
    host.querySelectorAll('.mission-action').forEach(btn=>btn.addEventListener('click',()=>handleMission(btn.dataset.id,btn)));
  }
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  async function handleMission(id,button){
    if(!await requireLogin())return;
    const mission=missionCache.find(m=>m.user_mission_id===id);if(!mission)return;
    button.disabled=true;
    if(!mission.started_at){
      const {error}=await client.rpc('start_mission',{p_mission_id:mission.mission_id});
      if(error){showToast('No se pudo iniciar: '+error.message);button.disabled=false;return;}
      showToast('Misión activada. El progreso se acredita con resultados verificados.');
    }else if(mission.progress<mission.target){
      showToast('Te faltan '+(mission.target-mission.progress)+' para completar esta misión.');
    }else{
      const {error}=await client.rpc('claim_mission',{p_user_mission_id:id});
      if(error){
        const msg=error.message||'Error al reclamar';
        showToast(msg.includes('MISSION_INCOMPLETE')?'Te falta progreso para completar esta misión.':msg.includes('MISSION_ALREADY_CLAIMED')?'Esta misión ya fue reclamada.':'No se pudo reclamar: '+msg);
        button.disabled=false;return;
      }
      showToast('¡Recompensa acreditada! Ganaste '+mission.reward_xp+' XP y '+mission.reward_pf+' PF.');
      await refreshProfile();
    }
    await loadMissions();
  }
  document.querySelectorAll('[data-mission-tab]').forEach(tab=>tab.addEventListener('click',()=>{
    missionCategory=tab.dataset.missionTab;
    document.querySelectorAll('[data-mission-tab]').forEach(t=>t.classList.toggle('active',t===tab));
    renderMissions();
  }));

  async function loadAccountData(){
    if(!currentUser) return;
    await Promise.all([refreshProfile(),loadTournaments(),loadFrames(),loadRooms(),loadMissions()]);
  }
  client.auth.onAuthStateChange((_event,session)=>{
    sync(session?.user??null);
    if(session?.user) setTimeout(loadAccountData,0);
    else {loadFrames();loadTournaments();loadRooms();loadMissions();}
  });

  loadTournaments();loadFrames();loadRooms();loadMissions();loadSeasons();loadEvidence();
  window.PLAYFORJA = Object.freeze({supabase:client, getUser:()=>currentUser});
})();
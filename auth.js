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
    else sync(data.session?.user??null);
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
    if(error){console.warn('Torneos:',error.message);return;}
    const {data:counts}=await client.rpc('get_tournament_counts');
    let joinedIds=new Set();if(currentUser){const {data:joined}=await client.from('tournament_registrations').select('tournament_id').eq('user_id',currentUser.id);(joined||[]).forEach(row=>joinedIds.add(row.tournament_id));}
    const cards=[...document.querySelectorAll('.game-card')];
    for(let i=0;i<Math.min(cards.length,data.length);i++){
      const item=data[i],card=cards[i],button=card.querySelector('.join-btn');
      card.dataset.platform=item.platform;
      const count=(counts||[]).find(row=>row.tournament_id===item.id)?.registered||0;
      card.querySelector('h3').textContent=item.title;
      card.querySelector('.pill').textContent=item.platform+' · '+item.mode;
      card.querySelector('.card-meta b').textContent=(count||0)+' de '+item.capacity+' anotados';
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
  }
  function notifyError(message){showToast(message.includes('TOURNAMENT_FULL')?'Torneo lleno.':message.includes('INSUFFICIENT_PF')?'No te alcanza el saldo de Monedas PF.':'No se pudo completar la acción: '+message);}
  async function loadFrames(){
    const {data,error}=await client.from('frames').select('*').eq('active',true).order('price_pf');
    if(error){console.warn('Marcos:',error.message);return;}
    const owned=new Set();
    if(currentUser){
      const {data:ownedRows}=await client.from('user_frames').select('frame_id').eq('user_id',currentUser.id);
      (ownedRows||[]).forEach(row=>owned.add(row.frame_id));
    }
    const cards=[...document.querySelectorAll('.frame-card')];
    for(let i=0;i<Math.min(cards.length,data.length);i++){
      const item=data[i],card=cards[i],button=card.querySelector('.buy-btn');
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
    if(error){console.warn('Salas:',error.message);return;}
    const {data:counts}=await client.rpc('get_room_counts');
    let joinedRooms=new Set();if(currentUser){const {data:joined}=await client.from('room_members').select('room_id').eq('user_id',currentUser.id);(joined||[]).forEach(row=>joinedRooms.add(row.room_id));}
    const cards=[...document.querySelectorAll('.room-card')];
    for(let i=0;i<Math.min(cards.length,data.length);i++){
      const item=data[i],card=cards[i],button=card.querySelector('.join-btn');
      if(!button) continue;
      card.querySelector('h3').textContent=item.name;
      card.querySelector('p').textContent=item.description;
      const count=(counts||[]).find(row=>row.room_id===item.id)?.members||0;
      card.querySelector('small').textContent=(count||0)+' de '+item.capacity+' jugadores';
      button.textContent=joinedRooms.has(item.id)?'Ya estás en la sala':item.status==='full'?'Sala llena':'Unirse';
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
      const claimed=!!m.claimed_at,complete=m.progress>=m.target,started=!!m.started_at;
      const label=claimed?'Reclamada':complete?'Reclamar':started?'Seguir':'Empezar';
      const disabled=claimed;
      return '<article class="mission-card mission-live"><div class="mission-card-top"><span class="mission-kicker">'+({daily:'CADA DÍA',weekly:'CADA SEMANA',seasonal:'TEMPORADA'}[m.category])+'</span><span class="mission-difficulty">'+m.difficulty+'</span></div><h3>'+escapeHtml(m.title)+'</h3><p>'+escapeHtml(m.description)+'</p><div class="mission-progress-label"><span>Progreso</span><b>'+m.progress+' / '+m.target+'</b></div><div class="mission-progress-track"><span style="width:'+pct+'%"></span></div><div class="mission-rewards"><b>+'+m.reward_xp+' XP</b><b>+'+m.reward_pf+' PF</b></div><button class="btn '+(complete?'btn-gold':'btn-outline')+' mission-action" data-id="'+m.user_mission_id+'" '+(disabled?'disabled':'')+'>'+label+'</button>'+(claimed?'<small class="mission-claimed">✓ Recompensa acreditada</small>':'')+'</article>';
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

  loadTournaments();loadFrames();loadRooms();loadMissions();
  window.PLAYFORJA = Object.freeze({supabase:client, getUser:()=>currentUser});
})();
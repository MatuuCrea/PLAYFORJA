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
  window.PLAYFORJA = Object.freeze({supabase:client, getUser:()=>currentUser});
})();
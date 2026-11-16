(() => {
  const toast = document.getElementById('toast');
  let toastTimer;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  document.getElementById('year').textContent = new Date().getFullYear();

  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.textContent = open ? '×' : '☰';
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = '☰';
  }));

  document.querySelectorAll('.platform').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.platform').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
  }));

  const search = document.getElementById('room-search');
  const rooms = [...document.querySelectorAll('.room-card')];
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase('es');
    let visible = 0;
    rooms.forEach(room => {
      const match = (room.dataset.search + ' ' + room.textContent).toLocaleLowerCase('es').includes(query);
      room.hidden = !match;
      if (match) visible++;
    });
    document.getElementById('empty-rooms').hidden = visible !== 0;
  });

  const greetings = {es:'Hola Matuu',pt:'Olá Matuu',en:'Hello Matuu',fr:'Bonjour Matuu',de:'Hallo Matuu',ja:'こんにちは Matuu'};
  document.querySelectorAll('.country').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.country').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    document.getElementById('hello-text').textContent = greetings[button.dataset.lang] || greetings.es;
    notify('Idioma de bienvenida: ' + button.textContent.trim());
  }));

  // Installable PWA on supported browsers; this does not claim to be a native APK.
  const installButton = document.getElementById('install-app');
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener('click', async () => {
    if (!installPrompt) {
      notify('Si tu navegador permite instalarla, abrí su menú y elegí “Instalar aplicación”.');
      return;
    }
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice?.outcome === 'accepted') notify('PLAYFORJA se está instalando.');
    installPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener('appinstalled', () => notify('PLAYFORJA quedó instalada en este dispositivo.'));
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => console.warn('PWA offline no disponible:', error));
    });
  }
})();
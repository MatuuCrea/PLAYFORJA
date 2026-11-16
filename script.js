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
  const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          if (link.getAttribute('href') === '#' + entry.target.id) link.setAttribute('aria-current','location');
          else link.removeAttribute('aria-current');
        });
      });
    }, {rootMargin:'-25% 0px -65% 0px'});
    sections.forEach(section => observer.observe(section));
  }
  const fairplayDialog = document.getElementById('fairplay-dialog');
  document.querySelector('[data-open-fairplay]')?.addEventListener('click', () => fairplayDialog?.showModal());
  document.querySelector('[data-close-fairplay]')?.addEventListener('click', () => fairplayDialog?.close());
  fairplayDialog?.addEventListener('click', event => { if (event.target === fairplayDialog) fairplayDialog.close(); });

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

  const greetings = {es:'Hola',pt:'Olá',en:'Hello',fr:'Bonjour',de:'Hallo',ja:'こんにちは'};
  document.querySelectorAll('.country').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.country').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    document.getElementById('hello-text').textContent = greetings[button.dataset.lang] || greetings.es;
    notify('Idioma de bienvenida: ' + button.textContent.trim());
  }));

})();

  // Interactive reference globe; city pins are reference coordinates, not live servers.
  (() => {
    const canvas=document.getElementById('playforja-globe');if(!canvas)return;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const W=720,H=520,cx=360,cy=250,R=205;
    let yaw=-1.13,pitch=.14,zoom=1,drag=null,selected=null;
    const cities={'Buenos Aires':[-34.6037,-58.3816],'São Paulo':[-23.5505,-46.6333],'Santiago':[-33.4489,-70.6693],'Ciudad de México':[19.4326,-99.1332],'Tokio':[35.6762,139.6503]};
    const shapes=[
      [[70,-168],[68,-140],[58,-130],[50,-125],[45,-123],[38,-118],[30,-115],[22,-108],[15,-98],[9,-84],[18,-77],[25,-80],[30,-90],[38,-105],[48,-123],[58,-135],[66,-155]],
      [[12,-81],[5,-78],[-2,-80],[-10,-78],[-18,-72],[-28,-71],[-40,-73],[-54,-68],[-50,-58],[-38,-52],[-25,-48],[-10,-42],[0,-50],[8,-60]],
      [[72,-10],[70,25],[62,50],[55,75],[48,100],[40,125],[30,135],[20,120],[10,105],[5,85],[15,65],[25,55],[32,40],[40,25],[52,5],[62,-10]],
      [[35,-10],[30,0],[20,10],[10,15],[0,10],[-10,15],[-20,20],[-35,18],[-35,30],[-20,38],[-5,42],[10,48],[25,38],[32,25]],
      [[-10,112],[-15,125],[-20,135],[-25,145],[-35,150],[-40,145],[-38,135],[-30,125],[-25,115]],
      [[60,-45],[70,-50],[80,-40],[82,-20],[75,-18],[65,-25]]
    ];
    function project(lat,lon){
      const a=lat*Math.PI/180,b=lon*Math.PI/180+yaw;
      const x=Math.cos(a)*Math.sin(b);
      const y=Math.sin(a)*Math.cos(pitch)-Math.cos(a)*Math.cos(b)*Math.sin(pitch);
      const z=Math.sin(a)*Math.sin(pitch)+Math.cos(a)*Math.cos(b)*Math.cos(pitch);
      return{x:cx+x*R*zoom,y:cy-y*R*zoom,z};
    }
    function draw(){
      ctx.clearRect(0,0,W,H);const r=R*zoom;
      const g=ctx.createRadialGradient(cx-r*.32,cy-r*.35,r*.06,cx,cy,r*1.15);
      g.addColorStop(0,'#40301b');g.addColorStop(.65,'#171a19');g.addColorStop(1,'#050606');
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
      ctx.strokeStyle='rgba(225,181,91,.25)';ctx.lineWidth=1;
      for(let lat=-60;lat<=60;lat+=30){ctx.beginPath();let started=false;for(let lon=-180;lon<=180;lon+=3){const p=project(lat,lon);if(p.z<0){started=false;continue;}if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}ctx.stroke();}
      for(let lon=-180;lon<180;lon+=30){ctx.beginPath();let started=false;for(let lat=-89;lat<=89;lat+=2){const p=project(lat,lon);if(p.z<0){started=false;continue;}if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}ctx.stroke();}
      ctx.fillStyle='rgba(204,160,77,.48)';ctx.strokeStyle='rgba(242,202,115,.55)';
      for(const poly of shapes){ctx.beginPath();let started=false;for(const [lat,lon] of poly){const p=project(lat,lon);if(p.z<0){started=false;continue;}if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);}ctx.closePath();ctx.fill();ctx.stroke();}
      for(const [name,[lat,lon]] of Object.entries(cities)){const p=project(lat,lon);if(p.z<=0)continue;ctx.beginPath();ctx.arc(p.x,p.y,3.2,0,Math.PI*2);ctx.fillStyle='#ffd36c';ctx.fill();if(selected?.name===name){ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.strokeStyle='#fff0b0';ctx.stroke();}}
      if(selected){const p=project(selected.lat,selected.lon);if(p.z>0){ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.strokeStyle='#ff7b36';ctx.lineWidth=2;ctx.stroke();}}
      ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(237,190,91,.75)';ctx.lineWidth=2;ctx.stroke();
    }
    function choose(name,lat,lon){selected={name,lat,lon};document.getElementById('globe-place').textContent=name;document.getElementById('globe-coordinates').textContent='Latitud '+lat.toFixed(4)+'° · Longitud '+lon.toFixed(4)+'°';draw();}
    function goCity(name){const pair=cities[name];if(!pair){document.getElementById('globe-place').textContent='Ciudad no encontrada';return;}const[lat,lon]=pair;yaw=-lon*Math.PI/180;pitch=lat*Math.PI/180*.45;zoom=Math.max(zoom,1.05);choose(name,lat,lon);}
    document.querySelectorAll('[data-city]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('globe-search').value=b.dataset.city;goCity(b.dataset.city);}));
    document.getElementById('globe-search-go').addEventListener('click',()=>{const q=document.getElementById('globe-search').value.trim().toLocaleLowerCase('es');const name=Object.keys(cities).find(k=>k.toLocaleLowerCase('es')===q);if(name){goCity(name);return;}const m=q.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);if(m){const lat=Number(m[1]),lon=Number(m[2]);if(Math.abs(lat)<=90&&Math.abs(lon)<=180){yaw=-lon*Math.PI/180;pitch=lat*Math.PI/180*.45;choose('Coordenadas elegidas',lat,lon);return;}}document.getElementById('globe-place').textContent='Usá una ciudad sugerida o latitud,longitud.';});
    function point(e){const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height};}
    canvas.addEventListener('pointerdown',e=>{drag={...point(e),yaw,pitch,moved:false};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
    canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e),dx=p.x-drag.x,dy=p.y-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;yaw=drag.yaw+dx/(R*zoom);pitch=Math.max(-1.35,Math.min(1.35,drag.pitch+dy/(R*zoom)));draw();});
    canvas.addEventListener('pointerup',e=>{if(!drag)return;const p=point(e),moved=drag.moved;drag=null;canvas.classList.remove('dragging');if(!moved){const x=(p.x-cx)/(R*zoom),y=(cy-p.y)/(R*zoom),rr=x*x+y*y;if(rr<=1){const z=Math.sqrt(1-rr),sp=Math.sin(pitch),cp=Math.cos(pitch),lat=Math.asin(y*cp+z*sp),lon=Math.atan2(x,z*cp-y*sp)-yaw;choose('Ubicación elegida',lat*180/Math.PI,((lon*180/Math.PI+540)%360)-180);}}});
    canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.72,Math.min(1.65,zoom+(e.deltaY<0?.08:-.08)));draw();},{passive:false});
    draw();
  })();

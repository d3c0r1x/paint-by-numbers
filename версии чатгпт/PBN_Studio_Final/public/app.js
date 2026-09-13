const $ = (s, root=document) => root.querySelector(s)
const $$ = (s, root=document) => [...root.querySelectorAll(s)]
const api = async (url, options={}) => {
  const r = await fetch(url, {headers:{'Content-Type':'application/json', ...(options.headers||{})}, credentials:'same-origin', ...options})
  const data = await r.json().catch(()=>({}))
  if (!r.ok) throw Object.assign(new Error(data.error || 'Request failed'), {status:r.status, data})
  return data
}
const state = {
  user:null, route:'home', catalog:[], projects:[], history:[], activeProject:null,
  filters:{query:'',category:'All'}, selectedColor:0, tool:'assist', zoom:1, focus:false,
  generating:false, favoriteOnly:false, authMode:'login', modal:null, message:null,
  lang: localStorage.getItem('pbn_lang') || 'ru',
  showReference:false,
}

const I18N = {
  "Discover":"Обзор","Language":"Язык","Easy":"Легко","Medium":"Средне","Hard":"Сложно","Nature":"Природа","Animals":"Животные","Flowers":"Цветы","Travel":"Путешествия","Architecture":"Архитектура","Portraits":"Портреты","All":"Все","region fill":"заполнение области","project created":"создание проекта","project completed":"завершение проекта","brush stroke":"мазок кистью","painted with smart brush":"рисование умной кистью","Search the gallery…":"Поиск по каталогу…","Delete this painting and its history?":"Удалить картину и её историю?","Started a new painting":"Начата новая картина","Finished a masterpiece":"Завершена картина","Studio could not start":"Не удалось запустить Studio","Request failed":"Запрос не выполнен","Language":"Язык","Session cookies are HttpOnly.":"Сессионные cookie защищены флагом HttpOnly." ,"Passwords are stored as secure scrypt hashes. Session cookies are HttpOnly.":"Пароли хранятся в виде защищённых scrypt-хешей. Сессии используют HttpOnly-cookie.","Open painting":"Открыть картину","Member since":"Участник с","minutes":"минут","colors":"цветов","areas":"областей","My paintings":"Мои картины","Collections":"Коллекции","History":"История","Sign in":"Войти","Profile":"Профиль",
  "paint by numbers":"картина по номерам","A creative space for slow painting":"Пространство для спокойного творчества","Turn a moment into":"Преврати момент в",
  "a masterpiece.":"шедевр.","Discover ready-made paintings by number, or transform your own photo into a printable, perfectly segmented artwork.":"Выбирай готовые картины по номерам или преврати своё фото в красивый шаблон для печати и раскрашивания.",
  "Explore gallery":"Открыть каталог","Create from photo":"Создать из фото","Smart regions":"Умные области","Pencil-friendly":"Удобно рисовать","Auto-saved":"Автосохранение",
  "Editor's pick":"Выбор редакции","Today’s painting":"Картина дня","Pick up where you left off":"Продолжить с места остановки","Continue painting":"Продолжить раскрашивание","See all →":"Смотреть всё →",
  "Completed":"Завершено","In progress":"В процессе","painted":"раскрашено","Curated gallery":"Избранная галерея","Featured for you":"Рекомендуем вам","View gallery →":"Открыть каталог →",
  "Explore":"Исследуйте","Choose your mood":"Выберите настроение","All":"Все","Favorites":"Избранное","Search paintings, animals, places…":"Поиск картин, животных, мест…",
  "Your photo, your painting":"Ваше фото — ваша картина","Make a one-of-a-kind piece.":"Создайте уникальную работу.","Upload a photo":"Загрузить фото","The Studio collection":"Коллекция Studio",
  "Find something":"Найдите то, что",
  "worth painting.":"хочется раскрасить.","Curated scenes designed to feel great from the first number to the final brushstroke.":"Подобранные сюжеты, которыми приятно заниматься от первого номера до последнего мазка.",
  "New painting":"Новая картина","Your studio":"Ваша студия","Everything you’ve started, finished and saved lives here.":"Здесь находятся все начатые, завершённые и сохранённые картины.",
  "Continue":"Продолжить","Nothing on the easel yet":"На мольберте пока пусто","Create a painting from your own photo or choose one from the gallery.":"Создайте картину из своего фото или выберите работу из каталога.",
  "Browse gallery":"Открыть каталог","Finished":"Завершено","Masterpieces":"Шедевры","Your wall is waiting":"Ваша галерея ждёт","Finish your first painting to see it here.":"Завершите первую картину, чтобы увидеть её здесь.",
  "Personal shelf":"Личная полка","Keep future projects close. Favorite anything you want to paint later.":"Сохраняйте интересные работы, чтобы вернуться к ним позже.","Favorite paintings":"Избранные картины","Make your first favorite":"Добавьте первую работу в избранное","Tap the heart on any painting in the gallery.":"Нажмите на сердечко у понравившейся картины.",
  "Your creative timeline":"Ваша творческая история","Small sessions add up to beautiful things.":"Небольшие сеансы складываются в красивые результаты.","finished":"завершено","minutes tracked":"минут","creative streak":"серия дней","Recent activity":"Последняя активность","Timeline":"История действий",
  "Your story starts with a brushstroke":"Ваша история начинается с первого мазка","Start a painting and your sessions will appear here.":"Начните раскрашивать, и здесь появится история ваших сеансов.","Start painting":"Начать раскрашивание",
  "Artist profile":"Профиль художника","today":"сегодня","Sign out":"Выйти","Studio stats":"Статистика студии","Little numbers":"Немного цифр","paintings":"картин","completed":"завершено","from photos":"из фото",
  "Your promise":"Ваш принцип","Make time to make art.":"Находите время для творчества.","The point is not to finish quickly. The point is to enjoy every color.":"Важно не закончить быстрее. Важно наслаждаться каждым цветом.","Create something new →":"Создать новое →",
  "Your photo":"Ваше фото","Studio collection":"Коллекция Studio","Smart":"Умный режим","Brush":"Кисть","Fill":"Заливка","Fit":"По размеру","Guide":"Подсказка","Color assistant":"Помощник по цветам","Choose a number":"Выберите номер",
  "Find all":"Найти все","Highlight every area that still needs this color.":"Подсветить все области, которым нужен этот цвет.","On":"Вкл","Off":"Выкл","Progress":"Прогресс","areas remaining · autosaved":"областей осталось · сохранено",
  "Reference":"Референс","Template":"Шаблон","Focus mode":"Режим фокуса","Export":"Экспорт","No painting selected":"Картина не выбрана","Back to gallery":"Вернуться в каталог",
  "Welcome back":"С возвращением","Start your studio":"Создайте свою студию","Your next painting is waiting.":"Ваша следующая картина уже ждёт.","Create your artist account.":"Создайте аккаунт художника.",
  "Save progress, keep your favorites and pick up any painting on another day.":"Сохраняйте прогресс, избранное и продолжайте в любой день.","Register in seconds. Your paintings, progress and history stay yours.":"Регистрация занимает секунды. Картины, прогресс и история остаются с вами.",
  "Username":"Имя пользователя","Password":"Пароль","Repeat password":"Повторите пароль","Create account":"Создать аккаунт","New to Studio?":"Впервые в Studio?","Already have an account?":"Уже есть аккаунт?","e.g. alex.studio":"например, alex.studio","8+ characters":"8+ символов",
  "Passwords do not match.":"Пароли не совпадают.","That username is already taken.":"Это имя пользователя уже занято.","Use at least 8 characters.":"Используйте минимум 8 символов.","Use 3–24 letters, numbers, dot, dash or underscore.":"Используйте 3–24 буквы, цифры, точку, дефис или подчёркивание.","Username or password is incorrect.":"Неверное имя пользователя или пароль.","Could not complete sign in.":"Не удалось выполнить вход.",
  "Create from photo":"Создать из фото","Make your own painting.":"Создайте свою картину.","Choose the image, tune the detail, then let the Studio engine build the regions and palette.":"Выберите изображение, настройте детализацию — Studio построит области, палитру и номера.","Drop a photo here":"Перетащите фото сюда","or":"или","choose a file":"выберите файл","up to 12 MB":"до 12 МБ","Detail":"Детализация","Balanced":"Сбалансированная","Simplified":"Упрощённая","Detailed":"Детальная","Colors":"Цвета","Contour":"Контур","Clean":"Чистый","Studio suggestion":"Рекомендация Studio","Balanced detail + 24 colors is a great starting point for portraits, pets and travel photos.":"Для портретов, животных и путешествий хорошо начать со сбалансированной детализации и 24 цветов.","Generate my painting":"Создать картину",
  "Building your painting":"Создаём картину","Finding the right":"Ищем подходящие","shapes & colors.":"формы и цвета.","Analyzing photo":"Анализируем фото","Balancing palette":"Балансируем палитру","Building regions":"Создаём области","Refining shapes":"Уточняем формы","Smoothing contours":"Сглаживаем контуры","Placing numbers":"Расставляем номера","Finishing":"Завершаем",
  "Search":"Поиск","View result":"Посмотреть результат","Continue":"Продолжить","Completed":"Завершено","In progress":"В процессе","Welcome to Studio!":"Добро пожаловать в Studio!","Welcome back!":"С возвращением!","Shared!":"Готово к отправке!","Share text copied to clipboard":"Текст для отправки скопирован","Template exported as PNG":"Шаблон экспортирован в PNG","Masterpiece complete ✦":"Шедевр завершён ✦"
}
function trText(text){return state.lang==='ru' ? (I18N[text] || text) : text}
function trDynamic(text){
  if(state.lang!=='ru') return text
  return String(text)
    .replace(/Create from photo/g,'Создать из фото').replace(/Open painting/g,'Открыть картину').replace(/(\d+) colors/g,'$1 цветов').replace(/(\d+) areas/g,'$1 областей').replace(/(\d+) regions/g,'$1 областей').replace(/(\d+) min/g,'$1 мин')
    .replace(/(\d+)% complete/g,'$1% завершено').replace(/(\d+) areas remaining/g,'$1 областей осталось')
    .replace(/updated /g,'обновлено ').replace(/ just now/g,'только что')
}
function localizeDom(root=document){
  if(state.lang!=='ru') return
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT)
  const nodes=[]; let n; while(n=walker.nextNode()) nodes.push(n)
  for(const node of nodes){ const v=node.nodeValue?.trim(); if(!v) continue; const t=trDynamic(v); if(t!==v) node.nodeValue=node.nodeValue.replace(v,t); else if(I18N[v]) node.nodeValue=node.nodeValue.replace(v,I18N[v]) }
  $$('input,button,[title],[aria-label]',root).forEach(el=>{
    if(el.placeholder && I18N[el.placeholder]) el.placeholder=I18N[el.placeholder]
    if(el.title && I18N[el.title]) el.title=I18N[el.title]
    if(el.getAttribute('aria-label') && I18N[el.getAttribute('aria-label')]) el.setAttribute('aria-label',I18N[el.getAttribute('aria-label')])
  })
}
function setLang(lang){ state.lang=lang;localStorage.setItem('pbn_lang',lang);render() }

const icons = {
  search:'⌕', heart:'♡', heartFill:'♥', user:'◉', plus:'＋', play:'▶', back:'‹', check:'✓', spark:'✦',
  wand:'✧', brush:'✎', fill:'◈', eye:'◌', undo:'↶', redo:'↷', download:'⇩', share:'↗', settings:'⚙', clock:'◷',
  folder:'▣', grid:'▦', target:'◎', lock:'⌘', flame:'♨', trophy:'♜', menu:'☰', close:'×'
}
const difficultyClass = d => d==='Easy'?'easy':d==='Hard'?'hard':'medium'
const escapeHtml = s => String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))
const colorFrom = h => h || '#999'

function toast(message, kind='ok') {
  state.message = {message,kind}; renderToast(); setTimeout(()=>{ if(state.message?.message===message){state.message=null;renderToast()} },2600)
}
function renderToast(){
  let t=$('#toast'); if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}
  t.className=`toast ${state.message?.kind||''}`; t.textContent=state.message?.message||''; t.style.display=state.message?'block':'none'
}

function authChip(){
  return state.user
    ? `<button class="avatar-chip" data-action="profile"><span class="avatar">${escapeHtml(state.user.username[0].toUpperCase())}</span><span>${escapeHtml(state.user.username)}</span><span class="chev">⌄</span></button>`
    : `<button class="btn btn-dark compact" data-action="open-login">Sign in</button>`
}
function header(active='home'){
 return `<header class="topbar"><div class="brand" data-route="home"><div class="brand-mark">PBN</div><div><b>Studio</b><span>paint by numbers</span></div></div><nav class="nav"><button class="nav-link ${active==='home'?'active':''}" data-route="home">Discover</button><button class="nav-link ${active==='projects'?'active':''}" data-route="projects">My paintings</button><button class="nav-link ${active==='collections'?'active':''}" data-route="collections">Collections</button><button class="nav-link ${active==='history'?'active':''}" data-route="history">History</button></nav><div class="top-actions"><button class="icon-btn" data-action="search" aria-label="Search">${icons.search}</button><select id="lang-select" class="lang-select" aria-label="Language"><option value="en" ${state.lang==='en'?'selected':''}>EN</option><option value="ru" ${state.lang==='ru'?'selected':''}>RU</option></select>${authChip()}</div></header>`
}

function pageHome(){
  const featured = state.catalog.filter(x=>x.featured).slice(0,4)
  const categories = ['All',...new Set(state.catalog.map(x=>x.category))]
  const items = state.catalog.filter(x=>{
    const q=state.filters.query.toLowerCase(); const cat=state.filters.category
    return (!q || (x.title+x.category+x.tags.join(' ')).toLowerCase().includes(q)) && (cat==='All'||x.category===cat) && (!state.favoriteOnly || x.favorite)
  })
  const continueProject = state.projects.find(p=>!p.completed) || state.projects[0]
  return `<div class="shell">${header('home')}
    <section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="eyebrow-dot"></span> A creative space for slow painting</div><h1>Turn a moment into<br><em>a masterpiece.</em></h1><p>Discover ready-made paintings by number, or transform your own photo into a printable, perfectly segmented artwork.</p><div class="hero-actions"><button class="btn btn-dark" data-route="catalog">Explore gallery <span>→</span></button><button class="btn btn-soft" data-action="create-photo">${icons.spark} Create from photo</button></div><div class="hero-proof"><span>✦</span> Smart regions <span>·</span> Pencil-friendly <span>·</span> Auto-saved</div></div><div class="hero-art"><div class="hero-frame"><div class="hero-badge"><b>Editor's pick</b><span>${featured[0]?.colors||0} colors · ${featured[0]?.regions||0} regions</span></div><img src="${escapeHtml(featured[0]?.previewUrl||('data:image/svg+xml,'+encodeURIComponent(featured[0]?.previewSvg||svgFallback('aurora'))))}" alt="Featured artwork"><div class="hero-caption"><div><span>Today’s painting</span><strong>${escapeHtml(featured[0]?.title||'Aurora Lake')}</strong></div><button class="round-btn" data-action="open-catalog" data-id="${featured[0]?.id||'aurora'}">${icons.play}</button></div></div></div></section>
    ${continueProject ? `<section class="section"><div class="section-head"><div><div class="section-kicker">Pick up where you left off</div><h2>Continue painting</h2></div><button class="text-btn" data-route="projects">See all →</button></div><div class="continue-card"><div class="mini-art" id="continue-preview"></div><div class="continue-meta"><div class="badge-soft">${continueProject.completed?'Completed':'In progress'}</div><h3>${escapeHtml(continueProject.title)}</h3><p>${continueProject.progress.toFixed(0)}% complete · updated ${timeAgo(continueProject.updatedAt)}</p><div class="progress"><span style="width:${Math.min(100,continueProject.progress)}%"></span></div><button class="btn btn-dark" data-action="open-project" data-id="${continueProject.id}">${continueProject.completed?'View result':'Continue' } <span>→</span></button></div><div class="continue-stat"><strong>${Math.round(continueProject.progress)}%</strong><span>painted</span></div></div></section>`:''}
    <section class="section" id="catalog"><div class="section-head"><div><div class="section-kicker">Curated gallery</div><h2>Featured for you</h2></div><button class="text-btn" data-route="catalog">View gallery →</button></div><div class="art-grid">${featured.map(cardHtml).join('')}</div></section>
    <section class="section"><div class="section-head"><div><div class="section-kicker">Explore</div><h2>Choose your mood</h2></div></div><div class="chips">${categories.map(c=>`<button class="chip ${state.filters.category===c?'active':''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div><div class="toolbar"><div class="searchbox"><span>${icons.search}</span><input id="search-input" value="${escapeHtml(state.filters.query)}" placeholder="Search paintings, animals, places…"></div><button class="chip-icon ${state.favoriteOnly?'active':''}" data-action="favorite-only">${icons.heart} Favorites</button></div><div class="art-grid wide">${items.map(cardHtml).join('')}</div></section>
    <section class="create-strip"><div><div class="eyebrow light"><span class="eyebrow-dot"></span> Your photo, your painting</div><h2>Make a one-of-a-kind piece.</h2><p>Upload a photo and let Studio build the regions, palette and numbers for you.</p></div><button class="btn btn-white" data-action="create-photo">Upload a photo <span>→</span></button></section>
  </div>`
}
function cardHtml(x){
  return `<article class="art-card" data-id="${x.id}" data-action="open-catalog"><div class="art-thumb"><img src="${escapeHtml(x.previewUrl||('data:image/svg+xml,'+encodeURIComponent(x.previewSvg)))}" alt="${escapeHtml(x.title)}"><button class="heart-mini ${x.favorite?'on':''}" data-action="toggle-favorite" data-id="${x.id}">${x.favorite?icons.heartFill:icons.heart}</button><div class="art-pill">${escapeHtml(x.difficulty)}</div><div class="art-hover">Open painting ${icons.arrow||'→'}</div></div><div class="art-copy"><div class="art-title"><h3>${escapeHtml(x.title)}</h3><span>${escapeHtml(x.category)}</span></div><div class="art-meta"><span>${x.colors} colors</span><span>·</span><span>${x.regions} areas</span><span>·</span><span>≈ ${x.minutes} min</span></div></div></article>`
}
function pageCatalog(){
  const items=state.catalog.filter(x=>{const q=state.filters.query.toLowerCase();return(!q||(x.title+x.category+x.tags.join(' ')).toLowerCase().includes(q))&&(state.filters.category==='All'||x.category===state.filters.category)})
  const cats=['All',...new Set(state.catalog.map(x=>x.category))]
  return `<div class="shell">${header('home')}<section class="page-head"><div><div class="section-kicker">The Studio collection</div><h1>Find something<br><em>worth painting.</em></h1><p>Curated scenes designed to feel great from the first number to the final brushstroke.</p></div><button class="btn btn-dark" data-action="create-photo">${icons.plus} Create from photo</button></section><div class="toolbar large"><div class="searchbox"><span>${icons.search}</span><input id="search-input" value="${escapeHtml(state.filters.query)}" placeholder="Search the gallery…"></div><div class="chips">${cats.map(c=>`<button class="chip ${state.filters.category===c?'active':''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div></div><div class="art-grid catalog-grid">${items.map(cardHtml).join('')}</div></div>`
}
function pageProjects(){
 const active=state.projects.filter(p=>!p.completed), done=state.projects.filter(p=>p.completed)
 return `<div class="shell">${header('projects')}<section class="page-head compact-head"><div><div class="section-kicker">Your studio</div><h1>My paintings</h1><p>Everything you’ve started, finished and saved lives here.</p></div><button class="btn btn-dark" data-action="create-photo">${icons.plus} New painting</button></section><div class="dash-grid"><div class="panel"><div class="panel-head"><div><span class="section-kicker">Continue</span><h2>In progress</h2></div><span class="count-badge">${active.length}</span></div>${active.length?`<div class="project-list">${active.map(projectRow).join('')}</div>`:`<div class="empty"><div class="empty-icon">${icons.brush}</div><h3>Nothing on the easel yet</h3><p>Create a painting from your own photo or choose one from the gallery.</p><button class="btn btn-dark" data-route="catalog">Browse gallery</button></div>`}</div><div class="panel"><div class="panel-head"><div><span class="section-kicker">Finished</span><h2>Masterpieces</h2></div><span class="count-badge">${done.length}</span></div>${done.length?`<div class="project-list">${done.map(projectRow).join('')}</div>`:`<div class="empty slim"><div class="empty-icon">✦</div><h3>Your wall is waiting</h3><p>Finish your first painting to see it here.</p></div>`}</div></div></div>`
}
function projectRow(p){return `<div class="project-row"><div class="project-visual"><div class="project-placeholder">${p.completed?'✓':'○'}</div></div><div class="project-info"><div class="badge-soft">${p.completed?'Completed':'In progress'}</div><h3>${escapeHtml(p.title)}</h3><p>${p.progress.toFixed(0)}% · ${timeAgo(p.updatedAt)}</p><div class="progress thin"><span style="width:${Math.min(100,p.progress)}%"></span></div></div><button class="round-btn dark" data-action="open-project" data-id="${p.id}">${p.completed?'↗':'→'}</button><button class="icon-btn subtle" data-action="delete-project" data-id="${p.id}">×</button></div>`}
function pageCollections(){
 const fav=state.catalog.filter(x=>x.favorite)
 return `<div class="shell">${header('collections')}<section class="page-head compact-head"><div><div class="section-kicker">Personal shelf</div><h1>Collections</h1><p>Keep future projects close. Favorite anything you want to paint later.</p></div></section><div class="collection-hero"><div><span class="section-kicker">Favorites</span><h2>${fav.length} paintings saved</h2><p>Your quiet queue of things you want to make.</p></div><div class="collection-stack">${fav.slice(0,3).map((x,i)=>`<img style="--i:${i}" src="data:image/svg+xml,${encodeURIComponent(x.previewSvg)}" alt="">`).join('') || '<div class="stack-empty">♡</div>'}</div></div><section class="section"><div class="section-head"><h2>Favorite paintings</h2></div><div class="art-grid">${fav.map(cardHtml).join('')||`<div class="empty full"><div class="empty-icon">♡</div><h3>Make your first favorite</h3><p>Tap the heart on any painting in the gallery.</p><button class="btn btn-dark" data-route="catalog">Explore gallery</button></div>`}</div></section></div>`
}
function pageHistory(){
 const total=state.projects.reduce((n,p)=>n+(p.completed?1:0),0); const mins=state.history.reduce((n,e)=>n+(e.payload?.durationMin||0),0)
 return `<div class="shell">${header('history')}<section class="page-head compact-head"><div><div class="section-kicker">Your creative timeline</div><h1>History</h1><p>Small sessions add up to beautiful things.</p></div></section><div class="stats-row"><div class="stat-card"><span>${icons.trophy}</span><strong>${total}</strong><label>finished</label></div><div class="stat-card"><span>${icons.clock}</span><strong>${Math.round(mins||0)}</strong><label>minutes tracked</label></div><div class="stat-card"><span>${icons.flame}</span><strong>${state.projects.length?Math.min(30,state.projects.length+2):0}</strong><label>creative streak</label></div><div class="stat-card"><span>${icons.spark}</span><strong>${state.catalog.filter(x=>x.favorite).length}</strong><label>favorites</label></div></div><div class="panel timeline-panel"><div class="panel-head"><div><span class="section-kicker">Recent activity</span><h2>Timeline</h2></div></div>${state.history.length?`<div class="timeline">${state.history.map(e=>`<div class="timeline-item"><div class="timeline-dot"></div><div><strong>${eventTitle(e)}</strong><p>${new Date(e.createdAt).toLocaleString()}</p></div><span class="timeline-pill">${e.action.replaceAll('_',' ')}</span></div>`).join('')}</div>`:`<div class="empty"><div class="empty-icon">◷</div><h3>Your story starts with a brushstroke</h3><p>Start a painting and your sessions will appear here.</p><button class="btn btn-dark" data-route="catalog">Start painting</button></div>`}</div></div>`
}
function pageProfile(){return `<div class="shell">${header()}<section class="profile-hero"><div class="profile-avatar">${escapeHtml((state.user?.username||'G')[0].toUpperCase())}</div><div><div class="section-kicker">Artist profile</div><h1>${escapeHtml(state.user?.username||'Guest')}</h1><p>Member since ${state.user?new Date().toLocaleDateString(undefined,{month:'long',year:'numeric'}):'today'}</p></div><button class="btn btn-soft" data-action="logout">Sign out</button></section><div class="dash-grid"><div class="panel"><div class="panel-head"><div><span class="section-kicker">Studio stats</span><h2>Little numbers</h2></div></div><div class="profile-stat-grid"><div><strong>${state.projects.length}</strong><span>paintings</span></div><div><strong>${state.projects.filter(p=>p.completed).length}</strong><span>completed</span></div><div><strong>${state.catalog.filter(x=>x.favorite).length}</strong><span>favorites</span></div><div><strong>${state.projects.filter(p=>p.sourceKind==='photo').length}</strong><span>from photos</span></div></div></div><div class="panel"><div class="panel-head"><div><span class="section-kicker">Your promise</span><h2>Make time to make art.</h2></div></div><p class="quote">“The point is not to finish quickly. The point is to enjoy every color.”</p><button class="btn btn-dark" data-action="create-photo">Create something new →</button></div></div></div>`}
function pageEditor(){
 const p=state.activeProject?.project
 if(!p) return `<div class="editor-shell"><div class="empty"><h3>No painting selected</h3><button class="btn btn-dark" data-route="home">Back to gallery</button></div></div>`
 const t=p.template, pal=t.palette||[], remaining=countRemaining(p)
  return `<div class="editor"><div class="editor-top"><button class="back-btn" data-route="projects">${icons.back}</button><div class="editor-title"><span>${p.sourceKind==='photo'?'Your photo':'Studio collection'}</span><strong>${escapeHtml(p.title)}</strong></div><div class="editor-actions"><button class="icon-btn" data-action="undo" ${!state.activeProject.undo?.length?'disabled':''}>${icons.undo}</button><button class="icon-btn" data-action="redo" ${!state.activeProject.redo?.length?'disabled':''}>${icons.redo}</button><button class="icon-btn" data-action="toggle-focus" title="Focus mode">${icons.eye}</button><button class="icon-btn ${state.showReference?'active':''}" data-action="reference" title="Reference">${icons.eye}</button><button class="icon-btn" data-action="share">${icons.share}</button><button class="btn btn-dark compact" data-action="export">Export</button></div></div><div class="editor-body ${state.focus?'focus':''}"><aside class="toolrail"><button class="tool-btn ${state.selectedTool==='assist'||state.tool==='assist'?'active':''}" data-tool="assist"><span>${icons.wand}</span><label>Smart</label></button><button class="tool-btn ${state.tool==='brush'?'active':''}" data-tool="brush"><span>${icons.brush}</span><label>Brush</label></button><button class="tool-btn ${state.tool==='fill'?'active':''}" data-tool="fill"><span>${icons.fill}</span><label>Fill</label></button><div class="tool-spacer"></div><button class="tool-btn" data-action="fit"><span>${icons.target}</span><label>Fit</label></button><button class="tool-btn" data-action="reference"><span>${icons.eye}</span><label>Reference</label></button><button class="tool-btn" data-action="focus-help"><span>?</span><label>Guide</label></button></aside><main class="canvas-wrap"><div class="canvas-stage" id="stage"><canvas id="base-canvas"></canvas><canvas id="paint-canvas"></canvas><canvas id="line-canvas"></canvas><canvas id="fx-canvas"></canvas><div class="mini-map" id="mini-map"></div></div><div class="canvas-hud"><button class="hud-btn" data-action="zoom-out">−</button><span id="zoom-label">${Math.round(state.zoom*100)}%</span><button class="hud-btn" data-action="zoom-in">＋</button><button class="hud-btn" data-action="fit">Fit</button></div>${state.focus?'<div class="focus-hint">Focus mode · press F or click Eye to exit</div>':''}</main><aside class="palette-panel"><div class="palette-top"><div><span class="section-kicker">Color assistant</span><h2>Choose a number</h2></div><span class="remaining">${remaining}<small> left</small></span></div><div class="selected-color" id="selected-color"></div><div class="palette-list" id="palette-list">${pal.map((c,i)=>`<button class="palette-item ${state.selectedColor===i?'active':''}" data-color="${i}"><span class="swatch" style="background:${colorFrom(c.hex)}"></span><b>${symbol(i)}</b><span>${c.hex}</span><em>${regionCountForColor(t,i)}</em></button>`).join('')}</div><div class="assistant-card"><div class="assistant-icon">${icons.spark}</div><div><strong>Find all ${symbol(state.selectedColor)}</strong><p>Highlight every area that still needs this color.</p></div><button class="toggle ${state.highlight?'on':''}" id="highlight-toggle" data-action="highlight">${state.highlight?'On':'Off'}</button></div><div class="progress-block"><div><span>Progress</span><strong>${p.progress.toFixed(0)}%</strong></div><div class="progress"><span style="width:${p.progress}%"></span></div><small>${remaining} areas remaining · autosaved</small></div></aside></div></div>`
}
function renderAuth(){
 if(!state.modal) return ''
 return `<div class="modal-backdrop" data-action="close-modal"><div class="auth-modal" data-stop-click="1"><button class="modal-close" data-action="close-modal">${icons.close}</button><div class="auth-mark">PBN</div><div class="eyebrow">${state.authMode==='login'?'Welcome back':'Start your studio'}</div><h2>${state.authMode==='login'?'Your next painting is waiting.':'Create your artist account.'}</h2><p>${state.authMode==='login'?'Save progress, keep your favorites and pick up any painting on another day.':'Register in seconds. Your paintings, progress and history stay yours.'}</p><form id="auth-form"><label>Username<input name="username" autocomplete="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.-]+" placeholder="e.g. alex.studio"></label><label>Password<input name="password" type="password" autocomplete="${state.authMode==='login'?'current-password':'new-password'}" required minlength="8" placeholder="8+ characters"></label>${state.authMode==='register'?'<label>Repeat password<input name="confirm" type="password" required minlength="8" placeholder="Repeat password"></label>':''}<div class="auth-error" id="auth-error"></div><button class="btn btn-dark full-btn" type="submit">${state.authMode==='login'?'Sign in':'Create account'} <span>→</span></button></form><div class="auth-switch">${state.authMode==='login'?'New to Studio?':'Already have an account?'} <button type="button" data-action="toggle-auth">${state.authMode==='login'?'Create account':'Sign in'}</button></div><div class="auth-note">🔒 Passwords are stored as secure scrypt hashes. Session cookies are HttpOnly.</div></div></div>`
}
function render(){
 const app=$('#app')
 let html = state.route==='home'?pageHome():state.route==='catalog'?pageCatalog():state.route==='projects'?pageProjects():state.route==='collections'?pageCollections():state.route==='history'?pageHistory():state.route==='profile'?pageProfile():state.route==='editor'?pageEditor():pageHome()
 app.innerHTML = html + renderAuth()
 renderToast()
 if(state.route==='editor') requestAnimationFrame(()=>drawEditor())
 if(state.route==='home' && state.projects[0]) requestAnimationFrame(()=>renderContinuePreview())
 bind()
 localizeDom(document)
}

function bind(){
 $$('.brand,[data-route]', $('#app')).forEach(el=>el.onclick=()=>{const r=el.dataset.route;if(r) navigate(r)})
 $$('[data-action]', $('#app')).forEach(el=>{
  if(el.classList.contains('art-card')) return
  el.addEventListener('click', async e=>{
    if(el.classList.contains('modal-backdrop') && e.target!==el) return
    if(e.target.closest?.('[data-action="toggle-favorite"]')) return
    e.stopPropagation(); await action(el.dataset.action,el)
  })
 })
 $$('[data-category]', $('#app')).forEach(el=>el.onclick=()=>{state.filters.category=el.dataset.category; render()})
 const si=$('#search-input'); if(si) si.oninput=e=>{state.filters.query=e.target.value; if(state.route==='home'||state.route==='catalog') render()}
 $$('.art-card', $('#app')).forEach(el=>el.onclick=(e)=>{ if(e.target.closest('[data-action="toggle-favorite"]')) return; openCatalog(el.dataset.id) })
 const form=$('#auth-form'); if(form) form.onsubmit=handleAuth
 const backdrop=$('.modal-backdrop'); if(backdrop) backdrop.onclick=e=>{if(e.target===backdrop) state.modal=null,render()}
 const lang=$('#lang-select'); if(lang) lang.onchange=e=>setLang(e.target.value)
}
async function action(a,el){
 switch(a){
  case 'open-login': state.authMode='login'; state.modal='auth'; return render()
  case 'toggle-auth': state.authMode=state.authMode==='login'?'register':'login'; return render()
  case 'close-modal': state.modal=null; return render()
  case 'logout': await api('/api/auth/logout',{method:'POST'}); state.user=null; state.projects=[]; state.route='home'; await loadCatalog(); return render()
  case 'profile': return navigate('profile')
  case 'create-photo': return requireAuth(()=>openGenerator())
  case 'open-catalog': return openCatalog(el.dataset.id)
  case 'toggle-favorite': return requireAuth(async()=>{const r=await api(`/api/catalog/${el.dataset.id}/favorite`,{method:'POST'});const x=state.catalog.find(i=>i.id===el.dataset.id);if(x)x.favorite=r.favorite;render()})
  case 'favorite-only': state.favoriteOnly=!state.favoriteOnly; return render()
  case 'open-project': return requireAuth(()=>openProject(el.dataset.id))
  case 'delete-project': return requireAuth(async()=>{if(confirm('Delete this painting and its history?')){await api(`/api/projects/${el.dataset.id}`,{method:'DELETE'});await loadProjects();render()}})
  case 'undo': return editorUndo()
  case 'redo': return editorRedo()
  case 'share': return sharePainting()
  case 'export': return exportPainting()
  case 'zoom-in': state.zoom=Math.min(4,state.zoom*1.15); return applyZoom()
  case 'zoom-out': state.zoom=Math.max(.5,state.zoom/1.15); return applyZoom()
  case 'fit': state.zoom=1; return applyZoom()
  case 'toggle-focus': state.focus=!state.focus; return render()
  case 'reference': state.showReference=!state.showReference; return render()
  case 'highlight': state.highlight=!state.highlight; return drawEditor()
  case 'focus-help': toast(state.lang==='ru'?'Умный режим ограничивает мазок выбранной областью. Для перемещения используйте Alt+drag.':'Smart mode clips strokes to the selected region. Two fingers or Alt+drag pans the canvas.'); return
  case 'search': $('#search-input')?.focus(); return
 }
 if(el.dataset.tool){ state.tool=el.dataset.tool; render() }
 if(el.dataset.color!==undefined){state.selectedColor=Number(el.dataset.color); state.highlight=false; drawEditor();$('.palette-list .active')?.classList.remove('active');el.classList.add('active');updateSelectedColor()}
}
function requireAuth(fn){if(!state.user){state.modal='auth';state.authMode='login';render();toast(state.lang==='ru'?'Войдите, чтобы сохранять и раскрашивать свои проекты':'Sign in to save and paint your own projects','info');return} return fn()}
function navigate(r){state.route=r;state.modal=null;render()}

async function handleAuth(e){e.preventDefault();const form=new FormData(e.target);const username=String(form.get('username')||'').trim();const password=String(form.get('password')||'');const confirm=String(form.get('confirm')||'');const err=$('#auth-error');err.textContent='';
 if(state.authMode==='register'&&password!==confirm){err.textContent=trText('Passwords do not match.');return}
 try{const data=await api(`/api/auth/${state.authMode==='register'?'register':'login'}`,{method:'POST',body:JSON.stringify({username,password})});state.user=data.user;state.modal=null;await loadProjects();render();toast(state.authMode==='register'?'Welcome to Studio!':'Welcome back!')}catch(e){err.textContent=trText(({USERNAME_TAKEN:'That username is already taken.',WEAK_PASSWORD:'Use at least 8 characters.',INVALID_USERNAME:'Use 3–24 letters, numbers, dot, dash or underscore.',BAD_CREDENTIALS:'Username or password is incorrect.'}[e.message]||'Could not complete sign in.'))} }

function openCatalog(id){
 const x=state.catalog.find(i=>i.id===id); if(!x) return; state.showReference=false; state.activeProject={catalog:x,project:{id:null,title:x.title,sourceKind:'catalog',template:{...x.template,previewSvg:x.previewSvg,catalogId:x.id},state:{filled:[],events:[]},progress:0},undo:[],redo:[]}; state.route='editor';render()
}
async function openProject(id){const r=await api(`/api/projects/${id}`);state.showReference=false;state.activeProject={project:r.project,undo:[],redo:[]};state.route='editor';state.selectedColor=0;render();await loadHistory(id);}

function openGenerator(){
 state.modal='generator'; renderGeneratorModal()
}
function renderGeneratorModal(){
 const old=$('.modal-backdrop'); if(old) old.remove();
 const el=document.createElement('div'); el.className='modal-backdrop'; el.innerHTML=`<div class="gen-modal"><button class="modal-close" data-close>×</button><div class="gen-head"><div><div class="section-kicker">Create from photo</div><h2>Make your own painting.</h2><p>Choose the image, tune the detail, then let the Studio engine build the regions and palette.</p></div><div class="gen-orb">✦</div></div><div class="dropzone" id="dropzone"><input id="photo-input" type="file" accept="image/*" hidden><div class="upload-icon">＋</div><h3>Drop a photo here</h3><p>or <button class="link-btn" id="pick-photo">choose a file</button> · JPG, PNG, WEBP up to 12 MB</p><div id="file-name" class="file-name"></div></div><div class="gen-options"><label><span>Detail</span><strong id="detail-value">Balanced</strong><input id="detail" type="range" min="0" max="100" value="58"></label><label><span>Colors</span><strong id="color-value">24</strong><input id="colors" type="range" min="8" max="36" value="24"></label><label><span>Contour</span><strong>Clean</strong><input id="contour" type="range" min="0" max="100" value="55"></label></div><div class="gen-tip"><span>${icons.spark}</span><div><strong>Studio suggestion</strong><p>Balanced detail + 24 colors is a great starting point for portraits, pets and travel photos.</p></div></div><button class="btn btn-dark full-btn" id="generate-btn" disabled>Generate my painting <span>→</span></button></div>`;document.body.appendChild(el); localizeDom(el)
 const close=el.querySelector('[data-close]');close.onclick=()=>el.remove();el.onclick=e=>{if(e.target===el)el.remove()}
 const input=$('#photo-input',el), drop=$('#dropzone',el), pick=$('#pick-photo',el), name=$('#file-name',el)
 pick.onclick=()=>input.click();drop.onclick=e=>{if(e.target.closest('button'))return;input.click()}; input.onchange=()=>loadFile(input.files[0])
 ;['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')}));['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')}));drop.addEventListener('drop',e=>loadFile(e.dataTransfer.files[0]))
 $('#detail',el).oninput=e=>$('#detail-value',el).textContent=e.target.value<35?'Simplified':e.target.value<70?'Balanced':'Detailed'
 $('#colors',el).oninput=e=>$('#color-value',el).textContent=e.target.value
 let file=null
 function loadFile(f){if(!f||!f.type.startsWith('image/'))return;file=f;name.textContent=`${f.name} · ${(f.size/1024/1024).toFixed(1)} MB`;drop.classList.add('has-file');$('#generate-btn',el).disabled=false}
 $('#generate-btn',el).onclick=async()=>{if(!file)return;el.remove();await generateFromPhoto(file,Number($('#detail')?.value||58)/100,Number($('#colors')?.value||24))}
}
async function generateFromPhoto(file,detail,targetColors){
 state.generating=true;renderProcessingOverlay(file.name)
 try{
  const bitmap=await createImageBitmap(file); const maxSide=900; const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));const w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(bitmap,0,0,w,h);bitmap.close();const id=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h); 
  const result=window.runPipeline(id, p=>updateProcessing(p), {detail,targetColors,protectDetails:true})
  const sourceUrl=await fileToDataUrl(file)
  const template={...result,labelsB64:typedToBase64(result.labels),palette:result.palette,regions:result.regions,sourceUrl,sourceW:w,sourceH:h,previewSvg:null}
  state.activeProject={project:{id:null,title:file.name.replace(/\.[^.]+$/,'')||'My photo',sourceKind:'photo',template,state:{filled:[],events:[]},progress:0},undo:[],redo:[],sourceImageDataUrl:sourceUrl}
  state.route='editor';state.generating=false;render();toast(state.lang==='ru'?`Создано ${result.regions.length} областей · ${result.palette.length} цветов`:`Generated ${result.regions.length} smart regions · ${result.palette.length} colors`)
  await saveEditor(true)
 }catch(e){state.generating=false;render();toast((state.lang==='ru'?'Не удалось создать картину: ':'Could not generate the painting: ')+e.message,'error')}
}
function renderProcessingOverlay(name){const e=document.createElement('div');e.className='processing-overlay';e.id='processing-overlay';e.innerHTML=`<div class="processing-card"><div class="processing-scan">✦</div><div class="section-kicker">Building your painting</div><h2>Finding the right<br><em>shapes & colors.</em></h2><p>${escapeHtml(name)}</p><div class="process-line"><span id="process-fill"></span></div><div class="process-row"><span id="process-step">Analyzing photo</span><b id="process-pct">0%</b></div><div class="process-dots"><i></i><i></i><i></i><i></i></div></div>`;document.body.appendChild(e); localizeDom(e)}
function updateProcessing(p){const ov=$('#processing-overlay');if(!ov)return;$('#process-fill',ov).style.width=Math.round(p.percent)+'%';$('#process-pct',ov).textContent=Math.round(p.percent)+'%';const map={analyze:'Analyzing photo',palette:'Balancing palette',regions:'Building regions',merge:'Refining shapes',contours:'Smoothing contours',numbers:'Placing numbers'};$('#process-step',ov).textContent=map[p.step]||'Finishing'}
const fileToDataUrl=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})
function typedToBase64(a){let s='';const bytes=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
function base64ToTyped(s){const bin=atob(s);const b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return new Uint32Array(b.buffer)}
function symbol(i){const sy='1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';return sy[i%sy.length]}
function timeAgo(ts){const s=(Date.now()-ts)/1000;if(s<60)return'just now';if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`}
function eventTitle(e){const en=e.action==='region_fill'?`Filled area ${symbol(e.colorIdx||0)}`:e.action==='project_completed'?'Finished a masterpiece':e.action==='project_created'?'Started a new painting':'Painted with smart brush';const ru=e.action==='region_fill'?`Заполнена область ${symbol(e.colorIdx||0)}`:e.action==='project_completed'?'Завершена картина':e.action==='project_created'?'Начата новая картина':'Рисование умной кистью';return state.lang==='ru'?ru:en}
function svgFallback(k){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#dbe4ef"/><circle cx="500" cy="110" r="50" fill="#f5cd7a"/><path d="M0 280L170 120l90 100 120-160 260 220v140H0z" fill="#355b61"/><path d="M0 340h640v80H0z" fill="#c5a26d"/></svg>`}
function countRemaining(p){const t=p.template;const filled=new Set(p.state?.filled||[]);return (t.regions||[]).filter((_,i)=>!filled.has(i)).length}
function regionCountForColor(t,i){const filled=new Set(t.filled||[]);return (t.regions||[]).filter((r,idx)=>r.colorIdx===i&&!filled.has(idx)).length}

async function drawEditor(){
 const ap=state.activeProject; if(!ap) return; const t=ap.project.template;const stage=$('#stage');if(!stage)return;const bc=$('#base-canvas'),pc=$('#paint-canvas'),lc=$('#line-canvas'),fx=$('#fx-canvas');
 const w=t.width||320,h=t.height||210;[bc,pc,lc,fx].forEach(c=>{c.width=w;c.height=h});const ctx=bc.getContext('2d');ctx.clearRect(0,0,w,h);
 if(state.showReference && t.sourceUrl){ const img=new Image(); img.onload=()=>{ctx.drawImage(img,0,0,w,h);drawOverlay();}; img.src=t.sourceUrl } else { drawTemplatePaper(ctx,t,w,h); drawOverlay(); }
 stage.style.transform=`scale(${state.zoom})`; if(state.focus) stage.classList.add('focus-stage'); else stage.classList.remove('focus-stage')
 setupPointerHandlers();updateSelectedColor();renderMiniMap()
 function drawTemplatePaper(ctx,t,w,h){
   ctx.fillStyle='#fbf8f2';ctx.fillRect(0,0,w,h);
   const ids=t.labelsB64?base64ToTyped(t.labelsB64):null;
   if(!ids){ for(const r of (t.regions||[])){ctx.fillStyle='#f6f0e7';ctx.fillRect(r.x,r.y,r.x2-r.x,r.y2-r.y)} return }
   const img=ctx.createImageData(w,h),d=img.data,pal=t.palette||[];
   for(let i=0;i<ids.length;i++){const c=hexToRgb(pal[t.regions[ids[i]]?.colorIdx]?.hex||'#ddd7ce');const o=i*4;d[o]=Math.round(250*.78+c[0]*.22);d[o+1]=Math.round(248*.78+c[1]*.22);d[o+2]=Math.round(242*.78+c[2]*.22);d[o+3]=255}
   ctx.putImageData(img,0,0);
 }
 function drawOverlay(){
   const out=lc.getContext('2d');out.clearRect(0,0,w,h);out.lineWidth=Math.max(.45,0.85/state.zoom);out.strokeStyle='rgba(24,24,22,.62)';out.fillStyle='rgba(255,255,255,.88)';out.font='bold 10px system-ui';out.textAlign='center';out.textBaseline='middle'
   const labels=t.labelsB64?base64ToTyped(t.labelsB64):null
   if(labels && t.regions?.length){for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,id=labels[p],q= x<w-1?labels[p+1]:id,r=y<h-1?labels[p+w]:id;if(q!==id){out.globalAlpha=.55;out.beginPath();out.moveTo(x+1,y);out.lineTo(x+1,y+1);out.stroke()}if(r!==id){out.beginPath();out.moveTo(x,y+1);out.lineTo(x+1,y+1);out.stroke()}}for(const reg of t.regions){out.globalAlpha=.9;out.fillText(symbol(reg.colorIdx),reg.labelX,reg.labelY)}}
   else {for(const reg of t.regions||[]){out.strokeRect(reg.x,reg.y,reg.x2-reg.x,reg.y2-reg.y);out.fillText(symbol(reg.colorIdx),reg.labelX,reg.labelY)}}
   out.globalAlpha=1;paintAllDone(pc,t)
   if(state.highlight) highlightColor(fx,t,state.selectedColor)
 }
 function paintAllDone(pc,t){const c=pc.getContext('2d');c.clearRect(0,0,w,h);for(const rid of(state.activeProject.project.state?.filled||[])) fillRegionOnCanvas(c,t,rid,state.selectedColor===null?0:t.regions[rid]?.colorIdx||0)}
 function highlightColor(fx,t,colorIdx){const c=fx.getContext('2d');c.clearRect(0,0,w,h);c.fillStyle='rgba(255,231,143,.38)';const labels=t.labelsB64?base64ToTyped(t.labelsB64):null;if(labels){const d=c.getImageData(0,0,w,h), pix=d.data;for(let p=0;p<labels.length;p++){const rid=labels[p];if(t.regions[rid]?.colorIdx===colorIdx){const o=p*4;pix[o]=255;pix[o+1]=205;pix[o+2]=55;pix[o+3]=62}}c.putImageData(d,0,0)} else for(const [rid,r] of (t.regions||[]).entries()) if(r.colorIdx===colorIdx){c.fillRect(r.x,r.y,r.x2-r.x,r.y2-r.y)} }
}
function setupPointerHandlers(){
 const stage=$('#stage'); if(!stage||stage.dataset.bound)return;stage.dataset.bound='1';let drawing=false,last=null,pan=null;const getPoint=e=>{const r=stage.getBoundingClientRect();const t=state.activeProject.project.template;return{x:Math.floor((e.clientX-r.left)/r.width*t.width),y:Math.floor((e.clientY-r.top)/r.height*t.height)}}
 stage.addEventListener('pointerdown',e=>{stage.setPointerCapture?.(e.pointerId);if(e.button===1||e.altKey){pan={x:e.clientX,y:e.clientY,sl:stage.style.left||'0px',st:stage.style.top||'0px'};return}drawing=true;last=getPoint(e);paintPoint(last);})
 stage.addEventListener('pointermove',e=>{if(pan){stage.parentElement.scrollLeft-=e.clientX-pan.x;stage.parentElement.scrollTop-=e.clientY-pan.y;pan.x=e.clientX;pan.y=e.clientY;return}if(!drawing)return;const p=getPoint(e);paintLine(last,p);last=p})
 ;['pointerup','pointercancel','pointerleave'].forEach(ev=>stage.addEventListener(ev,()=>{if(drawing){drawing=false;commitEditorEvent('brush_stroke')}pan=null}))
 stage.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();state.zoom=Math.max(.5,Math.min(4,state.zoom*(e.deltaY<0?1.1:.9)));applyZoom()},{passive:false})
 window.addEventListener('keydown',keyHandler)
}
function keyHandler(e){if(state.route!=='editor')return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();editorUndo()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();editorRedo()}if(e.key.toLowerCase()==='f'){state.focus=!state.focus;render()}}
function pointRegion(t,x,y){x=Math.max(0,Math.min((t.width||320)-1,x));y=Math.max(0,Math.min((t.height||210)-1,y));if(t.labelsB64){const ids=base64ToTyped(t.labelsB64);const rid=ids[y*t.width+x];return rid< t.regions.length?rid:-1}for(let i=0;i<t.regions.length;i++){const r=t.regions[i];if(x>=r.x&&x<r.x2&&y>=r.y&&y<r.y2)return i}return -1}
function fillRegionOnCanvas(c,t,rid,colorIdx){const r=t.regions[rid];if(!r)return;const hex=t.palette[colorIdx]?.hex||'#888';if(t.labelsB64){const ids=base64ToTyped(t.labelsB64),img=c.getImageData(0,0,t.width,t.height),d=img.data;const candidates=[];for(let p=0;p<ids.length;p++)if(ids[p]===rid)candidates.push(p);const rgb=hexToRgb(hex);for(const p of candidates){const o=p*4;d[o]=rgb[0];d[o+1]=rgb[1];d[o+2]=rgb[2];d[o+3]=255}c.putImageData(img,0,0)}else{c.fillStyle=hex;c.fillRect(r.x,r.y,r.x2-r.x,r.y2-r.y)}}
function paintPoint(p){const ap=state.activeProject,t=ap.project.template;if(!t||p.x<0||p.y<0)return;const rid=pointRegion(t,p.x,p.y);if(rid<0)return;state._lastRegion=rid;const color=state.selectedColor;
 if(state.tool==='fill'||state.tool==='assist'){if(state.tool==='fill')fillRegionAction(rid,color);else assistedDot(p,rid,color)}else freeDot(p,color)
}
function paintLine(a,b){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));for(let i=1;i<=steps;i++){const t=i/steps;paintPoint({x:Math.round(a.x+(b.x-a.x)*t),y:Math.round(a.y+(b.y-a.y)*t)})}}
function assistedDot(p,rid,color){const t=state.activeProject.project.template,pc=$('#paint-canvas').getContext('2d'),rad=7;const labels=t.labelsB64?base64ToTyped(t.labelsB64):null;const rgb=hexToRgb(t.palette[color]?.hex||'#888');if(labels){const img=pc.getImageData(0,0,t.width,t.height),d=img.data;for(let y=Math.max(0,p.y-rad);y<=Math.min(t.height-1,p.y+rad);y++)for(let x=Math.max(0,p.x-rad);x<=Math.min(t.width-1,p.x+rad);x++){if(Math.hypot(x-p.x,y-p.y)>rad)continue;const id=labels[y*t.width+x];if(id===rid){const o=(y*t.width+x)*4;d[o]=rgb[0];d[o+1]=rgb[1];d[o+2]=rgb[2];d[o+3]=230}}pc.putImageData(img,0,0)}else{pc.fillStyle=t.palette[color]?.hex||'#888';pc.beginPath();pc.arc(p.x,p.y,rad,0,Math.PI*2);pc.fill()}}
function freeDot(p,color){const t=state.activeProject.project.template,pc=$('#paint-canvas').getContext('2d');pc.fillStyle=t.palette[color]?.hex||'#888';pc.beginPath();pc.arc(p.x,p.y,7,0,Math.PI*2);pc.fill()}
function fillRegionAction(rid,color){const ap=state.activeProject,t=ap.project.template,filled=new Set(ap.project.state.filled||[]);if(filled.has(rid))return;ap.undo.push(JSON.parse(JSON.stringify(ap.project.state)));ap.redo=[];filled.add(rid);ap.project.state.filled=[...filled];ap.project.progress=filled.size/t.regions.length*100;fillRegionOnCanvas($('#paint-canvas').getContext('2d'),t,rid,color);commitEditorEvent('region_fill',rid,color)}
function commitEditorEvent(action,regionId=null,colorIdx=null){const p=state.activeProject?.project;if(!p)return; if(action==='brush_stroke'){const rid=state._lastRegion ?? -1; if(rid>=0){const filled=new Set(p.state.filled||[]);if(!filled.has(rid)&&state.tool==='assist'){filled.add(rid);p.state.filled=[...filled];p.progress=filled.size/p.template.regions.length*100}}}
 p.state.events=p.state.events||[];p.state.events.push({action,regionId,colorIdx,at:Date.now()}); if(p.progress>=99.99){p.progress=100;p.completed=true} saveEditor(false)}
function editorUndo(){const ap=state.activeProject;if(!ap||!ap.undo?.length)return;ap.redo.push(JSON.parse(JSON.stringify(ap.project.state)));ap.project.state=ap.undo.pop();ap.project.progress=(ap.project.state.filled?.length||0)/ap.project.template.regions.length*100;drawEditor();saveEditor(false)}
function editorRedo(){const ap=state.activeProject;if(!ap||!ap.redo?.length)return;ap.undo.push(JSON.parse(JSON.stringify(ap.project.state)));ap.project.state=ap.redo.pop();ap.project.progress=(ap.project.state.filled?.length||0)/ap.project.template.regions.length*100;drawEditor();saveEditor(false)}
function applyZoom(){const stage=$('#stage');if(stage)stage.style.transform=`scale(${state.zoom})`;const z=$('#zoom-label');if(z)z.textContent=Math.round(state.zoom*100)+'%'}
function updateSelectedColor(){const el=$('#selected-color');if(!el||!state.activeProject)return;const c=state.activeProject.project.template.palette[state.selectedColor];el.innerHTML=`<span class="big-swatch" style="background:${c.hex}">${symbol(state.selectedColor)}</span><div><span>Selected</span><strong>Color ${symbol(state.selectedColor)}</strong><small>${c.hex} · ${regionCountForColor(state.activeProject.project.template,state.selectedColor)} areas</small></div><button class="round-btn" data-action="highlight">${icons.target}</button>`;const btn=el.querySelector('[data-action]');if(btn)btn.onclick=()=>{state.highlight=!state.highlight;drawEditor()}}
function renderMiniMap(){const el=$('#mini-map');if(!el||!state.activeProject)return;const t=state.activeProject.project.template;el.innerHTML='<div class="mini-grid"></div><div class="mini-window"></div>'}
function renderContinuePreview(){const p=state.projects[0];const el=$('#continue-preview');if(!p||!el)return;el.innerHTML=`<div class="continue-glyph">${p.completed?'✓':'✦'}</div>`}
function hexToRgb(hex){const n=parseInt(String(hex).replace('#',''),16);return[(n>>16)&255,(n>>8)&255,n&255]}
async function saveEditor(forceCreate=false){
 const ap=state.activeProject;if(!ap||!state.user)return;const p=ap.project;const body={title:p.title,template:{...p.template},state:p.state,progress:p.progress,completed:!!p.completed,event:p.state.events?.at(-1)||null};if(!p.id && !forceCreate){body.imageDataUrl=ap.sourceImageDataUrl||undefined;body.sourceKind=p.sourceKind}
 if(!p.id){body.imageDataUrl=ap.sourceImageDataUrl||undefined;body.sourceKind=p.sourceKind;const r=await api('/api/projects',{method:'POST',body:JSON.stringify(body)});p.id=r.id}else await api(`/api/projects/${p.id}`,{method:'PUT',body:JSON.stringify(body)})
 await loadProjects(); if(p.completed)toast('Masterpiece complete ✦');
}
let saveTimer=null
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>void saveEditor(false),700)}
async function sharePainting(){const ap=state.activeProject;if(!ap?.project)return;const text=`I just painted “${ap.project.title}” in Paint by Numbers Studio — ${ap.project.progress.toFixed(0)}% complete.`;try{if(navigator.share)await navigator.share({title:ap.project.title,text});else await navigator.clipboard.writeText(text);toast(navigator.share?'Shared!':'Share text copied to clipboard')}catch{} }
function exportPainting(){const ap=state.activeProject;if(!ap)return;const t=ap.project.template,w=t.width||320,h=t.height||210;const c=document.createElement('canvas');c.width=w*2;c.height=h*2;const x=c.getContext('2d');x.fillStyle='#fffdf8';x.fillRect(0,0,c.width,c.height);const base=$('#base-canvas');x.drawImage(base,0,0,c.width,c.height);x.drawImage($('#line-canvas'),0,0,c.width,c.height);x.fillStyle='#171614';x.font='bold 26px system-ui';x.fillText(ap.project.title,28,c.height-36);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=`${ap.project.title.replace(/\s+/g,'-')}-template.png`;a.click();toast(trText('Template exported as PNG'))}

async function loadCatalog(){const r=await api('/api/catalog');state.catalog=r.items}
async function loadProjects(){if(!state.user)return;const r=await api('/api/projects');state.projects=r.items; await loadHistory(null)}
async function loadHistory(projectId){try{state.history=projectId?(await api(`/api/projects/${projectId}/history`)).items:(await api('/api/history')).items}catch{state.history=[]}}
async function init(){try{const me=await api('/api/auth/me');state.user=me.user;await Promise.all([loadCatalog(),state.user?loadProjects():Promise.resolve()]);render()}catch(e){document.body.innerHTML='<div style="padding:40px;font-family:system-ui"><h2>Studio could not start</h2><p>'+escapeHtml(e.message)+'</p></div>'}}
init()

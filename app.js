(() => {
  const BOT = "OO_PBot", OWNER_ID = "1523406780";
  const tg = window.Telegram?.WebApp;
  const state = { view:"home", listMode:"", tracks:[], current:null, profile:null };
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const audio = $("#audio");

  function haptic(kind="light"){ try{ tg?.HapticFeedback?.impactOccurred(kind) }catch(_){} }
  function toast(text){ const el=$("#toast"); el.textContent=text; el.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2100); }
  function loading(on,text="Finding your music…"){ $("#loadingText").textContent=text; $("#loading").classList.toggle("hidden",!on); }
  async function api(path, options={}){
    const headers = {"X-Telegram-Init-Data": tg?.initData || "", ...(options.body?{"Content-Type":"application/json"}:{}), ...(options.headers||{})};
    const res = await fetch(path,{...options,headers});
    if(!res.ok){ const msg=(await res.text()).trim() || `Request failed (${res.status})`; if(res.status===401) fatal(msg); throw new Error(msg); }
    return res.json();
  }
  function fatal(text){ $("#fatalText").textContent=text; $("#fatal").classList.remove("hidden"); }
  function showView(name){
    state.view=name; $$(".view").forEach(v=>v.classList.remove("active"));
    $(name==="home"?"#homeView":name==="profile"?"#profileView":"#listView").classList.add("active");
    $$(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===name || (name==="top"&&t.dataset.tab==="home")));
    try{ if(name!=="home")tg?.BackButton?.show(); else tg?.BackButton?.hide(); }catch(_){}
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function initialsArt(index){ return ["♪","♫","♬","♡"][index%4] }
  function esc(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])) }

  function renderTracks(tracks, title, kicker, subtitle){
    state.tracks=tracks; $("#listTitle").textContent=title; $("#listKicker").textContent=kicker; $("#listSub").textContent=subtitle||"";
    const box=$("#trackList"); box.innerHTML=""; $("#emptyState").classList.toggle("hidden",tracks.length>0);
    tracks.forEach((t,i)=>{
      const row=document.createElement("article"); row.className="track";
      row.innerHTML=`<button class="track-art icon-btn play-row" aria-label="Play">${initialsArt(i)}</button><div class="track-meta"><strong>${esc(t.title||t.name)}</strong><span>${esc(t.performer||"Unknown artist")}</span></div><div class="track-actions"><button class="icon-btn fav ${t.favorite?"loved":""}" aria-label="Favorite">${t.favorite?"♥":"♡"}</button><button class="icon-btn download" aria-label="Download">⇩</button></div>`;
      row.querySelector(".play-row").onclick=()=>playTrack(t);
      row.querySelector(".fav").onclick=async e=>{e.stopPropagation(); await toggleFavorite(t,e.currentTarget)};
      row.querySelector(".download").onclick=e=>{e.stopPropagation(); downloadTrack(t)};
      row.querySelector(".track-meta").onclick=()=>playTrack(t);
      box.appendChild(row);
    });
  }

  async function doSearch(query){
    loading(true,`Searching for “${query}”…`); haptic("light");
    try{ const data=await api("/api/search",{method:"POST",body:JSON.stringify({query})}); state.listMode="search"; showView("list"); renderTracks(data.tracks,`“${data.query}”`,"SEARCH RESULTS",`${data.tracks.length} matches from Music Bunny`); }
    catch(e){ toast(e.message) } finally{ loading(false) }
  }
  async function loadFavorites(){
    loading(true,"Opening your favorites…");
    try{ const data=await api("/api/favorites"); state.listMode="favorites"; showView("favorites"); renderTracks(data.tracks,"My Favorites","SAVED WITH 🩷",`${data.tracks.length} saved song${data.tracks.length===1?"":"s"}`); }
    catch(e){ toast(e.message) } finally{ loading(false) }
  }
  async function loadTop(){
    loading(true,"Checking what everyone loves…");
    try{ const data=await api("/api/top"); state.listMode="top"; showView("top"); renderTracks(data.tracks,"Most Requested","TRENDING IN THE BOT",data.tracks.length?"The songs Music Bunny users ask for most":"No trending songs yet"); }
    catch(e){ toast(e.message) } finally{ loading(false) }
  }
  async function loadProfile(){
    loading(true,"Building your music story…");
    try{ const data=await api("/api/profile"); state.profile=data.profile; renderProfile(data.profile); showView("profile"); }
    catch(e){ toast(e.message) } finally{ loading(false) }
  }
  function renderProfile(p){
    $("#profileName").textContent=p.name; $("#profileUsername").textContent=p.username?`@${p.username}`:"MUSIC LOVER"; $("#profileRank").textContent=p.rank;
    $("#statSearch").textContent=p.search_count; $("#statFav").textContent=p.favorite_count; $("#statTogether").textContent=p.songs_together;
    $("#profileBadge").textContent=p.badge; $("#topArtist").textContent=p.top_artist; $("#joinedDate").textContent=p.joined_date;
    const recent=$("#recentSearches"); recent.innerHTML=p.recent_searches.length?p.recent_searches.map(x=>`<span class="recent-chip">${esc(x)}</span>`).join(""):`<span class="recent-chip">No searches yet 🎀</span>`;
  }

  async function toggleFavorite(track, btn=null){
    haptic("medium");
    try{
      const data=await api("/api/favorite/toggle",{method:"POST",body:JSON.stringify({source:track.source,source_id:track.source_id,index:track.index})});
      track.favorite=data.favorite; if(btn){btn.classList.toggle("loved",data.favorite);btn.textContent=data.favorite?"♥":"♡"}
      if(state.current?.id===track.id){ $("#playerFav").textContent=data.favorite?"♥":"♡"; $("#playerFav").classList.toggle("loved",data.favorite) }
      toast(data.favorite?"Saved to Favorites 🩷":"Removed from Favorites 🤍");
      if(state.listMode==="favorites"&&!data.favorite) loadFavorites();
    }catch(e){ toast(e.message) }
  }
  function playTrack(track){
    haptic("light"); state.current=track; audio.src=track.stream_url; audio.play().catch(()=>toast("Tap play once more 🎧"));
    $("#playerTitle").textContent=track.title||track.name; $("#playerArtist").textContent=track.performer||"Music Bunny"; $("#playerFav").textContent=track.favorite?"♥":"♡"; $("#playerFav").classList.toggle("loved",track.favorite); $("#player").classList.remove("hidden"); $("#playerToggle").textContent="❚❚";
    try{ navigator.mediaSession.metadata=new MediaMetadata({title:track.title||track.name,artist:track.performer||"Music Bunny"}) }catch(_){}
  }
  function downloadTrack(track){
    haptic("light"); const url=new URL(track.download_url,location.origin).href; const name=`${track.performer||"Music Bunny"} - ${track.title||"Song"}.mp3`.replace(/[\\/:*?"<>|]/g,"-").slice(0,90);
    try{ if(tg?.downloadFile){tg.downloadFile({url,file_name:name},ok=>{if(!ok)location.href=url});return} }catch(_){} location.href=url;
  }

  $("#searchForm").addEventListener("submit",e=>{e.preventDefault();const q=$("#searchInput").value.trim();if(!q){toast("Type a song first 🎧");return}doSearch(q)});
  $$('[data-nav]').forEach(b=>b.onclick=()=>({favorites:loadFavorites,top:loadTop,profile:loadProfile}[b.dataset.nav]?.()));
  $$('[data-tab]').forEach(b=>b.onclick=()=>{const t=b.dataset.tab;if(t==="home")showView("home");if(t==="favorites")loadFavorites();if(t==="profile")loadProfile()});
  $$('[data-back]').forEach(b=>b.onclick=()=>showView("home"));
  $("#refreshList").onclick=()=>state.listMode==="favorites"?loadFavorites():state.listMode==="top"?loadTop():toast("Search again from Home 🎀");
  $("#refreshProfile").onclick=loadProfile;
  $("#groupBtn").onclick=()=>{haptic();const url=`https://t.me/${BOT}?startgroup=true`;tg?.openTelegramLink?tg.openTelegramLink(url):location.href=url};
  $("#ownerBtn").onclick=()=>{haptic();location.href=`tg://openmessage?user_id=${OWNER_ID}`};
  $("#playerToggle").onclick=()=>{if(audio.paused){audio.play();$("#playerToggle").textContent="❚❚"}else{audio.pause();$("#playerToggle").textContent="▶"}};
  $("#playerFav").onclick=()=>state.current&&toggleFavorite(state.current);
  audio.addEventListener("play",()=>$("#playerToggle").textContent="❚❚");audio.addEventListener("pause",()=>$("#playerToggle").textContent="▶");audio.addEventListener("ended",()=>$("#playerToggle").textContent="▶");
  try{tg?.BackButton?.onClick(()=>showView("home"))}catch(_){}

  async function boot(){
    if(!tg?.initData){fatal("Open this page from the Music Bunny bot so Telegram can securely sign you in.");return}
    try{tg.ready();tg.expand();tg.setHeaderColor("#0d0914");tg.setBackgroundColor("#0a0710");if(tg.setBottomBarColor)tg.setBottomBarColor("#0a0710")}catch(_){}
    loading(true,"Waking up Music Bunny…");
    try{const data=await api("/api/bootstrap");$("#firstName").textContent=data.user.first_name||"cutie";state.profile=data.profile;renderProfile(data.profile)}catch(e){console.error(e)}finally{loading(false)}
  }
  boot();
})();
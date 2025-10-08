/* eslint-disable quotes */
// Enhanced Notifications System (grouping, retention, settings, muting, keyboard nav, focus trap, a11y)
(function() {
  let notifications = JSON.parse(localStorage.getItem('siteNotifications') || '[]');
  let notificationId = parseInt(localStorage.getItem('notificationId') || '1');
  let unread = new Set(JSON.parse(localStorage.getItem('notificationUnread') || '[]'));
  let settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
  if (!settings || typeof settings !== 'object') settings = {};
  if (!Array.isArray(settings.mutedTypes)) settings.mutedTypes = [];
  if (typeof settings.retentionDays !== 'number' || settings.retentionDays <= 0) settings.retentionDays = 7;

  const TYPE_META = { info:{color:'text-blue-400',icon:'ℹ️'}, success:{color:'text-green-400',icon:'✅'}, warning:{color:'text-yellow-400',icon:'⚠️'}, error:{color:'text-red-400',icon:'⛔'} };

  function escapeHtml(str){return str.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
  function relativeTime(ts){const diff=Date.now()-ts;const s=Math.floor(diff/1000);if(s<60)return s+'s ago';const m=Math.floor(s/60);if(m<60)return m+'m ago';const h=Math.floor(m/60);if(h<24)return h+'h ago';const d=Math.floor(h/24);return d+'d ago';}
  function prune(){const cutoff=Date.now()-settings.retentionDays*86400000;const before=notifications.length;notifications=notifications.filter(n=>n.timestamp>=cutoff);if(before!==notifications.length){unread.forEach(id=>{if(!notifications.find(n=>n.id===id)) unread.delete(id);});}}
  function persist(){prune();localStorage.setItem('siteNotifications',JSON.stringify(notifications.slice(0,300)));localStorage.setItem('notificationId',String(notificationId));localStorage.setItem('notificationUnread',JSON.stringify([...unread]));localStorage.setItem('notificationSettings',JSON.stringify(settings));}
  function updateBadge(){const badge=document.getElementById('notification-badge');if(!badge)return;const count=unread.size;if(count){badge.textContent=count>99?'99+':String(count);badge.classList.remove('hidden');}else badge.classList.add('hidden');}
  function markAllRead(){notifications.forEach(n=>unread.delete(n.id));persist();render();}
  function toggleRead(id){if(unread.has(id)) unread.delete(id); else unread.add(id);persist();render();}
  function spawnToast(n){const toast=document.createElement('div');const palette={info:'bg-blue-600',success:'bg-green-600',warning:'bg-yellow-600 text-black',error:'bg-red-600'};const meta=TYPE_META[n.type]||TYPE_META.info;toast.className=`fixed bottom-4 right-4 p-4 ${palette[n.type]||palette.info} text-white rounded-lg shadow-lg flex items-start gap-3 transform translate-x-full transition-transform duration-300 z-50 w-72`;toast.innerHTML=`<div class="text-lg leading-none">${meta.icon}</div><div class="flex-1"><div class="font-medium">${escapeHtml(n.message)}</div><div class="text-xs opacity-75">Just now</div></div><button aria-label="Dismiss" class="font-bold ml-2" style="line-height:1;">&times;</button>`;toast.querySelector('button').onclick=()=>toast.remove();document.body.appendChild(toast);setTimeout(()=>toast.classList.remove('translate-x-full'),30);setTimeout(()=>{toast.classList.add('translate-x-full');setTimeout(()=>toast.remove(),250);},5000);}            
  window.showNotification=function(message,type='info',duration=5000){if(type!=='error'&&settings.mutedTypes.includes(type)) return null;const id=notificationId++;const n={id,message,type,timestamp:Date.now()};notifications.unshift(n);unread.add(id);persist();spawnToast(n);render();return id;};
  function group(list){const g={today:[],yesterday:[],older:[]};const now=new Date();const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();const startYesterday=startToday-86400000;list.forEach(n=>{if(n.timestamp>=startToday) g.today.push(n); else if(n.timestamp>=startYesterday) g.yesterday.push(n); else g.older.push(n);});return g;}
  function closeDropdown(){
    const dd=document.getElementById('notification-dropdown');
    const bell=document.getElementById('notification-bell');
    if(dd && !dd.classList.contains('hidden')){
      dd.classList.add('hidden');
      if(bell){
        bell.setAttribute('aria-expanded','false');
        bell.focus();
      }
    }
  }
  function render(){
    updateBadge();
    const listEl=document.getElementById('notification-list');
    if(!listEl) return; 
    if(!notifications.length){
      listEl.innerHTML=`<div class='text-center text-gray-500 p-4' data-i18n='notifications.empty'>No new notifications</div>`;
      return;
    }
    const groups=group(notifications.slice(0,250));
    function renderGroup(label,arr){
      if(!arr.length) return '';
      return `<div class='px-3 pt-3 text-[10px] uppercase tracking-wide opacity-60'>${label}</div>` + arr.map(n=>{
        const meta=TYPE_META[n.type]||TYPE_META.info;
        const isUnread=unread.has(n.id);
        return '<div tabindex="0" class="notification-item flex gap-3 p-3 rounded outline-none focus:ring-2 focus:ring-secondary hover:bg-gray-100 dark:hover:bg-gray-700 group ' + (isUnread?'bg-gray-50 dark:bg-gray-900/40':'') + '" data-id="'+n.id+'">'
          + '<div class="text-lg leading-none '+meta.color+'">'+meta.icon+'</div>'
          + '<div class="flex-1 min-w-0"><div class="text-sm '+(isUnread?'font-semibold':'font-medium')+'">'+escapeHtml(n.message)+'</div><div class="text-[10px] uppercase tracking-wide opacity-60 mt-1">'+relativeTime(n.timestamp)+'</div></div>'
          + '<button class="text-[10px] text-blue-400 hover:underline toggle-read" aria-label="Toggle read state">'+(isUnread?'Mark read':'Unread')+'</button>'
          + '</div>';
      }).join('');
    }
    // Build mute types HTML separately to simplify template
    const muteTypesHtml=['info','success','warning','error'].map(function(t){
      const disabled=t==='error'?'disabled':'';
      const checked=settings.mutedTypes.includes(t)?'checked':'';
      const extra=t==='error'?"<span class='text-[10px] opacity-60'>(cannot mute)</span>":'';
      return "<label class='flex items-center gap-2'><input type='checkbox' class='notif-mute-type' data-type='"+t+"' "+checked+" "+disabled+"> <span class='capitalize'>"+t+"</span> "+extra+"</label>";
    }).join('');
    listEl.innerHTML=[
      renderGroup('Today',groups.today),
      renderGroup('Yesterday',groups.yesterday),
      renderGroup('Older',groups.older),
      `<div class='flex justify-between items-center gap-2 p-2 border-t border-gray-200 dark:border-gray-700 mt-2 flex-wrap'><div class='flex gap-2'><button id='mark-all-read' class='text-xs text-blue-500 hover:underline'>Mark all read</button><button id='clear-notifications' class='text-xs text-red-500 hover:underline'>Clear</button></div><button id='open-notification-settings' class='text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1' aria-haspopup='true' aria-expanded='false'>⚙️ Settings</button></div>`,
      `<div id='notification-settings-panel' class='hidden border-t border-gray-200 dark:border-gray-700 p-3 text-sm space-y-3' aria-label='Notification settings'><div class='flex items-center justify-between'><label class='font-medium'>Retention (days)</label><input id='notif-retention-days' type='number' min='1' class='w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-secondary' value='${settings.retentionDays}'></div><fieldset class='space-y-2'><legend class='font-medium'>Mute Types</legend>${muteTypesHtml}</fieldset><div class='flex justify-end gap-2'><button id='notif-settings-cancel' class='text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500'>Close</button><button id='notif-settings-save' class='text-xs px-2 py-1 rounded bg-primary hover:brightness-110'>Save</button></div></div>`
    ].join('');
    listEl.querySelectorAll('.toggle-read').forEach(btn=>btn.addEventListener('click',function(e){
      e.stopPropagation();
      var closest = btn.closest('[data-id]');
      var id = closest ? parseInt(closest.getAttribute('data-id')) : NaN;
      if(!isNaN(id)) toggleRead(id);
    }));
    listEl.querySelectorAll('.notification-item').forEach(item=>item.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        var id=parseInt(item.getAttribute('data-id'));
        if(!isNaN(id)) toggleRead(id);
      } else if(e.key==='Delete'){
        var delId=parseInt(item.getAttribute('data-id'));
        notifications=notifications.filter(n=>n.id!==delId);
        unread.delete(delId);
        persist();
        render();
      } else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();
        var itemsArr=[].slice.call(listEl.querySelectorAll('.notification-item'));
        var idx=itemsArr.indexOf(item);
        var next=e.key==='ArrowDown'? (itemsArr[idx+1]||itemsArr[0]) : (itemsArr[idx-1]||itemsArr[itemsArr.length-1]);
        if(next) next.focus();
      } else if(e.key==='Escape'){
        closeDropdown();
      }
    }));
    const markBtn=document.getElementById('mark-all-read'); markBtn && (markBtn.onclick=e=>{e.stopPropagation();markAllRead();});
    const clearBtn=document.getElementById('clear-notifications'); clearBtn && (clearBtn.onclick=e=>{e.stopPropagation();notifications=[];unread.clear();persist();render();});
    const openSettings=document.getElementById('open-notification-settings'); const panel=document.getElementById('notification-settings-panel');
    if(openSettings && panel){openSettings.addEventListener('click',function(e){
      e.stopPropagation();
      var exp=openSettings.getAttribute('aria-expanded')==='true';
      openSettings.setAttribute('aria-expanded',String(!exp));
      panel.classList.toggle('hidden');
      if(!panel.classList.contains('hidden')){
        var first=panel.querySelector('input,button,select,textarea');
        if(first) first.focus();
      }
    });}
    const save=document.getElementById('notif-settings-save'); const cancel=document.getElementById('notif-settings-cancel');
    save && save.addEventListener('click',e=>{e.stopPropagation();const days=parseInt(document.getElementById('notif-retention-days').value)||7;settings.retentionDays=Math.max(1,days);settings.mutedTypes=[...document.querySelectorAll('#notification-settings-panel .notif-mute-type:checked')].map(cb=>cb.getAttribute('data-type')).filter(t=>t!=='error');persist();render();});
    cancel && cancel.addEventListener('click',function(e){
      e.stopPropagation();
      if(panel) panel.classList.add('hidden');
      if(openSettings) openSettings.setAttribute('aria-expanded','false');
    });
  }
  function ensureBell(){
    let bell=document.getElementById('notification-bell');
    const wrapper=document.getElementById('notification-bell-wrapper');
    if(!bell && wrapper){
      wrapper.innerHTML=`<button id="notification-bell" aria-haspopup="true" aria-expanded="false" aria-controls="notification-dropdown" class="flex items-center gap-2 px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary text-sm" title="Notifications"><span class="hidden sm:inline" data-i18n="notifications.title">Notifications</span><span class="relative inline-flex items-center">🔔<span id="notification-badge" class="bg-red-500 text-white text-[10px] rounded-full px-1 absolute -top-2 -right-2 hidden">0</span></span></button><div id="notification-dropdown" role="dialog" aria-modal="false" aria-label="Notifications" class="hidden absolute right-0 mt-2 w-96 max-w-[95vw] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"><div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><h3 id="notifications-header" class="font-semibold" data-i18n="notifications.title">Notifications</h3><button id="close-notifications" class="text-xs text-gray-400 hover:text-gray-200" aria-label="Close">✕</button></div><div id="notification-list" class="max-h-80 overflow-y-auto p-2" aria-labelledby="notifications-header" aria-live="polite"></div></div>`;
      bell=document.getElementById('notification-bell');
      const dropdown=document.getElementById('notification-dropdown');
      const closeBtn=document.getElementById('close-notifications');
      bell.addEventListener('click',function(e){
        e.stopPropagation();
        const expanded=bell.getAttribute('aria-expanded')==='true';
        bell.setAttribute('aria-expanded',String(!expanded));
        dropdown.classList.toggle('hidden');
        if(!dropdown.classList.contains('hidden')){
          render();
          setTimeout(function(){
            var firstItem=dropdown.querySelector('.notification-item');
            if(firstItem) firstItem.focus();
          },30);
        }
      });
      closeBtn.addEventListener('click',function(e){
        e.stopPropagation();
        closeDropdown();
      });
      document.addEventListener('click',function(ev){
        if(!dropdown.contains(ev.target) && ev.target!==bell) closeDropdown();
      });
      document.addEventListener('keydown',function(e){
        if(e.key==='Escape') closeDropdown();
        if(!dropdown.classList.contains('hidden') && e.key==='Tab'){
          var focusables=[].slice.call(dropdown.querySelectorAll('button,[tabindex="0"],input,select'));
          if(!focusables.length) return;
          var idx=focusables.indexOf(document.activeElement);
          if(e.shiftKey && (idx===0||document.activeElement===dropdown)){
            e.preventDefault();
            focusables[focusables.length-1].focus();
          }else if(!e.shiftKey && idx===focusables.length-1){
            e.preventDefault();
            focusables[0].focus();
          }
        }
      });
    }
  }
  updateBadge();
  document.addEventListener('DOMContentLoaded',()=>{ensureBell();render();if(!notifications.length) window.showNotification('Welcome! Future features are now active.','success');setInterval(()=>{if(Math.random()<0.25){const msgs=['New system update available','User login detected','Backup completed successfully','New order received'];const types=['info','success','warning'];const msg=msgs[Math.floor(Math.random()*msgs.length)];const type=types[Math.floor(Math.random()*types.length)];window.showNotification(msg,type,4500);}},60000);});
})();

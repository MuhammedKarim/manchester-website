const TIME_ZONE = 'Europe/London';
const HIJRI_DATE_OFFSET_DAYS = 0;
const MAX_FORWARD_DAYS = 7;
const PRAYERS = [['fajr','Fajr'],['sunrise','Sunrise'],['dhuhr','Dhuhr'],['asr','Asr'],['maghrib','Maghrib'],['isha','Isha']];

const widget = document.querySelector('[data-prayer-widget]');
const clock = document.querySelector('[data-prayer-clock]');
const gregorian = document.querySelector('[data-prayer-gregorian]');
const hijri = document.querySelector('[data-prayer-hijri]');
const countdownLabel = document.querySelector('[data-countdown-label]');
const countdownTime = document.querySelector('[data-countdown-time]');
const countdownTarget = document.querySelector('[data-countdown-target]');
const tableBody = document.querySelector('[data-prayer-table]');
const jumuahTime = document.querySelector('[data-jumuah-time]');
const status = document.querySelector('[data-prayer-status]');
const previousButton = document.querySelector('[data-prayer-prev]');
const nextButton = document.querySelector('[data-prayer-next]');

let currentMasjid = null;
let prayerTimes = null;
let selectedDateKey = null;
let renderTimer = null;
let reloadTimer = null;

const clockFormatter = new Intl.DateTimeFormat('en-GB',{timeZone:TIME_ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const gregorianFormatter = new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'});

function dateParts(date=new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
}

export function getDateKey(date=new Date()) {
  const parts=dateParts(date);
  return [parts.year,parts.month,parts.day].join('-');
}

function addDays(dateKey,days) {
  const [year,month,day]=dateKey.split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day+days,12));
  return [date.getUTCFullYear(),String(date.getUTCMonth()+1).padStart(2,'0'),String(date.getUTCDate()).padStart(2,'0')].join('-');
}

function dateFromKey(dateKey) {
  const [year,month,day]=dateKey.split('-').map(Number);
  return new Date(Date.UTC(year,month-1,day,12));
}

function timezoneOffset(date) {
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const values=Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
  return Date.UTC(values.year,values.month-1,values.day,values.hour,values.minute,values.second)-date.getTime();
}

export function makeManchesterDate(dateKey,time) {
  if (!dateKey || !time) return null;
  const [year,month,day]=dateKey.split('-').map(Number);
  const [hour,minute]=time.split(':').map(Number);
  const wallClockUtc=Date.UTC(year,month-1,day,hour,minute,0);
  let candidate=new Date(wallClockUtc);
  let offset=timezoneOffset(candidate);
  candidate=new Date(wallClockUtc-offset);
  const corrected=timezoneOffset(candidate);
  if (corrected!==offset) candidate=new Date(wallClockUtc-corrected);
  return candidate;
}

function formatTime(time) {
  if (!time) return '—';
  const [hour,minute]=time.split(':').map(Number);
  return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`;
}

function getJamat(key,prayer) {
  if (!prayer) return null;
  return key==='maghrib' ? prayer.start||null : prayer.jamat||null;
}

function nextEvent(now,todayKey,today,tomorrowKey,tomorrow) {
  for (const [key,label] of PRAYERS) {
    const timing=today?.[key];
    if (!timing?.start) continue;
    const start=makeManchesterDate(todayKey,timing.start);
    if (now<start) return {date:start,label:`${label} starts in`,target:`${label} start · ${formatTime(timing.start)}`};
    const jamat=getJamat(key,timing);
    if (jamat && jamat!==timing.start) {
      const date=makeManchesterDate(todayKey,jamat);
      if (now<date) return {date,label:`${label} Jamat in`,target:`${label} Jamat · ${formatTime(jamat)}`};
    }
  }
  const fajr=tomorrow?.fajr;
  if (fajr?.start) return {date:makeManchesterDate(tomorrowKey,fajr.start),label:'Fajr starts in',target:`Tomorrow · ${formatTime(fajr.start)}`};
  return null;
}

function formatCountdown(ms) {
  const total=Math.max(0,Math.floor(ms/1000));
  return [Math.floor(total/3600),Math.floor((total%3600)/60),total%60].map(value=>String(value).padStart(2,'0')).join(':');
}

function getHijriDateForKey(dateKey, now, timing, isToday) {
  const [year,month,day]=dateKey.split('-').map(Number);
  const displayDate=new Date(year,month-1,day,12);
  if (isToday && timing?.maghrib?.start) {
    const maghrib=makeManchesterDate(dateKey,timing.maghrib.start);
    if (maghrib && now>=maghrib) displayDate.setDate(displayDate.getDate()+1);
  }
  if (HIJRI_DATE_OFFSET_DAYS) displayDate.setDate(displayDate.getDate()+HIJRI_DATE_OFFSET_DAYS);
  return umalqura(displayDate);
}

function availableDateKeys() {
  if (!prayerTimes) return [];
  const today=getDateKey();
  const limit=addDays(today,MAX_FORWARD_DAYS);
  return Object.keys(prayerTimes).filter(key=>key>=today && key<=limit).sort();
}

function updateNavigation() {
  const keys=availableDateKeys();
  const index=keys.indexOf(selectedDateKey);
  if (previousButton) previousButton.disabled=index<=0;
  if (nextButton) nextButton.disabled=index<0 || index>=keys.length-1;
}

function resetPrayerWidget() {
  prayerTimes=null;
  selectedDateKey=getDateKey();
  if (countdownLabel) countdownLabel.textContent='Prayer times unavailable';
  if (countdownTime) countdownTime.textContent='--:--:--';
  if (countdownTarget) countdownTarget.textContent='';
  if (tableBody) tableBody.innerHTML='<tr><td colspan="3" class="prayer-loading">Prayer times are not available.</td></tr>';
  if (jumuahTime) jumuahTime.textContent='—';
  if (status) { status.hidden=true; status.textContent=''; }
  if (previousButton) previousButton.disabled=true;
  if (nextButton) nextButton.disabled=true;
}

function renderTable(day) {
  if (!tableBody) return;
  tableBody.innerHTML=PRAYERS.map(([key,label])=>{
    const timing=day?.[key];
    const jamat=getJamat(key,timing);
    return `<tr><td><span class="prayer-name">${label}</span></td><td class="${timing?.start?'':'prayer-time-muted'}">${timing?.start?`<span class="prayer-time-main">${formatTime(timing.start)}</span>`:'—'}</td><td class="${jamat?'':'prayer-time-muted'}">${jamat?`<span class="prayer-time-main">${formatTime(jamat)}</span>`:'—'}</td></tr>`;
  }).join('');
}

function render() {
  if (!widget) return;
  const now=new Date();
  const todayKey=getDateKey(now);
  if (clock) { clock.textContent=clockFormatter.format(now); clock.setAttribute('datetime',now.toISOString()); }
  if (!selectedDateKey) selectedDateKey=todayKey;
  const selected=prayerTimes?.[selectedDateKey];
  if (gregorian) gregorian.textContent=gregorianFormatter.format(dateFromKey(selectedDateKey)).toUpperCase();
  if (hijri) {
    try { hijri.textContent=getHijriDateForKey(selectedDateKey,now,selected,selectedDateKey===todayKey).format('d MMMM yyyy').toUpperCase()+' AH'; }
    catch { hijri.textContent='—'; }
  }
  updateNavigation();
  if (!prayerTimes) return;
  if (!selected) {
    if (tableBody) tableBody.innerHTML='<tr><td colspan="3" class="prayer-loading">No prayer times found for this date.</td></tr>';
    if (jumuahTime) jumuahTime.textContent='—';
    return;
  }
  if (selectedDateKey===todayKey) {
    const tomorrowKey=addDays(todayKey,1);
    const next=nextEvent(now,todayKey,selected,tomorrowKey,prayerTimes?.[tomorrowKey]);
    if (countdownLabel) countdownLabel.textContent=next?.label||'Next prayer';
    if (countdownTime) countdownTime.textContent=next?formatCountdown(next.date-now):'--:--:--';
    if (countdownTarget) countdownTarget.textContent=next?.target||'Next day prayer times are not available yet.';
  } else {
    if (countdownLabel) countdownLabel.textContent='Prayer times for selected date';
    if (countdownTime) countdownTime.textContent='--:--:--';
    if (countdownTarget) countdownTarget.textContent=gregorianFormatter.format(dateFromKey(selectedDateKey));
  }
  renderTable(selected);
  const dhuhrJamat=getJamat('dhuhr',selected.dhuhr);
  if (jumuahTime) jumuahTime.textContent=dhuhrJamat?formatTime(dhuhrJamat):'—';
}

function moveDate(direction) {
  const keys=availableDateKeys();
  const index=keys.indexOf(selectedDateKey);
  const nextIndex=index+direction;
  if (nextIndex<0 || nextIndex>=keys.length) return;
  selectedDateKey=keys[nextIndex];
  render();
}

previousButton?.addEventListener('click',()=>moveDate(-1));
nextButton?.addEventListener('click',()=>moveDate(1));

async function load() {
  if (!currentMasjid?.prayerTimesUrl) {
    resetPrayerWidget();
    if (status) { status.hidden=false; status.textContent='Prayer times have not been configured for this Khanqah.'; }
    return;
  }
  try {
    if (status) { status.hidden=false; status.textContent='Loading prayer times…'; }
    const response=await fetch(currentMasjid.prayerTimesUrl,{cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    prayerTimes=await response.json();
    const keys=availableDateKeys();
    selectedDateKey=keys.includes(getDateKey())?getDateKey():(keys[0]||getDateKey());
    if (status) { status.hidden=true; status.textContent=''; }
    render();
  } catch (error) {
    console.error('Unable to load prayer times:',error);
    resetPrayerWidget();
    if (status) { status.hidden=false; status.textContent='Prayer times are temporarily unavailable.'; }
  }
}

export function stopPrayerTimes() {
  clearInterval(renderTimer); clearInterval(reloadTimer);
  renderTimer=null; reloadTimer=null; currentMasjid=null; resetPrayerWidget();
}

export function initPrayerTimes(masjid) {
  stopPrayerTimes(); currentMasjid=masjid; selectedDateKey=getDateKey(); render(); load();
  renderTimer=setInterval(render,1000);
  reloadTimer=setInterval(load,30*60*1000);
}

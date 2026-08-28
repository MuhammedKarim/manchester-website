const EXTENSIONS = ['png','jpg','jpeg','webp','gif','avif','pdf'];

async function findTimetable(folder) {
  const timestamp=Date.now();
  for (const extension of EXTENSIONS) {
    const url=`${folder}/timetable.${extension}?v=${timestamp}`;
    try {
      const response=await fetch(url,{cache:'no-store'});
      if (!response.ok) continue;
      const type=(response.headers.get('content-type')||'').toLowerCase();
      if (!type.startsWith('image/') && !type.includes('application/pdf')) continue;
      return {url,filename:`timetable.${extension}`,isImage:type.startsWith('image/')};
    } catch {}
  }
  return null;
}

export async function initTimetable(masjid) {
  const links=document.querySelectorAll('[data-timetable-download]');
  const navItem=document.querySelector('[data-timetable-nav-item]');
  const section=document.querySelector('[data-timetable-section]');
  const image=document.querySelector('[data-timetable-image]');
  links.forEach(link=>{link.href='#';link.removeAttribute('download');link.setAttribute('aria-disabled','true');});
  if (image) { image.src=''; image.hidden=true; }
  const folder=masjid.assets?.folder;
  if (!folder) { if(navItem)navItem.hidden=true;if(section)section.hidden=true;return; }
  const timetable=await findTimetable(folder);
  if (!timetable) { if(navItem)navItem.hidden=true;if(section)section.hidden=true;return; }
  if(navItem)navItem.hidden=false;
  if(section)section.hidden=false;
  if(image && timetable.isImage) { image.src=timetable.url; image.alt=`Monthly prayer timetable for ${masjid.location||'this Khanqah'}`; image.hidden=false; }
  links.forEach(link=>{link.href=timetable.url;link.setAttribute('download',timetable.filename);link.removeAttribute('aria-disabled');link.hidden=false;});
}

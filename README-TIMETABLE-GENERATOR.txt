KHANQAH WEBSITE — STATIC TIMETABLE GENERATOR
=============================================

This version is for the static Khanqah website shown in the project screenshots.
It does NOT use React, TypeScript, Next.js, Vite, npm build scripts, or a menu link.

FILES TO COPY
-------------
Copy these files/folders into the ROOT of the existing website, preserving the paths:

  timetable-generator.html
  css/timetable-generator.css
  js/timetable-generator.js
  assets/prayer-timetable-template.xlsx

Your existing website should then contain, for example:

  admin-notifications.html
  index.html
  timetable-generator.html          <-- new
  css/
      timetable-generator.css       <-- new
  js/
      timetable-generator.js        <-- new
  assets/
      prayer-timetable-template.xlsx <-- new

Do not put the timetable generator in navigation.js unless you later decide you want it
in the public menu. It is intended to be opened by direct URL, just like the admin page.

DIRECT URL
----------
If the website is https://example.com, the page will be:

  https://example.com/timetable-generator.html

No change to index.html or navigation.js is required.

REMOVE THE EARLIER NEXT.JS FILES
--------------------------------
If you added the previous experimental files solely for this generator, remove:

  app/timetable-generator/page.tsx
  app/timetable-generator/timetable.css
  components/timetable/TimetableGenerator.tsx

Do not delete app/ or components/ themselves if anything else in the website uses them.

HOW IT WORKS
------------
1. Open timetable-generator.html by its direct URL.
2. Download the included Excel template if needed.
3. Complete the 10 prayer-time columns:
     1  Fajr Begins
     2  Fajr Jamaat
     3  Sunrise
     4  Dhuhr Begins
     5  Dhuhr Jamaat
     6  Asr Begins
     7  Asr Jamaat
     8  Maghrib Begins
     9  Isha Begins
    10  Isha Jamaat
4. Upload the completed spreadsheet.
5. Pick the date represented by the FIRST prayer-time row.
6. Click Generate timetable.
7. Review the preview.
8. Click Print / Save as PDF.
9. In the browser print dialog choose "Save as PDF".

The date is generated automatically for every row. The left edge is split into DAY then DATE,
and the far-right edge repeats DATE only.

PRINT SETTINGS
--------------
The stylesheet requests A4 PORTRAIT and is dimensioned to a single physical A4 page.
The table has 13 columns: DAY, DATE, the 10 prayer-time columns, then DATE again.
The generator accepts a maximum of 31 prayer rows so a calendar month stays on one PDF page.

For the richest green/gold PDF output, leave "Background graphics" enabled in the browser
print dialog if that option is shown. The timetable remains legible even without it.

EXCEL READER
------------
The page loads SheetJS directly in the browser from:

  https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js

There is no npm install or build step.

If the website has a restrictive Content-Security-Policy that blocks external scripts,
you will need to allow cdn.sheetjs.com or host xlsx.full.min.js locally. The page gives a
clear error if the library cannot be loaded.

PRIVACY / SECURITY
------------------
The spreadsheet is read in the visitor's browser. This patch does not upload the file to
a server and does not write any timetable data to your live site.

The page includes a noindex/no-follow directive so normal search engines are asked not to
index it. However, a private/direct URL is not authentication. If you later add publishing,
server writes, or other privileged actions, protect those actions with real authentication.

DEPLOYMENT
----------
Deploy exactly as you currently deploy admin-notifications.html and the rest of the static
website. There is no new build command.


V3 PRINT NOTES
--------------
- The timetable now prints as ONE A4 PORTRAIT page.
- The printable sheet is sized to fill almost the full A4 page.
- The left side is DAY then DATE.
- The far-right side is DATE only.
- Alternating-row styling no longer hides weekday names.
- In the browser print dialog, for the cleanest full-page PDF:
    Orientation: Portrait
    Margins: None
    Headers and footers: Off
    Background graphics: On
    Scale: 100% / Default (avoid Fit to page if it adds margins)

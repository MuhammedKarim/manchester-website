MULTI-KHANQAH WEBSITE

Every new visit starts on the Khanqah selection screen.
The previously selected Khanqah is remembered only so the selector can show the SELECTED badge.
The site does not automatically open the saved Khanqah.

GLOBAL CONFIG

data/config.json

This contains the shared site name and all shared URLs/settings:
siteName
selectorCountry
livePresenceUrl
sharedBanner.image
sharedBanner.topUrl
sharedBanner.bottomUrl
poster.controlUrl
poster.folder
dhikr.enabled
dhikr.timesUrl
dhikr.title
dhikr.description
dhikr.secondaryText
dhikr.liveUrl
dhikr.liveText

KHANQAH CONFIG

data/masjids.json remains your populated per-Khanqah file.
A clean reference structure is included as data/masjids.example.json.

The shared Khanqah name is no longer needed inside individual Khanqah entries.
The shared Dhikr configuration is also no longer needed inside individual Khanqah entries.

COMING SOON

Set "comingSoon": true on a Khanqah entry to show a COMING SOON badge on its selector image and beside its location on the Khanqah page.

ASSETS

Shared assets:
assets/shared/banner.png
assets/shared/poster.json
assets/shared/poster.*

Per-Khanqah assets:
assets/masjids/<id>/logo.png
assets/masjids/<id>/selector.jpg
assets/masjids/<id>/timetable.*

A fifth asset folder is included at assets/masjids/masjid-5/.

LIVE VISITORS

The fixed visitor indicator displays Live Visitor / Live Visitors and remains global across the entire website.

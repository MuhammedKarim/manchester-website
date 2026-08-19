MULTI-KHANQAH WEBSITE

The public URL stays unchanged. The visitor's Khanqah selection is stored in localStorage.

CONFIG FILES

data/site.json

Contains website-wide settings used by JavaScript:

livePresenceUrl
sharedBanner.image
sharedBanner.topUrl
sharedBanner.bottomUrl
poster.controlUrl
poster.folder

data/masjids.json

Contains the individual Khanqah details:

name
location
logo
selector image
prayer times API
Dhikr API
about information
facilities
donation details
opening hours
contact details
map and directions
asset folder

SHARED SITE-WIDE ASSETS

assets/shared/

banner.png
poster.json
poster.png / .jpg / .jpeg / .webp / .gif / .avif

poster.json:

{"active":true}

or:

{"active":false}

KHANQAH-SPECIFIC ASSETS

assets/
  masjids/
    khanqah-naqshbandia/
    masjid-2/
    masjid-3/
    masjid-4/

Each Khanqah folder can contain:

logo.png
selector.jpg
timetable.png / .jpg / .jpeg / .webp / .avif / .pdf

The timetable remains Khanqah-specific.

SELECTION

The first visit shows Choose your Khanqah.

The selected Khanqah is remembered locally.

Change Khanqah opens the selection screen again.

The public URL never changes.

PRESENCE

The visitor count remains global across the whole website.

To enable it, set livePresenceUrl in data/site.json to the deployed WebSocket Worker URL.

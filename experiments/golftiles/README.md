# golfTiles + MapLibre isolated trial

This branch is an integration experiment only. The production Rangefinder, 60/40 layout, scoring and navigation remain unchanged.

## Existing implementation
- `maplibre-gl` already installed in package.json
- `src/components/rangefinder/MapLibreHoleMap.jsx` handles Live Hole map
- `src/components/courselab/MapLibreCourseMap.jsx` handles Course Lab
- `src/lib/courseGraphics` supplies hole graphics

## Trial approach
1. Obtain an actual golfTiles PMTiles archive and its compatible style JSON.
2. Confirm the archive contains geometry for Emu Park Golf Club.
3. Add PMTiles protocol support (pmtiles JS package) on this trial branch only.
4. Render the style in an isolated viewer and verify source-layer names and CORS/range requests.
5. Test tee-bottom orientation, one-hole bounds, small red/yellow/green markers, metres and map zoom on S24.
6. Only after a successful viewer test, integrate as an optional map style in the existing MapLibreHoleMap, retaining fallback.
7. Build APK only after test succeeds and build costs are approved.

## Blockers
- A verified Emu Park PMTiles dataset URL has not been established.
- No APK build has been triggered.

Source: https://github.com/HuggeK/golfTiles
Attribution required: golfTiles and OpenStreetMap contributors. Check ODbL/CC BY and GPL licensing before distributing adapted source.

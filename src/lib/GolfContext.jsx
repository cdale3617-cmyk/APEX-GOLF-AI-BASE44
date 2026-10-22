import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CADDIE,
  DEFAULT_CLUBS,
  DEFAULT_COORDS,
  DEFAULT_ENV,
  PERSONALITIES,
  adjustmentSummary,
  applyLearnedCarries,
  bearingBetween,
  computeRoundStats,
  createDefaultScorecard,
  formatRelativeToPar,
  haversineYards,
  largestGap,
  playsLikeYards,
  recommendClub,
  strokesGained,
  weakestArea,
  windOnShot,
} from '@/lib/golfData';
import { FEATURED_COURSES, HOLE_PARS, addCourse, cachedHoles, getCourse, loadCourseHoles } from '@/lib/courses';
import { addRound, buildRound, loadRounds, removeRound } from '@/lib/roundHistory';
import { routeAudio } from '@/lib/audioRoute';
import { answerVoiceQuery, describeScorePatch, parseVoiceIntent } from '@/lib/voiceEngine';
import { checkGpsPosition, courseGpsMode, selectShotOrigin } from '@/lib/gpsTracking';
import { distanceUnitSpoken, toDisplayDistance } from '@/lib/units';

const STORAGE_KEY = 'apex_golf_ai_device_v1';
const newRoundSessionId = () => `round-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const GolfContext = createContext(null);

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function GolfProvider({ children }) {
  const [stored] = useState(loadStored);

  const [env, setEnv] = useState(stored.env ?? DEFAULT_ENV);
  const [units, setUnits] = useState(stored.units === 'imperial' ? 'imperial' : 'metric');
  // Earbuds / headset the caddie should speak through ('' = system default).
  const [audioSink, setAudioSink] = useState(stored.audioSink ?? '');
  const [clubs, setClubs] = useState(stored.clubs ?? DEFAULT_CLUBS);
  const [caddie, setCaddie] = useState({ ...DEFAULT_CADDIE, ...(stored.caddie ?? {}) });
  const startCourseId = stored.courseId ?? FEATURED_COURSES[0].id;
  const [courseId, setCourseId] = useState(startCourseId);
  const [holeIndex, setHoleIndex] = useState(stored.holeIndex ?? 0);
  // Real hole geometry, cached on this device per course.
  const [holes, setHoles] = useState(() => cachedHoles(startCourseId) ?? []);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState('');
  const [coords, setCoords] = useState(() => {
    const restored = cachedHoles(startCourseId);
    const start = restored?.[stored.holeIndex ?? 0] ?? restored?.[0];
    if (start) return { tee: start.tee, layup: start.layup, pin: start.pin };
    // Never initialise on the unrelated demo map while fetching the selected course.
    const center = getCourse(startCourseId)?.center;
    const position = Array.isArray(center) && center.length === 2 ? center : DEFAULT_COORDS.tee;
    return { tee: position, layup: position, pin: position };
  });
  const hole = holes[holeIndex] ?? null;
  const [scorecard, setScorecard] = useState(stored.scorecard ?? createDefaultScorecard());
  const [roundSessionId, setRoundSessionId] = useState(stored.roundSessionId ?? newRoundSessionId);
  const [bpm, setBpm] = useState(stored.bpm ?? 76);
  const [shots, setShots] = useState(stored.shots ?? []);
  const [rounds, setRounds] = useState(loadRounds);
  const [lastSwing, setLastSwing] = useState(null);

  const [gpsStatus, setGpsStatus] = useState('Course preview • GPS locating');
  // The player location is deliberately independent from tee/target/green.
  const [gpsFix, setGpsFix] = useState(null);
  const [gpsTrackingStatus, setGpsTrackingStatus] = useState('starting');
  const [gpsClock, setGpsClock] = useState(Date.now());
  const [playerFocusNonce, setPlayerFocusNonce] = useState(0);
  const watchIdRef = useRef(null);
  const [focusCenter, setFocusCenter] = useState(() => getCourse(startCourseId)?.center ?? null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [voices, setVoices] = useState([]);

  // Everything the golfer sets up lives on this device only.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ env, units, audioSink, clubs, caddie, scorecard, roundSessionId, bpm, shots, courseId, holeIndex }),
      );
    } catch {
      /* storage full or blocked — the round still works in memory */
    }
  }, [env, units, audioSink, clubs, caddie, scorecard, roundSessionId, bpm, shots, courseId, holeIndex]);

  const course = useMemo(() => (courseId ? getCourse(courseId) : null), [courseId]);

  // The markers always follow the hole that is loaded.
  useEffect(() => {
    if (!hole) return;
    setCoords({ tee: hole.tee, layup: hole.layup, pin: hole.pin });
  }, [hole]);

  // Scorecard pars come from the real holes once they arrive.
  useEffect(() => {
    if (!holes.length) return;
    setScorecard((prev) => prev.map((card, i) => ({ ...card, par: holes[i]?.par ?? HOLE_PARS[i] })));
  }, [holes]);

  const learnedClubs = useMemo(() => applyLearnedCarries(clubs, shots), [clubs, shots]);

  const gpsMode = useMemo(
    () => courseGpsMode(gpsFix, hole, gpsClock),
    [gpsFix, hole, gpsClock],
  );
  const shotOrigin = selectShotOrigin(gpsFix, gpsMode, coords.tee);

  const distances = useMemo(() => {
    const direct = haversineYards(shotOrigin, coords.pin);
    const bearing = bearingBetween(shotOrigin, coords.pin);
    const playsLike = playsLikeYards(direct, env, bearing);
    const rec = recommendClub(learnedClubs, playsLike);
    return {
      direct,
      playsLike,
      seg1: haversineYards(shotOrigin, coords.layup),
      seg2: haversineYards(coords.layup, coords.pin),
      club: rec.club,
      reason: rec.reason,
      wind: windOnShot(env, bearing),
      factors: adjustmentSummary(env, bearing),
      mode: gpsMode,
      accuracy: gpsMode === 'live' ? gpsFix.accuracy : null,
      origin: shotOrigin,
    };
  }, [shotOrigin, coords, env, learnedClubs, gpsMode, gpsFix]);

  // The hole the golfer is standing on drives the scorecard: the loaded map hole
  // while playing, otherwise the first hole still waiting for a score.
  const activeHoleNumber = useMemo(() => {
    if (hole) return hole.number;
    const pending = scorecard.find((card) => card.score === 0);
    return pending ? pending.hole : null;
  }, [hole, scorecard]);

  const stats = useMemo(() => computeRoundStats(scorecard), [scorecard]);
  const strokes = useMemo(() => strokesGained(stats), [stats]);

  /* ---------------- Voice synthesis ---------------- */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
    const synth = window.speechSynthesis;
    const populate = () => setVoices(synth.getVoices());
    populate();
    synth.addEventListener?.('voiceschanged', populate);
    return () => synth.removeEventListener?.('voiceschanged', populate);
  }, []);

  const speakingRef = useRef(false);
  const lastSpokenRef = useRef('');
  const ignoreUntilRef = useRef(0);

  const speak = useCallback(
    (text) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const available = synth.getVoices();
      const chosen = available.find((v) => v.name === caddie.voiceName);
      if (chosen) utterance.voice = chosen;
      utterance.pitch = caddie.pitch;
      utterance.rate = caddie.speed;
      utterance.volume = caddie.volume;
      lastSpokenRef.current = text;
      speakingRef.current = true;
      const resume = () => {
        speakingRef.current = false;
        // Give the mic a beat so it never transcribes the caddie's own voice.
        ignoreUntilRef.current = Date.now() + 600;
      };
      utterance.onend = resume;
      utterance.onerror = resume;
      // Hold the audio route on the golfer's earbuds before speaking through it.
      routeAudio(audioSink)
        .catch(() => null)
        .finally(() => synth.speak(utterance));
    },
    [audioSink, caddie],
  );

  const updateCaddie = useCallback((patch) => {
    setCaddie((prev) => ({ ...prev, ...patch }));
  }, []);

  const briefing = useCallback(() => {
    const personality = PERSONALITIES[caddie.personality] ?? PERSONALITIES.veteran;
    if (hole?.estimated) {
      return `${personality.prefix}This hole layout is only estimated. Do not rely on the mapped distances or club advice until verified hole positions are available.`;
    }
    const parts = [];
    if (gpsMode !== 'live') {
      parts.push('The distances are from the mapped tee, not your phone. This is course preview mode.');
    }
    if (hole) {
      parts.push(`Hole ${hole.number}, par ${hole.par}, ${hole.yards} yards on ${hole.courseName}.`);
    }
    const windNote = !env.windSpeed
      ? 'No wind to speak of'
      : distances.wind.label === 'crosswind'
        ? `Wind is ${env.windSpeed} from the ${env.windDir}, crossing`
        : `Wind is ${env.windSpeed} from the ${env.windDir}, a ${distances.wind.label} worth ${Math.abs(distances.wind.yards)} yards`;

    parts.push(
      `The pin is at ${toDisplayDistance(distances.direct, units)} ${distanceUnitSpoken(units)}, playing like ${toDisplayDistance(distances.playsLike, units)}, so I like your ${distances.club.name}.`,
      `${windNote} at ${env.temp} degrees Fahrenheit.`,
    );

    if (stats.holes) {
      parts.push(
        `You are ${formatRelativeToPar(stats.diff)} through ${stats.holes} holes with ${stats.putts} putts, ${stats.firPct} percent fairways and ${stats.girPct} percent greens.`,
      );
      const weak = weakestArea(strokes);
      if (weak) parts.push(`Biggest leak is ${weak.label.toLowerCase()} at ${weak.value} strokes gained.`);
    }

    const gap = largestGap(learnedClubs);
    if (gap) parts.push(`Watch the ${gap.gap} yard gap between ${gap.from} and ${gap.to}.`);

    const learned = learnedClubs.filter((club) => club.samples > 0);
    if (learned.length) {
      parts.push(`I am calibrated off ${shots.length} logged shots, so trust ${learned[0].name} at ${learned[0].carry}.`);
    }

    if (lastSwing?.peakShoulder) {
      parts.push(`Your last recorded swing peaked at ${lastSwing.peakShoulder} degrees of shoulder turn.`);
    }

    parts.push(`Tempo target stays at ${bpm} beats per minute.`);
    return `${personality.prefix}${parts.join(' ')}`;
  }, [bpm, caddie.personality, distances, env, gpsMode, units, hole, lastSwing, learnedClubs, shots.length, stats, strokes]);

  /* ---------------- Course & hole navigation (buttons and voice) ---------------- */
  const courseRequestRef = useRef(0);

  const openCourse = useCallback(async (nextCourse) => {
    const token = courseRequestRef.current + 1;
    courseRequestRef.current = token;
    const cached = cachedHoles(nextCourse.id);
    const center = nextCourse.center;
    const initial = cached?.[0];
    const position = initial
      ? { tee: initial.tee, layup: initial.layup, pin: initial.pin }
      : { tee: center, layup: center, pin: center };

    // Course switching is immediate. Hole geometry arrives separately.
    setCourseId(nextCourse.id);
    setHoleIndex(0);
    setCourseError('');
    setCoords(position);
    setHoles(initial ? cached : []);
    setFocusCenter(initial ? initial.tee : center);
    setFocusNonce((n) => n + 1);
    setGpsStatus(initial ? `Course Set • ${nextCourse.name}` : `Viewing ${nextCourse.name} • Loading holes`);
    if (initial) {
      setCourseLoading(false);
      return;
    }

    setCourseLoading(true);
    try {
      const loaded = await loadCourseHoles(nextCourse);
      if (token !== courseRequestRef.current) return;
      setHoles(loaded);
      setFocusCenter(loaded[0].tee);
      setFocusNonce((n) => n + 1);
      setGpsStatus(`Course Set • ${nextCourse.name}`);
    } catch (error) {
      if (token !== courseRequestRef.current) return;
      setCourseError(
        error?.message?.includes('No hole layout')
          ? error.message
          : 'Could not reach the course map. Check your signal and retry.',
      );
      // Land the map on the course anyway, so the golfer can drag the PIN.
      setFocusCenter(nextCourse.center);
      setFocusNonce((n) => n + 1);
      setGpsStatus('Course Data Unavailable');
    } finally {
      if (token === courseRequestRef.current) setCourseLoading(false);
    }
  }, []);

  const goToHole = useCallback(
    (index) => {
      if (!holes.length) return null;
      const normalized = ((index % holes.length) + holes.length) % holes.length;
      const next = holes[normalized];
      setHoleIndex(normalized);
      setFocusCenter(next.tee);
      setFocusNonce((n) => n + 1);
      setGpsStatus(`Hole ${next.number} • Par ${next.par}`);
      return next;
    },
    [holes],
  );

  const selectCourse = useCallback(
    (courseOrId) => {
      const next = typeof courseOrId === 'string' ? getCourse(courseOrId) : addCourse(courseOrId);
      if (!next) return;
      openCourse(next);
    },
    [openCourse],
  );

  // Restore the course the golfer was playing when they put their phone away.
  useEffect(() => {
    if (!courseId || holes.length) return;
    const saved = getCourse(courseId);
    if (saved) openCourse(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A slow map server must never leave the golfer staring at a spinner.
  useEffect(() => {
    if (!courseLoading) return undefined;
    const timer = setTimeout(() => {
      setCourseLoading(false);
      setCourseError('Verified hole map is taking too long. Retry when the course mapping service is available.');
    }, 30000);
    return () => clearTimeout(timer);
  }, [courseLoading]);

  const nextHole = useCallback(() => goToHole(holeIndex + 1), [goToHole, holeIndex]);
  const prevHole = useCallback(() => goToHole(holeIndex - 1), [goToHole, holeIndex]);

  /* ---------------- Voice commands ---------------- */
  const [scoreDraft, setScoreDraft] = useState(null);
  const wantListeningRef = useRef(false);
  const undoRef = useRef(null);
  const voiceSupported =
    typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const activePar = hole?.par ?? 4;

  const applyVoiceScore = useCallback(
    (index, patch) => {
      const target = scorecard[index];
      if (!target) return null;
      const merged = {
        ...target,
        ...patch,
        score: patch.score ?? (target.score > 0 ? target.score : target.par),
      };
      const updated = scorecard.map((card, i) => (i === index ? merged : card));
      undoRef.current = { scorecard, hole: index + 1 };
      setScorecard(updated);
      setScoreDraft(null);
      const next = computeRoundStats(updated);
      const scored = `Logged ${merged.score}${merged.putts ? ` with ${merged.putts} putts` : ''} on hole ${index + 1}.`;
      return { index, summary: `${scored} ${formatRelativeToPar(next.diff)} through ${next.holes} holes.` };
    },
    [scorecard],
  );

  const commitDraft = useCallback(() => {
    if (!scoreDraft) return null;
    const result = applyVoiceScore(scoreDraft.hole, scoreDraft);
    return result ? result.summary : null;
  }, [applyVoiceScore, scoreDraft]);

  const commitScoreDraft = useCallback(() => {
    const summary = commitDraft();
    if (summary) speak(summary);
  }, [commitDraft, speak]);

  const clearScoreDraft = useCallback(() => setScoreDraft(null), []);

  const handleCommand = useCallback(
    (raw) => {
      const intent = parseVoiceIntent(raw, { par: activePar });
      const answer = answerVoiceQuery(raw, {
        clubs: learnedClubs,
        distances,
        env,
        stats,
        strokes,
        bpm,
        lastSwing,
        shots,
        holeNumber: hole?.number ?? null,
        briefing,
      });

      if (intent?.kind === 'repeat') {
        speak(lastSpokenRef.current || 'Nothing to repeat yet.');
        return;
      }

      if (intent?.kind === 'undo') {
        if (!undoRef.current) {
          speak('Nothing to undo on the card.');
          return;
        }
        setScorecard(undoRef.current.scorecard);
        speak(`Undone. Hole ${undoRef.current.hole} is back the way it was.`);
        undoRef.current = null;
        return;
      }

      if (intent?.kind === 'clear') {
        setScoreDraft(null);
        speak('Draft cleared.');
        return;
      }

      if (intent?.kind === 'commit') {
        const summary = commitDraft();
        speak(summary ?? 'Nothing waiting to log. Tell me a score, like made a five with two putts.');
        return;
      }

      if (intent?.kind === 'score' && intent.commit) {
        const targetNumber = intent.hole ?? activeHoleNumber;
        if (!targetNumber) {
          speak('Load a course and I will take your scores.');
          return;
        }
        const index = targetNumber - 1;
        const carried = scoreDraft?.hole === index ? scoreDraft : {};
        const result = applyVoiceScore(index, { ...carried, ...intent.patch });
        if (!result) return;
        const landed = holes.length && index + 1 < holes.length ? goToHole(index + 1) : null;
        speak(`${result.summary}${landed ? ` Moving you to hole ${landed.number}.` : ''}`);
        return;
      }

      if (intent?.kind === 'score') {
        const targetNumber = intent.hole ?? activeHoleNumber;
        if (!targetNumber) {
          speak('Load a course and I will take your scores.');
          return;
        }
        const index = targetNumber - 1;
        setScoreDraft((prev) => ({
          ...(prev?.hole === index ? prev : {}),
          hole: index,
          ...intent.patch,
        }));
        speak(`${describeScorePatch(intent.patch)} on hole ${targetNumber}. Say log it to save it.`);
        return;
      }

      if (intent?.kind === 'hole') {
        if (!courseId) {
          speak('Pick a course first, then I will walk you hole to hole.');
          return;
        }
        const saved = commitDraft();
        const landed = intent.hole ? goToHole(intent.hole - 1) : goToHole(holeIndex + intent.delta);
        if (!landed) return;
        speak(`${saved ? `${saved} ` : ''}Hole ${landed.number}, par ${landed.par}, ${landed.yards} yards.`);
        return;
      }

      if (hole?.estimated && !intent && /\b(distance|far|yard|metres?|meters?|club|pin|green|layup|briefing)\b/i.test(raw)) {
        speak('This hole layout is only estimated. I cannot provide reliable GPS distance or club advice.');
        return;
      }
      speak(answer ?? `Got it. ${raw}`);
    },
    [
      activeHoleNumber,
      activePar,
      applyVoiceScore,
      bpm,
      briefing,
      commitDraft,
      courseId,
      distances,
      env,
      goToHole,
      hole,
      holeIndex,
      holes,
      lastSwing,
      learnedClubs,
      scoreDraft,
      shots,
      speak,
      stats,
      strokes,
    ],
  );

  const commandRef = useRef(handleCommand);
  commandRef.current = handleCommand;

  const recognizerRef = useRef(null);

  useEffect(() => {
    if (!voiceSupported) return undefined;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognizer = new Recognition();
    // Hands-free: the mic stays open and restarts itself after every command.
    recognizer.continuous = true;
    recognizer.interimResults = false;
    recognizer.lang = 'en-US';
    recognizer.onresult = (event) => {
      if (speakingRef.current || Date.now() < ignoreUntilRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (!event.results[i].isFinal) continue;
        const transcript = event.results[i][0].transcript.trim();
        if (!transcript) continue;
        setLastHeard(transcript);
        commandRef.current(transcript);
      }
    };
    recognizer.onend = () => {
      if (!wantListeningRef.current) {
        setListening(false);
        return;
      }
      try {
        recognizer.start();
      } catch {
        wantListeningRef.current = false;
        setListening(false);
      }
    };
    recognizer.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wantListeningRef.current = false;
        setListening(false);
        setGpsStatus('Voice Off • Mic Blocked');
      }
    };
    recognizerRef.current = recognizer;
    return () => {
      wantListeningRef.current = false;
      recognizer.onresult = null;
      recognizer.onend = null;
      recognizer.onerror = null;
      try {
        recognizer.abort();
      } catch {
        /* already stopped */
      }
    };
  }, [voiceSupported]);

  const toggleListening = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (!recognizer) {
      speak('Voice commands need Chrome or Safari with the microphone allowed.');
      return;
    }
    if (wantListeningRef.current) {
      wantListeningRef.current = false;
      setListening(false);
      setGpsStatus(hole ? `Hole ${hole.number} • Par ${hole.par}` : 'GPS Ready • High Accuracy');
      try {
        recognizer.stop();
      } catch {
        /* already stopped */
      }
      return;
    }
    wantListeningRef.current = true;
    try {
      recognizer.start();
      setListening(true);
      setGpsStatus('Voice Live • Hands-Free');
    } catch {
      wantListeningRef.current = false;
      setListening(false);
    }
  }, [hole, speak]);

  /* ---------------- Live GPS (foreground only) ---------------- */
  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsTrackingStatus('stopped');
  }, []);

  const startGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) return;
    if (!navigator.geolocation) {
      setGpsTrackingStatus('unsupported');
      return;
    }
    setGpsTrackingStatus('locating');
    try {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const checked = checkGpsPosition(position);
          setGpsClock(Date.now());
          if (!checked.accepted) {
            if (checked.reason === 'weak' || checked.reason === 'invalid') setGpsFix(null);
            setGpsTrackingStatus(checked.reason === 'weak' ? 'weak' : 'locating');
            return;
          }
          setGpsFix(checked.fix);
          setGpsTrackingStatus('tracking');
        },
        (error) => {
          if (error?.code === 1) {
            setGpsFix(null);
            setGpsTrackingStatus('denied');
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
          } else if (error?.code === 2) {
            setGpsFix(null);
            setGpsTrackingStatus('unavailable');
          } else {
            setGpsTrackingStatus('locating');
          }
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
      );
      watchIdRef.current = id;
    } catch {
      setGpsTrackingStatus('unavailable');
    }
  }, []);

  // Run while Apex is open; keep the latest fix private and never store it.
  // Closing the screen removes the browser geolocation watcher.
  useEffect(() => {
    startGpsTracking();
    const timer = setInterval(() => setGpsClock(Date.now()), 5000);
    return () => {
      clearInterval(timer);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [startGpsTracking]);

  const locate = useCallback(() => {
    startGpsTracking();
    if (gpsMode === 'live') {
      setPlayerFocusNonce((n) => n + 1);
      setGpsStatus('GPS position located');
    } else if (gpsMode === 'unverified') {
      setGpsStatus('Unverified course layout — GPS distance disabled');
    } else {
      setGpsStatus('Tee preview — GPS not at this hole or signal unavailable');
    }
    // Never change coords here: they describe the selected course, not us.
  }, [gpsMode, startGpsTracking]);

  const focusCourse = useCallback((lat, lng, label = 'Searched area') => {
    // Invalidate a course request so an old server reply cannot move us back.
    courseRequestRef.current += 1;
    setCourseId(null);
    setHoles([]);
    setHoleIndex(0);
    setCourseLoading(false);
    setCourseError('');
    const position = [lat, lng];
    setCoords({ tee: position, layup: position, pin: position });
    setFocusCenter(position);
    setFocusNonce((n) => n + 1);
    setGpsStatus(`Viewing ${label} • Select a golf course`);
  }, []);

  const moveTarget = useCallback((key, latlng) => {
    setCoords((prev) => ({ ...prev, [key]: [latlng.lat, latlng.lng] }));
  }, []);

  /* ---------------- Bag ---------------- */
  const updateClub = useCallback((index, patch) => {
    setClubs((prev) => prev.map((club, i) => (i === index ? { ...club, ...patch } : club)));
  }, []);

  const resetBag = useCallback(() => setClubs(DEFAULT_CLUBS), []);

  /* ---------------- Logged shots (what actually flew) ---------------- */
  const logShot = useCallback((shot) => {
    setShots((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        ...shot,
        clubName: clubs.find((club) => club.id === shot.clubId)?.name ?? 'Club',
        holeNumber: hole?.number ?? null,
        roundSessionId,
      },
      ...prev,
    ]);
  }, [clubs, hole, roundSessionId]);

  const removeShot = useCallback((id) => {
    setShots((prev) => prev.filter((shot) => shot.id !== id));
  }, []);

  const resetShots = useCallback(() => setShots([]), []);

  /* ---------------- Scorecard ---------------- */
  const updateHole = useCallback((index, patch) => {
    setScorecard((prev) => prev.map((hole, i) => (i === index ? { ...hole, ...patch } : hole)));
  }, []);

  const resetScorecard = useCallback(() => {
    setScorecard(createDefaultScorecard());
    setRoundSessionId(newRoundSessionId());
  }, []);

  /* ---------------- Round history (on this device) ---------------- */
  const saveRound = useCallback(() => {
    if (!stats.holes) return false;
    const roundShots = shots.filter((shot) => shot.roundSessionId === roundSessionId);
    setRounds(addRound(buildRound({ scorecard, courseName: course?.name, shots: roundShots, roundSessionId })));
    return true;
  }, [course, scorecard, shots, stats.holes, roundSessionId]);

  const deleteRound = useCallback((id) => setRounds(removeRound(id)), []);

  const value = useMemo(
    () => ({
      env,
      setEnv,
      units,
      setUnits,
      audioSink,
      setAudioSink,
      course,
      courseId,
      hole,
      holeIndex,
      holes,
      courseLoading,
      courseError,
      activeHoleNumber,
      selectCourse,
      goToHole,
      nextHole,
      prevHole,
      clubs,
      learnedClubs,
      shots,
      logShot,
      removeShot,
      resetShots,
      lastSwing,
      setLastSwing,
      caddie,
      updateCaddie,
      coords,
      scorecard,
      bpm,
      setBpm,
      distances,
      stats,
      strokes,
      gpsStatus,
      gpsFix,
      gpsMode,
      gpsTrackingStatus,
      playerFocusNonce,
      startGpsTracking,
      stopGpsTracking,
      shotOrigin,
      focusCenter,
      focusNonce,
      voices,
      listening,
      lastHeard,
      locate,
      focusCourse,
      moveTarget,
      updateClub,
      resetBag,
      updateHole,
      resetScorecard,
      rounds,
      saveRound,
      deleteRound,
      speak,
      briefing,
      toggleListening,
      scoreDraft,
      commitScoreDraft,
      clearScoreDraft,
      voiceSupported,
    }),
    [
      env,
      units,
      audioSink,
      course,
      courseId,
      hole,
      holeIndex,
      holes,
      courseLoading,
      courseError,
      activeHoleNumber,
      selectCourse,
      goToHole,
      nextHole,
      prevHole,
      clubs,
      learnedClubs,
      shots,
      lastSwing,
      logShot,
      removeShot,
      resetShots,
      caddie,
      updateCaddie,
      coords,
      scorecard,
      bpm,
      distances,
      stats,
      strokes,
      gpsStatus,
      gpsFix,
      gpsMode,
      gpsTrackingStatus,
      playerFocusNonce,
      startGpsTracking,
      stopGpsTracking,
      shotOrigin,
      focusCenter,
      focusNonce,
      voices,
      listening,
      lastHeard,
      locate,
      focusCourse,
      moveTarget,
      updateClub,
      resetBag,
      updateHole,
      resetScorecard,
      rounds,
      saveRound,
      deleteRound,
      speak,
      briefing,
      toggleListening,
      scoreDraft,
      commitScoreDraft,
      clearScoreDraft,
      voiceSupported,
    ],
  );

  return <GolfContext.Provider value={value}>{children}</GolfContext.Provider>;
}

export function useGolf() {
  const context = useContext(GolfContext);
  if (!context) throw new Error('useGolf must be used inside GolfProvider');
  return context;
}
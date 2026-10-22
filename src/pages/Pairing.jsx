import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardCopy, Radio, RefreshCcw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGolf } from '@/lib/GolfContext';

const BOX = 'w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground';
const BTN = 'min-h-12 w-full rounded-xl border border-primary/50 bg-primary/15 px-3 py-2 text-sm font-bold text-primary disabled:opacity-40';
const rtcSupported = () => typeof RTCPeerConnection !== 'undefined';

async function completeIce(pc) {
  if (pc.iceGatheringState === 'complete') return;
  await new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      pc.removeEventListener('icegatheringstatechange', check);
      clearTimeout(timer);
      resolve();
    };
    const check = () => { if (pc.iceGatheringState === 'complete') done(); };
    const timer = setTimeout(done, 12000);
    pc.addEventListener('icegatheringstatechange', check);
    check();
  });
}

function parseSignal(raw, kind) {
  if (raw.length > 150000) throw new Error('Connection text is too long.');
  const data = JSON.parse(raw);
  if (data.v !== 1 || data.type !== kind || !/^[0-9]{6}$/.test(String(data.pin))
    || typeof data.sdp !== 'string' || data.sdp.length > 120000) {
    throw new Error('This is not a valid APEX ' + kind + ' code.');
  }
  return data;
}

export default function Pairing() {
  const { course, hole, distances, stats, shots, units } = useGolf();
  const [role, setRole] = useState('sender');
  const [offerText, setOfferText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [inbound, setInbound] = useState('');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('Not paired');
  const [linked, setLinked] = useState(false);
  const [remote, setRemote] = useState(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const latestRef = useRef(null);
  const snapshot = {
    courseName: course?.name || 'Course not selected',
    hole: hole?.number || null,
    par: hole?.par || null,
    distanceYards: distances?.direct || null,
    club: distances?.club?.name || null,
    scoredHoles: stats?.holes || 0,
    grossScore: stats?.score || 0,
    putts: stats?.putts || 0,
    loggedShots: shots.length,
    units,
    updated: new Date().toISOString(),
  };
  latestRef.current = snapshot;

  const shutdown = () => {
    try { channelRef.current?.close(); } catch { /* already closed */ }
    try { peerRef.current?.close(); } catch { /* already closed */ }
    channelRef.current = null; peerRef.current = null;
    setLinked(false);
  };
  useEffect(() => () => {
    try { channelRef.current?.close(); peerRef.current?.close(); } catch { /* ignore */ }
  }, []);
  const send = () => {
    const channel = channelRef.current;
    if (channel?.readyState === 'open') {
      try { channel.send(JSON.stringify({ kind: 'round', data: latestRef.current })); } catch { /* disconnected */ }
    }
  };
  useEffect(() => { if (role === 'sender') send(); }, [
    role, snapshot.courseName, snapshot.hole, snapshot.par,
    snapshot.distanceYards, snapshot.club, snapshot.scoredHoles,
    snapshot.grossScore, snapshot.putts, snapshot.loggedShots, units,
  ]);
  const attachChannel = (channel) => {
    channelRef.current = channel;
    channel.onopen = () => {
      setLinked(true);
      setStatus('Connected over local peer-to-peer channel.');
      send();
    };
    channel.onclose = () => { setLinked(false); setStatus('Connection closed.'); };
    channel.onerror = () => { setStatus('Pairing channel error.'); };
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.kind === 'round' && typeof message.data?.courseName === 'string') setRemote(message.data);
      } catch { /* discard invalid messages */ }
    };
  };
  const createPeer = () => {
    const pc = new RTCPeerConnection({ iceServers: [] });
    peerRef.current = pc;
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') setStatus('Connection failed. Both devices should be on the same Wi-Fi.');
      if (pc.connectionState === 'disconnected') setStatus('Connection interrupted.');
    };
    pc.ondatachannel = (event) => attachChannel(event.channel);
    return pc;
  };
  const newPin = () => {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return String(100000 + values[0] % 900000);
  };
  const startPhone = async () => {
    if (!rtcSupported()) { setStatus('WebRTC is unavailable in this Android app.'); return; }
    shutdown(); setOfferText(''); setAnswerText(''); setRemote(null);
    try {
      const code = newPin(); setPin(code); setStatus('Creating an offer…');
      const pc = createPeer();
      attachChannel(pc.createDataChannel('apex-round', { ordered: true }));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await completeIce(pc);
      setOfferText(JSON.stringify({ v: 1, type: 'offer', pin: code, sdp: pc.localDescription.sdp }));
      setStatus('Copy the offer text to Lenny. Keep this page open.');
    } catch (error) { setStatus(error?.message || 'Could not create offer.'); shutdown(); }
  };
  const answerOnTablet = async () => {
    if (!rtcSupported()) { setStatus('WebRTC is unavailable in this Android app.'); return; }
    shutdown(); setAnswerText(''); setRemote(null);
    try {
      const offer = parseSignal(inbound.trim(), 'offer');
      setPin(offer.pin); setStatus('Creating Lenny answer…');
      const pc = createPeer();
      await pc.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await completeIce(pc);
      setAnswerText(JSON.stringify({ v: 1, type: 'answer', pin: offer.pin, sdp: pc.localDescription.sdp }));
      setStatus('Copy the answer text back to the S24. Keep this page open.');
    } catch (error) { setStatus(error?.message || 'Invalid offer.'); shutdown(); }
  };
  const finishPhone = async () => {
    try {
      const answer = parseSignal(inbound.trim(), 'answer');
      if (answer.pin !== pin) throw new Error('Pairing PIN does not match. Start again.');
      if (!peerRef.current) throw new Error('Create the offer on the S24 first.');
      await peerRef.current.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
      setStatus('Answer accepted. Waiting for Wi-Fi peer connection…');
    } catch (error) { setStatus(error?.message || 'Could not connect.'); }
  };
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setStatus('Code copied. Transfer it to your other device.'); }
    catch { setStatus('Clipboard unavailable. Select the code text and copy manually.'); }
  };
  return (
    <div className="absolute inset-0 overflow-y-auto px-3 pb-8 pt-3">
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader title="S24 ↔ Lenny" subtitle="Peer-to-peer round display on the same Wi-Fi">
          <Link to="/more" className="rounded-lg border border-border bg-muted/60 p-2 text-foreground" aria-label="Back to More"><ArrowLeft className="h-4 w-4" /></Link>
        </PageHeader>
        <section className="glass-panel space-y-3 rounded-2xl p-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Experimental local WebRTC pairing. No account or cloud relay. On S24 choose Send; on Lenny choose Display. Exchange the full offer and answer text between devices. A six-digit PIN verifies the exchange but cannot connect the devices by itself. Wi-Fi and Android WebRTC support are required.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { shutdown(); setRole('sender'); setInbound(''); setPin(''); }} className={BTN + (role === 'sender' ? '' : ' opacity-60')}>S24 · Send</button>
            <button type="button" onClick={() => { shutdown(); setRole('receiver'); setInbound(''); setPin(''); }} className={BTN + (role === 'receiver' ? '' : ' opacity-60')}>Lenny · Display</button>
          </div>
          <p role="status" className="rounded-lg border border-border bg-muted/50 p-2 text-xs text-foreground">{status}</p>
          {pin && <p className="text-center text-sm font-bold tracking-[0.16em] text-primary">PAIRING PIN {pin}</p>}
          {role === 'sender' ? <>
            <button type="button" onClick={startPhone} className={BTN}>1. Create S24 offer</button>
            {offerText && <>
              <p className="text-xs text-muted-foreground">Copy this entire offer to Lenny:</p>
              <textarea readOnly value={offerText} className={BOX + ' h-24'} aria-label="S24 offer text" />
              <button type="button" onClick={() => copy(offerText)} className={BTN}><ClipboardCopy className="mr-2 inline h-4 w-4" /> Copy offer</button>
            </>}
            <label className="block text-xs font-semibold text-foreground">3. Paste the Lenny answer here
              <textarea value={inbound} onChange={(e) => setInbound(e.target.value)} className={BOX + ' mt-1 h-24'} placeholder="Paste full APEX answer" />
            </label>
            <button type="button" onClick={finishPhone} disabled={!inbound.trim() || !offerText} className={BTN}>4. Connect S24 to Lenny</button>
          </> : <>
            <label className="block text-xs font-semibold text-foreground">2. Paste the S24 offer here
              <textarea value={inbound} onChange={(e) => setInbound(e.target.value)} className={BOX + ' mt-1 h-24'} placeholder="Paste full APEX offer" />
            </label>
            <button type="button" onClick={answerOnTablet} disabled={!inbound.trim()} className={BTN}>3. Create Lenny answer</button>
            {answerText && <>
              <p className="text-xs text-muted-foreground">Copy the entire answer back to the S24:</p>
              <textarea readOnly value={answerText} className={BOX + ' h-24'} aria-label="Lenny answer text" />
              <button type="button" onClick={() => copy(answerText)} className={BTN}><ClipboardCopy className="mr-2 inline h-4 w-4" /> Copy answer</button>
            </>}
          </>}
          <button type="button" onClick={() => { shutdown(); setStatus('Pairing reset.'); setPin(''); setOfferText(''); setAnswerText(''); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-xs font-bold text-foreground">
            <RefreshCcw className="h-4 w-4" /> Disconnect / Reset
          </button>
        </section>
        {role === 'receiver' && <section className="glass-panel rounded-2xl p-3">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground"><Radio className="h-4 w-4 text-primary" /> Lenny round display</h3>
          {remote ? <div className="space-y-2">
            <p className="text-lg font-black text-foreground">{remote.courseName}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Hole', remote.hole || '—'], ['Par', remote.par || '—'],
                ['Distance (yards)',remote.distanceYards === null ? '—' : Math.round(remote.distanceYards)],
                ['Club',remote.club || '—'], ['Scored holes',remote.scoredHoles], ['Total putts',remote.putts],
              ].map(([label,value])=><div key={label} className="rounded-lg bg-muted/50 p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="text-lg font-bold text-foreground">{value}</p></div>)}
            </div>
            <p className="text-xs text-muted-foreground">Live while the peer link is connected. This view is read-only.</p>
          </div> : <p className="text-xs text-muted-foreground">{linked ? 'Connected. Awaiting current round data.' : 'Waiting for S24 connection.'}</p>}
        </section>}
      </div>
    </div>
  );
}

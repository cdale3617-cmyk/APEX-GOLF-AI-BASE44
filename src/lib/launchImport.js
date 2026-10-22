/** Load real, user-exported launch-monitor CSV measurements.
 *  These are imported measurements, NOT measurements taken by the app.
 */
function columns(line) {
  const fields = []; let field = ''; let quoted = false;
  for (let i=0; i<line.length; i++) {
    const c=line[i];
    if (c==='"' && quoted && line[i+1]==='"') { field += '"'; i++; continue; }
    if (c==='"') { quoted=!quoted; continue; }
    if (c===',' && !quoted) { fields.push(field.trim()); field=''; continue; }
    field += c;
  }
  fields.push(field.trim());
  return fields;
}
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g,'');
function pick(headers, cells, choices) {
  const index = headers.findIndex((header) => choices.some((choice) => norm(header)===norm(choice)));
  return index < 0 ? null : cells[index] ?? null;
}
function numeric(value) {
  if (value===null || value==='') return null;
  const result=Number(String(value).replace(/[°%]/g,'').trim());
  return Number.isFinite(result) ? result : null;
}
export function parseLaunchMonitorCsv(text) {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('Choose a CSV file smaller than 2 MB.');
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter((line)=>line.trim());
  if (lines.length < 2) throw new Error('The CSV needs a header row and at least one shot.');
  const headers=columns(lines[0]);
  if (headers.length<2) throw new Error('Use a comma-delimited CSV.');
  const shots=[];
  for (const line of lines.slice(1,101)) {
    const cells=columns(line);
    const speed=numeric(pick(headers,cells,['Ball Speed','BallSpeed','Ball Speed (mph)','Ball Speed MPH','Ball Speed (km/h)','Ball Speed KPH','Ball Speed (m/s)','Ball Speed M/S']));
    const angle=numeric(pick(headers,cells,['Launch Angle','LaunchAngle','Launch (deg)','Vertical Launch Angle']));
    if (speed===null || angle===null || speed<=0 || angle<0 || angle>90) continue;
    const speedHeader=headers.find((header)=>/ball.?speed/i.test(header))||'';
    const speedKmh=/m\/s/i.test(speedHeader)?speed*3.6:/mph/i.test(speedHeader)?speed*1.609344:speed;
    const direction=numeric(pick(headers,cells,['Launch Direction','Horizontal Launch Angle','LaunchDirection','Direction']))??0;
    const sideSpin=numeric(pick(headers,cells,['Side Spin','Sidespin','Spin Axis Proxy','SideSpin RPM']))??0;
    const spin=numeric(pick(headers,cells,['Spin Rate','Backspin','Total Spin','Spin RPM']));
    const carry=numeric(pick(headers,cells,['Carry','Carry Distance','Carry (m)','Carry (yd)','Carry (yards)']));
    const club=pick(headers,cells,['Club','Club Name','ClubName'])||'';
    shots.push({ speedKmh,angle,direction,sideSpin,spin,carry,club });
  }
  if (!shots.length) throw new Error('No shots with readable Ball Speed and Launch Angle columns were found.');
  return shots;
}

/** Native-looking exports; generated from the actual saved scorecard. */
export async function exportScorecardPdf({ scorecard, courseName }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const rows = scorecard.filter((h) => h.score > 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('APEX GOLF AI — SCORECARD', 15, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(String(courseName || 'My golf round').slice(0, 75), 15, 26);
  doc.text(new Date().toLocaleDateString(), 15, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('HOLE', 15, 42);
  doc.text('PAR', 42, 42);
  doc.text('SCORE', 68, 42);
  doc.text('PUTTS', 100, 42);
  doc.text('FIR', 134, 42);
  doc.text('GIR', 166, 42);
  doc.setFont('helvetica', 'normal');
  let total = 0, par = 0, putts = 0;
  rows.forEach((h, i) => {
    const y = 49 + i * 9;
    const strokes = (Number(h.score) || 0) + (Number(h.penalties) || 0);
    total += strokes; par += Number(h.par) || 0; putts += Number(h.putts) || 0;
    [h.hole, h.par, strokes, h.putts ?? 0, h.fir ? 'Yes' : 'No', h.gir ? 'Yes' : 'No']
      .forEach((v, col) => doc.text(String(v), [15, 42, 68, 100, 134, 166][col], y));
  });
  const y = Math.min(245, 52 + rows.length * 9);
  doc.setFont('helvetica', 'bold');
  doc.text('Total: ' + total + '   Par: ' + par + '   Relative: ' + (total >= par ? '+' : '') + (total - par) +
    '   Putts: ' + putts, 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Score includes penalty strokes; individual shot distances are logged separately.', 15, y + 8);
  doc.save('Apex-Scorecard-' + new Date().toISOString().slice(0, 10) + '.pdf');
}
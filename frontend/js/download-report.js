(function () {
    const btn = document.getElementById('downloadReportBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const athleteSelect = document.getElementById('athleteSelect');
        const athleteId = athleteSelect?.value;
        const athleteName = athleteSelect?.options[athleteSelect.selectedIndex]?.text || 'Athlete';

        if (!athleteId) {
            alert('Please select an athlete first.');
            return;
        }

        const token = (JSON.parse(localStorage.getItem('user')) || {}).token;
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const sport = user.sport || 'cricket';

        const SPORT_METRICS = {
            cricket: ['Batting Strike Rate', 'Bowling Speed (km/h)', 'Fielding Accuracy (%)', 'Batting Average'],
            tennis: ['Serve Speed (km/h)', 'First Serve %', 'Rally Length', 'Break Points Won %'],
            kabaddi: ['Raid Points', 'Tackle Points', 'Super Raids'],
        };

        const realMetrics = ['attendance', 'sessions'];
        const mockMetrics = SPORT_METRICS[sport] || [];
        const allMetrics = [...realMetrics, ...mockMetrics];

        btn.textContent = '⏳ Generating...';
        btn.disabled = true;

        try {
            const results = await Promise.all(allMetrics.map(async metric => {
                const isReal = realMetrics.includes(metric);
                // ← THIS is the fix: real metrics use /real, mock use base endpoint
                const url = isReal
                    ? `http://localhost:5000/api/performance/real?athleteId=${athleteId}&metric=${encodeURIComponent(metric)}&months=6`
                    : `http://localhost:5000/api/performance?athleteId=${athleteId}&metric=${encodeURIComponent(metric)}`;
                try {
                    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                    const data = await res.json();
                    // /real returns { labels, values }
                    // /performance returns { records, benchmark }
                    if (isReal) {
                        return { metric, labels: data.labels || [], values: data.values || [] };
                    } else {
                        const labels = (data.records || []).map(r =>
                            new Date(r.recordedDate).toLocaleDateString('en-US', { month: 'short' })
                        );
                        const values = (data.records || []).map(r => r.value ?? 0);
                        return { metric, labels, values };
                    }
                } catch {
                    return { metric, labels: [], values: [] };
                }
            }));

            const labels = results.find(r => r.labels.length > 0)?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

            const headers = ['Date', ...results.map(r => r.metric)];
            const rows = labels.map((label, i) => {
                return [label, ...results.map(r => r.values[i] ?? 0)];
            });

            const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url2 = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url2;
            a.download = `${athleteName}_full_report.csv`.replace(/\s+/g, '_');
            a.click();
            URL.revokeObjectURL(url2);
        } catch (err) {
            alert('Failed to generate report.');
        } finally {
            btn.textContent = '⬇ Download CSV';
            btn.disabled = false;
        }
    });
})();
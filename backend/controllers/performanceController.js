const Performance = require('../models/Performance');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');

// ── Sport guard ───────────────────────────────────────────────
async function verifyAthleteSport(athleteId, userSport) {
    if (!athleteId || !userSport) return true;
    const athlete = await User.findById(athleteId, 'sport').lean();
    if (!athlete) return false;
    return athlete.sport === userSport;
}

const mockData = {
    'Batting Strike Rate': {
        records: [
            { value: 110, recordedDate: '2026-01-01' },
            { value: 118, recordedDate: '2026-02-01' },
            { value: 132, recordedDate: '2026-03-01' },
            { value: 128, recordedDate: '2026-04-01' },
            { value: 148, recordedDate: '2026-05-01' },
            { value: 162, recordedDate: '2026-06-01' },
        ],
        benchmark: 143,
        athlete: 'R. Gaikwad',
        metric: 'Batting Strike Rate',
    },
};

exports.getPerformanceData = async (req, res) => {
    try {
        const { athleteId, metric } = req.query;

        if (athleteId) {
            const allowed = await verifyAthleteSport(athleteId, req.user?.sport);
            if (!allowed) return res.status(403).json({ message: 'Access denied: athlete belongs to a different sport.' });
        }

        const filters = {};
        if (athleteId) filters.athlete = athleteId;
        if (metric) filters.metric = metric;

        const performance = await Performance.find(filters).sort({ recordedDate: 1 });

        if (!performance.length) {
            const fallback = mockData[metric] || Object.values(mockData)[0];
            return res.status(200).json({
                records: fallback.records,
                benchmark: fallback.benchmark,
                athlete: fallback.athlete,
                metric: fallback.metric,
            });
        }

        res.status(200).json({
            records: performance.map(record => ({
                value: record.value,
                recordedDate: record.recordedDate,
            })),
            benchmark: performance[0].benchmark || 0,
            athlete: athleteId || 'Athlete',
            metric: metric || performance[0].metric,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addPerformanceRecord = async (req, res) => {
    try {
        const { athleteId, metric, value, benchmark, recordedDate } = req.body;

        if (athleteId) {
            const allowed = await verifyAthleteSport(athleteId, req.user?.sport);
            if (!allowed) return res.status(403).json({ message: 'Access denied: athlete belongs to a different sport.' });
        }

        const record = new Performance({
            athlete: athleteId,
            metric,
            value,
            benchmark,
            recordedDate,
            recordedBy: req.user?._id,
        });

        await record.save();
        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBowlerWorkload = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const workloads = await Performance.aggregate([
            { $match: { metric: 'bowling_overs', recordedDate: { $gte: sevenDaysAgo } } },
            { $group: { _id: '$athlete', totalOvers: { $sum: '$value' } } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'athleteData',
                }
            },
            { $unwind: { path: '$athleteData', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    athleteName: '$athleteData.name',
                    totalOvers: 1,
                }
            },
        ]);

        const response = workloads.length > 0 ? workloads.map(item => {
            let riskLevel = 'OK';
            if (item.totalOvers > 30) riskLevel = 'HIGH_RISK';
            else if (item.totalOvers >= 20) riskLevel = 'WATCH';
            return {
                athleteName: item.athleteName || 'Unknown',
                totalOvers: item.totalOvers,
                riskLevel,
            };
        }) : [
            { athleteName: 'M. Pathirana', totalOvers: 32, riskLevel: 'HIGH_RISK' },
            { athleteName: 'J. Bumrah', totalOvers: 22, riskLevel: 'WATCH' },
        ];

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// ── Generic workload alerts (sport-aware) ──────────────────────
const WORKLOAD_CONFIG = {
    cricket: { metric: 'Bowling Speed (km/h)', unit: 'overs', highThreshold: 30, watchThreshold: 20, label: 'overs' },
    tennis: { metric: 'Serve Speed (km/h)', unit: 'serves', highThreshold: 180, watchThreshold: 120, label: 'serves' },
    kabaddi: { metric: 'Raid Points', unit: 'raids', highThreshold: 25, watchThreshold: 15, label: 'raids' },
};

exports.getWorkloadAlerts = async (req, res) => {
    try {
        const sport = req.user?.sport || 'cricket';
        const config = WORKLOAD_CONFIG[sport] || WORKLOAD_CONFIG.cricket;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Get athlete IDs for this sport only
        const athletes = await User.find({ role: 'athlete', sport }, '_id name').lean();
        const athleteIds = athletes.map(a => a._id);
        const athleteMap = {};
        athletes.forEach(a => { athleteMap[a._id.toString()] = a.name; });

        const records = await Performance.find({
            athlete: { $in: athleteIds },
            metric: config.metric,
            recordedDate: { $gte: sevenDaysAgo },
        }).lean();

        const totals = {};
        records.forEach(r => {
            const id = r.athlete.toString();
            totals[id] = (totals[id] || 0) + (r.value || 0);
        });

        const alerts = Object.entries(totals)
            .map(([athleteId, total]) => {
                let badge = null;
                if (total >= config.highThreshold) badge = { badge: 'HIGH RISK', badgeClass: 'red', icon: '⚠️' };
                else if (total >= config.watchThreshold) badge = { badge: 'WATCH', badgeClass: 'amber', icon: '✅' };
                if (!badge) return null;
                return {
                    title: athleteMap[athleteId] || 'Unknown',
                    meta: `${total} ${config.label} · last 7 days`,
                    ...badge,
                };
            })
            .filter(Boolean)
            .sort((a, b) => (a.badgeClass === 'red' ? -1 : 1));

        res.status(200).json({
            label: `${config.label.toUpperCase()} WORKLOAD MONITOR`,
            criticalCount: alerts.filter(a => a.badgeClass === 'red').length,
            alerts,
        });
    } catch (error) {
        console.error('getWorkloadAlerts error:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getRealMetrics = async (req, res) => {
    try {
        const { athleteId, metric, months, granularity } = req.query;
        const numMonths = parseInt(months, 10) || 6;
        const isMonthDrill = granularity === 'month' && req.query.month;

        if (athleteId) {
            const allowed = await verifyAthleteSport(athleteId, req.user?.sport);
            if (!allowed) return res.status(403).json({ message: 'Access denied: athlete belongs to a different sport.' });
        }

        if (isMonthDrill) {
            const [year, mon] = req.query.month.split('-').map(Number);
            const daysInMonth = new Date(year, mon, 0).getDate();

            const dayBuckets = [];
            for (let d = 1; d <= daysInMonth; d++) {
                dayBuckets.push({
                    label: `${d} ${new Date(year, mon - 1, d).toLocaleDateString('en-US', { month: 'short' })}`,
                    year,
                    month: mon - 1,
                    day: d,
                });
            }

            if (metric === 'attendance') {
                const attendanceRecords = await Attendance.find({ 'records.athlete': athleteId });
                const values = dayBuckets.map(bucket => {
                    const rec = attendanceRecords.find(a => {
                        const ad = new Date(a.date);
                        return ad.getFullYear() === bucket.year &&
                            ad.getMonth() === bucket.month &&
                            ad.getDate() === bucket.day;
                    });
                    if (!rec) return 0;
                    const entry = rec.records.find(r => String(r.athlete) === String(athleteId));
                    if (!entry) return 0;
                    return entry.status === 'present' ? 100 : 0;
                });
                return res.status(200).json({
                    labels: dayBuckets.map(b => b.label),
                    values,
                    metric: `Attendance % — ${new Date(year, mon - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                    benchmark: null,
                });
            }

            if (metric === 'sessions') {
                const athlete = await User.findById(athleteId);
                const athleteName = athlete?.name;
                const sessions = await Session.find({ athleteName: { $exists: true, $ne: '' } });
                const values = dayBuckets.map(bucket => {
                    return sessions.filter(s => {
                        const sd = new Date(s.sessionDate);
                        return s.athleteName === athleteName &&
                            sd.getFullYear() === bucket.year &&
                            sd.getMonth() === bucket.month &&
                            sd.getDate() === bucket.day;
                    }).length;
                });
                return res.status(200).json({
                    labels: dayBuckets.map(b => b.label),
                    values,
                    metric: `Sessions — ${new Date(year, mon - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                    benchmark: null,
                });
            }

            const mockMonthly = {
                'Batting Strike Rate': { data: [110, 118, 132, 128, 148, 162], benchmark: 143 },
                'Bowling Speed (km/h)': { data: [118, 122, 125, 121, 128, 132], benchmark: 130 },
                'Fielding Accuracy (%)': { data: [72, 75, 78, 74, 80, 85], benchmark: 80 },
                'Bowling Economy': { data: [7.2, 6.8, 6.5, 7.0, 6.2, 5.9], benchmark: 6.5 },
                'Batting Average': { data: [32, 35, 38, 36, 42, 48], benchmark: 40 },
                'Catches per Session': { data: [2, 3, 2, 4, 3, 5], benchmark: 4 },
            };
            const dataset = mockMonthly[metric] || mockMonthly['Batting Strike Rate'];
            const now = new Date();
            const monthsAgo = (now.getFullYear() - year) * 12 + (now.getMonth() - (mon - 1));
            const idx = Math.max(0, Math.min(5, 5 - monthsAgo));
            const base = dataset.data[idx];
            const values = dayBuckets.map(bucket => {
                const variation = Math.sin(bucket.day * 0.7 + idx) * 0.05 * base;
                return Math.round((base + variation) * 10) / 10;
            });
            return res.status(200).json({
                labels: dayBuckets.map(b => b.label),
                values,
                metric: `${metric} — ${new Date(year, mon - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                benchmark: dataset.benchmark,
            });
        }

        const isDaily = granularity === 'daily';

        if (!athleteId) {
            return res.status(400).json({ message: 'athleteId is required' });
        }

        if (isDaily) {
            const dayBuckets = [];
            const now = new Date();
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                dayBuckets.push({
                    label: `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`,
                    year: d.getFullYear(),
                    month: d.getMonth(),
                    day: d.getDate(),
                });
            }

            if (metric === 'attendance') {
                const attendanceRecords = await Attendance.find({ 'records.athlete': athleteId });
                const values = dayBuckets.map(bucket => {
                    const rec = attendanceRecords.find(a => {
                        const ad = new Date(a.date);
                        return ad.getFullYear() === bucket.year &&
                            ad.getMonth() === bucket.month &&
                            ad.getDate() === bucket.day;
                    });
                    if (!rec) return 0;
                    const entry = rec.records.find(r => String(r.athlete) === String(athleteId));
                    if (!entry) return 0;
                    return entry.status === 'present' ? 100 : 0;
                });
                return res.status(200).json({
                    labels: dayBuckets.map(b => b.label),
                    values,
                    metric: 'Attendance (daily)',
                    benchmark: null,
                });
            }

            if (metric === 'sessions') {
                const athlete = await User.findById(athleteId);
                const athleteName = athlete?.name;
                const sessions = await Session.find({ athleteName: { $exists: true, $ne: '' } });
                const values = dayBuckets.map(bucket => {
                    return sessions.filter(s => {
                        const sd = new Date(s.sessionDate);
                        return s.athleteName === athleteName &&
                            sd.getFullYear() === bucket.year &&
                            sd.getMonth() === bucket.month &&
                            sd.getDate() === bucket.day;
                    }).length;
                });
                return res.status(200).json({
                    labels: dayBuckets.map(b => b.label),
                    values,
                    metric: 'Sessions (daily)',
                    benchmark: null,
                });
            }

            const mockMonthly = {
                'Batting Strike Rate': { data: [110, 118, 132, 128, 148, 162], benchmark: 143 },
                'Bowling Speed (km/h)': { data: [118, 122, 125, 121, 128, 132], benchmark: 130 },
                'Fielding Accuracy (%)': { data: [72, 75, 78, 74, 80, 85], benchmark: 80 },
                'Bowling Economy': { data: [7.2, 6.8, 6.5, 7.0, 6.2, 5.9], benchmark: 6.5 },
                'Batting Average': { data: [32, 35, 38, 36, 42, 48], benchmark: 40 },
                'Catches per Session': { data: [2, 3, 2, 4, 3, 5], benchmark: 4 },
            };
            const dataset = mockMonthly[metric] || mockMonthly['Batting Strike Rate'];
            const now2 = new Date();
            const values = dayBuckets.map(bucket => {
                const monthsAgo = (now2.getFullYear() - bucket.year) * 12 +
                    (now2.getMonth() - bucket.month);
                const idx = Math.max(0, Math.min(5, 5 - monthsAgo));
                const base = dataset.data[idx];
                const variation = (Math.sin(bucket.day * 0.7 + idx) * 0.05 * base);
                return Math.round((base + variation) * 10) / 10;
            });
            return res.status(200).json({
                labels: dayBuckets.map(b => b.label),
                values,
                metric: `${metric} (daily)`,
                benchmark: dataset.benchmark,
            });
        }

        // --- MONTHLY ---
        const monthBuckets = [];
        const now = new Date();
        for (let i = numMonths - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthBuckets.push({
                label: d.toLocaleDateString('en-US', { month: 'short' }),
                year: d.getFullYear(),
                month: d.getMonth(),
            });
        }

        if (metric === 'sessions') {
            const sessions = await Session.find({ athleteName: { $exists: true, $ne: '' } });
            const athlete = await User.findById(athleteId);
            const athleteName = athlete?.name;
            const counts = monthBuckets.map(bucket => {
                return sessions.filter(s => {
                    const sd = new Date(s.sessionDate);
                    return s.athleteName === athleteName &&
                        sd.getFullYear() === bucket.year &&
                        sd.getMonth() === bucket.month;
                }).length;
            });
            return res.status(200).json({
                labels: monthBuckets.map(b => b.label),
                values: counts,
                metric: 'Session Count',
                benchmark: null,
            });
        }

        if (metric === 'attendance') {
            const attendanceRecords = await Attendance.find({ 'records.athlete': athleteId });
            const percentages = monthBuckets.map(bucket => {
                const monthRecords = attendanceRecords.filter(a => {
                    const ad = new Date(a.date);
                    return ad.getFullYear() === bucket.year && ad.getMonth() === bucket.month;
                });
                let presentCount = 0, totalCount = 0;
                monthRecords.forEach(a => {
                    const entry = a.records.find(r => String(r.athlete) === String(athleteId));
                    if (entry) {
                        totalCount += 1;
                        if (entry.status === 'present') presentCount += 1;
                    }
                });
                if (totalCount === 0) return 0;
                return Math.round((presentCount / totalCount) * 100);
            });
            return res.status(200).json({
                labels: monthBuckets.map(b => b.label),
                values: percentages,
                metric: 'Attendance %',
                benchmark: 90,
            });
        }

        return res.status(400).json({ message: 'Unknown metric. Use "attendance" or "sessions".' });
    } catch (error) {
        console.error('getRealMetrics error:', error);
        res.status(500).json({ message: error.message });
    }
};
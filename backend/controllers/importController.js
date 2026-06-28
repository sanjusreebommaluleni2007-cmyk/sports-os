const xlsx = require('xlsx');
const User = require('../models/User');
const Batch = require('../models/Batch');

// POST /api/import/bulk
// Owner only. Accepts base64-encoded xlsx in request body.
exports.bulkImport = async (req, res) => {
    try {
        const { fileData } = req.body; // base64 string sent from frontend

        if (!fileData) {
            return res.status(400).json({ message: 'No file data provided.' });
        }

        // Decode base64 → Buffer → workbook
        const buffer = Buffer.from(fileData, 'base64');
        const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });

        if (!workbook.SheetNames.length) {
            return res.status(400).json({ message: 'Excel file has no sheets.' });
        }

        // Pick the sheet matching the logged-in user's sport (e.g. "Kabaddi").
        // Falls back to the first sheet if no match is found (e.g. single-sheet
        // template files downloaded via "Download Template").
        const sheetName = workbook.SheetNames.find(
            name => name.toLowerCase() === (req.user?.sport || '').toLowerCase()
        ) || workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows.length) {
            return res.status(400).json({ message: 'Sheet is empty.' });
        }

        // Validate required columns exist
        const required = ['type', 'name', 'email', 'password'];
        const headers = Object.keys(rows[0]).map(k => k.trim().toLowerCase());
        const missing = required.filter(r => !headers.includes(r));
        if (missing.length) {
            return res.status(400).json({
                message: `Missing required columns: ${missing.join(', ')}`
            });
        }

        const VALID_TYPES = ['athlete', 'coach', 'head_coach'];
        const results = { created: 0, updated: 0, skipped: 0, errors: [] };

        // ── Pass 1: collect & upsert batches ──────────────────────
        const batchNames = [
            ...new Set(
                rows
                    .map(r => (r.batch || r.Batch || '').toString().trim())
                    .filter(Boolean)
            )
        ];

        for (const name of batchNames) {
            let batch = await Batch.findOne({ name });
            if (!batch) {
                // coachId/schedule/studentCount are left to schema
                // defaults / set in Pass 2 — do NOT pass schedule as an
                // array, it's a String field.
                await Batch.create({ name, athletes: [], sport: req.user?.sport || 'cricket' });
            }
        }

        // ── Pass 2: upsert users ───────────────────────────────────
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // 1-indexed + header row

            // Normalise keys (trim + lowercase for lookup)
            const get = (key) => (row[key] || row[key.charAt(0).toUpperCase() + key.slice(1)] || '').toString().trim();

            const type = get('type').toLowerCase();
            const name = get('name');
            const email = get('email').toLowerCase();
            const password = get('password');
            const batchRaw = get('batch'); // batch NAME string — stored as-is on User.batchAssigned
            const phone = get('phone');
            const dob = get('dob');

            // ── Validation ──
            if (!type || !name || !email || !password) {
                results.errors.push(`Row ${rowNum}: missing required field (type, name, email or password).`);
                results.skipped++;
                continue;
            }

            if (!VALID_TYPES.includes(type)) {
                results.errors.push(`Row ${rowNum}: invalid type "${type}". Must be athlete, coach, or head_coach.`);
                results.skipped++;
                continue;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                results.errors.push(`Row ${rowNum}: invalid email "${email}".`);
                results.skipped++;
                continue;
            }

            // NOTE: password is left PLAIN here on purpose. User.js's pre('save')
            // hook hashes it automatically on create() and on .save() when
            // isModified('password') is true. Hashing it here too would
            // double-hash it and break login for imported users.
            const userData = {
                name,
                email,
                password,
                role: type,
                sport: req.user?.sport || '',
                ...(batchRaw && { batchAssigned: batchRaw }),
                ...(phone && { phone }),
                ...(dob && { dob }),
            };

            // ── Upsert ──
            const existing = await User.findOne({ email });
            let userId;

            if (existing) {
                existing.name = name;
                existing.role = type;
                existing.sport = req.user?.sport || existing.sport;
                if (phone) existing.phone = phone;
                if (dob) existing.dob = dob;
                existing.password = password; // pre('save') hook will hash this
                if (batchRaw) existing.batchAssigned = batchRaw;

                await existing.save();
                userId = existing._id;
                results.updated++;
            } else {
                const newUser = await User.create(userData);
                userId = newUser._id;
                results.created++;
            }

            // Keep Batch in sync: athletes go into the athletes[] array,
            // coach/head_coach become the batch's single coachId.
            if (batchRaw) {
                const batchDoc = await Batch.findOne({ name: batchRaw });
                if (batchDoc) {
                    if (type === 'athlete') {
                        await Batch.findByIdAndUpdate(batchDoc._id, { $addToSet: { athletes: userId } });
                    } else {
                        await Batch.findByIdAndUpdate(batchDoc._id, { coachId: userId, $addToSet: { coaches: userId } });
                    }
                }
            }
        }

        return res.status(200).json({
            message: 'Import complete.',
            created: results.created,
            updated: results.updated,
            skipped: results.skipped,
            errors: results.errors,
            batchesProcessed: batchNames.length,
            sheetUsed: sheetName,
        });

    } catch (err) {
        console.error('Bulk import error:', err);
        return res.status(500).json({ message: 'Import failed.', error: err.message });
    }
};
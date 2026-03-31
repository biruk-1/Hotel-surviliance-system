/**
 * Blacklist matching scores (percent):
 * - Exact ID match: 100
 * - Same normalized name + same date of birth: 90
 * - Similar name (fuzzy): 60
 * Alert is created when best score > 70.
 */

function normalizeId(value) {
  if (value == null || value === '') return '';
  return String(value).trim().toLowerCase();
}

function normalizeName(value) {
  if (value == null || value === '') return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function namesEqual(a, b) {
  return normalizeName(a) === normalizeName(b);
}

function parseDateOnly(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function datesEqual(a, b) {
  const da = parseDateOnly(a);
  const db = parseDateOnly(b);
  if (!da || !db) return false;
  return da === db;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function nameSimilarityRatio(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (!na.length && !nb.length) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

const SIMILAR_NAME_THRESHOLD = 0.82;

function isSimilarName(a, b) {
  return nameSimilarityRatio(a, b) >= SIMILAR_NAME_THRESHOLD;
}

/**
 * @param {object} guest - { full_name, id_number, date_of_birth? }
 * @param {object} blacklistRow - row from blacklist table
 * @returns {number} score 0–100
 */
function scoreGuestAgainstBlacklistEntry(guest, blacklistRow) {
  if (normalizeId(guest.id_number) === normalizeId(blacklistRow.id_number)) {
    return 100;
  }

  if (
    namesEqual(guest.full_name, blacklistRow.full_name) &&
    datesEqual(guest.date_of_birth, blacklistRow.date_of_birth)
  ) {
    return 90;
  }

  if (isSimilarName(guest.full_name, blacklistRow.full_name)) {
    return 60;
  }

  return 0;
}

/**
 * @returns {{ bestScore: number, bestEntry: object|null, allAboveThreshold: Array<{entry, score}> }}
 */
function evaluateGuestAgainstBlacklist(guest, blacklistRows) {
  let bestScore = 0;
  let bestEntry = null;
  const allAboveThreshold = [];

  for (const row of blacklistRows) {
    const score = scoreGuestAgainstBlacklistEntry(guest, row);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = row;
    }
    if (score > 70) {
      allAboveThreshold.push({ entry: row, score });
    }
  }

  return { bestScore, bestEntry, allAboveThreshold };
}

module.exports = {
  scoreGuestAgainstBlacklistEntry,
  evaluateGuestAgainstBlacklist,
  normalizeId,
  normalizeName,
};

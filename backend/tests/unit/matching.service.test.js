const {
  scoreGuestAgainstBlacklistEntry,
  evaluateGuestAgainstBlacklist,
} = require('../../src/services/matching.service');

describe('matching.service', () => {
  const guestBase = {
    full_name: 'Jane  Doe',
    id_number: 'ID-001',
    date_of_birth: '1990-05-15',
  };

  describe('scoreGuestAgainstBlacklistEntry', () => {
    it('returns 100 on exact ID match (case/whitespace insensitive)', () => {
      const row = {
        full_name: 'Someone Else',
        id_number: '  id-001 ',
        date_of_birth: '1980-01-01',
      };
      expect(scoreGuestAgainstBlacklistEntry(guestBase, row)).toBe(100);
    });

    it('returns 90 when normalized name and date of birth match', () => {
      const row = {
        full_name: 'jane doe',
        id_number: 'different-id',
        date_of_birth: '1990-05-15T00:00:00.000Z',
      };
      expect(scoreGuestAgainstBlacklistEntry(guestBase, row)).toBe(90);
    });

    it('returns 60 when names are similar (fuzzy) but ID and DOB do not match higher rules', () => {
      const row = {
        full_name: 'Jon Smith',
        id_number: 'x',
        date_of_birth: '2000-01-01',
      };
      const guest = { full_name: 'John Smith', id_number: 'y', date_of_birth: '2001-01-01' };
      expect(scoreGuestAgainstBlacklistEntry(guest, row)).toBe(60);
    });

    it('returns 0 when there is no ID, name+DOB, or fuzzy-name match', () => {
      const row = {
        full_name: 'Completely Different',
        id_number: 'other',
        date_of_birth: '2000-01-01',
      };
      expect(scoreGuestAgainstBlacklistEntry(guestBase, row)).toBe(0);
    });

    it('prefers 100 over 90 when ID matches even if name differs', () => {
      const row = {
        full_name: 'Other Name',
        id_number: 'id-001',
        date_of_birth: '1990-05-15',
      };
      expect(scoreGuestAgainstBlacklistEntry(guestBase, row)).toBe(100);
    });

    it('returns 60 when name matches fuzzy but DOB differs (does not reach 90 without matching DOB)', () => {
      const row = {
        full_name: 'Jane Doe',
        id_number: 'diff',
        date_of_birth: '1991-05-15',
      };
      const guest = { full_name: 'Jane Doe', id_number: 'other', date_of_birth: '1990-05-15' };
      expect(scoreGuestAgainstBlacklistEntry(guest, row)).toBe(60);
    });
  });

  describe('evaluateGuestAgainstBlacklist', () => {
    it('picks best score and lists entries above threshold (>70)', () => {
      const rows = [
        { id_number: 'a', full_name: 'Low', date_of_birth: '2000-01-01' },
        { id_number: 'b', full_name: 'Jane Doe', date_of_birth: '1990-05-15' },
        { id_number: 'ID-001', full_name: 'x', date_of_birth: '2000-01-01' },
      ];
      const result = evaluateGuestAgainstBlacklist(guestBase, rows);
      expect(result.bestScore).toBe(100);
      expect(result.bestEntry.id_number).toBe('ID-001');
      expect(result.allAboveThreshold.length).toBe(2);
      expect(result.allAboveThreshold.map((x) => x.score).sort((a, b) => b - a)).toEqual([100, 90]);
    });

    it('returns zeros when blacklist is empty', () => {
      const result = evaluateGuestAgainstBlacklist(guestBase, []);
      expect(result.bestScore).toBe(0);
      expect(result.bestEntry).toBeNull();
      expect(result.allAboveThreshold).toEqual([]);
    });
  });
});

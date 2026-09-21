// Minimal stand-in for the Supabase query builder over the waiver_acceptances
// table, so tests can exercise the real "accepted at the current version" query
// (eq user, eq type, gte version) against a set of rows instead of hand-rolling
// a chain per test. Only the calls hasAcceptedWaiver makes are supported.
export type FakeWaiverRow = {
  user_id: string;
  waiver_type: string;
  version: number;
};

export function fakeWaiverTable(rows: FakeWaiverRow[]) {
  const eqCalls: [string, unknown][] = [];

  function query() {
    const filters: ((row: FakeWaiverRow) => boolean)[] = [];
    const q = {
      select: () => q,
      eq: (column: keyof FakeWaiverRow, value: unknown) => {
        eqCalls.push([column, value]);
        filters.push((row) => row[column] === value);
        return q;
      },
      gte: (column: keyof FakeWaiverRow, value: number) => {
        filters.push((row) => (row[column] as number) >= value);
        return q;
      },
      limit: () => q,
      // Awaiting the builder resolves the filtered rows, like the real client.
      then: (resolve: (result: unknown) => unknown) =>
        resolve({
          data: rows
            .filter((row) => filters.every((keep) => keep(row)))
            .map(() => ({ id: "waiver-row" })),
          error: null,
        }),
    };
    return q;
  }

  return { query, eqCalls };
}

"use client";

import { Component, useMemo, useState, type ReactNode } from "react";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatBytes, singaporeDay, singaporeTime } from "@/lib/analytics";
import styles from "./page.module.css";

class DataErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <section className={styles.panel} role="alert">Unable to load Convex data. Check the backend connection, then <button onClick={() => window.location.reload()}>retry</button>.</section> : this.props.children;
  }
}

export default function AnalyticsDashboard() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <p role="alert">Convex is not configured. Set NEXT_PUBLIC_CONVEX_URL to connect this page.</p>;
  return <DataErrorBoundary><ConnectedDashboard /></DataErrorBoundary>;
}

function ConnectedDashboard() {
  const [client] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));
  return <ConvexProvider client={client}><Dashboard /></ConvexProvider>;
}

function Dashboard() {
  const data = useQuery(api.cards.analytics);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("newest");
  const invalidRange = Boolean(start && end && start > end);
  const filtered = useMemo(() => (data?.cards ?? []).filter(card => {
    const day = singaporeDay(card._creationTime);
    return !invalidRange && (!start || day >= start) && (!end || day <= end)
      && (status === "all" || card.status === status)
      && (type === "all" || card.mimeType === type)
      && card._id.toLowerCase().includes(search.trim().toLowerCase());
  }).sort((a, b) => sort === "largest" ? b.byteSize - a.byteSize : sort === "oldest" ? a._creationTime - b._creationTime : b._creationTime - a._creationTime), [data, start, end, status, type, search, sort, invalidRange]);
  const daily = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of filtered) {
      const day = singaporeDay(card._creationTime);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);
  const max = Math.max(1, ...daily.map(([, count]) => count));
  const published = filtered.filter(card => card.status === "published").length;
  const bytes = filtered.reduce((sum, card) => sum + card.byteSize, 0);
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const currentPage = Math.min(page, pages - 1);
  const update = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setter(event.target.value); setPage(0); };

  return <>
    <p className={styles.scope} role="status">{data ? `${data.cards.length.toLocaleString()} records loaded · ${data.truncated ? "Latest 5,000 records only; charts and filters apply to this window, not the full database." : "All current card records · Live updates"}` : "Connecting to Convex…"}</p>
    <section className={styles.panel} aria-label="Filter submissions">
      <div className={styles.filters}>
        <label>From (UTC+8)<input type="date" value={start} onChange={update(setStart)} /></label>
        <label>To (UTC+8, inclusive)<input type="date" value={end} onChange={update(setEnd)} /></label>
        <label>Status<select value={status} onChange={update(setStatus)}><option value="all">All statuses</option><option value="published">Published</option><option value="removed">Removed</option></select></label>
        <label>File type<select value={type} onChange={update(setType)}><option value="all">All file types</option>{[...new Set(data?.cards.map(card => card.mimeType))].sort().map(mime => <option key={mime}>{mime}</option>)}</select></label>
        <label>Card ID<input type="search" placeholder="Search card ID" value={search} onChange={update(setSearch)} /></label>
        <button className={styles.button} onClick={() => { setStart(""); setEnd(""); setStatus("all"); setType("all"); setSearch(""); setSort("newest"); setPage(0); }}>Reset filters</button>
      </div>
      {invalidRange && <p role="alert">The end date must be on or after the start date.</p>}
    </section>
    <section className={styles.metrics} aria-label="Filtered summary" aria-busy={!data}>
      {[["Matching cards", filtered.length.toLocaleString()], ["Published", published.toLocaleString()], ["Removed", (filtered.length - published).toLocaleString()], ["Image storage", formatBytes(bytes)]].map(([label, value]) => <div className={styles.metric} key={label}><span>{label}</span><strong>{data ? value : "—"}</strong></div>)}
    </section>
    <div className={styles.charts}>
      <section className={styles.panel}>
        <h2>Submissions by day</h2><p>Submission dates in UTC+8 · days with submissions shown</p>
        <div className={styles.daily} aria-label="Daily submission counts">
          {daily.map(([day, count]) => <div className={styles.barRow} key={day}><span>{day}</span><div className={styles.track}><div className={styles.bar} style={{ width: `${count / max * 100}%` }} /></div><strong>{count}</strong></div>)}
          {!daily.length && <p>{data ? "No submissions match these filters." : "Loading chart…"}</p>}
        </div>
      </section>
      <section className={styles.panel}><h2>Status breakdown</h2><p>Current status of matching cards</p>
        <div className={styles.statusBar} role="img" aria-label={`${published} published, ${filtered.length - published} removed`}><div style={{ width: `${filtered.length ? published / filtered.length * 100 : 0}%` }} /></div>
        <p>Published <strong>{published}</strong> · Removed <strong>{filtered.length - published}</strong></p>
        <p className={styles.note}>Metadata only. Removed artwork and upload keys are not exposed. This page is public and read-only; it does not provide moderation controls.</p>
      </section>
    </div>
    <section className={styles.panel} aria-label="Card records">
      <div className={styles.tableHeading}><h2>Card records</h2><label>Sort by<select value={sort} onChange={update(setSort)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="largest">Largest file first</option></select></label></div>
      <div className={styles.tableScroll}><table><thead><tr><th>Card ID</th><th>Submitted (UTC+8)</th><th>Status</th><th>File type</th><th>Size</th></tr></thead><tbody>
        {filtered.slice(currentPage * 25, currentPage * 25 + 25).map(card => <tr key={card._id}><td className={styles.id}>{card._id}</td><td><time dateTime={new Date(card._creationTime).toISOString()}>{singaporeTime(card._creationTime)}</time></td><td><span className={card.status === "published" ? styles.published : styles.removed}>{card.status}</span></td><td>{card.mimeType}</td><td>{formatBytes(card.byteSize)}</td></tr>)}
        {!filtered.length && <tr><td colSpan={5}>{data ? "No cards match these filters." : "Loading cards…"}</td></tr>}
      </tbody></table></div>
      <nav className={styles.pagination} aria-label="Table pagination"><button disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage + 1} of {pages} · {filtered.length} matching records</span><button disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Next</button></nav>
    </section>
  </>;
}

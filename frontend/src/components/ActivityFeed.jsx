function ActivityFeed({ events, isLoading }) {
  return (
    <aside className="nf-sidebar-panel nf-activity-panel">
      <div className="nf-sidebar-kicker">Live Feed</div>
      <h2 className="nf-sidebar-title">Recent activity</h2>
      <p className="nf-sidebar-copy">Newest events appear first as the shelf changes.</p>

      {isLoading ? (
        <div className="nf-activity-empty">Loading activity...</div>
      ) : events.length === 0 ? (
        <div className="nf-activity-empty">No activity yet.</div>
      ) : (
        <div className="nf-activity-list">
          {events.map((event) => (
            <article className="nf-activity-item" key={event.id}>
              <div className="nf-activity-type">{String(event.type || '').replaceAll('_', ' ')}</div>
              <div className="nf-activity-message">{event.message}</div>
              <div className="nf-activity-time">{new Date(event.createdAt).toLocaleString()}</div>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

export default ActivityFeed;
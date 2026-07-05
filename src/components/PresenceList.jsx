export default function PresenceList({ presence }) {
  return (
    <div>
      <h3>Presence</h3>
      <div className="presence-list">
        {presence.length ? (
          presence.map((person) => (
            <div key={person.userId} className="presence-item">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span className="presence-dot" />
                <span>{person.userName}</span>
              </div>
              <span>{person.active ? "Viewing" : "Away"}</span>
            </div>
          ))
        ) : (
          <div className="empty-state">No collaborators yet</div>
        )}
      </div>
    </div>
  );
}

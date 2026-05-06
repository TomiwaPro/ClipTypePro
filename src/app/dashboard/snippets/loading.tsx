/**
 * Skeleton shown during route transitions to /dashboard/snippets.
 * Pure CSS shimmer using the global @keyframes shimmer in globals.css.
 */
export default function SnippetsLoading() {
  return (
    <div className="fade-up">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              ...skeletonBar,
              width: 200,
              height: 22,
              marginBottom: 8,
            }}
          />
          <div style={{ ...skeletonBar, width: 120, height: 14 }} />
        </div>
        <div style={{ ...skeletonBar, width: 130, height: 36 }} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...skeletonBar, width: 64, height: 24 }} />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              padding: 18,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ ...skeletonBar, width: "70%", height: 14 }} />
            <div style={{ ...skeletonBar, width: 60, height: 16 }} />
            <div style={{ ...skeletonBar, width: "100%", height: 10 }} />
            <div style={{ ...skeletonBar, width: "90%", height: 10 }} />
            <div style={{ ...skeletonBar, width: "60%", height: 10 }} />
            <div
              style={{
                ...skeletonBar,
                width: 100,
                height: 28,
                marginTop: 4,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const skeletonBar: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--c-border) 25%, var(--c-border-l) 50%, var(--c-border) 75%)",
  backgroundSize: "400px 100%",
  animation: "shimmer 1.4s infinite",
  borderRadius: 6,
};

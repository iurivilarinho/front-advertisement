import OverlayController from "./components/OverlayController";

export default function App() {
  return (
    <OverlayController showSeconds={15} intervalMinutes={0.5} fullscreen={true}>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            padding: 24,
            borderRadius: 16,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            color: "white",
            pointerEvents: "none",
          }}
        >
          <img
            src="https://autoentusiastas.com.br/ae/wp-content/uploads/2019/07/Opala-SS.jpg"
            alt="Opala SS"
            style={{
              maxWidth: "70vw",
              maxHeight: "60vh",
              objectFit: "contain",
              borderRadius: 12,
              boxShadow: "0 0 40px rgba(0,0,0,0.7)",
            }}
          />

          <div style={{ fontSize: 36, fontWeight: 600 }}>
            Chevrolet Opala SS
          </div>
        </div>
      </div>
    </OverlayController>
  );
}
export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const password = "hessa123*";
  const { screen } = useApp();

  const Screen = useMemo(() => SCREENS[screen] || SplashScreen, [screen]);
  const showChrome = screen !== "splash";

  // 🔒 LOCK SCREEN
  if (!authenticated) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "#000",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999999,
        }}
      >
        <input
          type="password"
          autoFocus
          placeholder="Enter password"
          style={{
            padding: "20px",
            fontSize: "18px",
            borderRadius: "10px",
            border: "1px solid #333",
            background: "#111",
            color: "#fff",
            outline: "none",
            pointerEvents: "auto"
          }}
          onChange={(e) => {
            if (e.target.value === password) {
              setAuthenticated(true);
            }
          }}
        />
      </div>
    );
  }

  // 🔓 MAIN APP
  return (
    <PhoneShell showStatusBar={showChrome}>
      <Screen />
      {showChrome && <BottomNav />}
    </PhoneShell>
  );
}
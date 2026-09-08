import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Reset password · Upforce Hub" };

export default function ForgotPage() {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 32,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1
          className="upf-display"
          style={{
            fontSize: 25,
            fontWeight: 600,
            letterSpacing: "-.02em",
            margin: "0 0 6px",
          }}
        >
          Reset your password
        </h1>
        <p style={{ fontSize: 14, color: "var(--t35)", margin: "0 0 22px" }}>
          We will email a link to the address on your Upforce workspace.
        </p>

        <ForgotForm />

        <p style={{ fontSize: 13, marginTop: 18 }}>
          <a href="/sign-in">Back to sign in</a>
        </p>
      </div>
    </main>
  );
}

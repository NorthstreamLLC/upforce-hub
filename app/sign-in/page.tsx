import Image from "next/image";

import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in · Upforce Hub" };

const PROMISES = [
  { color: "#F2683C", text: "Every stage schedules its own retarget touches." },
  { color: "#E9A83B", text: "Nothing demotes without someone approving it." },
  { color: "#3FBF7F", text: "Pipeline value updates as services change." },
];

export default function SignInPage() {
  return (
    <main
      style={{
        display: "flex",
        flexWrap: "wrap",
        minHeight: "100vh",
        background: "var(--t0)",
      }}
    >
      <section
        style={{
          flex: "1 1 460px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          <Image
            className="upf-logo"
            src="/upforce-logo.png"
            alt="Upforce"
            width={126}
            height={30}
            priority
          />

          <h1
            className="upf-display"
            style={{
              fontSize: 25,
              fontWeight: 600,
              letterSpacing: "-.02em",
              margin: "22px 0 6px",
            }}
          >
            Sign in to Hub
          </h1>
          <p style={{ fontSize: 14, color: "var(--t35)", margin: "0 0 22px" }}>
            Your pipeline, retarget clocks and team calendar.
          </p>

          <SignInForm />
        </div>
      </section>

      <aside
        style={{
          flex: "1 1 420px",
          display: "flex",
          alignItems: "center",
          padding: 40,
          background: "var(--t2)",
          borderLeft: "1px solid var(--t18)",
        }}
      >
        <div style={{ maxWidth: 400 }}>
          <p
            className="upf-display"
            style={{
              fontSize: 21,
              fontWeight: 600,
              lineHeight: 1.4,
              margin: "0 0 22px",
            }}
          >
            Every lead sits on a clock. Hub makes sure it never runs out
            quietly.
          </p>

          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {PROMISES.map((p) => (
              <li
                key={p.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 0",
                  fontSize: 13.5,
                  color: "var(--t38)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 7,
                    height: 7,
                    flex: "0 0 auto",
                    borderRadius: "50%",
                    background: p.color,
                  }}
                />
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}

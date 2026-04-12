import { ImageResponse } from "next/og";

export const alt = "Govroll — See What Your Representatives Are Doing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Star({ size: s = 36 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#B8860B">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default async function OgImage() {
  // Load a serif font for the constitutional aesthetic
  const geistRes = await fetch(
    new URL("https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-700-normal.woff")
  );
  const geistFont = await geistRes.arrayBuffer();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A1F44",
        }}
      >
        {/* Stars + Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Star size={36} />
          <span
            style={{
              color: "#FFFFFF",
              fontSize: 84,
              fontFamily: "EBGaramond",
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            GOVROLL
          </span>
          <Star size={36} />
        </div>

        {/* Divider */}
        <div
          style={{
            width: 100,
            height: 3,
            backgroundColor: "#B8860B",
            marginTop: 32,
            marginBottom: 32,
          }}
        />

        {/* Tagline */}
        <span
          style={{
            color: "#FAFAF5",
            fontSize: 30,
            fontFamily: "EBGaramond",
            fontWeight: 700,
            opacity: 0.8,
          }}
        >
          See What Your Representatives Are Doing
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "EBGaramond",
          data: geistFont,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}

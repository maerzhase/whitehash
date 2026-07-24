import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

export const alt = "whitehash — Generative art. Straight from the source."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const dynamic = "force-static"

export default async function OpenGraphImage() {
  const [logo, geistSans] = await Promise.all([
    readFile(join(process.cwd(), "public", "logo.png")),
    readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf")),
  ])
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#000",
        color: "#f4e7d8",
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.7,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 620,
          height: 620,
          right: -35,
          top: 5,
          display: "flex",
          borderRadius: 620,
          background: "radial-gradient(circle, rgba(71,168,255,.18), rgba(0,0,0,0) 68%)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          width: "100%",
          padding: "58px 64px 54px 68px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" style={{ width: 42, height: 42 }} />
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.6px",
            }}
          >
            whitehash
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 164 }}>
          <div
            style={{
              display: "flex",
              fontSize: 66,
              fontWeight: 600,
              lineHeight: 0.98,
              letterSpacing: "-4.4px",
            }}
          >
            Generative art.
          </div>
          <div
            style={{
              display: "flex",
              width: 740,
              marginTop: 13,
              fontSize: 66,
              fontWeight: 600,
              lineHeight: 0.98,
              letterSpacing: "-4.4px",
              color: "#777",
            }}
          >
            Straight from the source.
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: -10,
          bottom: -20,
          width: 510,
          height: 510,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          style={{
            width: 480,
            height: 480,
            objectFit: "contain",
            filter: "drop-shadow(0 30px 70px rgba(0,0,0,.65))",
          }}
        />
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Geist", data: geistSans, weight: 600 }],
    },
  )
}

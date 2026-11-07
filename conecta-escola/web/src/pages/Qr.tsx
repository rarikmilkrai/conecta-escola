import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { usePageTitle, useSite } from "../lib";

// Tela para projetar no dia da apresentação: os pais apontam a câmera e caem direto no cadastro.
export default function QrPage() {
  usePageTitle("QR Code");
  const { publicUrl, school } = useSite();
  const [url, setUrl] = useState("");
  const [svg, setSvg] = useState("");
  useEffect(() => {
    const fromQuery = new URLSearchParams(location.search).get("url");
    setUrl(fromQuery || publicUrl || location.origin);
  }, [publicUrl]);
  const target = `${url.replace(/\/$/, "")}/cadastro`;
  useEffect(() => {
    if (!url) return;
    QRCode.toString(target, { type: "svg", margin: 1, color: { dark: "#1F2A37", light: "#FFFFFF" } }).then(setSvg);
  }, [target, url]);
  const isLocalhost = /localhost|127\.0\.0\.1/.test(url);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand p-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white font-display text-xl font-bold text-brand">C</span>
      <h1 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl">Conecta Escola</h1>
      <p className="mt-2 text-lg text-white/80">Aponte a câmera do celular e crie sua conta</p>
      <div className="mt-8 rounded-[28px] bg-white p-5 shadow-pop">
        <div className="h-[min(70vw,360px)] w-[min(70vw,360px)] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <p className="mt-6 rounded-full bg-mustard px-5 py-2 font-display text-lg font-bold text-ink">{target.replace(/^https?:\/\//, "")}</p>
      {school && <p className="mt-3 text-sm text-white/70">{school.name}</p>}
      {isLocalhost && (
        <p className="mt-6 max-w-md rounded-xl bg-white/10 px-4 py-3 text-sm text-white">
          Atenção: este QR aponta para <b>localhost</b> e não vai abrir no celular. Abra esta página pelo IP do notebook (ex.: http://192.168.0.10:8080/qr) ou defina PUBLIC_URL no .env.
        </p>
      )}
    </div>
  );
}

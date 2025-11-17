// api/pedidos.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const GOOGLE_SCRIPT_URL =
      "https://script.google.com/macros/s/AKfycbz0_1z2YFTCYnMGEYulW8fq6_I65i-wo8q7RuNhijwUeUVZmZiYt1XcvIvJMpox2n-zQQ/exec";

    const r = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const texto = await r.text();

    // Intentamos devolver JSON si es posible, si no texto plano
    try {
      const json = JSON.parse(texto);
      return res.status(200).json(json);
    } catch {
      return res.status(200).send(texto);
    }
  } catch (error) {
    console.error("Error llamando a Apps Script:", error);
    return res
      .status(500)
      .json({ ok: false, error: "Error llamando a Google Apps Script" });
  }
}

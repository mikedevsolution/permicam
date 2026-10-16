export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Méthode non autorisée" });
  }

  const id = req.query.id;
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ success: false, error: "ID invalide" });
  }

  try {
    const url = new URL(
      "https://ci4cartesgrise.com/public/api/getPermisInfo.php"
    );
    url.searchParams.set("id", id);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        success: false,
        error: "L'API PHP n'a pas renvoyé du JSON",
      });
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({
      success: false,
      error: "Impossible de joindre l'API PHP",
    });
  }
}

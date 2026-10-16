export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      success: false,
      error: "Méthode non autorisée",
    });
  }

  const id = req.query.id;

  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({
      success: false,
      error: "ID invalide",
    });
  }

  const apiUrl = new URL(
    "https://ci4cartesgrise.com/public/api/getPermisInfo.php"
  );
  apiUrl.searchParams.set("id", id);

  let upstream;

  try {
    upstream = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error("Échec de connexion à l'API PHP", {
      name: error?.name,
      message: error?.message,
      cause: error?.cause?.message,
      code: error?.cause?.code,
    });

    return res.status(502).json({
      success: false,
      error: "Impossible de joindre l'API PHP",
    });
  }

  const contentType = upstream.headers.get("content-type") || "";
  let body;

  try {
    body = await upstream.text();
  } catch (error) {
    console.error("Impossible de lire la réponse de l'API PHP", {
      name: error?.name,
      message: error?.message,
    });

    return res.status(502).json({
      success: false,
      error: "Impossible de lire la réponse de l'API PHP",
    });
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    console.error("L'API PHP a répondu sans JSON", {
      status: upstream.status,
      contentType,
      responseStart: body.slice(0, 100).replace(/\s+/g, " "),
    });

    return res.status(502).json({
      success: false,
      error: "L'API PHP a renvoyé une réponse non JSON",
    });
  }

  let data;

  try {
    data = JSON.parse(body);
  } catch (error) {
    console.error("Réponse JSON invalide de l'API PHP", {
      status: upstream.status,
      message: error?.message,
    });

    return res.status(502).json({
      success: false,
      error: "Réponse JSON invalide de l'API PHP",
    });
  }

  return res.status(upstream.status).json(data);
}

import https from "node:https";

function requestPhp(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        // Contournement TLS temporaire, limité à cet appel.
        rejectUnauthorized: false,
        headers: { Accept: "application/json" },
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode || 502,
            contentType: String(response.headers["content-type"] || ""),
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );

    request.setTimeout(10000, () => {
      request.destroy(new Error("Délai dépassé vers l'API PHP"));
    });

    request.on("error", reject);
  });
}

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

  const url = new URL(
    "https://ci4cartesgrise.com/public/api/getPermisInfo.php"
  );
  url.searchParams.set("id", id);

  try {
    const upstream = await requestPhp(url);

    if (!upstream.contentType.toLowerCase().includes("application/json")) {
      console.error("API PHP non JSON", {
        status: upstream.status,
        contentType: upstream.contentType,
      });

      return res.status(502).json({
        success: false,
        error: "L'API PHP a renvoyé une réponse non JSON",
      });
    }

    let data;

    try {
      data = JSON.parse(upstream.body);
    } catch {
      console.error("JSON invalide reçu de l'API PHP", {
        status: upstream.status,
      });

      return res.status(502).json({
        success: false,
        error: "Réponse invalide de l'API PHP",
      });
    }

    return res.status(upstream.status).json(data);
  } catch (error) {
    console.error("Échec de connexion à l'API PHP", {
      message: error?.message,
      code: error?.code,
    });

    return res.status(502).json({
      success: false,
      error: "Impossible de joindre l'API PHP",
    });
  }
}

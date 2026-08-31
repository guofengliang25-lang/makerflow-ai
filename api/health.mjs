export default async function healthHandler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    return response.status(405).json({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "只支持GET请求。" } });
  }
  return response.status(200).json({ ok: true });
}

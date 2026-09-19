export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: { message: "Method not allowed", type: "invalid_request_error" } });
  }
  res.status(200).json({
    object: "list",
    data: [{ id: "gpt-5.6-luna", object: "model", owned_by: "Tooken Club" }]
  });
}

import http from "http";

const server = http.createServer((req, res) => {
  res.end("Hello");
});

server.listen(8080, () => {
  console.log("Server running on 8080");
});
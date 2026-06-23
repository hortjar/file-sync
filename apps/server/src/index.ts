import { createApp } from "./app";

createApp().listen(process.env["PORT"] ?? 3001, ({ port }) => {
  console.log(`FileSync server running on http://localhost:${port}`);
});

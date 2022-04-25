/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { h, renderSSR } from "https://deno.land/x/nano_jsx@v0.0.20/mod.ts";

function App() {
  return (
    <html>
      <head>
        <title>Cheeper</title>
      </head>
      <body>
        <h1>Cheep Cheep</h1>
        <p>Welcome to the Roost!</p>
      </body>
    </html>
  );
}

function handler(req) {
  const html = renderSSR(<App />);
  return new Response(html, {
    headers: {
      "content-type": "text/html",
    },
  });
}

console.log("Listening on http://localhost:8000");
serve(handler);
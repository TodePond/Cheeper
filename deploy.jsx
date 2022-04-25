/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.133.0/http/server.ts";
import { router } from "https://crux.land/router@0.0.11";
import { h, ssr } from "https://crux.land/nanossr@0.0.4";

import "https://deno.land/x/xhr@0.1.2/mod.ts";
import { installGlobals } from "https://deno.land/x/virtualstorage@0.1.0/mod.ts";
import { virtualStorage } from "https://deno.land/x/virtualstorage@0.1.0/middleware.ts";

// Env
import "https://deno.land/std@0.136.0/dotenv/load.ts";

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const render = (component) => ssr(() => <App>{component}</App>);
installGlobals();

const firebaseConfig = JSON.parse(Deno.env.get("FIREBASE_CONFIG"));
console.log(firebaseConfig);
const firebaseApp = initializeApp(firebaseConfig, "example");
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const users = new Map();

serve(
  router(
    {
      "/": () => render(<Feed />),
      "/cheeps": async () => {
        const cheepsCol = collection(db, "cheeps");
        const querySnapshot = await getDocs(cheepsCol);
        new Response({
          body: querySnapshot.docs.map((doc) => doc.data()),
          type: "json",
        });
      },
    },
    () => render(<NotFound />)
  )
);

function App({ children }) {
  return (
    <div class="min-h-screen">
      <NavBar />
      {children}
    </div>
  );
}

function NavBar() {
  return (
    <nav class="font-sans flex flex-col text-center sm:flex-row sm:text-left sm:justify-between py-4 px-6 bg-white shadow sm:items-baseline w-full">
      <div class="mb-2 sm:mb-0">
        <a href="/" class="text-2xl no-underline hover:text-indigo-800">
          Cheeper
        </a>
      </div>
    </nav>
  );
}

function Feed() {
  return (
    <div class="flex justify-center items-center">
      <div class="max-w-7xl py-12 px-4 sm:px-6 lg:py-24 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <h2 class="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
          <span class="block">Cheep Cheep</span>
          <span class="block text-indigo-600">Welcome to the Roost!</span>
        </h2>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div class="min-h-full px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div class="max-w-max mx-auto">
        <main class="sm:flex">
          <p class="text-4xl font-extrabold text-indigo-600 sm:text-5xl">404</p>
          <div class="sm:ml-6">
            <div class="sm:border-l sm:border-gray-200 sm:pl-6">
              <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                Page not found
              </h1>
              <p class="mt-1 text-base text-gray-500">
                Please check the URL in the address bar and try again.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
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

// Oak
import {
  Application,
  Router,
  Status,
} from "https://deno.land/x/oak@v7.7.0/mod.ts";

const render = (component) => ssr(() => <App>{component}</App>);
installGlobals();

const firebaseConfig = JSON.parse(Deno.env.get("FIREBASE_CONFIG"));
const firebaseApp = initializeApp(firebaseConfig, "example");
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const users = new Map();

const router = new Router();

router.get("/", (ctx) => {
  const signedInUid = ctx.cookies.get("LOGGED_IN_UID");
  const signedInUser = signedInUid != null ? users.get(signedInUid) : undefined;
  const loginned = signedInUid && signedInUser && auth.currentUser;
  ctx.response.body = render(<Feed>{loginned}</Feed>).body;
  ctx.response.type = "text/html";
});

router.get("/cheeps", async (ctx) => {
  const cheepsCol = collection(db, "cheeps");
  try {
    const querySnapshot = await getDocs(cheepsCol);
    ctx.response.body = querySnapshot.docs.map((doc) => doc.data());
    ctx.response.type = "json";
  } catch (e) {
    ctx.response.body = render(<NotAllowed />).body;
    ctx.response.type = "text/html";
  }
});

function isCheep(value) {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  if (!("id" in value)) return false;
  if (!("text" in value)) return false;
  return true;
}

router.post("/cheep", async (ctx) => {
  const body = ctx.request.body();
  if (body.type !== "json") {
    ctx.throw(Status.BadRequest, "Must be a JSON document");
  }
  const cheep = await body.value;
  console.log(cheep);
  if (!isCheep(cheep)) {
    ctx.throw(Status.BadRequest, "Cheep was not well formed");
  }
  addDoc(collection(db, "cheeps"), cheep);
  ctx.response.status = Status.NoContent;
});

router.get("/login", async (ctx) => {
  ctx.response.body = render(<Login></Login>).body;
  ctx.response.type = "text/html";
});

router.post("/login", async (ctx) => {
  const value = await ctx.request.body().value;
  console.log(value);
});

router.get("/(.*)", (ctx) => {
  ctx.response.body = render(<NotFound />).body;
  ctx.response.type = "text/html";
});

const app = new Application();
app.use(virtualStorage());

app.use(async (ctx, next) => {
  const signedInUid = ctx.cookies.get("LOGGED_IN_UID");
  const signedInUser = signedInUid != null ? users.get(signedInUid) : undefined;
  if (!signedInUid || !signedInUser || !auth.currentUser) {
    const creds = await signInWithEmailAndPassword(
      auth,
      Deno.env.get("FIREBASE_USERNAME"),
      Deno.env.get("FIREBASE_PASSWORD")
    );
    const { user } = creds;
    if (user) {
      users.set(user.uid, user);
      ctx.cookies.set("LOGGED_IN_UID", user.uid);
    } else if (signedInUser && signedInUid.uid !== auth.currentUser?.uid) {
      await auth.updateCurrentUser(signedInUser);
    }
  }
  return next();
});

app.use(router.routes());
app.use(router.allowedMethods());

/*

const sendCheep = async () => {
    const req = new XMLHttpRequest()
    req.open("POST", "http://localhost:8000/cheep")
    req.setRequestHeader("Content-Type", "application/json")
    req.send('{"text": "Cheeeeeep", "id": "0"}')
    req.addEventListener("load", function() {
        console.log(this)
    })
}

*/

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

function Feed(loginned) {
  return (
    <div class="flex justify-center items-center">
      <div class="max-w-7xl py-12 px-4 sm:px-6 lg:py-24 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <h2 class="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
          <span class="block">Cheep Cheep</span>
          <span class="block text-indigo-600">
            Welcome {loginned ? "back " : ""}to the Roost!
          </span>
        </h2>
      </div>
    </div>
  );
}

function Login() {
  return (
    <div class="flex justify-center items-center">
      <div class="max-w-7xl py-12 px-4 sm:px-6 lg:py-24 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <form action="/login" method="POST">
          <label for="emailaddress" class="block text-lg">
            Email
          </label>
          <input
            type="email"
            class="block bg-indigo-100 rounded p-0.5"
            name="emailaddress"
            id="emailaddress"
            autocomplete="username"
            required
          ></input>
          <label for="emailaddress" class="block text-lg">
            Password
          </label>
          <input
            type="password"
            class="block bg-indigo-100 rounded p-0.5"
            name="password"
            id="password"
            autocomplete="current-password"
            required
          ></input>
          <input
            class="block my-4 text-lg !px-2 rounded p-0.5"
            type="submit"
            value="Login"
          ></input>
        </form>
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

function NotAllowed() {
  return (
    <div class="min-h-full px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div class="max-w-max mx-auto">
        <main class="sm:flex">
          <p class="text-4xl font-extrabold text-indigo-600 sm:text-5xl">401</p>
          <div class="sm:ml-6">
            <div class="sm:border-l sm:border-gray-200 sm:pl-6">
              <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                Unauthorised
              </h1>
              <p class="mt-1 text-base text-gray-500">
                Please sign in and try again.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

await app.listen({ port: 8000 });

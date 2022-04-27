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
  updateCurrentUser,
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

const render = (component, loggedIn) =>
  ssr(() => <App loggedIn={loggedIn}>{component}</App>);
installGlobals();

const firebaseConfig = JSON.parse(Deno.env.get("FIREBASE_CONFIG"));
const firebaseApp = initializeApp(firebaseConfig, "example");
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const isLoggedIn = () => {
  return auth.currentUser !== null;
};

const router = new Router();
router.get("/", (ctx) => {
  const loggedIn = isLoggedIn();
  ctx.response.body = render(<Feed loggedIn={loggedIn} />, loggedIn).body;
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
router.get("/cheep", async (ctx) => {
  ctx.response.body = render(<Cheep />, isLoggedIn()).body;
  ctx.response.type = "text/html";
});

const isCheep = (value) => {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  if (!("file" in value)) return false;
  if (!("url" in value)) return false;
  if (!("text" in value)) return false;
  if (!("time" in value)) return false;
  return true;
};

router.post("/cheep", async (ctx) => {
  const body = ctx.request.body();
  if (body.type !== "form") {
    ctx.throw(Status.BadRequest, "Cheep was not well formed");
    return;
  }

  if (!isLoggedIn()) {
    ctx.throw(Status.BadRequest, "You need to login to cheep");
    return;
  }

  const value = await body.value;
  const text = value.get("text");
  const url = value.get("url");
  const file = value.get("file");

  const time = Date.now();

  const cheep = { text, url, file, time };
  if (!isCheep(cheep)) {
    ctx.throw(Status.BadRequest, "Cheep was not well formed");
    return;
  }
  addDoc(collection(db, "cheeps"), cheep);
  ctx.response.status = Status.NoContent;
});

router.get("/login", async (ctx) => {
  const invalid = ctx.request.url.searchParams.has("invalid");
  ctx.response.body = render(
    <Login invalid={invalid}></Login>,
    isLoggedIn()
  ).body;
  ctx.response.type = "text/html";
});

router.get("/logout", async (ctx) => {
  auth.signOut();
  ctx.response.redirect("/");
});

router.post("/login", async (ctx) => {
  const value = await ctx.request.body().value;
  const email = value.get("emailaddress");
  const password = value.get("password");
  let creds;
  try {
    creds = await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    return ctx.response.redirect("/login?invalid");
  }
  const { user } = creds;
  if (user) {
    await updateCurrentUser(auth, user);
  }
  ctx.response.redirect("/");
});

router.get("/(.*)", (ctx) => {
  ctx.response.body = render(<NotFound />).body;
  ctx.response.type = "text/html";
});

const app = new Application();
app.use(virtualStorage());
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

const App = (args) => {
  const { loggedIn, children } = args;
  return (
    (
      <head>
        <title>Cheeper</title>
      </head>
    ),
    (
      <div class="min-h-screen">
        <NavBar loggedIn={loggedIn} />
        {children}
      </div>
    )
  );
};

const NavBar = ({ loggedIn }) => {
  return (
    <nav class="font-sans flex text-center flex-row text-left justify-between py-4 px-6 bg-white shadow items-baseline w-full">
      <div class="mb-2 sm:mb-0">
        <a href="/" class="text-2xl no-underline hover:text-indigo-800">
          Cheeper
        </a>
      </div>
      {loggedIn ? (
        <div class="mb-2 sm:mb-0">
          <a href="/cheep" class="text-2xl no-underline hover:text-indigo-800">
            Cheep
          </a>
        </div>
      ) : undefined}
      {loggedIn ? (
        <div class="mb-2 sm:mb-0">
          <a href="/logout" class="text-2xl no-underline hover:text-indigo-800">
            Logout
          </a>
        </div>
      ) : (
        <div class="mb-2 sm:mb-0">
          <a href="/login" class="text-2xl no-underline hover:text-indigo-800">
            Login
          </a>
        </div>
      )}
    </nav>
  );
};

function Feed({ loggedIn }) {
  return (
    <div class="flex justify-center items-center">
      <div class="max-w-7xl py-12 px-4 sm:px-6 lg:py-24 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <h2 class="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
          <span class="block">Cheep Cheep</span>
          <span class="block text-indigo-600">
            Welcome {loggedIn ? "back " : ""}to the Roost!
          </span>
        </h2>
      </div>
    </div>
  );
}

function Login({ invalid = false }) {
  return (
    <div class="flex justify-center items-center">
      <div class="max-w-7xl py-12 px-4 sm:px-6 lg:py-24 lg:px-8">
        <form action="/login" method="POST">
          <label for="emailaddress" class="block text-lg">
            Email
          </label>
          <input
            type="email"
            class="w-full block bg-indigo-100 rounded p-0.5"
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
            class="w-full block bg-indigo-100 rounded p-0.5"
            name="password"
            id="password"
            autocomplete="current-password"
            required
          ></input>
          <input
            class="bg-indigo-100 block my-2 text-lg !px-2 rounded p-0.5 hover:bg-indigo-200"
            type="submit"
            value="Login"
          ></input>
        </form>
        {invalid ? <div class="text-red-500">bad login :(</div> : undefined}
      </div>
    </div>
  );
}

function Cheep() {
  return (
    <div class="flex justify-center items-center">
      <div class="max-w-full py-12 px-4 sm:px-6 lg:py-24 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <form action="/cheep" method="POST">
          <label for="text" class="block text-lg">
            Text
          </label>
          <textarea
            class="block w-full bg-indigo-100 rounded p-0.5"
            name="text"
            id="text"
            type="text"
          ></textarea>
          <label for="url" class="block text-lg">
            Link
          </label>
          <input
            type="url"
            class="block w-full bg-indigo-100 rounded p-0.5"
            name="url"
            id="url"
          ></input>
          <label for="file" class="block text-lg">
            Video / Image
          </label>
          <input
            class="w-full block bg-indigo-100 rounded p-0.5"
            type="file"
            name="file"
            id="file"
          ></input>
          <input
            class="bg-indigo-100 block my-2 text-lg !px-2 rounded p-0.5 hover:bg-indigo-200"
            type="submit"
            value="Cheep"
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

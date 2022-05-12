/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h, ssr } from "https://crux.land/nanossr@0.0.4"

import "https://deno.land/x/xhr@0.1.2/mod.ts"
import { installGlobals } from "https://deno.land/x/virtualstorage@0.1.0/mod.ts"
import { virtualStorage } from "https://deno.land/x/virtualstorage@0.1.0/middleware.ts"

// Env
import "https://deno.land/std@0.136.0/dotenv/load.ts"

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js"
import {
	getAuth,
	signInWithEmailAndPassword,
	updateCurrentUser,
	getIdToken,
	setPersistence,
	browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js"
import {
	getFirestore,
	collection,
	addDoc,
	deleteDoc,
	getDocs,
	query,
	where,
	orderBy,
	limit,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"

// Oak
import { Application, Router, Status } from "https://deno.land/x/oak@v7.7.0/mod.ts"

const render = (component) => ssr(() => <App>{component}</App>).body
installGlobals()

const firebaseConfig = JSON.parse(Deno.env.get("FIREBASE_CONFIG"))
const firebaseApp = initializeApp(firebaseConfig, "example")
const auth = getAuth(firebaseApp)
const db = getFirestore(firebaseApp)

setPersistence(auth, browserLocalPersistence)

const isLoggedIn = () => {
	return auth.currentUser !== null
}

const router = new Router()
router.get("/", async (ctx) => {
	const cheepCollection = collection(db, "cheeps")
	const q = query(cheepCollection, orderBy("time", "desc"), limit(100))
	const querySnapshot = await getDocs(q)
	const cheepDocuments = querySnapshot.docs
	const cheeps = cheepDocuments.map((doc) => doc.data())

	ctx.response.body = render(<Feed cheeps={cheeps} />)
	ctx.response.type = "text/html"
})

router.get("/cheeps", async (ctx) => {
	const cheepsCol = collection(db, "cheeps")
	try {
		const querySnapshot = await getDocs(cheepsCol)
		ctx.response.body = querySnapshot.docs.map((doc) => doc.data())
		ctx.response.type = "json"
	} catch (e) {
		ctx.response.body = render(<NotAllowed />)
		ctx.response.type = "text/html"
	}
})

const isCheep = (value) => {
	if (typeof value !== "object") return false
	if (value === null) return false
	if (!("file" in value)) return false
	if (!("text" in value)) return false
	if (!("time" in value)) return false
	return true
}

router.get("/new", async (ctx) => {
	if (!isLoggedIn()) {
		ctx.response.redirect("/login")
	}
	ctx.response.body = render(<New />)
	ctx.response.type = "text/html"
})

router.post("/new", async (ctx) => {
	const body = ctx.request.body()
	if (body.type !== "form") {
		ctx.throw(Status.BadRequest, "Cheep was not well formed")
		return
	}
	if (!isLoggedIn()) {
		ctx.throw(Status.BadRequest, "You need to login to cheep")
		return
	}
	const value = await body.value
	const text = value.get("text")
	const file = value.get("file")
	const time = Date.now()

	const cheep = { text, file, time }
	if (!isCheep(cheep)) {
		ctx.throw(Status.BadRequest, "Cheep was not well formed")
		return
	}
	addDoc(collection(db, "cheeps"), cheep)
	ctx.response.redirect("/")
})

const users = new Map()
router.get("/logout", async (ctx) => {
	await auth.signOut()
	ctx.response.redirect("/")
})

router.get("/login", async (ctx) => {
	const invalid = ctx.request.url.searchParams.has("invalid")
	ctx.response.body = render(<Login invalid={invalid}></Login>)
	ctx.response.type = "text/html"
})

router.post("/login", async (ctx) => {
	const value = await ctx.request.body().value
	const email = value.get("emailaddress")
	const password = value.get("password")
	let creds
	try {
		creds = await signInWithEmailAndPassword(auth, email, password)
	} catch (e) {
		return ctx.response.redirect("/login?invalid")
	}
	const { user } = creds
	if (user) {
		const token = await getIdToken(user, true)
		//console.log(auth.createSessionCookie)
		await updateCurrentUser(auth, user)
	}
	ctx.response.redirect("/")
})

const app = new Application()
app.use(virtualStorage())

app.use(async (ctx, next) => {
	/*const cookie = undefined
	if (cookie === undefined) {
		await updateCurrentUser(auth, null)
		return next()
	}
	*/
	return next()
})

router.get("/(.*)", (ctx) => {
	ctx.response.body = render(<NotFound />)
	ctx.response.type = "text/html"
})

const App = ({ ctx, children }) => {
	return (
		<html>
			<head>
				<title>Cheeper</title>
			</head>
			<body>
				<div class="min-h-screen">
					<NavBar ctx={ctx} />
					{children}
				</div>
			</body>
		</html>
	)
}

const NavBar = ({ ctx }) => {
	const loggedIn = isLoggedIn()
	return (
		<nav class="font-sans flex text-center flex-row text-left justify-between py-4 px-6 bg-white shadow items-baseline w-full">
			<div class="mb-0">
				<a href="/" class="text-2xl no-underline hover:text-indigo-800">
					Home
				</a>
			</div>
			{loggedIn ? (
				<div class="mb-0">
					<a href="/new" class="text-2xl no-underline hover:text-indigo-800">
						Cheep
					</a>
				</div>
			) : undefined}
			{loggedIn ? (
				<div class="mb-0">
					<a href="/logout" class="text-2xl no-underline hover:text-indigo-800">
						Logout
					</a>
				</div>
			) : (
				<div class="mb-0">
					<a href="/login" class="text-2xl no-underline hover:text-indigo-800">
						Login
					</a>
				</div>
			)}
		</nav>
	)
}

const Feed = ({ cheeps }) => {
	return (
		<div class="flex px-4 justify-center items-center">
			<div class="">
				{cheeps.map((cheep) => (
					<Cheep cheep={cheep} />
				))}
			</div>
		</div>
	)
}

const Cheep = ({ cheep }) => {
	const likes = cheep.likes !== undefined ? cheep.likes : 0
	const time = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
	const seconds = (cheep.time - Date.now()) / 1000
	const minutes = seconds / 60
	const hours = minutes / 60
	const days = hours / 24

	let timeText = "a while back"

	if (seconds > -60) {
		timeText = time.format(Math.ceil(seconds), "second")
	} else if (minutes > -60) {
		timeText = time.format(Math.ceil(minutes), "minute")
	} else if (hours > -24) {
		timeText = time.format(Math.ceil(hours), "hours")
	} else if (days > -7) {
		timeText = time.format(Math.ceil(days), "days")
	} else {
		timeText = new Date(cheep.time).toLocaleString(undefined, {
			day: "numeric",
			month: "long",
			year: "numeric",
		})
	}

	return (
		<div class="block my-10">
			<span class="font-bold">TodePond</span>
			<span class="text-gray-400 text-sm"> - {timeText}</span>
			<p>{cheep.text}</p>

			<div class="pt-1">
				<a href="#" class="">
					❤
				</a>
				<span class="text-red-700">×{likes}</span>
			</div>
		</div>
	)
}

const Login = ({ invalid = false }) => {
	return (
		<div class="flex justify-center items-center">
			<div class="max-w-7xl py-12 px-4 sm:px-6 lg:py-24 lg:px-8">
				<form action="/login" method="POST">
					<input
						type="email"
						class="w-full block bg-indigo-100 rounded p-0.5"
						name="emailaddress"
						id="emailaddress"
						autocomplete="username"
						required
					></input>
					<input
						type="password"
						class="my-2 w-full block bg-indigo-100 rounded p-0.5"
						name="password"
						id="password"
						autocomplete="current-password"
						required
					></input>
					<input
						class="bg-indigo-100 block my-2 !px-2 rounded p-0.5 hover:bg-indigo-200"
						type="submit"
						value="Login"
					></input>
				</form>
				{invalid ? <div class="text-red-500">bad login :(</div> : undefined}
			</div>
		</div>
	)
}

const New = () => {
	return (
		<div class="flex justify-center items-center">
			<div class="max-w-full py-12 px-4 sm:px-6 lg:py-24 lg:px-8 lg:flex lg:items-center lg:justify-between">
				<form action="/new" method="POST">
					<textarea
						class="block h-24 w-full bg-indigo-100 rounded p-0.5"
						name="text"
						id="text"
						type="text"
					></textarea>
					<input
						class="my-2 w-full block bg-indigo-100 rounded p-0.5"
						type="file"
						name="file"
						id="file"
						accept="video/*,image/*"
					></input>
					<input
						class="bg-indigo-100 block my-2 !px-2 rounded p-0.5 hover:bg-indigo-200"
						type="submit"
						value="Cheep"
					></input>
				</form>
			</div>
		</div>
	)
}

const NotFound = () => {
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
	)
}

const NotAllowed = () => {
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
							<p class="mt-1 text-base text-gray-500">Please sign in and try again.</p>
						</div>
					</div>
				</main>
			</div>
		</div>
	)
}

app.use(router.routes())
app.use(router.allowedMethods())
await app.listen({ port: 8000 })
